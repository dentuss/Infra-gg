import {
  dateToKey,
  DAY_START_HOUR,
  type AvailabilityLookup,
  type AvailabilityStatus,
} from "@/lib/availability";
import type { Profile } from "@/lib/team";

/**
 * Roles that have to be in the server. Staff (manager, coach, analyst) are
 * skipped so a coach's blocked evening cannot stop a scrim being booked, and
 * bench players only count when they are attached to the event.
 */
const PLAYING_ROLES: ReadonlySet<Profile["role"]> = new Set(["igl", "player"]);

export type AvailabilitySlot = { day: string; hour: number };

/**
 * Which availability cell a moment in time falls in.
 *
 * The board day runs 10:00 → 03:00, so anything before 10:00 belongs to the
 * previous day's column as hour 24+ — the same rule FullCalendar applies via
 * `nextDayThreshold`. Without this a 01:00 scrim would be checked against
 * Saturday morning rather than the Friday night it is displayed under.
 */
export function slotForDate(date: Date): AvailabilitySlot {
  const hour = date.getHours();
  if (hour >= DAY_START_HOUR) {
    return { day: dateToKey(date), hour };
  }
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return { day: dateToKey(previous), hour: hour + 24 };
}

// A sanity bound: an event spanning longer than this is not something the
// availability grid can meaningfully describe, and we refuse to loop forever.
const MAX_SLOTS = 24 * 14;

/** Every hourly cell the interval touches, including a partial final hour. */
export function slotsBetween(starts: Date, ends: Date): AvailabilitySlot[] {
  if (!(starts < ends)) return [];
  const slots: AvailabilitySlot[] = [];
  const cursor = new Date(starts);
  cursor.setMinutes(0, 0, 0);
  while (cursor < ends && slots.length < MAX_SLOTS) {
    slots.push(slotForDate(cursor));
    cursor.setHours(cursor.getHours() + 1);
  }
  return slots;
}

export type Clash = {
  userId: string;
  username: string;
  status: AvailabilityStatus;
  /** The clashing hours, in the grid's numbering (24 = midnight). */
  hours: number[];
};

/**
 * Players who said they cannot make the event's hours.
 *
 * `unavailable` is a real clash; `maybe` is reported alongside it so staff know
 * who to ask, but it does not block — otherwise "ask me" would behave exactly
 * like "no" and nobody would use it. Unset never clashes: silence is not a
 * refusal.
 */
export function findClashes({
  starts,
  ends,
  members,
  substituteIds,
  lookup,
}: {
  starts: Date;
  ends: Date;
  members: readonly Profile[];
  substituteIds: readonly string[];
  lookup: AvailabilityLookup;
}): Clash[] {
  const slots = slotsBetween(starts, ends);
  if (slots.length === 0) return [];

  const attached = new Set(substituteIds);
  const expected = members.filter(
    (member) => PLAYING_ROLES.has(member.role) || attached.has(member.id),
  );

  const clashes: Clash[] = [];
  for (const member of expected) {
    const byStatus = new Map<AvailabilityStatus, number[]>();
    for (const slot of slots) {
      const status = lookup.statusAt(member.id, slot.day, slot.hour);
      if (status !== "unavailable" && status !== "maybe") continue;
      const hours = byStatus.get(status);
      if (hours) hours.push(slot.hour);
      else byStatus.set(status, [slot.hour]);
    }
    // A player marked red for part of the window and amber for the rest is
    // reported once per status, worst first.
    for (const status of ["unavailable", "maybe"] as const) {
      const hours = byStatus.get(status);
      if (hours) {
        clashes.push({
          userId: member.id,
          username: member.username,
          status,
          hours,
        });
      }
    }
  }

  // Blocking clashes first, then alphabetical, so the list reads consistently.
  return clashes.sort(
    (a, b) =>
      Number(b.status === "unavailable") - Number(a.status === "unavailable") ||
      a.username.localeCompare(b.username),
  );
}

/** Only a red marker stops the save; amber is advisory. */
export function hasBlockingClash(clashes: readonly Clash[]): boolean {
  return clashes.some((clash) => clash.status === "unavailable");
}
