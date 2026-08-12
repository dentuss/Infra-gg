"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export type ScheduleView = "week" | "month";

export function ScheduleToolbar({
  view,
  onViewChange,
  weekLabel,
  onShiftWeek,
  onThisWeek,
  canManage,
  clearDisabled,
  onClear,
  onNew,
  monthPicker,
}: {
  view: ScheduleView;
  onViewChange: (view: ScheduleView) => void;
  weekLabel: string;
  onShiftWeek: (days: number) => void;
  onThisWeek: () => void;
  canManage: boolean;
  clearDisabled: boolean;
  onClear: () => void;
  onNew: () => void;
  /** Only the month view shows the zone picker here; the week grid owns its own. */
  monthPicker: ReactNode;
}) {
  const t = useTranslations("calendar");

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        {view === "week" ? (
          <>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("previousWeek")}
              onClick={() => onShiftWeek(-7)}
            >
              <ChevronLeft />
            </Button>
            <Button variant="outline" onClick={onThisWeek}>
              {t("thisWeek")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("nextWeek")}
              onClick={() => onShiftWeek(7)}
            >
              <ChevronRight />
            </Button>
            <span className="ml-2 text-sm font-medium tabular-nums">
              {weekLabel}
            </span>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant={view === "week" ? "default" : "outline"}
            aria-pressed={view === "week"}
            onClick={() => onViewChange("week")}
          >
            {t("weekView")}
          </Button>
          <Button
            variant={view === "month" ? "default" : "outline"}
            aria-pressed={view === "month"}
            onClick={() => onViewChange("month")}
          >
            <CalendarDays /> {t("monthView")}
          </Button>
        </div>

        {view === "month" ? monthPicker : null}

        {canManage ? (
          <>
            <Button
              variant="destructive"
              disabled={clearDisabled}
              onClick={onClear}
            >
              <Trash2 /> {t("clearButton", { range: view })}
            </Button>
            <Button onClick={onNew}>
              <Plus /> {t("newEvent")}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
