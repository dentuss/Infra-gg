import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/services/profile";

const ROLE_ORDER: Record<Profile["role"], number> = {
  coach: 0,
  manager: 1,
  igl: 2,
  analyst: 3,
  player: 4,
};

export const getTeamRoster = cache(async (): Promise<Profile[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_member", true)
    .order("username");

  if (error) {
    console.error("Failed to load team roster:", error.message);
    return [];
  }

  return data.sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
});
