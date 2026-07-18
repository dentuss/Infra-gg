import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { MatchUploader } from "@/components/matches/match-uploader";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCurrentProfile } from "@/services/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("matches");
  return { title: t("metaTitle") };
}

export default async function MatchesPage() {
  const [profile, t] = await Promise.all([
    getCurrentProfile(),
    getTranslations("matches"),
  ]);

  if (!profile) {
    redirect("/login");
  }

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
      <p className="max-w-prose text-sm text-muted-foreground">
        {t("subtitle")}
      </p>
      <MatchUploader />
    </main>
  );
}
