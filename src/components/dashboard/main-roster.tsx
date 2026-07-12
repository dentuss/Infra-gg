import { getTranslations } from "next-intl/server";

import { UserAvatar } from "@/components/layout/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Profile } from "@/lib/team";

export const MAIN_ROSTER_SIZE = 5;

export async function MainRoster({ members }: { members: Profile[] }) {
  const [t, tRoles] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("roles"),
  ]);
  const emptySlots = Math.max(0, MAIN_ROSTER_SIZE - members.length);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t("mainRosterTitle")}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <UserAvatar
                username={member.username}
                avatarUrl={member.avatar_url}
                className="size-20 text-xl"
              />
              <div className="min-w-0 self-stretch">
                <p className="truncate font-semibold">{member.username}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.full_name ?? " "}
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
        {Array.from({ length: emptySlots }, (_, index) => (
          <div
            key={index}
            className="flex min-h-48 items-center justify-center border border-dashed border-border p-4 text-xs tracking-wide text-muted-foreground uppercase"
          >
            {t("openSlot")}
          </div>
        ))}
      </div>
    </section>
  );
}
