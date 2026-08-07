"use client";

import { CalendarCog, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { AvailabilityDefaultsDialog } from "@/components/calendar/availability-defaults-dialog";
import {
  AvailabilityGrid,
  STATUS_CLASS,
  type CellAddress,
  type GridColumn,
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
  nextStatus,
  startOfWeek,
  summariseSlot,
  weekdayIndex,
  weekDays,
  type AvailabilityStatus,
} from "@/lib/availability";
import { cn } from "@/lib/utils";

/** Pseudo-subject in the player picker: the whole roster at once. */
const OVERLAP = "__overlap__";

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
  const [subject, setSubject] = useState<string | null>(null);
  const [defaultsOpen, setDefaultsOpen] = useState(false);

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const lastDay = useMemo(() => addDays(anchor, 6), [anchor]);
  const weekStart = dateToKey(anchor);
  const weekEnd = dateToKey(lastDay);
  const today = dateToKey(new Date());

  const { data: members } = useMembers();
  const {
    data: rows,
    isPending,
    error,
  } = useWeekAvailability(weekStart, weekEnd);
  const { data: defaults } = useAvailabilityDefaults();
  const setAvailability = useSetAvailability(weekStart);

  const roster = useMemo(() => members ?? [], [members]);
  const rosterIds = useMemo(() => roster.map((member) => member.id), [roster]);

  // Default to your own week; fall back to the first player for anyone who is
  // not on the roster (a signed-in account still awaiting an invite).
  const activeSubject = subject ?? userId ?? rosterIds[0] ?? OVERLAP;
  const isOverlap = activeSubject === OVERLAP;
  const editable = !isOverlap && activeSubject === userId;

  const lookup = useMemo(
    () =>
      buildAvailabilityLookup(rows ?? [], defaults ?? [], (day) =>
        weekdayIndex(new Date(`${day}T00:00:00`)),
      ),
    [rows, defaults],
  );

  const columns: GridColumn[] = useMemo(
    () =>
      days.map((date) => {
        const key = dateToKey(date);
        return {
          key,
          label: date.toLocaleDateString(formattingLocale(locale), {
            weekday: "short",
          }),
          sublabel: date.toLocaleDateString(formattingLocale(locale), {
            day: "numeric",
            month: "short",
          }),
          highlight: key === today,
        };
      }),
    [days, locale, today],
  );

  const statusAt = useCallback(
    (columnKey: string, hour: number) =>
      isOverlap ? null : lookup.statusAt(activeSubject, columnKey, hour),
    [isOverlap, lookup, activeSubject],
  );

  const mutateAvailability = setAvailability.mutate;
  const onPaint = useCallback(
    (cells: CellAddress[], status: AvailabilityStatus | null) =>
      mutateAvailability(
        cells.map((cell) => ({
          day: cell.columnKey,
          hour: cell.hour,
          status,
        })),
      ),
    [mutateAvailability],
  );

  // A day header sets the entire column, taking its cue from the first hour so
  // the click is predictable rather than depending on where the day is mixed.
  const onCycleColumn = useCallback(
    (columnKey: string) => {
      const first = DAY_HOURS[0];
      if (first === undefined) return;
      const target = nextStatus(
        lookup.statusAt(activeSubject, columnKey, first),
      );
      mutateAvailability(
        DAY_HOURS.map((hour) => ({ day: columnKey, hour, status: target })),
      );
    },
    [lookup, activeSubject, mutateAvailability],
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
            onClick={() => setAnchor(startOfWeek(new Date()))}
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

      {/* Whose week is on screen. Only your own is editable; the rest are
          there to be read. */}
      <div
        role="tablist"
        aria-label={t("whoseWeek")}
        className="flex flex-wrap gap-1"
      >
        {roster.map((member) => {
          const selected = member.id === activeSubject;
          return (
            <Button
              key={member.id}
              role="tab"
              aria-selected={selected}
              size="sm"
              variant={selected ? "default" : "outline"}
              onClick={() => setSubject(member.id)}
            >
              {member.username}
              {member.id === userId ? (
                <span className="opacity-70">{t("you")}</span>
              ) : null}
            </Button>
          );
        })}
        {roster.length > 0 ? (
          <Button
            role="tab"
            aria-selected={isOverlap}
            size="sm"
            variant={isOverlap ? "default" : "outline"}
            onClick={() => setSubject(OVERLAP)}
          >
            <Users /> {t("everyone")}
          </Button>
        ) : null}
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : roster.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noMembers")}</p>
      ) : (
        <AvailabilityGrid
          columns={columns}
          editable={editable}
          statusAt={statusAt}
          isDefaulted={(columnKey, hour) =>
            !isOverlap && lookup.isDefaulted(activeSubject, columnKey, hour)
          }
          onPaint={editable ? onPaint : undefined}
          onCycleColumn={editable ? onCycleColumn : undefined}
          renderCell={
            isOverlap
              ? (columnKey, hour) => {
                  const summary = summariseSlot(
                    rosterIds,
                    columnKey,
                    hour,
                    lookup,
                  );
                  const full = isFullHouse(summary, rosterIds.length);
                  return (
                    <div
                      title={t("overlapTooltip", {
                        hour: hourLabel(hour),
                        available: summary.available,
                        total: rosterIds.length,
                      })}
                      className={cn(
                        "flex h-6 w-full items-center justify-center rounded-[3px] text-[0.65rem] font-semibold tabular-nums",
                        full
                          ? "bg-emerald-500 text-white"
                          : summary.available > 0
                            ? "bg-emerald-500/25 text-foreground"
                            : "bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {summary.available > 0 ? summary.available : ""}
                    </div>
                  );
                }
              : undefined
          }
        />
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {isOverlap ? (
          <span>{t("overlapLegend")}</span>
        ) : (
          LEGEND.map((entry) => (
            <span key={entry} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block size-3 rounded-[3px]",
                  entry === "unset"
                    ? "bg-muted/40 ring-1 ring-border"
                    : STATUS_CLASS[entry],
                )}
              />
              {t(`status.${entry}`)}
            </span>
          ))
        )}
        {editable ? <span className="ml-auto">{t("paintHint")}</span> : null}
        {!editable && !isOverlap ? (
          <span className="ml-auto">{t("readOnly")}</span>
        ) : null}
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
