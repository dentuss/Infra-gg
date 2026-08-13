"use client";

import { DateTime } from "luxon";
import type { ReactNode } from "react";

import {
  ScheduleGrid,
  type ScheduleDay,
} from "@/components/calendar/schedule-grid";
import { useUpdateEvent } from "@/hooks/use-events";
import type { EventOccurrence } from "@/lib/events";
import { instantAtMinute, type MinuteRange } from "@/lib/schedule-window";
import { slotLabelInZone } from "@/lib/timezone";

/**
 * The week grid, wired up: it turns dragged minute ranges back into instants
 * and writes rescheduled events. Positions resolve in the team's zone, labels
 * in the reader's — the split that keeps the zone picker from moving anything.
 */
export function ScheduleWeek({
  days,
  occurrences,
  teamZone,
  viewZone,
  now,
  canManage,
  onOpenOccurrence,
  onToggleChill,
  onDraft,
  cornerSlot,
  tagsFor,
}: {
  days: readonly ScheduleDay[];
  occurrences: readonly EventOccurrence[];
  teamZone: string;
  viewZone: string;
  now: Date | null;
  canManage: boolean;
  onOpenOccurrence: (occurrence: EventOccurrence) => void;
  onToggleChill: (day: ScheduleDay) => void;
  onDraft: (span: { start: Date; end: Date }) => void;
  cornerSlot?: ReactNode;
  tagsFor: (occurrence: EventOccurrence) => readonly string[];
}) {
  const updateEvent = useUpdateEvent();

  const clock = (at: Date) =>
    DateTime.fromJSDate(at, { zone: viewZone }).toFormat("HH:mm");

  const instants = (dayKey: string, range: MinuteRange) => {
    const start = instantAtMinute(dayKey, range.from, teamZone);
    const end = instantAtMinute(dayKey, range.to, teamZone);
    return start && end ? { start, end } : null;
  };

  return (
    <ScheduleGrid
      days={days}
      occurrences={occurrences}
      teamZone={teamZone}
      now={now}
      hourLabelFor={(dayKey, hour) =>
        slotLabelInZone(dayKey, hour, teamZone, viewZone)
      }
      timeLabelFor={(occurrence) =>
        `${clock(occurrence.start)} – ${clock(occurrence.end)}`
      }
      rangeLabelFor={(dayKey, range) => {
        const span = instants(dayKey, range);
        return span ? `${clock(span.start)} – ${clock(span.end)}` : "";
      }}
      onOpenOccurrence={onOpenOccurrence}
      onCreate={
        canManage
          ? (dayKey, range) => {
              const span = instants(dayKey, range);
              if (span) onDraft(span);
            }
          : undefined
      }
      onReschedule={
        canManage
          ? (occurrence, dayKey, range) => {
              const span = instants(dayKey, range);
              if (!span) return;
              updateEvent.mutate({
                id: occurrence.event.id,
                patch: {
                  starts_at: span.start.toISOString(),
                  ends_at: span.end.toISOString(),
                },
              });
            }
          : undefined
      }
      onToggleChill={canManage ? onToggleChill : undefined}
      cornerSlot={cornerSlot}
      tagsFor={tagsFor}
    />
  );
}
