"use client";

import { CalendarDays, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AvailabilityPanel } from "@/components/calendar/availability-panel";
import { TeamCalendar } from "@/components/calendar/team-calendar";
import { Button } from "@/components/ui/button";

type Section = "schedule" | "availability";

export function CalendarSections({
  canManage,
  userId,
}: {
  canManage: boolean;
  userId: string | null;
}) {
  const t = useTranslations("calendar");
  const [section, setSection] = useState<Section>("schedule");

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={t("sections")}
        className="inline-flex w-fit gap-1 rounded-lg bg-muted/60 p-1"
      >
        {(["schedule", "availability"] as const).map((value) => {
          const Icon = value === "schedule" ? CalendarDays : Users;
          const selected = section === value;
          return (
            <Button
              key={value}
              role="tab"
              aria-selected={selected}
              variant={selected ? "default" : "ghost"}
              size="sm"
              onClick={() => setSection(value)}
            >
              <Icon /> {t(`section.${value}`)}
            </Button>
          );
        })}
      </div>

      {section === "schedule" ? (
        <TeamCalendar canManage={canManage} />
      ) : (
        <AvailabilityPanel userId={userId} canManage={canManage} />
      )}
    </div>
  );
}
