"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { UserAvatar } from "@/components/layout/user-avatar";
import { EditMemberDialog } from "@/components/team/edit-member-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMembers } from "@/hooks/use-team";
import type { Profile } from "@/lib/team";

const MAIN_ROSTER_SIZE = 5;

function OpenSlot({ label, pulse }: { label: string; pulse?: boolean }) {
  return (
    <div
      className={`flex min-h-48 items-center justify-center border border-dashed border-border p-4 text-xs tracking-wide text-muted-foreground uppercase ${pulse ? "animate-pulse" : ""}`}
    >
      {label}
    </div>
  );
}

export function RosterCards({ canManage = false }: { canManage?: boolean }) {
  const t = useTranslations("dashboard");
  const tRoles = useTranslations("roles");
  const { data: members, isPending } = useMembers();
  const [editTarget, setEditTarget] = useState<Profile | null>(null);

  // The starting five: the IGL plus up to four players get big cards.
  const mainRoster = [
    ...(members ?? []).filter((member) => member.role === "igl"),
    ...(members ?? []).filter((member) => member.role === "player"),
  ].slice(0, MAIN_ROSTER_SIZE);
  const emptySlots = MAIN_ROSTER_SIZE - mainRoster.length;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t("mainRosterTitle")}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {isPending
          ? Array.from({ length: MAIN_ROSTER_SIZE }, (_, index) => (
              <OpenSlot key={index} label="…" pulse />
            ))
          : null}

        {mainRoster.map((member) => (
          <Card key={member.id} className="relative">
            {canManage ? (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1"
                aria-label={t("editCard")}
                onClick={() => setEditTarget(member)}
              >
                <Pencil />
              </Button>
            ) : null}
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <UserAvatar
                username={member.username}
                avatarUrl={member.avatar_url}
                className="size-20 text-xl"
              />
              <div className="min-w-0 self-stretch">
                <p className="truncate font-semibold">{member.username}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.full_name ?? " "}
                </p>
              </div>
              <Badge variant="secondary">
                {member.role === "igl"
                  ? tRoles("igl")
                  : (member.ingame_role ?? "—")}
              </Badge>
              <div className="w-full border-t border-border pt-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="tracking-wide text-muted-foreground uppercase">
                    {t("statistics")}
                  </span>
                  <Badge variant="outline">{t("soonBadge")}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!isPending
          ? Array.from({ length: Math.max(0, emptySlots) }, (_, index) => (
              <OpenSlot key={index} label={t("openSlot")} />
            ))
          : null}
      </div>

      {canManage ? (
        <EditMemberDialog
          member={editTarget}
          onClose={() => setEditTarget(null)}
        />
      ) : null}
    </section>
  );
}
