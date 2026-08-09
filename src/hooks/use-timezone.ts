"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { resolveViewZone } from "@/lib/timezone";

const TEAM_ZONE_KEY = ["team", "timezone"] as const;
const OWN_ZONE_KEY = ["profile", "timezone"] as const;

/** The zone the team schedules in; availability hours are anchored to it. */
export function useTeamZone() {
  return useQuery({
    queryKey: TEAM_ZONE_KEY,
    queryFn: async (): Promise<string | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("team_settings")
        .select("timezone")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.timezone ?? null;
    },
  });
}

/** The signed-in member's own choice. Null means "follow the team". */
export function useOwnZone() {
  return useQuery({
    queryKey: OWN_ZONE_KEY,
    queryFn: async (): Promise<string | null> => {
      const supabase = createClient();
      const { data: claims } = await supabase.auth.getClaims();
      const userId = claims?.claims.sub;
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.timezone ?? null;
    },
  });
}

/**
 * Everything a component needs to render times: the anchor the data is stored
 * against, and the zone to show it in.
 */
export function useZones() {
  const team = useTeamZone();
  const own = useOwnZone();
  const teamZone = resolveViewZone(null, team.data);
  return {
    teamZone,
    viewZone: resolveViewZone(own.data, team.data),
    /** Null when following the team, which the picker shows as the default. */
    ownZone: own.data ?? null,
    isPending: team.isPending || own.isPending,
  };
}

export function useSetOwnZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (zone: string | null) => {
      const supabase = createClient();
      const { data: claims } = await supabase.auth.getClaims();
      const userId = claims?.claims.sub;
      if (!userId) throw new Error("Not signed in.");
      const { error } = await supabase
        .from("profiles")
        .update({ timezone: zone })
        .eq("id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: OWN_ZONE_KEY }),
  });
}

/** Staff only — RLS on team_settings already restricts the write. */
export function useSetTeamZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (zone: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("team_settings")
        .update({ timezone: zone })
        .eq("id", true);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAM_ZONE_KEY }),
  });
}
