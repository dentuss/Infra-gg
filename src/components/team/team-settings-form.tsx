"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateTeamName } from "@/hooks/use-team";
import { useSetTeamZone, useTeamZone } from "@/hooks/use-timezone";
import {
  FALLBACK_ZONE,
  TEAM_ZONES,
  zoneAbbreviation,
  zoneCityName,
  zoneGmtLabel,
} from "@/lib/timezone";

export function TeamSettingsForm({ initialName }: { initialName: string }) {
  const t = useTranslations("team");
  const tZone = useTranslations("timezone");
  const router = useRouter();
  const updateName = useUpdateTeamName();
  const { data: teamZone } = useTeamZone();
  const setTeamZone = useSetTeamZone();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);

  const zone = teamZone ?? FALLBACK_ZONE;
  // Whatever the team is already on stays selectable even off the curated list.
  const zoneOptions = [...new Set<string>([...TEAM_ZONES, zone])];
  const zoneLabels = Object.fromEntries(
    zoneOptions.map((option) => [
      option,
      `${zoneCityName(option)} · ${zoneAbbreviation(option)} ${zoneGmtLabel(option)}`,
    ]),
  );

  const onSubmit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await updateName.mutateAsync(trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // The sidebar renders the team name on the server.
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="team-name">{t("nameLabel")}</Label>
        <Input
          id="team-name"
          value={name}
          maxLength={40}
          onChange={(changeEvent) => setName(changeEvent.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="team-timezone">{tZone("teamLabel")}</Label>
        <Select
          items={zoneLabels}
          value={zone}
          onValueChange={(next) => next && setTeamZone.mutate(next)}
        >
          <SelectTrigger id="team-timezone" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {zoneOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {zoneLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {tZone("teamDescription")}
        </p>
        {setTeamZone.error ? (
          <p role="alert" className="text-sm text-destructive">
            {setTeamZone.error.message}
          </p>
        ) : null}
      </div>

      {updateName.error ? (
        <p role="alert" className="text-sm text-destructive">
          {updateName.error.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={updateName.isPending}>
          {updateName.isPending ? t("saving") : t("save")}
        </Button>
        {saved ? (
          <span className="text-sm text-muted-foreground">{t("saved")}</span>
        ) : null}
      </div>
    </form>
  );
}
