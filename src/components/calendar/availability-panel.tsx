"use client";

import { CalendarCog, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { AvailabilityDefaultsDialog } from "@/components/calendar/availability-defaults-dialog";
import {
  AvailabilityGrid,
  STATUS_CLASS,
  type CellAddress,
  type GridRow,
} from "@/components/calendar/availability-grid";
import { Button } from "@/components/ui/button";
import {
  useAvailabilityDefaults,
  useSetAvailability,
  useWeekAvailability,
} from "@/hooks/use-availability";
import { useMembers } from "@/hooks/use-team";
import { formattingLocale } from "@/i18n/config";
import {
  addDays,
  buildAvailabilityLookup,
  dateToKey,
  DAY_HOURS,
  hourLabel,
  isFullHouse,
  startOfWeek,
  summariseSlot,
  weekdayIndex,
  weekDays,
  type AvailabilityStatus,
} from "@/lib/availability";
import { cn } from "@/lib/utils";

const LEGEND: (AvailabilityStatus | "unset")[] = [
  "available",
  "maybe",
  "unavailable",
  "unset",
];

export function AvailabilityPanel({ userId }: { userId: string | null }) {
  const t = useTranslations("availability");
  const locale = useLocale();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => dateToKey(new Date()));
  const [defaultsOpen, setDefaultsOpen] = useState(false);

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const lastDay = useMemo(() => addDays(anchor, 6), [anchor]);
  const weekStart = dateToKey(anchor);
  const weekEnd = dateToKey(lastDay);
  const dayKeys = useMemo(() => new Set(days.map(dateToKey)), [days]);

  const { data: members } = useMembers();
  const {
    data: rows,
    isPending,
    error,
  } = useWeekAvailability(weekStart, weekEnd);
  const { data: defaults } = useAvailabilityDefaults();
  const setAvailability = useSetAvailability(weekStart);

  // Keep the selected day inside the visible week when paging.
  const activeDay = dayKeys.has(selectedDay) ? selectedDay : weekStart;

  const lookup = useMemo(
    () =>
      buildAvailabilityLookup(rows ?? [], defaults ?? [], (day) =>
        weekdayIndex(new Date(`${day}T00:00:00`)),
      ),
    [rows, defaults],
  );

  const roster = useMemo(() => members ?? [], [members]);
  const rosterIds = useMemo(() => roster.map((m) => m.id), [roster]);

  const gridRows: GridRow[] = useMemo(
    () =>
      roster.map((member) => ({
        id: member.id,
        label: member.username,
        sublabel: member.id === userId ? t("you") : undefined,
        editable: member.id === userId,
      })),
    [roster, userId, t],
  );

  // Stable identity: the grid re-binds its pointerup listener whenever this
  // changes, and it changes on every render otherwise.
  const mutateAvailability = setAvailability.mutate;
  const onPaint = useCallback(
    (cells: CellAddress[], status: AvailabilityStatus | null) =>
      mutateAvailability(
        cells.map((cell) => ({ day: activeDay, hour: cell.hour, status })),
      ),
    [mutateAvailability, activeDay],
  );

  const shortDate = (date: Date) =>
    date.toLocaleDateString(formattingLocale(locale), {
      day: "numeric",
      month: "short",
    });
  const weekLabel = `${shortDate(anchor)} – ${shortDate(lastDay)}`;

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("loadError", { message: error.message })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("previousWeek")}
            onClick={() => setAnchor((current) => addDays(current, -7))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setAnchor(startOfWeek(new Date()));
              setSelectedDay(dateToKey(new Date()));
            }}
          >
            {t("thisWeek")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("nextWeek")}
            onClick={() => setAnchor((current) => addDays(current, 7))}
          >
            <ChevronRight />
          </Button>
          <span className="ml-2 text-sm font-medium tabular-nums">
            {weekLabel}
          </span>
        </div>

        <Button
          variant="secondary"
          disabled={!userId}
          onClick={() => setDefaultsOpen(true)}
        >
          <CalendarCog /> {t("editDefaults")}
        </Button>
      </div>

      {/* Day chooser. Hourly markers only read well one day at a time, so the
          week is navigated above and drilled into here. */}
      <div className="flex flex-wrap gap-1">
        {days.map((date) => {
          const key = dateToKey(date);
          const isActive = key === activeDay;
          const fullHouseHours = DAY_HOURS.filter((hour) =>
            isFullHouse(
              summariseSlot(rosterIds, key, hour, lookup),
              rosterIds.length,
            ),
          ).length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDay(key)}
              className={cn(
                "flex min-w-20 flex-col items-center rounded-md border px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border hover:bg-muted",
              )}
            >
              <span>
                {date.toLocaleDateString(formattingLocale(locale), {
                  weekday: "short",
                })}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {date.toLocaleDateString(formattingLocale(locale), {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              {fullHouseHours > 0 ? (
                <span className="mt-0.5 text-[0.65rem] font-medium text-emerald-600 dark:text-emerald-400">
                  {t("fullHouseHours", { count: fullHouseHours })}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : roster.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noMembers")}</p>
      ) : (
        <AvailabilityGrid
          rows={gridRows}
          statusAt={(rowId, hour) => lookup.statusAt(rowId, activeDay, hour)}
          isDefaulted={(rowId, hour) =>
            lookup.isDefaulted(rowId, activeDay, hour)
          }
          onPaint={onPaint}
          footerLabel={t("teamOverlap")}
          renderFooter={(hour) => {
            const summary = summariseSlot(rosterIds, activeDay, hour, lookup);
            const full = isFullHouse(summary, rosterIds.length);
            return (
              <div
                title={t("overlapTooltip", {
                  hour: hourLabel(hour),
                  available: summary.available,
                  total: rosterIds.length,
                })}
                className={cn(
                  "mx-auto flex h-6 w-full items-center justify-center rounded-[3px] text-[0.65rem] font-semibold tabular-nums",
                  full
                    ? "bg-emerald-500 text-white"
                    : "bg-muted/60 text-muted-foreground",
                )}
              >
                {summary.available}
              </div>
            );
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {LEGEND.map((entry) => (
          <span key={entry} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block size-3 rounded-[3px]",
                entry === "unset"
                  ? "bg-muted/40 ring-1 ring-border"
                  : STATUS_CLASS[entry].split(" ")[0],
              )}
            />
            {t(`status.${entry}`)}
          </span>
        ))}
        <span className="ml-auto">{t("paintHint")}</span>
      </div>

      <AvailabilityDefaultsDialog
        open={defaultsOpen}
        onOpenChange={setDefaultsOpen}
        userId={userId}
        defaults={defaults ?? []}
      />
    </div>
  );
}
