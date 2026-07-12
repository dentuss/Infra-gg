import { Bell, CalendarDays, Crosshair, FileText, Trophy } from "lucide-react";
import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Dashboard",
};

function EmptyState({ icon: Icon, text }: { icon: typeof Bell; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
      <Icon className="size-5" aria-hidden />
      <p>{text}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const [profile, roster, upcoming] = await Promise.all([
    getCurrentProfile(),
    getTeamRoster(),
    getUpcomingEvents(),
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
          Welcome back, {profile?.username}
        </h1>
        <p className="text-sm text-muted-foreground">
          Everything your team is working on, in one place.
        </p>
      </div>

      <section
        aria-label="Quick actions"
        className="flex flex-wrap items-center gap-2"
      >
        <Link href="/calendar" className={buttonVariants()}>
          <CalendarDays /> Schedule session
        </Link>
        <Button
          disabled
          variant="secondary"
          title="Available with the Strategy Board phase"
        >
          <Crosshair /> New strategy
        </Button>
        <Button
          disabled
          variant="secondary"
          title="Available with the Documents phase"
        >
          <FileText /> New document
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Theory sessions</CardTitle>
            <CardDescription>From the team calendar</CardDescription>
          </CardHeader>
          <CardContent>
            {theorySessions.length ? (
              <UpcomingList occurrences={theorySessions} />
            ) : (
              <EmptyState
                icon={CalendarDays}
                text="No theory sessions scheduled — add one in the calendar."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming matches</CardTitle>
            <CardDescription>Scrims and officials</CardDescription>
          </CardHeader>
          <CardContent>
            {matches.length ? (
              <UpcomingList occurrences={matches} />
            ) : (
              <EmptyState
                icon={Trophy}
                text="No scrims or matches scheduled yet."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Team activity</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState icon={Bell} text="Nothing new yet." />
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>Roster</CardTitle>
            <CardDescription>
              {roster.length} member{roster.length === 1 ? "" : "s"}
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
                    <p className="text-xs text-muted-foreground capitalize">
                      {member.role}
                    </p>
                  </div>
                  {member.role === "coach" ? <Badge>Coach</Badge> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
