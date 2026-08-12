"use client";

import { DateTime } from "luxon";
import { useTranslations } from "next-intl";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrentMinute } from "@/hooks/use-current-minute";
import { useTeamZone } from "@/hooks/use-timezone";
import { FALLBACK_ZONE, zoneAbbreviation } from "@/lib/timezone";

/**
 * The current time where the team schedules, so someone in Moscow can see at a
 * glance what "20:00" means to everyone else. Always the team's zone, never the
 * reader's — that is the point of it.
 */
export function TeamClock() {
  const t = useTranslations("timezone");
  const { data: teamZone } = useTeamZone();
  const zone = teamZone ?? FALLBACK_ZONE;

  const now = useCurrentMinute();

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
