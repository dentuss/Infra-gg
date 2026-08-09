"use client";

import { Check, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  TEAM_ZONES,
  zoneAbbreviation,
  zoneCityName,
  zoneOffsetHours,
} from "@/lib/timezone";
import { cn } from "@/lib/utils";

function offsetLabel(hours: number): string {
  if (hours === 0) return "";
  const sign = hours > 0 ? "+" : "−";
  return `${sign}${Math.abs(hours)}h`;
}

/**
 * Sits in the corner above the hour labels. Changing it only changes how times
 * are *shown* — availability stays anchored to the team's zone, so nobody's
 * markers move when someone else switches their view.
 */
export function TimezonePicker({
  teamZone,
  viewZone,
  onSelect,
  onMakeTeamDefault,
  compact = false,
}: {
  teamZone: string;
  viewZone: string;
  onSelect: (zone: string | null) => void;
  /** Staff only; omitted for everyone else. */
  onMakeTeamDefault?: (zone: string) => void;
  compact?: boolean;
}) {
  const t = useTranslations("timezone");

  // Any zone already in use is offered even if it is not on the curated list,
  // so a hand-set value never disappears from the menu.
  const zones = useMemo(() => {
    const all = new Set<string>(TEAM_ZONES);
    all.add(teamZone);
    all.add(viewZone);
    return [...all];
  }, [teamZone, viewZone]);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("label")}
            title={t("hint")}
            className={cn(
              "gap-1 px-1.5 text-xs font-medium text-muted-foreground",
              compact && "w-full",
            )}
          >
            <Globe className="size-3.5" />
            {zoneAbbreviation(viewZone)}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-64 p-1">
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          {t("description")}
        </p>
        <ul className="flex flex-col">
          {zones.map((zone) => {
            const selected = zone === viewZone;
            const offset = offsetLabel(zoneOffsetHours(teamZone, zone));
            return (
              <li key={zone}>
                <button
                  type="button"
                  onClick={() => onSelect(zone === teamZone ? null : zone)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                    selected && "font-medium",
                  )}
                >
                  <Check
                    className={cn(
                      "size-3.5 shrink-0",
                      selected ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1 truncate">{zoneCityName(zone)}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {zoneAbbreviation(zone)}
                    {offset ? ` ${offset}` : ""}
                  </span>
                  {zone === teamZone ? (
                    <span className="rounded-sm bg-primary/15 px-1 text-[0.6rem] font-semibold uppercase">
                      {t("teamTag")}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {onMakeTeamDefault && viewZone !== teamZone ? (
          <>
            <div className="my-1 h-px bg-border" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => onMakeTeamDefault(viewZone)}
            >
              {t("makeDefault", { zone: zoneCityName(viewZone) })}
            </Button>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
