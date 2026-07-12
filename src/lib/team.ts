import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

const ROLE_ORDER: Record<Profile["role"], number> = {
  manager: 0,
  coach: 1,
  igl: 2,
  analyst: 3,
  player: 4,
  substitute: 5,
  trial: 6,
};

export function sortByRole(profiles: Profile[]): Profile[] {
  return [...profiles].sort(
    (a, b) =>
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      a.username.localeCompare(b.username),
  );
}

const STAFF_ROLES: ReadonlySet<Profile["role"]> = new Set([
  "coach",
  "manager",
  "igl",
]);

export function isStaff(profile: Profile | null): boolean {
  return !!profile && profile.is_member && STAFF_ROLES.has(profile.role);
}
