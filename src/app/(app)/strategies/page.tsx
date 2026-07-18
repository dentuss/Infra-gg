import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { StrategiesList } from "@/components/strategy/strategies-list";
import { badgeVariants } from "@/components/ui/badge";
import { isStaff } from "@/lib/team";
import { cn } from "@/lib/utils";
import { getCurrentProfile } from "@/services/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("strategy");
  return { title: t("metaTitle") };
}

export default async function StrategiesPage() {
  const [profile, t] = await Promise.all([
    getCurrentProfile(),
    getTranslations("strategy"),
  ]);

  if (!profile) {
    redirect("/login");
  }

  const staffRole = isStaff(profile);
  const canCreate = staffRole || profile.role === "player";

  return (
    <main className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <span
          className={cn(
            badgeVariants({ variant: "outline" }),
            "border-amber-500/40 text-amber-500",
          )}
        >
          {t("inDev")}
        </span>
      </div>
      <StrategiesList
        currentUserId={profile.id}
        isStaffRole={staffRole}
        canCreate={canCreate}
      />
    </main>
  );
}
