import type { EventInput } from "@fullcalendar/core";
import { DateTime } from "luxon";

import type { Tables } from "@/types/database";

export type EventRow = Tables<"events">;

export type EventOccurrence = {
  event: EventRow;
  start: Date;
  end: Date;
};

export type ClearPlan = {
  /** One-off events deleted outright. */
  deleteIds: string[];
  /** Recurring events with the listed occurrence dates excluded. */
  exclusions: { event: EventRow; dates: string[] }[];
  totalCount: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Local calendar date of a Date object (YYYY-MM-DD). */
export function dateToKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local date of an ISO timestamp, formatted for a date input (YYYY-MM-DD). */
export function isoToDateValue(iso: string): string {
  return dateToKey(new Date(iso));
}

/** Local wall-clock time of an ISO timestamp (HH:mm, 24h). */
export function isoToTimeValue(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Combine a date with start and end times into concrete timestamps.
 * An end time at or before the start time means the event runs past
 * midnight into the next day.
 */
export function combineDateAndTimes(
  date: string,
  startTime: string,
  endTime: string,
): { start: Date; end: Date } {
  const start = new Date(`${date}T${startTime}`);
  const end = new Date(`${date}T${endTime}`);
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

function eventDurationMs(event: EventRow): number {
  return (
    new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()
  );
}

/**
 * The date an occurrence belongs to, in the team's zone. Exclusions are stored
 * as plain dates, so they have to be matched in the same zone the event was
 * scheduled in — a 01:00 session is excluded on the night it belongs to, not on
 * the calendar date the viewer's browser happens to be in.
 */
export function occurrenceKey(start: Date, zone: string): string {
  return DateTime.fromJSDate(start, { zone }).toFormat("yyyy-MM-dd");
}

/**
 * Weekly recurrence steps in the TEAM's zone, not the browser's.
 *
 * "Every Friday at 20:00" means 20:00 where the team plays. Stepping with
 * `setDate(+7)` preserves the wall clock in whatever zone the *reader* is in,
 * so once either zone crosses a DST boundary the series drifts an hour for
 * anyone outside the team's zone. luxon's `plus({ weeks })` keeps the wall
 * clock in the zone we ask for, which is the one that defines the event.
 */
export function occurrenceStartsInRange(
  event: EventRow,
  rangeStart: Date,
  rangeEnd: Date,
  zone: string,
): Date[] {
  if (!event.recurs_weekly) {
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);
    return start < rangeEnd && end > rangeStart ? [start] : [];
  }

  // Inclusive to the end of the final day, in the team's zone.
  const until = event.recur_until
    ? DateTime.fromISO(event.recur_until, { zone }).endOf("day")
    : null;

  const starts: Date[] = [];
  let cursor = DateTime.fromISO(event.starts_at, { zone });
  if (!cursor.isValid) return [];

  // A malformed row must not spin forever; a weekly series cannot outrun this.
  const MAX_OCCURRENCES = 520;
  let guard = 0;

  while (
    cursor.toMillis() < rangeStart.getTime() &&
    guard++ < MAX_OCCURRENCES
  ) {
    cursor = cursor.plus({ weeks: 1 });
  }
  while (
    (until === null || cursor <= until) &&
    cursor.toMillis() < rangeEnd.getTime() &&
    guard++ < MAX_OCCURRENCES
  ) {
    const start = cursor.toJSDate();
    if (!event.excluded_dates.includes(occurrenceKey(start, zone))) {
      starts.push(start);
    }
    cursor = cursor.plus({ weeks: 1 });
  }
  return starts;
}

/**
 * Concrete occurrences inside a range, as typed values rather than calendar
 * inputs — what our own week grid renders from.
 */
export function occurrencesInRange(
  events: EventRow[],
  rangeStart: Date,
  rangeEnd: Date,
  zone: string,
): EventOccurrence[] {
  return events.flatMap((event) => {
    const durationMs = eventDurationMs(event);
    return occurrenceStartsInRange(event, rangeStart, rangeEnd, zone).map(
      (start) => ({
        event,
        start,
        end: new Date(start.getTime() + durationMs),
      }),
    );
  });
}

/**
 * FullCalendar inputs for the visible range. Recurring events are
 * expanded into individual occurrences (id `<eventId>::<date>`) so a
 * single occurrence can be deleted without touching the series.
 */
export function expandEventsForRange(
  events: EventRow[],
  rangeStart: Date,
  rangeEnd: Date,
  zone: string,
): EventInput[] {
  return events.flatMap((event): EventInput[] => {
    const base: EventInput = {
      title: event.title,
      classNames: [`event-${event.type}`],
      extendedProps: {
        description: event.description,
        substituteIds: event.substitute_ids,
      },
    };

    if (!event.recurs_weekly) {
      return [
        { ...base, id: event.id, start: event.starts_at, end: event.ends_at },
      ];
    }

    const durationMs = eventDurationMs(event);
    return occurrenceStartsInRange(event, rangeStart, rangeEnd, zone).map(
      (start) => ({
        ...base,
        id: `${event.id}::${occurrenceKey(start, zone)}`,
        start,
        end: new Date(start.getTime() + durationMs),
        // Series timing is edited through the dialog; dragging a single
        // instance of a series is ambiguous.
        editable: false,
      }),
    );
  });
}

/**
 * What "Clear" does to the visible range: one-off events are deleted,
 * recurring events only lose the occurrences inside the range.
 */
export function buildClearPlan(
  events: EventRow[],
  rangeStart: Date,
  rangeEnd: Date,
  zone: string,
): ClearPlan {
  const deleteIds: string[] = [];
  const exclusions: ClearPlan["exclusions"] = [];
  let totalCount = 0;

  for (const event of events) {
    const occurrenceStarts = occurrenceStartsInRange(
      event,
      rangeStart,
      rangeEnd,
      zone,
    );
    if (occurrenceStarts.length === 0) {
      continue;
    }
    if (event.recurs_weekly) {
      exclusions.push({
        event,
        dates: occurrenceStarts.map((start) => occurrenceKey(start, zone)),
      });
    } else {
      deleteIds.push(event.id);
    }
    totalCount += occurrenceStarts.length;
  }

  return { deleteIds, exclusions, totalCount };
}

/**
 * Expand events (including weekly recurrences) into concrete occurrences
 * starting at `from`, sorted ascending. Recurrences without an end date
 * are expanded up to `horizonWeeks` ahead.
 */
export function upcomingOccurrences(
  events: EventRow[],
  from: Date,
  limit: number,
  zone: string,
  horizonWeeks = 12,
): EventOccurrence[] {
  const horizon = new Date(from);
  horizon.setDate(horizon.getDate() + horizonWeeks * 7);

  const occurrences: EventOccurrence[] = [];

  for (const event of events) {
    if (!event.recurs_weekly && new Date(event.ends_at) < from) {
      continue;
    }
    const durationMs = eventDurationMs(event);
    for (const start of occurrenceStartsInRange(
      event,
      from,
      horizon,
      zone,
    ).slice(0, limit)) {
      occurrences.push({
        event,
        start,
        end: new Date(start.getTime() + durationMs),
      });
    }
  }

  return occurrences
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limit);
}
