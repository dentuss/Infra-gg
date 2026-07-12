import { Bell, CalendarDays, Crosshair, FileText, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { UpcomingList } from "@/components/dashboard/upcoming-list";
import { UserAvatar } from "@/components/layout/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUpcomingEvents } from "@/services/events";
import { getCurrentProfile } from "@/services/profile";
import { getTeamRoster } from "@/services/team";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("metaTitle") };
}

function EmptyState({ icon: Icon, text }: { icon: typeof Bell; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
      <Icon className="size-5" aria-hidden />
      <p>{text}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const [profile, roster, upcoming, t, tRoles] = await Promise.all([
    getCurrentProfile(),
    getTeamRoster(),
    getUpcomingEvents(),
    getTranslations("dashboard"),
    getTranslations("roles"),
  ]);

  const theorySessions = upcoming
    .filter(({ event }) => event.type === "theory")
    .slice(0, 3);
  const matches = upcoming
    .filter(({ event }) => event.type === "scrim" || event.type === "match")
    .slice(0, 3);

  return (
    <main className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("welcome", { username: profile?.username ?? "" })}
        </h1>
        <p className="text-sm text-muted-foreground">{t("tagline")}</p>
      </div>

      <section
        aria-label={t("quickActions")}
        className="flex flex-wrap items-center gap-2"
      >
        <Link href="/calendar" className={buttonVariants()}>
          <CalendarDays /> {t("scheduleSession")}
        </Link>
        <Button disabled variant="secondary" title={t("availableLater")}>
          <Crosshair /> {t("newStrategy")}
        </Button>
        <Button disabled variant="secondary" title={t("availableLater")}>
          <FileText /> {t("newDocument")}
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("theoryTitle")}</CardTitle>
            <CardDescription>{t("theorySubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {theorySessions.length ? (
              <UpcomingList occurrences={theorySessions} />
            ) : (
              <EmptyState icon={CalendarDays} text={t("theoryEmpty")} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("matchesTitle")}</CardTitle>
            <CardDescription>{t("matchesSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {matches.length ? (
              <UpcomingList occurrences={matches} />
            ) : (
              <EmptyState icon={Trophy} text={t("matchesEmpty")} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("notificationsTitle")}</CardTitle>
            <CardDescription>{t("notificationsSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState icon={Bell} text={t("notificationsEmpty")} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>{t("rosterTitle")}</CardTitle>
            <CardDescription>
              {t("membersCount", { count: roster.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roster.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 border border-border p-3"
                >
                  <UserAvatar
                    username={member.username}
                    avatarUrl={member.avatar_url}
                    className="size-9"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tRoles(member.role)}
                    </p>
                  </div>
                  {member.role === "coach" ? (
                    <Badge>{tRoles("coach")}</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
