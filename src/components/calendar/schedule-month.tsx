"use client";

import type {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import enGbLocale from "@fullcalendar/core/locales/en-gb";
import ruLocale from "@fullcalendar/core/locales/ru";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
// FullCalendar only understands "local" and "UTC" on its own; named IANA zones
// need a plugin. Luxon reads zone data from the browser's Intl rather than
// shipping its own database.
import luxonPlugin from "@fullcalendar/luxon3";
import FullCalendar from "@fullcalendar/react";
import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";

function renderEventContent(arg: EventContentArg) {
  return (
    <div className="truncate px-1 font-semibold">
      {arg.timeText ? `${arg.timeText} ` : ""}
      {arg.event.title}
    </div>
  );
}

/**
 * The month overview, still FullCalendar's.
 *
 * The week view is ours because it has to agree cell-for-cell with the
 * availability grid; a month grid has no such constraint, so there is nothing
 * to gain from rebuilding it.
 */
export function ScheduleMonth({
  events,
  viewZone,
  onDatesSet,
  onEventClick,
}: {
  events: EventInput[];
  viewZone: string;
  onDatesSet: (range: { start: Date; end: Date }) => void;
  onEventClick: (eventId: string) => void;
}) {
  const locale = useLocale();
  const calendarRef = useRef<FullCalendar>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // FullCalendar only re-measures on window resize, so collapsing or expanding
  // the sidebar (an animated width change) leaves the grid at a stale width.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      calendarRef.current?.getApi().updateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin, luxonPlugin]}
        timeZone={viewZone}
        locale={locale === "ru" ? ruLocale : enGbLocale}
        initialView="dayGridMonth"
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        events={events}
        nextDayThreshold="10:00:00"
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        eventContent={renderEventContent}
        height="auto"
        datesSet={(arg: DatesSetArg) =>
          onDatesSet({ start: arg.view.activeStart, end: arg.view.activeEnd })
        }
        eventClick={(info: EventClickArg) => onEventClick(info.event.id)}
      />
    </div>
  );
}
