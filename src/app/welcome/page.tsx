import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { signOut } from "@/services/auth";
import { getCurrentProfile } from "@/services/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("welcome");
  return { title: t("metaTitle") };
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const [profile, { invite }, t] = await Promise.all([
    getCurrentProfile(),
    searchParams,
    getTranslations("welcome"),
  ]);

  if (!profile) {
    redirect("/login");
  }
  if (profile.is_member) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-widest uppercase">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {invite === "invalid" ? (
        <p role="alert" className="text-sm text-destructive">
          {t("invalidInvite")}
        </p>
      ) : null}

      <form action={signOut}>
        <Button type="submit" variant="ghost">
          {t("signOut")}
        </Button>
      </form>
    </main>
  );
}
