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
 * Short names for the curated zones. Intl returns "GMT+2" rather than "CEST"
 * for European zones in an English locale, and these are the names players
 * actually use, so the list is spelled out. `daylight` is omitted for zones
 * that do not change clocks.
 */
const ZONE_ABBREVIATIONS: Record<
  string,
  { standard: string; daylight?: string }
> = {
  "Europe/Berlin": { standard: "CET", daylight: "CEST" },
  "Europe/London": { standard: "GMT", daylight: "BST" },
  "Europe/Lisbon": { standard: "WET", daylight: "WEST" },
  "Europe/Kyiv": { standard: "EET", daylight: "EEST" },
  "Europe/Moscow": { standard: "MSK" },
  "Europe/Istanbul": { standard: "IST" },
  UTC: { standard: "UTC" },
};

/**
 * The zone's current short name — "CEST", "MSK". Falls back to whatever Intl
 * offers for a zone outside the curated list.
 */
export function zoneAbbreviation(zone: string, at: Date = new Date()): string {
  const dt = DateTime.fromJSDate(at, { zone });
  if (!dt.isValid) return zone;
  const known = ZONE_ABBREVIATIONS[zone];
  if (known) return (dt.isInDST && known.daylight) || known.standard;
  return dt.toFormat("ZZZZ");
}

/** The absolute offset from UTC — "GMT+2", or "UTC" at zero. */
export function zoneGmtLabel(zone: string, at: Date = new Date()): string {
  const dt = DateTime.fromJSDate(at, { zone });
  if (!dt.isValid) return "";
  const hours = dt.offset / 60;
  if (hours === 0) return "UTC";
  const whole = Math.trunc(hours);
  const minutes = Math.abs(Math.round((hours - whole) * 60));
  const sign = hours > 0 ? "+" : "-";
  return `GMT${sign}${Math.abs(whole)}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

/**
 * The real moment a stored availability slot refers to.
 *
 * A slot is `hour` on `day` **in the team's zone**, where hour 24 is midnight
 * of the following morning (the board day runs 10:00 → 03:00). Resolving it
 * here is what lets a viewer in another zone see the same slot relabelled
 * rather than shifted onto a different night.
 */
/**
 * The instant at a wall-clock offset from a day's midnight, in `zone`.
 * Minutes past 24h roll into the following days.
 *
 * The offset has to be applied as a CALENDAR quantity, not elapsed time. On the
 * day a zone leaves summer time the day is 25 hours long, so adding 20 hours to
 * midnight lands at 19:00 rather than the 20:00 the label promises. Days are
 * added with `plus` (calendar-aware) and the time of day is `set` (wall clock).
 */
export function wallClockInstant(
  day: string,
  minutesFromMidnight: number,
  zone: string,
): Date | null {
  const base = DateTime.fromISO(day, { zone });
  if (!base.isValid) return null;
  const total = Math.round(minutesFromMidnight);
  const dayOffset = Math.floor(total / 1440);
  const rest = total - dayOffset * 1440;
  const moment = base
    .startOf("day")
    .plus({ days: dayOffset })
    .set({
      hour: Math.floor(rest / 60),
      minute: rest % 60,
      second: 0,
      millisecond: 0,
    });
  return moment.isValid ? moment.toJSDate() : null;
}

/** The instant a grid hour begins. Hours run past 24 for the small hours. */
export function slotInstant(
  day: string,
  hour: number,
  teamZone: string,
): Date | null {
  return wallClockInstant(day, hour * 60, teamZone);
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
