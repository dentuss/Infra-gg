import { LocalTime } from "@/components/local-time";
import type { EventOccurrence } from "@/lib/events";

export function UpcomingList({
  occurrences,
}: {
  occurrences: EventOccurrence[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {occurrences.map(({ event, start }) => (
        <li
          key={`${event.id}-${start.toISOString()}`}
          className="flex items-baseline justify-between gap-3 border border-border p-2 text-sm"
        >
          <span className="truncate font-medium">{event.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            <LocalTime iso={start.toISOString()} />
          </span>
        </li>
      ))}
    </ul>
  );
}
