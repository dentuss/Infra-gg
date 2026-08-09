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
  zoneGmtLabel,
} from "@/lib/timezone";
import { cn } from "@/lib/utils";

/** Short name over the offset — the name is what people read first. */
function ZoneStamp({ zone, className }: { zone: string; className?: string }) {
  const abbreviation = zoneAbbreviation(zone);
  const gmt = zoneGmtLabel(zone);
  return (
    <span className={cn("flex flex-col items-end leading-tight", className)}>
      <span className="text-xs font-semibold">{abbreviation}</span>
      {gmt !== abbreviation ? (
        <span className="text-[0.65rem] font-normal text-muted-foreground tabular-nums">
          {gmt}
        </span>
      ) : null}
    </span>
  );
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
              "h-auto gap-1 px-1.5 py-1 text-muted-foreground",
              compact && "w-full",
            )}
          >
            <Globe className="size-3.5 shrink-0" />
            <ZoneStamp zone={viewZone} className="items-start" />
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
                  {zone === teamZone ? (
                    <span className="rounded-sm bg-primary/15 px-1 text-[0.6rem] font-semibold uppercase">
                      {t("teamTag")}
                    </span>
                  ) : null}
                  <ZoneStamp zone={zone} />
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
