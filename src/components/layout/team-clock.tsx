"use client";

import { DateTime } from "luxon";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTeamZone } from "@/hooks/use-timezone";
import { FALLBACK_ZONE, zoneAbbreviation } from "@/lib/timezone";

// One ticker for every clock on the page, aligned to the minute boundary so
// the display never sits a stale minute behind. Kept outside React because a
// clock is an external source, not derived state.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function scheduleNextMinute() {
  timer = setTimeout(
    () => {
      listeners.forEach((listener) => listener());
      scheduleNextMinute();
    },
    60_000 - (Date.now() % 60_000),
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) scheduleNextMinute();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
}

/** Stable within a minute, so re-renders only happen when the display changes. */
const currentMinute = (): number | null => Math.floor(Date.now() / 60_000);
/** Null on the server: the two clocks would disagree and hydration would warn. */
const noMinuteOnServer = (): number | null => null;

/**
 * The current time where the team schedules, so someone in Moscow can see at a
 * glance what "20:00" means to everyone else. Always the team's zone, never the
 * reader's — that is the point of it.
 */
export function TeamClock() {
  const t = useTranslations("timezone");
  const { data: teamZone } = useTeamZone();
  const zone = teamZone ?? FALLBACK_ZONE;

  const minute = useSyncExternalStore(
    subscribe,
    currentMinute,
    noMinuteOnServer,
  );
  const now = minute === null ? null : new Date(minute * 60_000);

  const time = now
    ? DateTime.fromJSDate(now, { zone }).toFormat("HH:mm")
    : "--:--";
  const abbreviation = zoneAbbreviation(zone, now ?? undefined);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          // tabIndex so the hint is reachable by keyboard, and aria-label so it
          // is not the only way to learn whose time this is.
          <span
            tabIndex={0}
            aria-label={`${t("teamTime")}: ${time} ${abbreviation}`}
            className="flex w-fit items-baseline gap-1.5 rounded-md px-2 py-1 text-xs"
          >
            <span className="font-medium tabular-nums">{time}</span>
            <span className="text-[0.65rem] font-semibold text-muted-foreground">
              {abbreviation}
            </span>
          </span>
        }
      />
      <TooltipContent side="right">{t("teamTime")}</TooltipContent>
    </Tooltip>
  );
}
