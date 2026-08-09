import { describe, expect, it } from "vitest";

import {
  FALLBACK_ZONE,
  isKnownZone,
  resolveViewZone,
  slotInstant,
  slotLabelInZone,
  zoneAbbreviation,
  zoneCityName,
  zoneGmtLabel,
} from "@/lib/timezone";

const BERLIN = "Europe/Berlin";
const MOSCOW = "Europe/Moscow";
const LONDON = "Europe/London";

// 2026-08-07 is summer: Berlin is CEST (UTC+2), Moscow is UTC+3 year round.
const SUMMER = "2026-08-07";
// 2026-01-09 is winter: Berlin is CET (UTC+1), Moscow still UTC+3.
const WINTER = "2026-01-09";

describe("recognising zones", () => {
  it("accepts real IANA zones and rejects junk", () => {
    expect(isKnownZone(BERLIN)).toBe(true);
    expect(isKnownZone("UTC")).toBe(true);
    expect(isKnownZone("Mars/Olympus")).toBe(false);
    expect(isKnownZone("")).toBe(false);
    expect(isKnownZone(null)).toBe(false);
    expect(isKnownZone(undefined)).toBe(false);
  });
});

describe("choosing which zone a viewer sees", () => {
  it("prefers the personal choice", () => {
    expect(resolveViewZone(MOSCOW, BERLIN)).toBe(MOSCOW);
  });

  it("falls back to the team zone when there is no personal choice", () => {
    expect(resolveViewZone(null, BERLIN)).toBe(BERLIN);
  });

  it("ignores a personal choice that is not a real zone", () => {
    expect(resolveViewZone("Mars/Olympus", BERLIN)).toBe(BERLIN);
  });

  it("falls back again when the team zone is missing or broken", () => {
    expect(resolveViewZone(null, null)).toBe(FALLBACK_ZONE);
    expect(resolveViewZone(null, "nonsense")).toBe(FALLBACK_ZONE);
  });
});

describe("resolving a slot to a real moment", () => {
  it("treats the hour as team-zone wall time", () => {
    const instant = slotInstant(SUMMER, 20, BERLIN);
    // 20:00 CEST is 18:00 UTC.
    expect(instant?.toISOString()).toBe("2026-08-07T18:00:00.000Z");
  });

  it("rolls hour 24 onto the following morning", () => {
    const instant = slotInstant(SUMMER, 24, BERLIN);
    // Midnight opening 8 August, CEST, is 22:00 UTC on the 7th.
    expect(instant?.toISOString()).toBe("2026-08-07T22:00:00.000Z");
  });

  it("tracks the team zone's own DST", () => {
    // The same wall-clock hour is a different instant in winter.
    expect(slotInstant(WINTER, 20, BERLIN)?.toISOString()).toBe(
      "2026-01-09T19:00:00.000Z",
    );
  });

  it("returns null for an unparseable day", () => {
    expect(slotInstant("not-a-date", 20, BERLIN)).toBeNull();
  });
});

describe("labelling a slot in the viewer's zone", () => {
  it("shows team time unchanged to a viewer in the team zone", () => {
    expect(slotLabelInZone(SUMMER, 20, BERLIN, BERLIN)).toBe("20:00");
  });

  // The point of anchoring: the marker does not move, its label does.
  it("shifts the label for a viewer further east", () => {
    expect(slotLabelInZone(SUMMER, 20, BERLIN, MOSCOW)).toBe("21:00");
  });

  it("shifts the other way for a viewer further west", () => {
    expect(slotLabelInZone(SUMMER, 20, BERLIN, LONDON)).toBe("19:00");
  });

  it("wraps past midnight rather than showing 24:00", () => {
    expect(slotLabelInZone(SUMMER, 23, BERLIN, MOSCOW)).toBe("00:00");
    expect(slotLabelInZone(SUMMER, 24, BERLIN, BERLIN)).toBe("00:00");
  });

  // Moscow does not observe DST, so the gap to Berlin is not constant.
  it("uses the offset in force on that date, not a fixed one", () => {
    expect(slotLabelInZone(SUMMER, 20, BERLIN, MOSCOW)).toBe("21:00"); // +1
    expect(slotLabelInZone(WINTER, 20, BERLIN, MOSCOW)).toBe("22:00"); // +2
  });

  it("falls back to the team-time label when the day is unparseable", () => {
    expect(slotLabelInZone("nope", 20, BERLIN, MOSCOW)).toBe("20:00");
  });
});

describe("zone short names", () => {
  const summerNoon = new Date(`${SUMMER}T12:00:00Z`);
  const winterNoon = new Date(`${WINTER}T12:00:00Z`);

  // Intl hands back "GMT+2" for European zones in an English locale, which is
  // why these are spelled out rather than derived.
  it("switches between standard and daylight names", () => {
    expect(zoneAbbreviation(BERLIN, summerNoon)).toBe("CEST");
    expect(zoneAbbreviation(BERLIN, winterNoon)).toBe("CET");
    expect(zoneAbbreviation(LONDON, summerNoon)).toBe("BST");
    expect(zoneAbbreviation(LONDON, winterNoon)).toBe("GMT");
  });

  it("keeps one name for zones that do not change clocks", () => {
    expect(zoneAbbreviation(MOSCOW, summerNoon)).toBe("MSK");
    expect(zoneAbbreviation(MOSCOW, winterNoon)).toBe("MSK");
    expect(zoneAbbreviation("UTC", summerNoon)).toBe("UTC");
  });

  it("falls back to Intl for a zone outside the curated list", () => {
    expect(zoneAbbreviation("America/New_York", summerNoon)).toBeTruthy();
    expect(zoneAbbreviation("Mars/Olympus", summerNoon)).toBe("Mars/Olympus");
  });
});

describe("GMT labels", () => {
  it("shows the absolute offset, tracking DST", () => {
    expect(zoneGmtLabel(BERLIN, new Date(`${SUMMER}T12:00:00Z`))).toBe("GMT+2");
    expect(zoneGmtLabel(BERLIN, new Date(`${WINTER}T12:00:00Z`))).toBe("GMT+1");
    expect(zoneGmtLabel(MOSCOW, new Date(`${SUMMER}T12:00:00Z`))).toBe("GMT+3");
  });

  it("says UTC rather than GMT+0", () => {
    expect(zoneGmtLabel("UTC", new Date(`${SUMMER}T12:00:00Z`))).toBe("UTC");
  });

  it("handles a zone west of Greenwich and a half-hour zone", () => {
    expect(
      zoneGmtLabel("America/New_York", new Date(`${SUMMER}T12:00:00Z`)),
    ).toBe("GMT-4");
    expect(zoneGmtLabel("Asia/Kolkata", new Date(`${SUMMER}T12:00:00Z`))).toBe(
      "GMT+5:30",
    );
  });
});

describe("zone display names", () => {
  it("uses the city, spaced out", () => {
    expect(zoneCityName(BERLIN)).toBe("Berlin");
    expect(zoneCityName("America/New_York")).toBe("New York");
    expect(zoneCityName("UTC")).toBe("UTC");
  });
});
