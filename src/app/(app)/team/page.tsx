import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { InvitesPanel } from "@/components/team/invites-panel";
import { MembersList } from "@/components/team/members-list";
import { RosterCards } from "@/components/team/roster-cards";
import { TeamSettingsForm } from "@/components/team/team-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isStaff } from "@/lib/team";
import { getCurrentProfile } from "@/services/profile";
import { getTeamName } from "@/services/team";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("team");
  return { title: t("metaTitle") };
}

export default async function TeamPage() {
  const [profile, teamName, t] = await Promise.all([
    getCurrentProfile(),
    getTeamName(),
    getTranslations("team"),
  ]);

  if (!profile) {
    redirect("/login");
  }

  const canManage = isStaff(profile);

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <RosterCards canManage={canManage} />

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("membersTitle")}</CardTitle>
            <CardDescription>{t("membersSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <MembersList currentUserId={profile.id} canManage={canManage} />
          </CardContent>
        </Card>

        {canManage ? (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("invitesTitle")}</CardTitle>
                <CardDescription>{t("invitesSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                <InvitesPanel />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("settingsTitle")}</CardTitle>
                <CardDescription>{t("settingsSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                <TeamSettingsForm initialName={teamName} />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
    </main>
  );
}
