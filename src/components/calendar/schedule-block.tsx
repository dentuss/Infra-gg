"use client";

import { useTranslations } from "next-intl";

import {
  MIN_BLOCK_PX,
  minutesToPx,
  ROOMY_BLOCK_PX,
} from "@/components/calendar/schedule-geometry";
import type { DragKind } from "@/hooks/use-schedule-drag";
import type { EventOccurrence } from "@/lib/events";
import type { MinuteRange, Placed } from "@/lib/schedule-window";
import { cn } from "@/lib/utils";

/** One event in a day column, sized and shared with whatever it overlaps. */
export function ScheduleBlock({
  block,
  tags,
  timeLabel,
  draggable,
  onBegin,
  onOpen,
}: {
  block: Placed<EventOccurrence>;
  tags: readonly string[];
  timeLabel: string;
  /** Series occurrences are edited through the dialog, never dragged. */
  draggable: boolean;
  onBegin: (
    event: React.PointerEvent,
    kind: DragKind,
    occurrence: EventOccurrence,
    range: MinuteRange,
  ) => void;
  onOpen: () => void;
}) {
  const t = useTranslations("calendar");
  const { event } = block.item;
  const width = 100 / block.columns;
  const height = Math.max(MIN_BLOCK_PX, minutesToPx(block.to - block.from) - 2);
  const range = { from: block.from, to: block.to };

  const handle = (kind: DragKind, className: string, label: string) =>
    draggable ? (
      <span
        role="separator"
        aria-label={label}
        onPointerDown={(pointer) => onBegin(pointer, kind, block.item, range)}
        className={cn(
          "absolute inset-x-0 h-2 cursor-ns-resize opacity-0 transition-opacity group-hover:opacity-100",
          "before:absolute before:inset-x-2 before:top-1/2 before:h-0.5 before:-translate-y-1/2 before:rounded-full before:bg-white/70",
          className,
        )}
      />
    ) : null;

  return (
    <div
      style={{
        top: minutesToPx(block.from),
        height,
        left: `calc(${block.column * width}% + 1px)`,
        width: `calc(${width}% - 2px)`,
      }}
      className={cn(
        "schedule-block group pointer-events-auto absolute z-10 overflow-hidden rounded-[3px] border-l-2 px-1.5 py-0.5 text-left text-xs text-white select-none",
        `event-${event.type}`,
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        // A clipped edge loses its rounding, so the block reads as continuing
        // past the window rather than ending there.
        block.clippedTop && "rounded-t-none",
        block.clippedBottom && "rounded-b-none",
      )}
      // A draggable block opens on a press that does not move; a series
      // occurrence has no gesture to distinguish, so it opens on click.
      onPointerDown={
        draggable
          ? (pointer) => onBegin(pointer, "move", block.item, range)
          : undefined
      }
      onClick={draggable ? undefined : onOpen}
    >
      {block.clippedTop
        ? null
        : handle("resize-start", "top-0", t("dragStart"))}

      {tags.length > 0 && height > ROOMY_BLOCK_PX ? (
        <span className="mb-0.5 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-[3px] bg-white/25 px-1 text-[0.6rem] leading-tight font-bold tracking-wide uppercase"
            >
              {tag}
            </span>
          ))}
        </span>
      ) : null}

      <span className="block truncate leading-tight">
        <span className="font-semibold">{event.title}</span>
        {height > MIN_BLOCK_PX + 6 ? null : (
          <span className="ml-1 tabular-nums opacity-80">{timeLabel}</span>
        )}
      </span>
      {height > MIN_BLOCK_PX + 6 ? (
        <span className="block truncate text-[0.7rem] leading-tight tabular-nums opacity-80">
          {timeLabel}
        </span>
      ) : null}

      {block.clippedBottom
        ? null
        : handle("resize-end", "bottom-0", t("dragEnd"))}
    </div>
  );
}
