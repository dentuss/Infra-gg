import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/team";

export type { Profile } from "@/lib/team";

// cache() dedupes the lookup across layout and page within one request.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Failed to load profile:", error.message);
    return null;
  }

  return profile;
});
