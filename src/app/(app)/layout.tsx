import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/services/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }
  if (!profile.is_member) {
    redirect("/join");
  }

  return <>{children}</>;
}
