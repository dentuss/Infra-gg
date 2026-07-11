import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { JoinForm } from "@/components/auth/join-form";
import { getCurrentProfile } from "@/services/profile";

export const metadata: Metadata = {
  title: "Join workspace",
};

export default async function JoinPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }
  if (profile.is_member) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <JoinForm username={profile.username} />
      </div>
    </main>
  );
}
