import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { StrategyEditor } from "@/components/strategy/strategy-editor";
import { isStaff } from "@/lib/team";
import { getCurrentProfile } from "@/services/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("strategy");
  return { title: t("metaTitle") };
}

export default async function StrategyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [profile, { id }] = await Promise.all([getCurrentProfile(), params]);

  if (!profile) {
    redirect("/login");
  }

  const staffRole = isStaff(profile);

  return (
    <StrategyEditor
      strategyId={id}
      userId={profile.id}
      isStaffRole={staffRole}
      canAuthorRole={staffRole || profile.role === "player"}
    />
  );
}
