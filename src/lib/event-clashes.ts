import { DateTime } from "luxon";

import type {
  AvailabilityLookup,
  AvailabilityStatus,
} from "@/lib/availability";
import { slotForInstant, type WindowSlot } from "@/lib/schedule-window";
import type { Profile } from "@/lib/team";

/**
 * Roles that have to be in the server. Staff (manager, coach, analyst) are
 * skipped so a coach's blocked evening cannot stop a scrim being booked, and
 * bench players only count when they are attached to the event.
 */
const PLAYING_ROLES: ReadonlySet<Profile["role"]> = new Set(["igl", "player"]);

export type AvailabilitySlot = WindowSlot;

// A sanity bound: an event spanning longer than this is not something the
// availability grid can meaningfully describe, and we refuse to loop forever.
const MAX_SLOTS = 24 * 14;

/**
 * Every hourly cell the interval touches, including a partial final hour.
 *
 * Hours are walked in the TEAM's zone, because that is the zone the cells were
 * painted in. Walking them in the reader's zone checked a Moscow viewer's
 * bookings against the wrong row.
 */
export function slotsBetween(
  starts: Date,
  ends: Date,
  zone: string,
): AvailabilitySlot[] {
  if (!(starts < ends)) return [];
  const slots: AvailabilitySlot[] = [];
  let cursor = DateTime.fromJSDate(starts, { zone }).startOf("hour");
  if (!cursor.isValid) return [];
  while (cursor.toMillis() < ends.getTime() && slots.length < MAX_SLOTS) {
    slots.push(slotForInstant(cursor.toJSDate(), zone));
    cursor = cursor.plus({ hours: 1 });
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
  zone,
}: {
  starts: Date;
  ends: Date;
  members: readonly Profile[];
  substituteIds: readonly string[];
  lookup: AvailabilityLookup;
  /** The team's zone — the one the availability cells were painted in. */
  zone: string;
}): Clash[] {
  const slots = slotsBetween(starts, ends, zone);
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
