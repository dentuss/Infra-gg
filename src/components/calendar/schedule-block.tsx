"use client";

import {
  GAP_PX,
  MIN_BLOCK_PX,
  minutesToPx,
} from "@/components/calendar/schedule-geometry";
import type { EventOccurrence } from "@/lib/events";
import type { Placed } from "@/lib/schedule-window";
import { cn } from "@/lib/utils";

/** One event in a day column, sized and shared with whatever it overlaps. */
export function ScheduleBlock({
  block,
  tags,
  onOpen,
}: {
  block: Placed<EventOccurrence>;
  tags: readonly string[];
  onOpen: () => void;
}) {
  const { event } = block.item;
  const width = 100 / block.columns;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={event.title}
      style={{
        top: minutesToPx(block.from),
        height: Math.max(
          MIN_BLOCK_PX,
          minutesToPx(block.to - block.from) - GAP_PX,
        ),
        left: `calc(${block.column * width}% + 1px)`,
        width: `calc(${width}% - 2px)`,
      }}
      className={cn(
        "schedule-block absolute z-10 cursor-pointer overflow-hidden rounded-[4px] border px-1 py-0.5 text-left text-xs text-white",
        `event-${event.type}`,
        // A clipped edge loses its rounding, so the block reads as continuing
        // past the window rather than ending there.
        block.clippedTop && "rounded-t-none border-t-0",
        block.clippedBottom && "rounded-b-none border-b-0",
      )}
    >
      {tags.length > 0 ? (
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
      <span className="block truncate font-semibold">{event.title}</span>
    </button>
  );
}
