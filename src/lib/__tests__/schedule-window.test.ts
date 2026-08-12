import { describe, expect, it } from "vitest";

import {
  minutesIntoWindow,
  nowOffset,
  placeEvents,
  slotForInstant,
  WINDOW_MINUTES,
} from "@/lib/schedule-window";

const BERLIN = "Europe/Berlin";
const FRI = "2026-08-14";

/** An instant expressed as Berlin wall-clock, which is how the team thinks. */
const at = (iso: string) => new Date(iso);

describe("which column an instant belongs to", () => {
  it("uses the clock hour during the evening", () => {
    // 20:00 Berlin on the 14th = 18:00Z
    expect(slotForInstant(at("2026-08-14T18:00:00Z"), BERLIN)).toEqual({
      day: FRI,
      hour: 20,
    });
  });

  // The whole point: a 01:00 scrim belongs to the night it began.
  it("files after-midnight onto the previous night", () => {
    // 01:00 Berlin on the 15th = 23:00Z on the 14th
    expect(slotForInstant(at("2026-08-14T23:00:00Z"), BERLIN)).toEqual({
      day: FRI,
      hour: 25,
    });
  });

  // The old browser-local version read the reader's clock, so a Moscow viewer
  // filed this instant an hour off. Same night either way — different row.
  it("gives a different slot per zone for the same instant", () => {
    const instant = at("2026-08-14T23:00:00Z");
    expect(slotForInstant(instant, BERLIN)).toEqual({ day: FRI, hour: 25 });
    expect(slotForInstant(instant, "Europe/Moscow")).toEqual({
      day: FRI,
      hour: 26,
    });
  });
});

describe("vertical position within a day", () => {
  it("measures from 10:00 team time", () => {
    expect(minutesIntoWindow(at("2026-08-14T08:00:00Z"), FRI, BERLIN)).toBe(0);
    expect(minutesIntoWindow(at("2026-08-14T18:00:00Z"), FRI, BERLIN)).toBe(
      600,
    );
  });

  it("reports outside the window rather than clamping", () => {
    expect(minutesIntoWindow(at("2026-08-14T07:00:00Z"), FRI, BERLIN)).toBe(
      -60,
    );
    expect(minutesIntoWindow(at("2026-08-15T02:00:00Z"), FRI, BERLIN)).toBe(
      WINDOW_MINUTES + 60,
    );
  });
});

type Ev = { id: string; start: Date; end: Date };
const ev = (id: string, start: string, end: string): Ev => ({
  id,
  start: at(start),
  end: at(end),
});
const rangeOf = (e: Ev) => ({ start: e.start, end: e.end });

describe("placing events", () => {
  it("positions a simple evening event", () => {
    const [block] = placeEvents(
      [ev("a", "2026-08-14T18:00:00Z", "2026-08-14T20:00:00Z")],
      rangeOf,
      [FRI],
      BERLIN,
    );
    expect(block?.day).toBe(FRI);
    // 20:00 is 600 minutes into a window that opens at 10:00.
    expect(block?.from).toBe(600);
    expect(block?.to).toBe(720);
    expect(block?.columns).toBe(1);
  });

  it("draws a past-midnight event on the night it started", () => {
    const [block] = placeEvents(
      [ev("a", "2026-08-14T21:00:00Z", "2026-08-14T23:30:00Z")], // 23:00→01:30
      rangeOf,
      [FRI],
      BERLIN,
    );
    expect(block?.day).toBe(FRI);
    expect(block?.clippedBottom).toBe(false);
  });

  it("clips an event that runs past the window and says so", () => {
    const [block] = placeEvents(
      [ev("a", "2026-08-14T23:00:00Z", "2026-08-15T06:00:00Z")], // 01:00→08:00
      rangeOf,
      [FRI],
      BERLIN,
    );
    expect(block?.clippedBottom).toBe(true);
    expect(block?.to).toBe(WINDOW_MINUTES);
  });

  it("ignores events entirely outside the window", () => {
    // 08:00–09:00 Berlin, before the window opens.
    expect(
      placeEvents(
        [ev("a", "2026-08-14T06:00:00Z", "2026-08-14T07:00:00Z")],
        rangeOf,
        [FRI],
        BERLIN,
      ),
    ).toEqual([]);
  });

  it("ignores events outside the visible week", () => {
    expect(
      placeEvents(
        [ev("a", "2026-08-20T18:00:00Z", "2026-08-20T19:00:00Z")],
        rangeOf,
        [FRI],
        BERLIN,
      ),
    ).toEqual([]);
  });
});

describe("overlap layout", () => {
  const columnsOf = (blocks: { item: Ev; column: number; columns: number }[]) =>
    Object.fromEntries(
      blocks.map((b) => [b.item.id, [b.column, b.columns] as const]),
    );

  it("leaves consecutive events full width", () => {
    const blocks = placeEvents(
      [
        ev("a", "2026-08-14T18:00:00Z", "2026-08-14T19:00:00Z"),
        ev("b", "2026-08-14T19:00:00Z", "2026-08-14T20:00:00Z"),
      ],
      rangeOf,
      [FRI],
      BERLIN,
    );
    expect(columnsOf(blocks)).toEqual({ a: [0, 1], b: [0, 1] });
  });

  it("splits two that overlap", () => {
    const blocks = placeEvents(
      [
        ev("a", "2026-08-14T18:00:00Z", "2026-08-14T20:00:00Z"),
        ev("b", "2026-08-14T19:00:00Z", "2026-08-14T21:00:00Z"),
      ],
      rangeOf,
      [FRI],
      BERLIN,
    );
    expect(columnsOf(blocks)).toEqual({ a: [0, 2], b: [1, 2] });
  });

  it("gives three mutually overlapping events a third each", () => {
    const blocks = placeEvents(
      [
        ev("a", "2026-08-14T18:00:00Z", "2026-08-14T21:00:00Z"),
        ev("b", "2026-08-14T18:30:00Z", "2026-08-14T21:00:00Z"),
        ev("c", "2026-08-14T19:00:00Z", "2026-08-14T21:00:00Z"),
      ],
      rangeOf,
      [FRI],
      BERLIN,
    );
    expect(columnsOf(blocks)).toEqual({ a: [0, 3], b: [1, 3], c: [2, 3] });
  });

  // A and C never touch, so C takes A's column back rather than forcing a
  // third — but the cluster still spans all three, so the width stays halved
  // for B, which does overlap both.
  it("reuses a freed column inside a chained cluster", () => {
    const blocks = placeEvents(
      [
        ev("a", "2026-08-14T18:00:00Z", "2026-08-14T19:30:00Z"),
        ev("b", "2026-08-14T19:00:00Z", "2026-08-14T20:30:00Z"),
        ev("c", "2026-08-14T20:00:00Z", "2026-08-14T21:00:00Z"),
      ],
      rangeOf,
      [FRI],
      BERLIN,
    );
    expect(columnsOf(blocks)).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2] });
  });

  it("starts a fresh cluster once the overlap ends", () => {
    const blocks = placeEvents(
      [
        ev("a", "2026-08-14T18:00:00Z", "2026-08-14T20:00:00Z"),
        ev("b", "2026-08-14T19:00:00Z", "2026-08-14T20:00:00Z"),
        ev("c", "2026-08-14T20:00:00Z", "2026-08-14T21:00:00Z"),
      ],
      rangeOf,
      [FRI],
      BERLIN,
    );
    const cols = columnsOf(blocks);
    expect(cols.a?.[1]).toBe(2);
    expect(cols.b?.[1]).toBe(2);
    expect(cols.c).toEqual([0, 1]);
  });
});

describe("now indicator", () => {
  it("sits proportionally inside the window", () => {
    expect(nowOffset(at("2026-08-14T18:00:00Z"), FRI, BERLIN)).toBe(600);
  });

  it("is absent outside the window", () => {
    expect(nowOffset(at("2026-08-14T06:00:00Z"), FRI, BERLIN)).toBeNull();
    expect(nowOffset(at("2026-08-15T05:00:00Z"), FRI, BERLIN)).toBeNull();
  });
});
