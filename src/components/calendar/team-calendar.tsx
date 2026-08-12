"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  EventDialog,
  type EventDialogState,
} from "@/components/calendar/event-dialog";
import { ScheduleGrid } from "@/components/calendar/schedule-grid";
import { ScheduleMonth } from "@/components/calendar/schedule-month";
import {
  ScheduleToolbar,
  type ScheduleView,
} from "@/components/calendar/schedule-toolbar";
import { TimezonePicker } from "@/components/calendar/timezone-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAddChillDay, useRemoveChillDay } from "@/hooks/use-chill-days";
import { useClearRange } from "@/hooks/use-events";
import { useSchedule, type DateRange } from "@/hooks/use-schedule";
import { useMembers } from "@/hooks/use-team";
import { useSetOwnZone, useSetTeamZone, useZones } from "@/hooks/use-timezone";
import { formattingLocale } from "@/i18n/config";
import { addDays, startOfWeek } from "@/lib/availability";
import { occurrenceKey, type EventOccurrence } from "@/lib/events";
import { slotInstant, slotLabelInZone } from "@/lib/timezone";

const CLOSED: EventDialogState = {
  open: false,
  event: null,
  occurrenceDate: null,
  range: null,
};

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function TeamCalendar({ canManage }: { canManage: boolean }) {
  const t = useTranslations("calendar");
  const locale = useLocale();

  const [view, setView] = useState<ScheduleView>("week");
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [monthRange, setMonthRange] = useState<DateRange | null>(null);

  const {
    events,
    isPending,
    error,
    now,
    teamZone,
    clearPlan,
    occurrences,
    monthInputs,
    chillBackground,
    scheduleDays,
  } = useSchedule({ anchor, view, monthRange, locale });

  const { data: members } = useMembers();
  const clearRange = useClearRange();
  const addChillDay = useAddChillDay();
  const removeChillDay = useRemoveChillDay();
  const { viewZone } = useZones();
  const setOwnZone = useSetOwnZone();
  const setTeamZone = useSetTeamZone();
  const [dialog, setDialog] = useState<EventDialogState>(CLOSED);
  const [clearOpen, setClearOpen] = useState(false);
  const [chillPrompt, setChillPrompt] = useState<{
    day: string;
    weekday: string;
    isChill: boolean;
  } | null>(null);

  // Ids that no longer resolve to a bench member are simply untagged — the
  // column has no foreign key, so a removed player can leave one behind.
  const benchTagsFor = useMemo(() => {
    const roles = new Map<string, "substitute" | "trial">();
    for (const member of members ?? []) {
      if (member.role === "substitute" || member.role === "trial") {
        roles.set(member.id, member.role);
      }
    }
    return (occurrence: EventOccurrence) => {
      const found = occurrence.event.substitute_ids
        .map((id) => roles.get(id))
        .filter((role) => role !== undefined);
      // One tag per distinct bench role, so two subs read as a single "SUB".
      return [...new Set(found)].map((role) => t(`roleTag.${role}`));
    };
  }, [members, t]);

  const openCreate = (draft: EventDialogState["range"]) =>
    setDialog({ open: true, event: null, occurrenceDate: null, range: draft });

  const openEvent = (eventId: string, occurrenceDate: string | null) => {
    const row = events?.find((event) => event.id === eventId);
    if (row) {
      setDialog({ open: true, event: row, occurrenceDate, range: null });
    }
  };

  const shortDate = (date: Date) =>
    date.toLocaleDateString(formattingLocale(locale), {
      day: "numeric",
      month: "short",
    });
  const weekLabel = `${shortDate(anchor)} – ${shortDate(addDays(anchor, 6))}`;

  const picker = (compact: boolean) => (
    <TimezonePicker
      teamZone={teamZone}
      viewZone={viewZone}
      onSelect={(zone) => setOwnZone.mutate(zone)}
      onMakeTeamDefault={
        canManage ? (zone) => setTeamZone.mutate(zone) : undefined
      }
      compact={compact}
    />
  );

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("loadError", { message: error.message })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ScheduleToolbar
        view={view}
        onViewChange={setView}
        weekLabel={weekLabel}
        onShiftWeek={(days) => setAnchor((current) => addDays(current, days))}
        onThisWeek={() => setAnchor(startOfWeek(new Date()))}
        canManage={canManage}
        clearDisabled={clearPlan.totalCount === 0}
        onClear={() => setClearOpen(true)}
        onNew={() => openCreate(null)}
        monthPicker={picker(false)}
      />

      <p className="text-sm text-muted-foreground">
        {isPending ? t("loading") : canManage ? t("hint") : t("hintReadOnly")}
      </p>

      {view === "week" ? (
        <ScheduleGrid
          days={scheduleDays}
          occurrences={occurrences}
          teamZone={teamZone}
          now={now}
          hourLabelFor={(dayKey, hour) =>
            slotLabelInZone(dayKey, hour, teamZone, viewZone)
          }
          onOpenOccurrence={(occurrence) =>
            openEvent(
              occurrence.event.id,
              occurrence.event.recurs_weekly
                ? occurrenceKey(occurrence.start, teamZone)
                : null,
            )
          }
          onCreateAt={
            canManage
              ? (dayKey, hour) => {
                  const start = slotInstant(dayKey, hour, teamZone);
                  const end = slotInstant(dayKey, hour + 1, teamZone);
                  if (start && end) openCreate({ start, end });
                }
              : undefined
          }
          onToggleChill={
            canManage
              ? (day) =>
                  setChillPrompt({
                    day: day.key,
                    weekday: capitalize(
                      new Date(`${day.key}T12:00:00`).toLocaleDateString(
                        formattingLocale(locale),
                        { weekday: "long" },
                      ),
                    ),
                    isChill: day.isChill,
                  })
              : undefined
          }
          tagsFor={benchTagsFor}
          cornerSlot={picker(true)}
        />
      ) : (
        <ScheduleMonth
          events={[...monthInputs, ...chillBackground]}
          viewZone={viewZone}
          onDatesSet={setMonthRange}
          // Recurring occurrences carry ids of the form `<eventId>::<date>`.
          onEventClick={(id) => {
            const [eventId, occurrenceDate] = id.split("::");
            if (eventId) openEvent(eventId, occurrenceDate ?? null);
          }}
        />
      )}

      <EventDialog
        state={dialog}
        readOnly={!canManage}
        onClose={() => setDialog(CLOSED)}
      />

      <ConfirmDialog
        open={chillPrompt !== null}
        onOpenChange={(open) => !open && setChillPrompt(null)}
        title={
          chillPrompt?.isChill
            ? t("chillRemoveTitle", { weekday: chillPrompt.weekday })
            : t("chillMakeTitle", { weekday: chillPrompt?.weekday ?? "" })
        }
        description={
          chillPrompt?.isChill
            ? t("chillRemoveDescription")
            : t("chillMakeDescription")
        }
        cancelLabel={t("chillNo")}
        confirmLabel={
          chillPrompt?.isChill ? t("chillRemoveConfirm") : t("chillYes")
        }
        disabled={addChillDay.isPending || removeChillDay.isPending}
        onConfirm={() => {
          if (!chillPrompt) return;
          const toggle = chillPrompt.isChill ? removeChillDay : addChillDay;
          toggle.mutate(chillPrompt.day);
          setChillPrompt(null);
        }}
      />

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title={t("clearTitle", { range: view })}
        description={t("clearDescription", { count: clearPlan.totalCount })}
        cancelLabel={t("cancel")}
        confirmLabel={t("clearConfirm", { count: clearPlan.totalCount })}
        disabled={clearRange.isPending}
        onConfirm={() => {
          clearRange.mutate(clearPlan);
          setClearOpen(false);
        }}
      />
    </div>
  );
}
