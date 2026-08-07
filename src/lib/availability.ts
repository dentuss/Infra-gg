import { dateToKey } from "@/lib/events";
import type { Enums, Tables } from "@/types/database";

export type AvailabilityStatus = Enums<"availability_status">;
export type AvailabilityRow = Tables<"availability">;
export type AvailabilityDefaultRow = Tables<"availability_defaults">;

/** Cycled by clicking a cell; a fourth click clears back to unset. */
export const STATUS_CYCLE: readonly AvailabilityStatus[] = [
  "available",
  "maybe",
  "unavailable",
];

/**
 * Hours are numbered against the calendar's own day window, which runs
 * 10:00 → 03:00 (`slotMinTime` 10:00, `slotMaxTime` 27:00 in team-calendar).
 * Hour 24 is midnight, 25 is 01:00, 26 is 02:00 of the following morning.
 * Numbering them against the day they are *displayed* under keeps this grid
 * and the schedule in agreement about which night a late scrim belongs to.
 */
export const DAY_START_HOUR = 10;
export const DAY_END_HOUR = 27;

export const DAY_HOURS: readonly number[] = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, index) => DAY_START_HOUR + index,
);

/** 14 → "14:00", 24 → "00:00", 26 → "02:00". */
export function hourLabel(hour: number): string {
  return `${String(hour % 24).padStart(2, "0")}:00`;
}

/** ISO weekday index used by `availability_defaults`: Monday 0 … Sunday 6. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** The Monday on or before `date`, at local midnight. */
export function startOfWeek(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - weekdayIndex(monday));
  return monday;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** The seven dates of the week containing `date`, Monday first. */
export function weekDays(date: Date): Date[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function cellKey(userId: string, day: string, hour: number): string {
  return `${userId}|${day}|${hour}`;
}

function defaultKey(userId: string, weekday: number, hour: number): string {
  return `${userId}|${weekday}|${hour}`;
}

export type AvailabilityLookup = {
  /**
   * The status shown for a cell, or null when the player has said nothing.
   * An explicit entry for the date always wins; otherwise the player's
   * typical-week default for that weekday applies. Resolution is per hour,
   * so marking one evening hour does not blank the rest of that day.
   */
  statusAt: (
    userId: string,
    day: string,
    hour: number,
  ) => AvailabilityStatus | null;
  /** Whether the cell comes from the typical week rather than an explicit set. */
  isDefaulted: (userId: string, day: string, hour: number) => boolean;
};

export function buildAvailabilityLookup(
  rows: readonly AvailabilityRow[],
  defaults: readonly AvailabilityDefaultRow[],
  weekdayFor: (day: string) => number,
): AvailabilityLookup {
  const explicit = new Map<string, AvailabilityStatus>();
  for (const row of rows) {
    explicit.set(cellKey(row.user_id, row.day, row.hour), row.status);
  }

  const typical = new Map<string, AvailabilityStatus>();
  for (const row of defaults) {
    typical.set(defaultKey(row.user_id, row.weekday, row.hour), row.status);
  }

  const resolve = (userId: string, day: string, hour: number) => {
    const own = explicit.get(cellKey(userId, day, hour));
    if (own) return { status: own, defaulted: false };
    const fallback = typical.get(defaultKey(userId, weekdayFor(day), hour));
    return fallback
      ? { status: fallback, defaulted: true }
      : { status: null, defaulted: false };
  };

  return {
    statusAt: (userId, day, hour) => resolve(userId, day, hour).status,
    isDefaulted: (userId, day, hour) => resolve(userId, day, hour).defaulted,
  };
}

/** Next status when a cell is clicked; wraps past `unavailable` to unset. */
export function nextStatus(
  current: AvailabilityStatus | null,
): AvailabilityStatus | null {
  if (!current) return STATUS_CYCLE[0] ?? null;
  const index = STATUS_CYCLE.indexOf(current);
  return index === STATUS_CYCLE.length - 1
    ? null
    : (STATUS_CYCLE[index + 1] ?? null);
}

export type TeamSlotSummary = {
  available: number;
  maybe: number;
  unavailable: number;
  unset: number;
};

/**
 * How the roster stands for one hour. Drives the overlap strip that answers
 * the only question this page exists for: when can everyone actually play?
 */
export function summariseSlot(
  userIds: readonly string[],
  day: string,
  hour: number,
  lookup: AvailabilityLookup,
): TeamSlotSummary {
  const summary: TeamSlotSummary = {
    available: 0,
    maybe: 0,
    unavailable: 0,
    unset: 0,
  };
  for (const userId of userIds) {
    const status = lookup.statusAt(userId, day, hour);
    if (status === "available") summary.available += 1;
    else if (status === "maybe") summary.maybe += 1;
    else if (status === "unavailable") summary.unavailable += 1;
    else summary.unset += 1;
  }
  return summary;
}

/** A slot everyone has explicitly marked available — the one to schedule on. */
export function isFullHouse(
  summary: TeamSlotSummary,
  rosterSize: number,
): boolean {
  return rosterSize > 0 && summary.available === rosterSize;
}

export { dateToKey };
