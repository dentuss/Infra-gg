/**
 * In-game roles offered in the profile and team-management pickers, split into a
 * Classic set and an Expanded set. Stored as plain text on `profiles`
 * (`ingame_role` = player's own, `assigned_role` = staff-assigned).
 */
export const INGAME_ROLE_GROUPS = [
  {
    key: "classic",
    roles: ["Entry", "Flex-entry", "Flex", "Flex-Support", "Support"],
  },
  {
    key: "expanded",
    roles: ["Lurk", "Shields", "Flex-lurk"],
  },
] as const;

export const INGAME_ROLES: readonly string[] = INGAME_ROLE_GROUPS.flatMap(
  (group) => group.roles,
);
