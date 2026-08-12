"use client";

import { useTranslations } from "next-intl";
import { type ReactNode } from "react";

import { ScheduleBlock } from "@/components/calendar/schedule-block";
import {
  COLUMN_PX,
  minutesToPx,
  ROW_PX,
} from "@/components/calendar/schedule-geometry";
import { DAY_HOURS } from "@/lib/availability";
import type { EventOccurrence } from "@/lib/events";
import { nowOffset, placeEvents } from "@/lib/schedule-window";
import { cn } from "@/lib/utils";

export type ScheduleDay = {
  /** YYYY-MM-DD in the team's zone — the key everything is filed under. */
  key: string;
  label: string;
  sublabel: string;
  isToday: boolean;
  isChill: boolean;
};

export type ScheduleGridProps = {
  days: readonly ScheduleDay[];
  occurrences: readonly EventOccurrence[];
  /** The team's zone. Positions resolve against this and nothing else. */
  teamZone: string;
  /** Current time, or null before hydration knows it. */
  now: Date | null;
  /** Row labels, shifted into the reader's zone by the caller. */
  hourLabelFor: (dayKey: string, hour: number) => string;
  onOpenOccurrence: (occurrence: EventOccurrence) => void;
  /** Staff only: clicking an empty hour drafts an event there. */
  onCreateAt?: (dayKey: string, hour: number) => void;
  /** Staff only: clicking a day header offers to toggle its chill day. */
  onToggleChill?: (day: ScheduleDay) => void;
  /** Rendered in the empty corner above the hour labels. */
  cornerSlot?: ReactNode;
  /** Bench tags shown on a block, e.g. SUB / TRIAL. */
  tagsFor: (occurrence: EventOccurrence) => readonly string[];
};

/**
 * The week schedule, drawn on the availability grid's geometry.
 *
 * Everything here is positioned in the TEAM's zone: a viewer elsewhere sees the
 * same blocks in the same places, with the hour labels down the side shifted to
 * their own clock. That is the whole point of owning this grid — under
 * FullCalendar the timezone picker moved the events and the now-line instead.
 */
export function ScheduleGrid({
  days,
  occurrences,
  teamZone,
  now,
  hourLabelFor,
  onOpenOccurrence,
  onCreateAt,
  onToggleChill,
  cornerSlot,
  tagsFor,
}: ScheduleGridProps) {
  const t = useTranslations("calendar");

  const dayKeys = days.map((day) => day.key);
  const placed = placeEvents(
    occurrences,
    (occurrence) => ({ start: occurrence.start, end: occurrence.end }),
    dayKeys,
    teamZone,
  );

  const gridColumns = `4rem repeat(${days.length}, minmax(0, 1fr))`;
  const anchorKey = days[0]?.key ?? "";

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[44rem]">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: gridColumns }}
        >
          <div className="flex items-end justify-center pb-1">{cornerSlot}</div>
          {days.map((day) => {
            const inner = (
              <>
                <span className="block text-sm font-semibold">{day.label}</span>
                <span className="block text-xs font-normal text-muted-foreground tabular-nums">
                  {day.sublabel}
                </span>
                {day.isChill ? (
                  <span className="chill-tag mt-0.5 inline-block">
                    {t("chillTag")}
                  </span>
                ) : null}
              </>
            );
            const shell = cn(
              "rounded-md border px-1 py-2 text-center leading-tight",
              day.isToday
                ? "border-primary/60 bg-primary/10"
                : "border-border/60 bg-muted/40",
            );
            return (
              <div key={day.key} className="pb-1">
                {onToggleChill ? (
                  <button
                    type="button"
                    onClick={() => onToggleChill(day)}
                    title={
                      day.isChill ? t("chillHeaderRemove") : t("chillHeaderAdd")
                    }
                    className={cn(
                      shell,
                      "w-full transition-colors hover:bg-muted",
                    )}
                  >
                    {inner}
                  </button>
                ) : (
                  <div className={shell}>{inner}</div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: gridColumns }}
        >
          {/* Hour labels. These are the only things the reader's zone moves. */}
          <div className="flex flex-col gap-1">
            {DAY_HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: ROW_PX }}
                className="flex items-center justify-end rounded-md border border-border/60 bg-muted/40 px-2 text-xs font-medium text-foreground/80 tabular-nums"
              >
                {hourLabelFor(anchorKey, hour)}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const blocks = placed.filter((block) => block.day === day.key);
            const marker = now && nowOffset(now, day.key, teamZone);
            return (
              <div
                key={day.key}
                className="relative"
                style={{ height: COLUMN_PX }}
              >
                {/* Empty hours sit underneath: the backdrop staff click to
                    draft an event, and the surface events are drawn on. */}
                <div className="absolute inset-0 flex flex-col gap-1">
                  {DAY_HOURS.map((hour) =>
                    onCreateAt ? (
                      <button
                        key={hour}
                        type="button"
                        style={{ height: ROW_PX }}
                        aria-label={t("createAt", {
                          day: day.label,
                          hour: hourLabelFor(day.key, hour),
                        })}
                        onClick={() => onCreateAt(day.key, hour)}
                        className={cn(
                          "w-full cursor-pointer rounded-[4px] transition-colors",
                          day.isChill
                            ? "chill-cell"
                            : "bg-muted/40 hover:bg-muted",
                        )}
                      />
                    ) : (
                      <div
                        key={hour}
                        style={{ height: ROW_PX }}
                        className={cn(
                          "w-full rounded-[4px]",
                          day.isChill ? "chill-cell" : "bg-muted/40",
                        )}
                      />
                    ),
                  )}
                </div>

                {blocks.map((block) => (
                  <ScheduleBlock
                    key={`${block.item.event.id}-${block.item.start.toISOString()}`}
                    block={block}
                    tags={tagsFor(block.item)}
                    onOpen={() => onOpenOccurrence(block.item)}
                  />
                ))}

                {marker == null ? null : (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute right-0 left-0 z-20 border-t-2 border-rose-500"
                    style={{ top: minutesToPx(marker) }}
                  >
                    <span className="absolute -top-1 -left-1 size-2 rounded-full bg-rose-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
