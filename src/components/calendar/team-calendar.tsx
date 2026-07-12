"use client";

import type {
  DateSelectArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
} from "@fullcalendar/core";
import enGbLocale from "@fullcalendar/core/locales/en-gb";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  EventDialog,
  type EventDialogState,
} from "@/components/calendar/event-dialog";
import { Button } from "@/components/ui/button";
import { useEvents, useUpdateEvent } from "@/hooks/use-events";
import { toCalendarEvent } from "@/lib/events";

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
  const [dialog, setDialog] = useState<EventDialogState>(CLOSED);
  const calendarRef = useRef<FullCalendar>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        <Button onClick={() => openCreate(null)}>
          <Plus /> New event
        </Button>
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
        events={events?.map(toCalendarEvent) ?? []}
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
    </div>
  );
}
