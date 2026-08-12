"use client";

import type { EventInput } from "@fullcalendar/core";
import { useMemo } from "react";

import type { ScheduleDay } from "@/components/calendar/schedule-grid";
import type { ScheduleView } from "@/components/calendar/schedule-toolbar";
import { useChillDays } from "@/hooks/use-chill-days";
import { useCurrentMinute } from "@/hooks/use-current-minute";
import { useEvents } from "@/hooks/use-events";
import { useZones } from "@/hooks/use-timezone";
import { formattingLocale } from "@/i18n/config";
import {
  addDays,
  dateToKey,
  DAY_END_HOUR,
  DAY_START_HOUR,
  weekDays,
} from "@/lib/availability";
import {
  buildClearPlan,
  expandEventsForRange,
  occurrencesInRange,
} from "@/lib/events";
import { slotForInstant } from "@/lib/schedule-window";
import { slotInstant } from "@/lib/timezone";

export type DateRange = { start: Date; end: Date };

const EMPTY_PLAN = { deleteIds: [], exclusions: [], totalCount: 0 };

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Everything the calendar page derives from the events, chill days and the
 * team's zone. Kept out of the component so the view is only layout — and so
 * the zone threading, which is where every timezone bug in this feature has
 * come from, lives in exactly one place.
 */
export function useSchedule({
  anchor,
  view,
  monthRange,
  locale,
}: {
  anchor: Date;
  view: ScheduleView;
  monthRange: DateRange | null;
  locale: string;
}) {
  const { data: events, isPending, error } = useEvents();
  const { data: chillDays } = useChillDays();
  const { teamZone } = useZones();
  const now = useCurrentMinute();

  const chillSet = useMemo(() => new Set(chillDays ?? []), [chillDays]);

  // The week runs from its first day opening at 10:00 to its last closing at
  // 03:00, both resolved in the team's zone rather than the reader's.
  const weekRange = useMemo(() => {
    const start = slotInstant(dateToKey(anchor), DAY_START_HOUR, teamZone);
    const end = slotInstant(
      dateToKey(addDays(anchor, 6)),
      DAY_END_HOUR,
      teamZone,
    );
    return start && end ? { start, end } : null;
  }, [anchor, teamZone]);

  const range = view === "week" ? weekRange : monthRange;

  const clearPlan = useMemo(
    () =>
      events && range
        ? buildClearPlan(events, range.start, range.end, teamZone)
        : EMPTY_PLAN,
    [events, range, teamZone],
  );

  const occurrences = useMemo(
    () =>
      events && weekRange
        ? occurrencesInRange(events, weekRange.start, weekRange.end, teamZone)
        : [],
    [events, weekRange, teamZone],
  );

  const monthInputs = useMemo(
    () =>
      events && monthRange
        ? expandEventsForRange(
            events,
            monthRange.start,
            monthRange.end,
            teamZone,
          )
        : [],
    [events, monthRange, teamZone],
  );

  // The chill wash covers the day's own visible column (10:00 → 03:00) rather
  // than the clock's 00:00–03:00, which would paint the bottom of the previous
  // day's column. The week grid shades its columns directly; this is the month
  // view's equivalent.
  const chillBackground: EventInput[] = useMemo(
    () =>
      (chillDays ?? []).flatMap((date) => {
        const start = slotInstant(date, DAY_START_HOUR, teamZone);
        const end = slotInstant(date, DAY_END_HOUR, teamZone);
        if (!start || !end) return [];
        return [
          {
            id: `chill-${date}`,
            start,
            end,
            display: "background",
            classNames: ["chill-bg"],
          },
        ];
      }),
    [chillDays, teamZone],
  );

  // "Today" is the night the team is currently in, so at 01:00 the highlight
  // stays on the column the evening began in.
  const todayKey = now ? slotForInstant(now, teamZone).day : null;

  const scheduleDays: ScheduleDay[] = useMemo(
    () =>
      weekDays(anchor).map((date) => {
        const key = dateToKey(date);
        return {
          key,
          label: capitalize(
            date.toLocaleDateString(formattingLocale(locale), {
              weekday: "short",
            }),
          ),
          sublabel: date.toLocaleDateString(formattingLocale(locale), {
            day: "numeric",
            month: "short",
          }),
          isToday: key === todayKey,
          isChill: chillSet.has(key),
        };
      }),
    [anchor, locale, todayKey, chillSet],
  );

  return {
    events,
    isPending,
    error,
    now,
    teamZone,
    clearPlan,
    occurrences,
    monthInputs,
    chillBackground,
    scheduleDays,
  };
}
