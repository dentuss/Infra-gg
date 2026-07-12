import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

const ROLE_ORDER: Record<Profile["role"], number> = {
  coach: 0,
  manager: 1,
  igl: 2,
  analyst: 3,
  player: 4,
};

export function sortByRole(profiles: Profile[]): Profile[] {
  return [...profiles].sort(
    (a, b) =>
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      a.username.localeCompare(b.username),
  );
}

export function isStaff(profile: Profile | null): boolean {
  return (
    !!profile &&
    profile.is_member &&
    (profile.role === "coach" || profile.role === "manager")
  );
}
