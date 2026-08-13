"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { LABEL_PX, pxToMinutes } from "@/components/calendar/schedule-geometry";
import type { EventOccurrence } from "@/lib/events";
import {
  clampMinute,
  createRange,
  moveRange,
  resizeRange,
  type MinuteRange,
} from "@/lib/schedule-window";

export type DragKind = "create" | "move" | "resize-start" | "resize-end";

export type DragPreview = MinuteRange & {
  kind: DragKind;
  dayIndex: number;
  occurrence: EventOccurrence | null;
};

/** Below this the gesture was a click, not a drag. */
const MOVE_THRESHOLD_PX = 4;

type Origin = {
  clientX: number;
  clientY: number;
  /** Where in the block the pointer grabbed it, for a move. */
  grabOffset: number;
  /** The range the gesture started from. */
  range: MinuteRange;
};

export type ScheduleDragHandlers = {
  onCreate: (dayIndex: number, range: MinuteRange) => void;
  onReschedule: (
    occurrence: EventOccurrence,
    dayIndex: number,
    range: MinuteRange,
  ) => void;
  onClickEmpty: (dayIndex: number, minute: number) => void;
  onClickEvent: (occurrence: EventOccurrence) => void;
};

/**
 * Drag to create, move and resize on the week grid.
 *
 * A press that never really moves is a click, so the older tap behaviour
 * survives: clicking an empty hour still drafts an event there and clicking a
 * block still opens it. Everything is measured against the grid element, so the
 * caller never has to know pixel offsets.
 */
export function useScheduleDrag({
  gridRef,
  dayCount,
  enabled,
  handlers,
}: {
  gridRef: React.RefObject<HTMLDivElement | null>;
  dayCount: number;
  enabled: boolean;
  handlers: ScheduleDragHandlers;
}) {
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const [active, setActive] = useState(false);

  const previewRef = useRef<DragPreview | null>(null);
  const originRef = useRef<Origin | null>(null);
  const movedRef = useRef(false);

  // Kept in a ref so a pointermove does not rebind the window listeners.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const locate = useCallback(
    (clientX: number, clientY: number) => {
      const element = gridRef.current;
      if (!element || dayCount === 0) return null;
      const rect = element.getBoundingClientRect();
      const dayWidth = (rect.width - LABEL_PX) / dayCount;
      if (dayWidth <= 0) return null;
      const dayIndex = Math.min(
        dayCount - 1,
        Math.max(0, Math.floor((clientX - rect.left - LABEL_PX) / dayWidth)),
      );
      return {
        dayIndex,
        minute: clampMinute(pxToMinutes(clientY - rect.top)),
      };
    },
    [gridRef, dayCount],
  );

  const begin = useCallback(
    (
      event: React.PointerEvent,
      kind: DragKind,
      occurrence: EventOccurrence | null,
      range: MinuteRange,
    ) => {
      if (!enabled) return;
      const at = locate(event.clientX, event.clientY);
      if (!at) return;
      event.preventDefault();
      event.stopPropagation();

      originRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        grabOffset: at.minute - range.from,
        range,
      };
      movedRef.current = false;
      const next = { kind, dayIndex: at.dayIndex, occurrence, ...range };
      previewRef.current = next;
      setPreview(next);
      setActive(true);
    },
    [enabled, locate],
  );

  useEffect(() => {
    if (!active) return;

    const move = (event: PointerEvent) => {
      const origin = originRef.current;
      const current = previewRef.current;
      if (!origin || !current) return;

      if (
        Math.abs(event.clientX - origin.clientX) > MOVE_THRESHOLD_PX ||
        Math.abs(event.clientY - origin.clientY) > MOVE_THRESHOLD_PX
      ) {
        movedRef.current = true;
      }
      if (!movedRef.current) return;

      const at = locate(event.clientX, event.clientY);
      if (!at) return;

      const range: MinuteRange =
        current.kind === "create"
          ? createRange(origin.range.from, at.minute)
          : current.kind === "move"
            ? moveRange(origin.range, at.minute - origin.grabOffset)
            : resizeRange(
                origin.range,
                current.kind === "resize-start" ? "start" : "end",
                at.minute,
              );

      // Only a move may change day; resizing sideways would be an accident.
      const dayIndex =
        current.kind === "create" ? current.dayIndex : at.dayIndex;
      const next: DragPreview = {
        ...current,
        ...range,
        dayIndex:
          current.kind === "resize-start" || current.kind === "resize-end"
            ? current.dayIndex
            : dayIndex,
      };
      previewRef.current = next;
      setPreview(next);
    };

    const finish = () => {
      const current = previewRef.current;
      const origin = originRef.current;
      previewRef.current = null;
      originRef.current = null;
      setPreview(null);
      setActive(false);
      if (!current || !origin) return;

      const { onCreate, onReschedule, onClickEmpty, onClickEvent } =
        handlersRef.current;

      if (!movedRef.current) {
        if (current.occurrence) onClickEvent(current.occurrence);
        else onClickEmpty(current.dayIndex, origin.range.from);
        return;
      }
      if (current.occurrence) {
        onReschedule(current.occurrence, current.dayIndex, {
          from: current.from,
          to: current.to,
        });
      } else {
        onCreate(current.dayIndex, { from: current.from, to: current.to });
      }
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [active, locate]);

  // `preview` is the render-visible state; whether the gesture has passed the
  // click threshold lives in a ref and must stay out of render.
  return { preview, begin };
}
