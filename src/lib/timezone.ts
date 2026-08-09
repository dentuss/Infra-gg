import { DateTime } from "luxon";

/**
 * The zones a European roster realistically spans. Short enough to scan in a
 * dropdown; extend the list rather than opening all ~400 IANA zones.
 */
export const TEAM_ZONES = [
  "Europe/Berlin",
  "Europe/London",
  "Europe/Lisbon",
  "Europe/Kyiv",
  "Europe/Moscow",
  "Europe/Istanbul",
  "UTC",
] as const;

export type TeamZone = (typeof TEAM_ZONES)[number];

/** The zone used when the team has not chosen one. */
export const FALLBACK_ZONE = "Europe/Berlin";

export function isKnownZone(zone: string | null | undefined): zone is string {
  return !!zone && DateTime.local().setZone(zone).isValid;
}

/** The zone a viewer sees times in: their own choice, else the team's. */
export function resolveViewZone(
  personal: string | null | undefined,
  team: string | null | undefined,
): string {
  if (isKnownZone(personal)) return personal;
  if (isKnownZone(team)) return team;
  return FALLBACK_ZONE;
}

/** "Europe/Berlin" → "Berlin", for a compact dropdown label. */
export function zoneCityName(zone: string): string {
  const city = zone.split("/").pop() ?? zone;
  return city.replace(/_/g, " ");
}

/**
 * The zone's current short name — "CEST", "MSK", "GMT+3". Shown next to the
 * picker because that is how players actually talk about times.
 */
export function zoneAbbreviation(zone: string, at: Date = new Date()): string {
  const dt = DateTime.fromJSDate(at, { zone });
  if (!dt.isValid) return zone;
  return dt.toFormat("ZZZZ");
}

/**
 * The real moment a stored availability slot refers to.
 *
 * A slot is `hour` on `day` **in the team's zone**, where hour 24 is midnight
 * of the following morning (the board day runs 10:00 → 03:00). Resolving it
 * here is what lets a viewer in another zone see the same slot relabelled
 * rather than shifted onto a different night.
 */
export function slotInstant(
  day: string,
  hour: number,
  teamZone: string,
): Date | null {
  const base = DateTime.fromISO(day, { zone: teamZone });
  if (!base.isValid) return null;
  // `plus` rather than `set`, so hours past 24 roll into the next day and DST
  // is applied at the resulting instant rather than the nominal one.
  const moment = base.startOf("day").plus({ hours: hour });
  return moment.isValid ? moment.toJSDate() : null;
}

/**
 * How a slot reads on the viewer's clock: "20:00" in team time becomes "21:00"
 * for someone viewing in Moscow. Falls back to the team-time label if the slot
 * cannot be resolved.
 */
export function slotLabelInZone(
  day: string,
  hour: number,
  teamZone: string,
  viewZone: string,
): string {
  const instant = slotInstant(day, hour, teamZone);
  if (!instant) return `${String(hour % 24).padStart(2, "0")}:00`;
  return DateTime.fromJSDate(instant, { zone: viewZone }).toFormat("HH:mm");
}

/**
 * Whole hours between two zones at a given moment — positive when `viewZone` is
 * ahead. Used to caption the picker, not for conversion; real conversions go
 * through luxon so partial-hour zones and DST are handled properly.
 */
export function zoneOffsetHours(
  teamZone: string,
  viewZone: string,
  at: Date = new Date(),
): number {
  const team = DateTime.fromJSDate(at, { zone: teamZone });
  const view = DateTime.fromJSDate(at, { zone: viewZone });
  if (!team.isValid || !view.isValid) return 0;
  return (view.offset - team.offset) / 60;
}
