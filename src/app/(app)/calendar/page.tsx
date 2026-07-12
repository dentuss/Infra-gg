import type { Metadata } from "next";

import { TeamCalendar } from "@/components/calendar/team-calendar";

export const metadata: Metadata = {
  title: "Calendar",
};

export default function CalendarPage() {
  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <TeamCalendar />
    </main>
  );
}
