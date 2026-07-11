import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { signOut } from "@/services/auth";
import { getCurrentProfile } from "@/services/profile";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome, {profile?.username}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {profile?.role}
          </p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </header>

      <p className="text-muted-foreground">The dashboard arrives in Phase 2.</p>
    </main>
  );
}
