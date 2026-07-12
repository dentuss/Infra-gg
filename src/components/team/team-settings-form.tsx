"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateTeamName } from "@/hooks/use-team";

export function TeamSettingsForm({ initialName }: { initialName: string }) {
  const t = useTranslations("team");
  const router = useRouter();
  const updateName = useUpdateTeamName();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);

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
