import type { EventInput } from "@fullcalendar/core";

import type { Tables } from "@/types/database";

export type EventRow = Tables<"events">;

export type EventOccurrence = {
  event: EventRow;
  start: Date;
  end: Date;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Format an ISO timestamp for a datetime-local input, in local time. */
export function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localTimeOfDay(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

/** recur_until is inclusive; FullCalendar's endRecur is exclusive. */
function dayAfter(dateOnly: string): string {
  const date = new Date(`${dateOnly}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toCalendarEvent(event: EventRow): EventInput {
  const base: EventInput = {
    id: event.id,
    title: event.title,
    allDay: event.all_day,
    classNames: [`event-${event.type}`],
  };

  if (event.recurs_weekly) {
    return {
      ...base,
      daysOfWeek: [new Date(event.starts_at).getDay()],
      startTime: localTimeOfDay(event.starts_at),
      endTime: localTimeOfDay(event.ends_at),
      startRecur: event.starts_at,
      endRecur: event.recur_until ? dayAfter(event.recur_until) : undefined,
      // Recurring events are edited through the dialog; dragging a
      // single instance of a series is ambiguous.
      editable: false,
    };
  }

  return { ...base, start: event.starts_at, end: event.ends_at };
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
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);

    if (!event.recurs_weekly) {
      if (end >= from) {
        occurrences.push({ event, start, end });
      }
      continue;
    }

    const durationMs = end.getTime() - start.getTime();
    const until = event.recur_until
      ? new Date(`${event.recur_until}T23:59:59`)
      : horizon;

    // Step in calendar weeks (not fixed milliseconds) so wall-clock
    // times survive DST changes.
    const cursor = new Date(start);
    while (cursor < from) {
      cursor.setDate(cursor.getDate() + 7);
    }

    let produced = 0;
    while (cursor <= until && cursor <= horizon && produced < limit) {
      occurrences.push({
        event,
        start: new Date(cursor),
        end: new Date(cursor.getTime() + durationMs),
      });
      cursor.setDate(cursor.getDate() + 7);
      produced += 1;
    }
  }

  return occurrences
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limit);
}
