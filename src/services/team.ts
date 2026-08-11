import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { sortByRole, type Profile } from "@/lib/team";
import { resolveViewZone } from "@/lib/timezone";

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

/** The zone the team schedules in; recurrence and clash maths anchor to it. */
export const getTeamZone = cache(async (): Promise<string> => {
  const supabase = await createClient();

  const { data } = await supabase
    .from("team_settings")
    .select("timezone")
    .maybeSingle();

  return resolveViewZone(null, data?.timezone);
});

export const getTeamName = cache(async (): Promise<string> => {
  const supabase = await createClient();

  const { data } = await supabase
    .from("team_settings")
    .select("name")
    .maybeSingle();

  return data?.name ?? "Infragg";
});
