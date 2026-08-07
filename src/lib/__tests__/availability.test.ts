import { describe, expect, it } from "vitest";

import {
  buildAvailabilityLookup,
  dateToKey,
  DAY_HOURS,
  hourLabel,
  isFullHouse,
  nextStatus,
  startOfWeek,
  summariseSlot,
  weekdayIndex,
  weekDays,
  type AvailabilityDefaultRow,
  type AvailabilityRow,
} from "@/lib/availability";

const row = (
  user_id: string,
  day: string,
  hour: number,
  status: AvailabilityRow["status"],
): AvailabilityRow => ({
  user_id,
  day,
  hour,
  status,
  updated_at: "2026-08-07T00:00:00Z",
});

const fallback = (
  user_id: string,
  weekday: number,
  hour: number,
  status: AvailabilityDefaultRow["status"],
): AvailabilityDefaultRow => ({
  user_id,
  weekday,
  hour,
  status,
  updated_at: "2026-08-07T00:00:00Z",
});

// 2026-08-07 is a Friday.
const FRIDAY = "2026-08-07";
const weekdayFor = (day: string) => weekdayIndex(new Date(`${day}T00:00:00`));

describe("hour numbering", () => {
  it("covers the calendar's own 10:00 to 03:00 window", () => {
    expect(DAY_HOURS[0]).toBe(10);
    expect(DAY_HOURS.at(-1)).toBe(26);
    expect(DAY_HOURS).toHaveLength(17);
  });

  it("labels past-midnight hours as the small hours", () => {
    expect(hourLabel(10)).toBe("10:00");
    expect(hourLabel(23)).toBe("23:00");
    expect(hourLabel(24)).toBe("00:00");
    expect(hourLabel(26)).toBe("02:00");
  });
});

describe("week maths", () => {
  it("treats Monday as the first day", () => {
    expect(weekdayIndex(new Date("2026-08-03T00:00:00"))).toBe(0); // Monday
    expect(weekdayIndex(new Date("2026-08-07T00:00:00"))).toBe(4); // Friday
    expect(weekdayIndex(new Date("2026-08-09T00:00:00"))).toBe(6); // Sunday
  });

  it("snaps any day to the Monday of its week", () => {
    expect(dateToKey(startOfWeek(new Date("2026-08-07T12:00:00")))).toBe(
      "2026-08-03",
    );
    // A Sunday belongs to the week that started six days earlier, not the next.
    expect(dateToKey(startOfWeek(new Date("2026-08-09T23:00:00")))).toBe(
      "2026-08-03",
    );
    expect(dateToKey(startOfWeek(new Date("2026-08-03T00:00:00")))).toBe(
      "2026-08-03",
    );
  });

  it("returns seven consecutive days, Monday first", () => {
    const days = weekDays(new Date("2026-08-07T00:00:00")).map(dateToKey);
    expect(days).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
    ]);
  });

  it("crosses a month boundary without losing a day", () => {
    const days = weekDays(new Date("2026-09-02T00:00:00")).map(dateToKey);
    expect(days).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
  });
});

describe("status cycle", () => {
  it("steps green to yellow to red, then back to unset", () => {
    expect(nextStatus(null)).toBe("available");
    expect(nextStatus("available")).toBe("maybe");
    expect(nextStatus("maybe")).toBe("unavailable");
    expect(nextStatus("unavailable")).toBeNull();
  });
});

describe("resolving a cell against the typical week", () => {
  it("returns null when the player has said nothing at all", () => {
    const lookup = buildAvailabilityLookup([], [], weekdayFor);
    expect(lookup.statusAt("u1", FRIDAY, 20)).toBeNull();
    expect(lookup.isDefaulted("u1", FRIDAY, 20)).toBe(false);
  });

  it("falls back to the weekday default, flagged as defaulted", () => {
    const lookup = buildAvailabilityLookup(
      [],
      [fallback("u1", 4, 20, "available")],
      weekdayFor,
    );
    expect(lookup.statusAt("u1", FRIDAY, 20)).toBe("available");
    expect(lookup.isDefaulted("u1", FRIDAY, 20)).toBe(true);
  });

  it("lets an explicit entry for the date beat the default", () => {
    const lookup = buildAvailabilityLookup(
      [row("u1", FRIDAY, 20, "unavailable")],
      [fallback("u1", 4, 20, "available")],
      weekdayFor,
    );
    expect(lookup.statusAt("u1", FRIDAY, 20)).toBe("unavailable");
    expect(lookup.isDefaulted("u1", FRIDAY, 20)).toBe(false);
  });

  // The bug this guards: a per-day override model would blank the rest of
  // the day the moment one hour was touched.
  it("resolves per hour, so one override leaves the other hours defaulted", () => {
    const lookup = buildAvailabilityLookup(
      [row("u1", FRIDAY, 20, "unavailable")],
      [
        fallback("u1", 4, 20, "available"),
        fallback("u1", 4, 21, "available"),
        fallback("u1", 4, 22, "maybe"),
      ],
      weekdayFor,
    );
    expect(lookup.statusAt("u1", FRIDAY, 20)).toBe("unavailable");
    expect(lookup.statusAt("u1", FRIDAY, 21)).toBe("available");
    expect(lookup.statusAt("u1", FRIDAY, 22)).toBe("maybe");
  });

  it("keeps players apart", () => {
    const lookup = buildAvailabilityLookup(
      [row("u1", FRIDAY, 20, "available")],
      [fallback("u2", 4, 20, "unavailable")],
      weekdayFor,
    );
    expect(lookup.statusAt("u1", FRIDAY, 20)).toBe("available");
    expect(lookup.statusAt("u2", FRIDAY, 20)).toBe("unavailable");
    expect(lookup.statusAt("u3", FRIDAY, 20)).toBeNull();
  });

  it("does not leak a default across weekdays", () => {
    const lookup = buildAvailabilityLookup(
      [],
      [fallback("u1", 4, 20, "available")], // Friday only
      weekdayFor,
    );
    expect(lookup.statusAt("u1", "2026-08-07", 20)).toBe("available"); // Fri
    expect(lookup.statusAt("u1", "2026-08-06", 20)).toBeNull(); // Thu
  });
});

describe("team overlap summary", () => {
  const roster = ["u1", "u2", "u3"];

  it("counts each status, treating silence as unset", () => {
    const lookup = buildAvailabilityLookup(
      [
        row("u1", FRIDAY, 20, "available"),
        row("u2", FRIDAY, 20, "maybe"),
        // u3 has said nothing
      ],
      [],
      weekdayFor,
    );
    expect(summariseSlot(roster, FRIDAY, 20, lookup)).toEqual({
      available: 1,
      maybe: 1,
      unavailable: 0,
      unset: 1,
    });
  });

  it("only calls a full house when everyone is explicitly available", () => {
    const all = buildAvailabilityLookup(
      roster.map((id) => row(id, FRIDAY, 20, "available")),
      [],
      weekdayFor,
    );
    expect(isFullHouse(summariseSlot(roster, FRIDAY, 20, all), 3)).toBe(true);

    // One silent player is not a yes.
    const partial = buildAvailabilityLookup(
      [row("u1", FRIDAY, 20, "available"), row("u2", FRIDAY, 20, "available")],
      [],
      weekdayFor,
    );
    expect(isFullHouse(summariseSlot(roster, FRIDAY, 20, partial), 3)).toBe(
      false,
    );
  });

  it("counts a defaulted available as available", () => {
    const lookup = buildAvailabilityLookup(
      [],
      roster.map((id) => fallback(id, 4, 20, "available")),
      weekdayFor,
    );
    expect(isFullHouse(summariseSlot(roster, FRIDAY, 20, lookup), 3)).toBe(
      true,
    );
  });

  it("never reports a full house for an empty roster", () => {
    const lookup = buildAvailabilityLookup([], [], weekdayFor);
    expect(isFullHouse(summariseSlot([], FRIDAY, 20, lookup), 0)).toBe(false);
  });
});
