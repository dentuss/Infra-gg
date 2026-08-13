"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { ScheduleDay } from "@/components/calendar/schedule-grid";
import { cn } from "@/lib/utils";

/** The day names above the week grid, and the corner the zone picker sits in. */
export function ScheduleHeader({
  days,
  columns,
  cornerSlot,
  onToggleChill,
}: {
  days: readonly ScheduleDay[];
  columns: string;
  cornerSlot?: ReactNode;
  onToggleChill?: (day: ScheduleDay) => void;
}) {
  const t = useTranslations("calendar");

  return (
    <div
      className="grid border-b border-border/60 bg-muted/20"
      style={{ gridTemplateColumns: columns }}
    >
      <div className="flex items-end justify-center p-1">{cornerSlot}</div>
      {days.map((day) => {
        const inner = (
          <>
            <span className="block text-sm font-semibold">{day.label}</span>
            <span className="block text-xs font-normal text-muted-foreground tabular-nums">
              {day.sublabel}
            </span>
            {day.isChill ? (
              <span className="chill-tag mt-1 inline-block">
                {t("chillTag")}
              </span>
            ) : null}
          </>
        );
        // Grid items stretch, so a chill tag on one day can no longer leave the
        // other headers short.
        const shell = cn(
          "flex h-full flex-col items-center justify-start border-l border-border/60 px-1 py-2 text-center leading-tight",
          day.isToday && "bg-primary/10 text-primary",
        );
        return onToggleChill ? (
          <button
            key={day.key}
            type="button"
            onClick={() => onToggleChill(day)}
            title={day.isChill ? t("chillHeaderRemove") : t("chillHeaderAdd")}
            className={cn(shell, "transition-colors hover:bg-muted/60")}
          >
            {inner}
          </button>
        ) : (
          <div key={day.key} className={shell}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
