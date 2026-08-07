import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CalendarSections } from "@/components/calendar/calendar-sections";
import { isStaff } from "@/lib/team";
import { getCurrentProfile } from "@/services/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calendar");
  return { title: t("metaTitle") };
}

export default async function CalendarPage() {
  const [t, profile] = await Promise.all([
    getTranslations("calendar"),
    getCurrentProfile(),
  ]);

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <CalendarSections
        canManage={isStaff(profile)}
        userId={profile?.id ?? null}
      />
    </main>
  );
}
