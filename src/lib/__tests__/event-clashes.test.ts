import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import {
  buildAvailabilityLookup,
  weekdayIndex,
  type AvailabilityRow,
} from "@/lib/availability";
import {
  findClashes,
  hasBlockingClash,
  slotsBetween,
} from "@/lib/event-clashes";
import type { Profile } from "@/lib/team";

const FRIDAY = "2026-08-07";
/** Availability cells are painted in the team's zone, so tests use one. */
const TEAM = "Europe/Berlin";
const weekdayFor = (day: string) => weekdayIndex(new Date(`${day}T00:00:00`));

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

const member = (id: string, username: string, role: Profile["role"]): Profile =>
  ({
    id,
    username,
    role,
    is_member: true,
    avatar_url: null,
    full_name: null,
    ingame_role: null,
    assigned_role: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  }) as Profile;

const at = (day: string, time: string) =>
  DateTime.fromISO(`${day}T${time}`, { zone: TEAM }).toJSDate();

describe("enumerating the hours an event covers", () => {
  it("covers every whole hour touched", () => {
    expect(
      slotsBetween(at(FRIDAY, "20:00"), at(FRIDAY, "22:00"), TEAM),
    ).toEqual([
      { day: FRIDAY, hour: 20 },
      { day: FRIDAY, hour: 21 },
    ]);
  });

  it("includes a partial hour at either end", () => {
    expect(
      slotsBetween(at(FRIDAY, "20:30"), at(FRIDAY, "21:30"), TEAM),
    ).toEqual([
      { day: FRIDAY, hour: 20 },
      { day: FRIDAY, hour: 21 },
    ]);
  });

  it("rolls past midnight onto the same night", () => {
    expect(
      slotsBetween(at(FRIDAY, "23:00"), at("2026-08-08", "01:00"), TEAM),
    ).toEqual([
      { day: FRIDAY, hour: 23 },
      { day: FRIDAY, hour: 24 },
    ]);
  });

  it("returns nothing for an empty or reversed range", () => {
    expect(
      slotsBetween(at(FRIDAY, "20:00"), at(FRIDAY, "20:00"), TEAM),
    ).toEqual([]);
    expect(
      slotsBetween(at(FRIDAY, "22:00"), at(FRIDAY, "20:00"), TEAM),
    ).toEqual([]);
  });
});

describe("finding clashes", () => {
  const roster = [
    member("igl", "Alex", "igl"),
    member("p1", "Sam", "player"),
    member("coach", "Boris", "coach"),
    member("sub", "Leo", "substitute"),
    member("trial", "Max", "trial"),
  ];
  const evening = { starts: at(FRIDAY, "20:00"), ends: at(FRIDAY, "22:00") };

  it("reports a player marked unavailable", () => {
    const lookup = buildAvailabilityLookup(
      [row("p1", FRIDAY, 20, "unavailable")],
      [],
      weekdayFor,
    );
    const clashes = findClashes({
      ...evening,
      members: roster,
      substituteIds: [],
      lookup,
      zone: TEAM,
    });
    expect(clashes).toEqual([
      { userId: "p1", username: "Sam", status: "unavailable", hours: [20] },
    ]);
    expect(hasBlockingClash(clashes)).toBe(true);
  });

  it("ignores staff, who do not have to be in the server", () => {
    const lookup = buildAvailabilityLookup(
      [row("coach", FRIDAY, 20, "unavailable")],
      [],
      weekdayFor,
    );
    expect(
      findClashes({
        ...evening,
        members: roster,
        substituteIds: [],
        lookup,
        zone: TEAM,
      }),
    ).toEqual([]);
  });

  it("ignores bench players until they are attached to the event", () => {
    const lookup = buildAvailabilityLookup(
      [row("sub", FRIDAY, 20, "unavailable")],
      [],
      weekdayFor,
    );
    expect(
      findClashes({
        ...evening,
        members: roster,
        substituteIds: [],
        lookup,
        zone: TEAM,
      }),
    ).toEqual([]);

    const attached = findClashes({
      ...evening,
      members: roster,
      substituteIds: ["sub"],
      lookup,
      zone: TEAM,
    });
    expect(attached).toHaveLength(1);
    expect(attached[0]?.username).toBe("Leo");
  });

  it("lists 'ask me' without letting it block", () => {
    const lookup = buildAvailabilityLookup(
      [row("p1", FRIDAY, 20, "maybe")],
      [],
      weekdayFor,
    );
    const clashes = findClashes({
      ...evening,
      members: roster,
      substituteIds: [],
      lookup,
      zone: TEAM,
    });
    expect(clashes).toHaveLength(1);
    expect(clashes[0]?.status).toBe("maybe");
    expect(hasBlockingClash(clashes)).toBe(false);
  });

  it("treats silence as no objection", () => {
    const lookup = buildAvailabilityLookup([], [], weekdayFor);
    expect(
      findClashes({
        ...evening,
        members: roster,
        substituteIds: [],
        lookup,
        zone: TEAM,
      }),
    ).toEqual([]);
  });

  it("counts a clash inherited from the typical week", () => {
    const lookup = buildAvailabilityLookup(
      [],
      [
        {
          user_id: "igl",
          weekday: 4, // Friday
          hour: 21,
          status: "unavailable",
          updated_at: "2026-08-07T00:00:00Z",
        },
      ],
      weekdayFor,
    );
    const clashes = findClashes({
      ...evening,
      members: roster,
      substituteIds: [],
      lookup,
      zone: TEAM,
    });
    expect(clashes).toHaveLength(1);
    expect(clashes[0]?.username).toBe("Alex");
  });

  it("puts blocking clashes above advisory ones", () => {
    const lookup = buildAvailabilityLookup(
      [row("igl", FRIDAY, 20, "maybe"), row("p1", FRIDAY, 21, "unavailable")],
      [],
      weekdayFor,
    );
    const clashes = findClashes({
      ...evening,
      members: roster,
      substituteIds: [],
      lookup,
      zone: TEAM,
    });
    expect(clashes.map((clash) => clash.status)).toEqual([
      "unavailable",
      "maybe",
    ]);
  });

  it("groups one player's hours per status", () => {
    const lookup = buildAvailabilityLookup(
      [row("p1", FRIDAY, 20, "unavailable"), row("p1", FRIDAY, 21, "maybe")],
      [],
      weekdayFor,
    );
    const clashes = findClashes({
      ...evening,
      members: roster,
      substituteIds: [],
      lookup,
      zone: TEAM,
    });
    expect(clashes).toEqual([
      { userId: "p1", username: "Sam", status: "unavailable", hours: [20] },
      { userId: "p1", username: "Sam", status: "maybe", hours: [21] },
    ]);
  });

  it("checks the night an after-midnight event is displayed under", () => {
    const lookup = buildAvailabilityLookup(
      [row("p1", FRIDAY, 24, "unavailable")],
      [],
      weekdayFor,
    );
    const clashes = findClashes({
      starts: at(FRIDAY, "23:30"),
      ends: at("2026-08-08", "01:00"),
      members: roster,
      substituteIds: [],
      lookup,
      zone: TEAM,
    });
    expect(clashes).toHaveLength(1);
    expect(clashes[0]?.hours).toEqual([24]);
  });
});
