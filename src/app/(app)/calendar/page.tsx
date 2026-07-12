import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TeamCalendar } from "@/components/calendar/team-calendar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calendar");
  return { title: t("metaTitle") };
}

export default async function CalendarPage() {
  const t = await getTranslations("calendar");

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <TeamCalendar />
    </main>
  );
}
