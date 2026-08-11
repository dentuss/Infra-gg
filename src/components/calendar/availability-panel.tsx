"use client";

import { CalendarCog, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { AvailabilityDefaultsDialog } from "@/components/calendar/availability-defaults-dialog";
import {
  AvailabilityGrid,
  ROW_HEIGHT,
  type CellAddress,
  type GridColumn,
} from "@/components/calendar/availability-grid";
import {
  EventDialog,
  type EventDialogState,
} from "@/components/calendar/event-dialog";
import {
  MarkerPicker,
  STATUS_CLASS,
  type Marker,
} from "@/components/calendar/marker-picker";
import { TimezonePicker } from "@/components/calendar/timezone-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAvailabilityDefaults,
  useSetAvailability,
  useWeekAvailability,
} from "@/hooks/use-availability";
import { useMembers } from "@/hooks/use-team";
import { useSetOwnZone, useSetTeamZone, useZones } from "@/hooks/use-timezone";
import { formattingLocale } from "@/i18n/config";
import {
  addDays,
  buildAvailabilityLookup,
  dateToKey,
  DAY_HOURS,
  isFullHouse,
  startOfWeek,
  STATUS_ORDER,
  summariseSlot,
  weekdayIndex,
  weekDays,
} from "@/lib/availability";
import { slotInstant, slotLabelInZone } from "@/lib/timezone";
import { cn } from "@/lib/utils";

/** Pseudo-subject in the player picker: the whole roster at once. */
const OVERLAP = "__overlap__";

export function AvailabilityPanel({
  userId,
  canManage,
}: {
  userId: string | null;
  canManage: boolean;
}) {
  const t = useTranslations("availability");
  const locale = useLocale();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [subject, setSubject] = useState<string | null>(null);
  const [marker, setMarker] = useState<Marker>(STATUS_ORDER[0] ?? null);
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [eventDialog, setEventDialog] = useState<EventDialogState | null>(null);

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
  const setAvailability = useSetAvailability(weekStart, userId);

  const { teamZone, viewZone } = useZones();
  const setOwnZone = useSetOwnZone();
  const setTeamZone = useSetTeamZone();

  // Slots are stored against the team's zone; a viewer elsewhere sees the same
  // slots relabelled rather than shifted onto a different night.
  const hourLabelFor = useCallback(
    (columnKey: string, hour: number) =>
      slotLabelInZone(columnKey, hour, teamZone, viewZone),
    [teamZone, viewZone],
  );

  const roster = useMemo(() => members ?? [], [members]);
  const rosterIds = useMemo(() => roster.map((member) => member.id), [roster]);

  // id -> nickname, for both the dropdown's options and the label its trigger
  // shows for the current selection.
  const playerLabels = useMemo(
    () =>
      Object.fromEntries(
        roster.map((member) => [
          member.id,
          member.id === userId
            ? `${member.username} ${t("you")}`
            : member.username,
        ]),
      ),
    [roster, userId, t],
  );

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
    (cells: CellAddress[], status: Marker) =>
      mutateAvailability(
        cells.map((cell) => ({ day: cell.columnKey, hour: cell.hour, status })),
      ),
    [mutateAvailability],
  );

  const onPaintColumn = useCallback(
    (columnKey: string) =>
      mutateAvailability(
        DAY_HOURS.map((hour) => ({ day: columnKey, hour, status: marker })),
      ),
    [mutateAvailability, marker],
  );

  // Wipes only the week on screen, not the player's whole history.
  const onClearAll = useCallback(
    () =>
      mutateAvailability(
        days.flatMap((date) =>
          DAY_HOURS.map((hour) => ({
            day: dateToKey(date),
            hour,
            status: null,
          })),
        ),
      ),
    [mutateAvailability, days],
  );

  // slotInstant resolves the slot against the TEAM zone, so the event lands on
  // the hour the grid is showing rather than the browser's idea of it.
  const scheduleSlot = useCallback(
    (day: string, hour: number) => {
      const start = slotInstant(day, hour, teamZone);
      const end = slotInstant(day, hour + 1, teamZone);
      if (!start || !end) return;
      setEventDialog({
        open: true,
        event: null,
        occurrenceDate: null,
        range: { start, end },
      });
    },
    [teamZone],
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

  // A rejected zone write used to fail silently, which is exactly how the
  // missing column grant went unnoticed.
  const zoneError = setOwnZone.error ?? setTeamZone.error;

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

        <div className="flex items-center gap-2">
          {/* Whose week is on screen. Only your own is editable. */}
          <Select
            // Select.Value renders the raw value unless Root can resolve a
            // label for it — without this the trigger shows a bare user id.
            items={playerLabels}
            value={isOverlap ? null : activeSubject}
            onValueChange={(next) => next && setSubject(next)}
          >
            <SelectTrigger aria-label={t("whoseWeek")} className="min-w-44">
              <SelectValue placeholder={t("pickPlayer")} />
            </SelectTrigger>
            <SelectContent>
              {roster.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {playerLabels[member.id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Kept out of the dropdown: it is the view staff reach for most. */}
          <Button
            variant={isOverlap ? "default" : "outline"}
            aria-pressed={isOverlap}
            onClick={() => setSubject(OVERLAP)}
          >
            <Users /> {t("everyone")}
          </Button>

          <Button
            variant="secondary"
            disabled={!userId}
            onClick={() => setDefaultsOpen(true)}
          >
            <CalendarCog /> {t("editDefaults")}
          </Button>
        </div>
      </div>

      {editable ? (
        <MarkerPicker
          value={marker}
          onChange={setMarker}
          onClearAll={onClearAll}
          clearAllTitle={t("clearWeekTitle")}
          clearAllDescription={t("clearWeekDescription", { week: weekLabel })}
        />
      ) : null}

      {isPending ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : roster.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noMembers")}</p>
      ) : (
        <AvailabilityGrid
          columns={columns}
          editable={editable}
          marker={marker}
          statusAt={statusAt}
          isDefaulted={(columnKey, hour) =>
            !isOverlap && lookup.isDefaulted(activeSubject, columnKey, hour)
          }
          onPaint={editable ? onPaint : undefined}
          onPaintColumn={editable ? onPaintColumn : undefined}
          hourLabelFor={hourLabelFor}
          cornerSlot={
            <TimezonePicker
              teamZone={teamZone}
              viewZone={viewZone}
              onSelect={(zone) => setOwnZone.mutate(zone)}
              onMakeTeamDefault={
                canManage ? (zone) => setTeamZone.mutate(zone) : undefined
              }
              compact
            />
          }
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
                  const bookable = full && canManage;
                  const shared = cn(
                    ROW_HEIGHT,
                    "flex w-full items-center justify-center rounded-[4px] text-xs font-semibold tabular-nums",
                    full
                      ? "bg-emerald-500 text-white"
                      : summary.available > 0
                        ? "bg-emerald-500/25 text-foreground"
                        : "bg-muted/40 text-muted-foreground",
                  );
                  const count = summary.available > 0 ? summary.available : "";

                  if (bookable) {
                    return (
                      <button
                        type="button"
                        title={t("scheduleSlot", {
                          hour: hourLabelFor(columnKey, hour),
                        })}
                        onClick={() => scheduleSlot(columnKey, hour)}
                        className={cn(
                          shared,
                          "cursor-pointer transition-colors hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        )}
                      >
                        {count}
                      </button>
                    );
                  }
                  return (
                    <div
                      title={t("overlapTooltip", {
                        hour: hourLabelFor(columnKey, hour),
                        available: summary.available,
                        total: rosterIds.length,
                      })}
                      className={shared}
                    >
                      {count}
                    </div>
                  );
                }
              : undefined
          }
        />
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {isOverlap ? (
          <span>
            {canManage ? t("overlapLegendBookable") : t("overlapLegend")}
          </span>
        ) : editable ? (
          <span>{t("paintHint")}</span>
        ) : (
          <>
            <span>{t("readOnly")}</span>
            <span className="flex items-center gap-3">
              {STATUS_ORDER.map((status) => (
                <span key={status} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-block size-3 rounded-[3px]",
                      STATUS_CLASS[status],
                    )}
                  />
                  {t(`status.${status}`)}
                </span>
              ))}
            </span>
          </>
        )}
      </div>

      {zoneError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("zoneError", { message: zoneError.message })}
        </p>
      ) : null}

      {eventDialog ? (
        <EventDialog state={eventDialog} onClose={() => setEventDialog(null)} />
      ) : null}

      <AvailabilityDefaultsDialog
        open={defaultsOpen}
        onOpenChange={setDefaultsOpen}
        userId={userId}
        defaults={defaults ?? []}
      />
    </div>
  );
}
