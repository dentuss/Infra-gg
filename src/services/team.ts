import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { sortByRole, type Profile } from "@/lib/team";

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

  return sortByRole(data);
});

export const getTeamName = cache(async (): Promise<string> => {
  const supabase = await createClient();

  const { data } = await supabase
    .from("team_settings")
    .select("name")
    .maybeSingle();

  return data?.name ?? "Infragg";
});
