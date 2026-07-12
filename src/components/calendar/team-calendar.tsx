"use client";

import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import enGbLocale from "@fullcalendar/core/locales/en-gb";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  EventDialog,
  type EventDialogState,
} from "@/components/calendar/event-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteEvents, useEvents, useUpdateEvent } from "@/hooks/use-events";
import {
  chillDates,
  dateToKey,
  dayAfter,
  eventsInRange,
  toCalendarEvent,
} from "@/lib/events";

const CLOSED: EventDialogState = { open: false, event: null, range: null };

function renderEventContent(arg: EventContentArg) {
  const description = arg.event.extendedProps.description as string | null;
  const showDescription = description && arg.view.type === "timeGridWeek";

  return (
    <div className="flex flex-col gap-0.5 overflow-hidden px-1 py-0.5">
      <div className="truncate font-semibold">
        {arg.timeText ? `${arg.timeText} ` : ""}
        {arg.event.title}
      </div>
      {showDescription ? (
        <div className="line-clamp-3 text-[0.75rem] leading-tight opacity-80">
          {description}
        </div>
      ) : null}
    </div>
  );
}

export function TeamCalendar() {
  const { data: events, isPending, error } = useEvents();
  const updateEvent = useUpdateEvent();
  const deleteEvents = useDeleteEvents();
  const [dialog, setDialog] = useState<EventDialogState>(CLOSED);
  const [clearOpen, setClearOpen] = useState(false);
  const [viewRange, setViewRange] = useState<{
    type: string;
    start: Date;
    end: Date;
  } | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const chillList = useMemo(
    () =>
      events && viewRange
        ? chillDates(events, viewRange.start, viewRange.end)
        : [],
    [events, viewRange],
  );
  const chillSet = useMemo(() => new Set(chillList), [chillList]);

  const chillBackgroundEvents: EventInput[] = chillList.map((date) => ({
    id: `chill-${date}`,
    start: `${date}T00:00:00`,
    end: `${dayAfter(date)}T00:00:00`,
    display: "background",
    classNames: ["chill-bg"],
  }));

  const affectedByClear = useMemo(
    () =>
      events && viewRange
        ? eventsInRange(events, viewRange.start, viewRange.end)
        : [],
    [events, viewRange],
  );
  const rangeNoun = viewRange?.type === "dayGridMonth" ? "month" : "week";

  // FullCalendar only re-measures on window resize, so collapsing or
  // expanding the sidebar (an animated width change of the content area)
  // leaves the grid at a stale width — phantom columns or an overflowing
  // Sunday. Track the container size directly.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      calendarRef.current?.getApi().updateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const openCreate = (range: EventDialogState["range"]) =>
    setDialog({ open: true, event: null, range });

  const onSelect = (info: DateSelectArg) =>
    openCreate({ start: info.start, end: info.end });

  const onEventClick = (info: EventClickArg) => {
    const row = events?.find((event) => event.id === info.event.id);
    if (row) {
      setDialog({ open: true, event: row, range: null });
    }
  };

  const onEventMoved = (info: EventDropArg | EventResizeDoneArg) => {
    const start = info.event.start;
    if (!start) {
      info.revert();
      return;
    }
    updateEvent.mutate(
      {
        id: info.event.id,
        patch: {
          starts_at: start.toISOString(),
          ends_at: (info.event.end ?? start).toISOString(),
          all_day: info.event.allDay,
        },
      },
      { onError: () => info.revert() },
    );
  };

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Could not load the calendar: {error.message}
      </p>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isPending ? "Loading events…" : "Drag to create, click to edit."}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            disabled={affectedByClear.length === 0}
            onClick={() => setClearOpen(true)}
          >
            <Trash2 /> Clear {rangeNoun}
          </Button>
          <Button onClick={() => openCreate(null)}>
            <Plus /> New event
          </Button>
        </div>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        locale={enGbLocale}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,dayGridMonth",
        }}
        views={{
          timeGridWeek: { dayHeaderFormat: { weekday: "long" } },
        }}
        events={[
          ...(events?.map(toCalendarEvent) ?? []),
          ...chillBackgroundEvents,
        ]}
        datesSet={(arg: DatesSetArg) =>
          setViewRange({
            type: arg.view.type,
            start: arg.view.activeStart,
            end: arg.view.activeEnd,
          })
        }
        dayHeaderContent={(arg) => {
          if (
            arg.view.type !== "timeGridWeek" ||
            !chillSet.has(dateToKey(arg.date))
          ) {
            return arg.text;
          }
          return (
            <span className="flex items-center gap-1.5">
              {arg.text}
              <span className="chill-tag">chill day</span>
            </span>
          );
        }}
        selectable
        selectMirror
        editable
        nowIndicator
        allDaySlot={false}
        // The team is active from morning until well past midnight, so
        // the visible day runs 10:00 → 03:00 with the small hours at the
        // bottom of the previous day's column.
        slotMinTime="10:00:00"
        slotMaxTime="27:00:00"
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        eventContent={renderEventContent}
        height="auto"
        select={onSelect}
        eventClick={onEventClick}
        eventDrop={onEventMoved}
        eventResize={onEventMoved}
      />

      <EventDialog state={dialog} onClose={() => setDialog(CLOSED)} />

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this {rangeNoun}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {affectedByClear.length} event
              {affectedByClear.length === 1 ? "" : "s"} in the visible{" "}
              {rangeNoun}. Recurring series that touch this {rangeNoun} are
              deleted entirely. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteEvents.isPending}
              onClick={() =>
                deleteEvents.mutate(affectedByClear.map((event) => event.id))
              }
            >
              Delete {affectedByClear.length} event
              {affectedByClear.length === 1 ? "" : "s"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
