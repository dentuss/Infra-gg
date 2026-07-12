import type { EventInput } from "@fullcalendar/core";

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

export function dayAfter(dateOnly: string): string {
  const date = new Date(`${dateOnly}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return dateToKey(date);
}

function eventDurationMs(event: EventRow): number {
  return (
    new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()
  );
}

/**
 * Concrete occurrence start times of an event inside [rangeStart,
 * rangeEnd), honoring excluded dates. Weekly stepping uses calendar
 * days so wall-clock times survive DST changes.
 */
export function occurrenceStartsInRange(
  event: EventRow,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  if (!event.recurs_weekly) {
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);
    return start < rangeEnd && end > rangeStart ? [start] : [];
  }

  const until = event.recur_until
    ? new Date(`${event.recur_until}T23:59:59`)
    : null;
  const starts: Date[] = [];
  const cursor = new Date(event.starts_at);
  while (cursor < rangeStart) {
    cursor.setDate(cursor.getDate() + 7);
  }
  while ((until === null || cursor <= until) && cursor < rangeEnd) {
    if (!event.excluded_dates.includes(dateToKey(cursor))) {
      starts.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 7);
  }
  return starts;
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
): EventInput[] {
  return events.flatMap((event): EventInput[] => {
    const base: EventInput = {
      title: event.title,
      classNames: [`event-${event.type}`],
      extendedProps: { description: event.description },
    };

    if (!event.recurs_weekly) {
      return [
        { ...base, id: event.id, start: event.starts_at, end: event.ends_at },
      ];
    }

    const durationMs = eventDurationMs(event);
    return occurrenceStartsInRange(event, rangeStart, rangeEnd).map(
      (start) => ({
        ...base,
        id: `${event.id}::${dateToKey(start)}`,
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
): ClearPlan {
  const deleteIds: string[] = [];
  const exclusions: ClearPlan["exclusions"] = [];
  let totalCount = 0;

  for (const event of events) {
    const occurrenceStarts = occurrenceStartsInRange(
      event,
      rangeStart,
      rangeEnd,
    );
    if (occurrenceStarts.length === 0) {
      continue;
    }
    if (event.recurs_weekly) {
      exclusions.push({ event, dates: occurrenceStarts.map(dateToKey) });
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
    for (const start of occurrenceStartsInRange(event, from, horizon).slice(
      0,
      limit,
    )) {
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
