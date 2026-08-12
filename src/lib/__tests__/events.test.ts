import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import {
  buildClearPlan,
  occurrenceKey,
  occurrenceStartsInRange,
  type EventRow,
} from "@/lib/events";

const BERLIN = "Europe/Berlin";

/** What the clock reads in the team's zone — the thing that must stay fixed. */
const berlinClock = (d: Date) =>
  DateTime.fromJSDate(d, { zone: BERLIN }).toFormat("yyyy-MM-dd HH:mm");

const event = (over: Partial<EventRow> = {}): EventRow =>
  ({
    id: "e1",
    title: "Scrim",
    description: null,
    type: "scrim",
    // Friday 2026-10-23, 20:00 Berlin (CEST, UTC+2).
    starts_at: "2026-10-23T18:00:00.000Z",
    ends_at: "2026-10-23T20:00:00.000Z",
    all_day: false,
    recurs_weekly: true,
    recur_until: null,
    excluded_dates: [],
    substitute_ids: [],
    created_by: "u1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  }) as EventRow;

const range = (from: string, to: string) => ({
  start: new Date(from),
  end: new Date(to),
});

describe("weekly recurrence across a DST change", () => {
  // Berlin leaves summer time on 2026-10-25. A series defined as "Friday at
  // 20:00" must stay at 20:00 Berlin on both sides of it, even though the two
  // occurrences are different UTC instants.
  it("keeps the team's wall clock, not a fixed UTC offset", () => {
    const { start, end } = range(
      "2026-10-20T00:00:00Z",
      "2026-11-07T00:00:00Z",
    );
    const starts = occurrenceStartsInRange(event(), start, end, BERLIN);

    expect(starts.map(berlinClock)).toEqual([
      "2026-10-23 20:00",
      "2026-10-30 20:00",
      "2026-11-06 20:00",
    ]);

    // ...and the underlying instants really do differ by the DST hour.
    expect(starts[0]?.toISOString()).toBe("2026-10-23T18:00:00.000Z");
    expect(starts[1]?.toISOString()).toBe("2026-10-30T19:00:00.000Z");
  });
});

describe("occurrence keys", () => {
  // A 01:00 session is 23:00 the previous day in UTC. Excluding it has to match
  // the date the team sees, not the one a UTC browser would compute.
  it("uses the team's date for an after-midnight start", () => {
    const lateNight = new Date("2026-08-13T23:00:00.000Z"); // 01:00 Berlin, 14th
    expect(occurrenceKey(lateNight, BERLIN)).toBe("2026-08-14");
    expect(occurrenceKey(lateNight, "UTC")).toBe("2026-08-13");
  });

  it("excludes the occurrence the team would name", () => {
    const lateSeries = event({
      starts_at: "2026-08-13T23:00:00.000Z", // Fri 14 Aug, 01:00 Berlin
      ends_at: "2026-08-14T01:00:00.000Z",
      excluded_dates: ["2026-08-21"],
    });
    const { start, end } = range(
      "2026-08-10T00:00:00Z",
      "2026-08-31T00:00:00Z",
    );
    const keys = occurrenceStartsInRange(lateSeries, start, end, BERLIN).map(
      (d) => occurrenceKey(d, BERLIN),
    );
    expect(keys).toEqual(["2026-08-14", "2026-08-28"]);
  });
});

describe("recurrence bounds", () => {
  it("treats recur_until as inclusive to the end of that day", () => {
    const bounded = event({ recur_until: "2026-10-30" });
    const { start, end } = range(
      "2026-10-20T00:00:00Z",
      "2026-11-30T00:00:00Z",
    );
    expect(
      occurrenceStartsInRange(bounded, start, end, BERLIN).map(berlinClock),
    ).toEqual(["2026-10-23 20:00", "2026-10-30 20:00"]);
  });

  it("leaves one-off events alone", () => {
    const once = event({ recurs_weekly: false });
    const { start, end } = range(
      "2026-10-20T00:00:00Z",
      "2026-11-07T00:00:00Z",
    );
    expect(
      occurrenceStartsInRange(once, start, end, BERLIN).map(berlinClock),
    ).toEqual(["2026-10-23 20:00"]);
  });

  it("returns nothing for an unparseable start rather than looping", () => {
    const broken = event({ starts_at: "not-a-timestamp" });
    const { start, end } = range(
      "2026-10-20T00:00:00Z",
      "2026-11-07T00:00:00Z",
    );
    expect(occurrenceStartsInRange(broken, start, end, BERLIN)).toEqual([]);
  });
});

describe("clear plan", () => {
  it("lists exclusion dates in the team's zone", () => {
    const lateSeries = event({
      starts_at: "2026-08-13T23:00:00.000Z", // 01:00 Berlin on the 14th
      ends_at: "2026-08-14T01:00:00.000Z",
    });
    const { start, end } = range(
      "2026-08-10T00:00:00Z",
      "2026-08-24T00:00:00Z",
    );
    const plan = buildClearPlan([lateSeries], start, end, BERLIN);

    expect(plan.deleteIds).toEqual([]);
    expect(plan.exclusions[0]?.dates).toEqual(["2026-08-14", "2026-08-21"]);
    expect(plan.totalCount).toBe(2);
  });

  it("deletes one-off events outright", () => {
    const once = event({ recurs_weekly: false });
    const { start, end } = range(
      "2026-10-20T00:00:00Z",
      "2026-11-07T00:00:00Z",
    );
    const plan = buildClearPlan([once], start, end, BERLIN);
    expect(plan.deleteIds).toEqual(["e1"]);
    expect(plan.exclusions).toEqual([]);
  });
});
