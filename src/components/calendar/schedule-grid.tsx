"use client";

import { useRef, type ReactNode } from "react";

import { ScheduleBlock } from "@/components/calendar/schedule-block";
import {
  GRID_PX,
  LABEL_PX,
  MIN_BLOCK_PX,
  minutesToPx,
  ROW_PX,
} from "@/components/calendar/schedule-geometry";
import { ScheduleHeader } from "@/components/calendar/schedule-header";
import { useScheduleDrag } from "@/hooks/use-schedule-drag";
import { DAY_HOURS } from "@/lib/availability";
import type { EventOccurrence } from "@/lib/events";
import {
  nowOffset,
  placeEvents,
  type MinuteRange,
} from "@/lib/schedule-window";
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
  /** A block's own times, likewise in the reader's zone. */
  timeLabelFor: (occurrence: EventOccurrence) => string;
  /** How a dragged range reads while the pointer is down. */
  rangeLabelFor: (dayKey: string, range: MinuteRange) => string;
  onOpenOccurrence: (occurrence: EventOccurrence) => void;
  /** Staff only: a click drafts an hour, a drag drafts the range. */
  onCreate?: (dayKey: string, range: MinuteRange) => void;
  /** Staff only: a block was dragged or resized to a new range. */
  onReschedule?: (
    occurrence: EventOccurrence,
    dayKey: string,
    range: MinuteRange,
  ) => void;
  /** Staff only: clicking a day header offers to toggle its chill day. */
  onToggleChill?: (day: ScheduleDay) => void;
  /** Rendered in the empty corner above the hour labels. */
  cornerSlot?: ReactNode;
  /** Bench tags shown on a block, e.g. SUB / TRIAL. */
  tagsFor: (occurrence: EventOccurrence) => readonly string[];
};

const FIRST_HOUR = DAY_HOURS[0] ?? 0;

/**
 * The week schedule.
 *
 * Everything is positioned in the TEAM's zone: a viewer elsewhere sees the same
 * blocks in the same places, with the hour labels down the side shifted to
 * their own clock. Labels and day columns are rows of one grid rather than two
 * stacks kept in step by arithmetic, which is what used to drift apart.
 */
export function ScheduleGrid({
  days,
  occurrences,
  teamZone,
  now,
  hourLabelFor,
  timeLabelFor,
  rangeLabelFor,
  onOpenOccurrence,
  onCreate,
  onReschedule,
  onToggleChill,
  cornerSlot,
  tagsFor,
}: ScheduleGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const placed = placeEvents(
    occurrences,
    (occurrence) => ({ start: occurrence.start, end: occurrence.end }),
    days.map((day) => day.key),
    teamZone,
  );

  const { preview, begin } = useScheduleDrag({
    gridRef,
    dayCount: days.length,
    enabled: Boolean(onCreate),
    handlers: {
      onCreate: (dayIndex, range) => {
        const day = days[dayIndex];
        if (day) onCreate?.(day.key, range);
      },
      onReschedule: (occurrence, dayIndex, range) => {
        const day = days[dayIndex];
        if (day) onReschedule?.(occurrence, day.key, range);
      },
      onClickEmpty: (dayIndex, minute) => {
        const day = days[dayIndex];
        // A plain click still means "the hour I clicked", as it did before.
        const hourStart = Math.floor(minute / 60) * 60;
        if (day) onCreate?.(day.key, { from: hourStart, to: hourStart + 60 });
      },
      onClickEvent: onOpenOccurrence,
    },
  });

  const columns = `${LABEL_PX}px repeat(${days.length}, minmax(0, 1fr))`;
  const anchorKey = days[0]?.key ?? "";

  return (
    <div className="overflow-x-auto rounded-md border border-border/60">
      <div className="min-w-[44rem]">
        <ScheduleHeader
          days={days}
          columns={columns}
          cornerSlot={cornerSlot}
          onToggleChill={onToggleChill}
        />

        {/* One grid: the labels are rows of it, not a parallel stack. */}
        <div
          ref={gridRef}
          className={cn(
            "relative grid select-none",
            // Dragging and scrolling are the same gesture on a touch screen, so
            // only the people who can drag give up scrolling here.
            onCreate && "touch-none",
          )}
          style={{
            gridTemplateColumns: columns,
            gridTemplateRows: `repeat(${DAY_HOURS.length}, ${ROW_PX}px)`,
            height: GRID_PX,
          }}
        >
          {DAY_HOURS.map((hour, row) => (
            <div
              key={`label-${hour}`}
              style={{ gridColumn: 1, gridRow: row + 1 }}
              className={cn(
                "flex items-start justify-end pt-0.5 pr-2 text-xs font-medium text-muted-foreground tabular-nums",
                row > 0 && "border-t border-border/40",
              )}
            >
              {hourLabelFor(anchorKey, hour)}
            </div>
          ))}

          {days.map((day, dayIndex) =>
            DAY_HOURS.map((hour, row) => (
              <div
                key={`${day.key}-${hour}`}
                style={{ gridColumn: dayIndex + 2, gridRow: row + 1 }}
                onPointerDown={
                  onCreate
                    ? (pointer) =>
                        begin(pointer, "create", null, {
                          from: (hour - FIRST_HOUR) * 60,
                          to: (hour - FIRST_HOUR) * 60,
                        })
                    : undefined
                }
                className={cn(
                  "border-l border-border/60",
                  row > 0 && "border-t border-border/40",
                  day.isChill && "chill-cell",
                  day.isToday && !day.isChill && "bg-primary/[0.04]",
                  onCreate && "cursor-cell",
                  onCreate && !day.isChill && "hover:bg-muted/50",
                )}
              />
            )),
          )}

          {/* Events sit above the bands but let clicks through to them. */}
          {days.map((day, dayIndex) => {
            const blocks = placed.filter((block) => block.day === day.key);
            const marker = now && nowOffset(now, day.key, teamZone);
            const ghost = preview?.dayIndex === dayIndex ? preview : null;
            return (
              <div
                key={`overlay-${day.key}`}
                style={{ gridColumn: dayIndex + 2, gridRow: "1 / -1" }}
                className="pointer-events-none relative"
              >
                {blocks.map((block) => (
                  <ScheduleBlock
                    key={`${block.item.event.id}-${block.item.start.toISOString()}`}
                    block={block}
                    tags={tagsFor(block.item)}
                    timeLabel={timeLabelFor(block.item)}
                    draggable={
                      Boolean(onReschedule) && !block.item.event.recurs_weekly
                    }
                    onBegin={begin}
                    onOpen={() => onOpenOccurrence(block.item)}
                  />
                ))}

                {ghost ? (
                  <div
                    style={{
                      top: minutesToPx(ghost.from),
                      height: Math.max(
                        MIN_BLOCK_PX,
                        minutesToPx(ghost.to - ghost.from),
                      ),
                    }}
                    className="absolute inset-x-0.5 z-20 rounded-[3px] border-2 border-dashed border-primary bg-primary/25 px-1.5 py-0.5 text-xs font-semibold tabular-nums"
                  >
                    {rangeLabelFor(day.key, ghost)}
                  </div>
                ) : null}

                {marker == null ? null : (
                  <div
                    aria-hidden
                    className="absolute right-0 left-0 z-30 border-t-2 border-rose-500"
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
