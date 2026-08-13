import { DateTime } from "luxon";

import { DAY_END_HOUR, DAY_START_HOUR } from "@/lib/availability";
import { wallClockInstant } from "@/lib/timezone";

/**
 * The schedule and the availability grid share one window: 10:00 → 03:00 in the
 * TEAM's zone. Everything here works in that zone, never the reader's — a
 * viewer in Moscow sees the same seventeen rows relabelled, not a different
 * seventeen hours.
 */
export const WINDOW_HOURS = DAY_END_HOUR - DAY_START_HOUR;
export const WINDOW_MINUTES = WINDOW_HOURS * 60;

export type WindowSlot = { day: string; hour: number };

/**
 * Which day-column and hour an instant belongs to.
 *
 * Hours run past 24: 01:00 is hour 25 of the previous day, because a scrim that
 * starts after midnight belongs to the night it began on, not to the morning
 * its calendar date happens to fall in.
 */
export function slotForInstant(instant: Date, zone: string): WindowSlot {
  const dt = DateTime.fromJSDate(instant, { zone });
  if (dt.hour >= DAY_START_HOUR) {
    return { day: dt.toFormat("yyyy-MM-dd"), hour: dt.hour };
  }
  return {
    day: dt.minus({ days: 1 }).toFormat("yyyy-MM-dd"),
    hour: dt.hour + 24,
  };
}

/**
 * Minutes from the top of `day`'s window. Negative before it, greater than
 * WINDOW_MINUTES after it — callers clamp; this reports the truth so a caller
 * can tell "starts earlier than we show" from "starts at the top".
 */
export function minutesIntoWindow(
  instant: Date,
  day: string,
  zone: string,
): number | null {
  // Same calendar-vs-elapsed trap: on the day a zone leaves summer time, the
  // window opens 25 hours after the previous midnight, not 24.
  const top = wallClockInstant(day, DAY_START_HOUR * 60, zone);
  if (!top) return null;
  return (instant.getTime() - top.getTime()) / 60_000;
}

/** Dragging snaps to this, so a scrim lands on a sensible boundary. */
export const SNAP_MINUTES = 15;

/** Nothing may be dragged shorter than this. */
export const MIN_DURATION_MINUTES = 15;

export function snapMinutes(minutes: number, step = SNAP_MINUTES): number {
  return Math.round(minutes / step) * step;
}

export function clampMinute(minutes: number): number {
  return Math.min(WINDOW_MINUTES, Math.max(0, minutes));
}

/**
 * The instant a given number of minutes into a day's window, in the team's
 * zone. Built by adding to the day's start rather than to a fixed offset, so a
 * DST change lands on the resulting instant and not the nominal one.
 */
export function instantAtMinute(
  day: string,
  minutes: number,
  zone: string,
): Date | null {
  return wallClockInstant(day, DAY_START_HOUR * 60 + minutes, zone);
}

export type MinuteRange = { from: number; to: number };

/**
 * The range a drag-to-create gesture describes. Dragging upward is the same
 * gesture as dragging down, so the anchor may end up as either edge.
 */
export function createRange(anchor: number, pointer: number): MinuteRange {
  const a = snapMinutes(anchor);
  const b = snapMinutes(pointer);
  const from = Math.min(a, b);
  const to = Math.max(a, b);
  return clampRange({
    from,
    to: to - from < MIN_DURATION_MINUTES ? from + MIN_DURATION_MINUTES : to,
  });
}

/** Slide a range without changing how long it is, keeping it inside the day. */
export function moveRange(range: MinuteRange, from: number): MinuteRange {
  const duration = range.to - range.from;
  const start = Math.min(
    WINDOW_MINUTES - duration,
    Math.max(0, snapMinutes(from)),
  );
  return { from: start, to: start + duration };
}

/** Drag one edge past the other and the range would invert, so it does not. */
export function resizeRange(
  range: MinuteRange,
  edge: "start" | "end",
  pointer: number,
): MinuteRange {
  const at = clampMinute(snapMinutes(pointer));
  if (edge === "start") {
    return {
      from: Math.min(at, range.to - MIN_DURATION_MINUTES),
      to: range.to,
    };
  }
  return {
    from: range.from,
    to: Math.max(at, range.from + MIN_DURATION_MINUTES),
  };
}

function clampRange({ from, to }: MinuteRange): MinuteRange {
  if (to > WINDOW_MINUTES) {
    return {
      from: Math.max(0, WINDOW_MINUTES - (to - from)),
      to: WINDOW_MINUTES,
    };
  }
  return { from: Math.max(0, from), to };
}

export type Placed<T> = {
  item: T;
  /** Day column this block is drawn in. */
  day: string;
  /**
   * Minutes from the top of the window, clamped to it. Minutes rather than
   * percentages because the grid lays out on a fixed row pitch, and only the
   * caller knows what a minute is worth in pixels.
   */
  from: number;
  to: number;
  /** The event runs beyond the window at this edge. */
  clippedTop: boolean;
  clippedBottom: boolean;
  /** Horizontal share, for events that overlap in time. */
  column: number;
  columns: number;
};

/** Small events still need to be clickable, so they get a floor. */
const MIN_MINUTES = 15;

type Range = { start: Date; end: Date };

/**
 * Lays events onto their day columns.
 *
 * Overlapping events share the column's width. Sharing is decided per
 * *cluster* — a run of events connected by overlap — so three events that
 * chain A-B, B-C all render at one third rather than A and C silently
 * overlapping because neither touches the other directly.
 */
export function placeEvents<T>(
  items: readonly T[],
  rangeOf: (item: T) => Range,
  days: readonly string[],
  zone: string,
): Placed<T>[] {
  const byDay = new Map<string, { item: T; from: number; to: number }[]>();
  const visible = new Set(days);

  for (const item of items) {
    const { start, end } = rangeOf(item);
    // An event is drawn in the column its START belongs to, so a session
    // running past 03:00 stays on the night it began.
    const { day } = slotForInstant(start, zone);
    if (!visible.has(day)) continue;

    const from = minutesIntoWindow(start, day, zone);
    const to = minutesIntoWindow(end, day, zone);
    if (from === null || to === null || to <= 0 || from >= WINDOW_MINUTES) {
      continue;
    }
    const bucket = byDay.get(day) ?? [];
    bucket.push({ item, from, to });
    byDay.set(day, bucket);
  }

  const placed: Placed<T>[] = [];

  for (const [day, entries] of byDay) {
    entries.sort((a, b) => a.from - b.from || b.to - a.to);

    // Walk the day once, breaking it into clusters of connected overlap.
    let cluster: typeof entries = [];
    let clusterEnd = -Infinity;

    const flush = () => {
      if (cluster.length === 0) return;
      const columnEnds: number[] = [];
      const assigned = cluster.map((entry) => {
        let column = columnEnds.findIndex((end) => end <= entry.from);
        if (column === -1) {
          column = columnEnds.length;
        }
        columnEnds[column] = entry.to;
        return { entry, column };
      });
      const columns = columnEnds.length;
      for (const { entry, column } of assigned) {
        const from = Math.max(0, entry.from);
        const to = Math.min(WINDOW_MINUTES, entry.to);
        placed.push({
          item: entry.item,
          day,
          from,
          to: Math.max(to, from + MIN_MINUTES),
          clippedTop: entry.from < 0,
          clippedBottom: entry.to > WINDOW_MINUTES,
          column,
          columns,
        });
      }
      cluster = [];
      clusterEnd = -Infinity;
    };

    for (const entry of entries) {
      if (entry.from >= clusterEnd) flush();
      cluster.push(entry);
      clusterEnd = Math.max(clusterEnd, entry.to);
    }
    flush();
  }

  return placed;
}

/**
 * Where "now" sits in a day's column, in minutes from the top, or null when the
 * current moment falls outside that day's window.
 */
export function nowOffset(now: Date, day: string, zone: string): number | null {
  const minutes = minutesIntoWindow(now, day, zone);
  if (minutes === null || minutes < 0 || minutes > WINDOW_MINUTES) return null;
  return minutes;
}
