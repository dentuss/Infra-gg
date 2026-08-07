"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AvailabilityDefaultRow,
  AvailabilityRow,
  AvailabilityStatus,
} from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";

const AVAILABILITY_KEY = "availability";
const DEFAULTS_KEY = ["availability-defaults"] as const;

async function currentUserId(): Promise<string> {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) throw new Error("Not signed in.");
  return userId;
}

/** Every player's rows for one week, keyed by the Monday. */
export function useWeekAvailability(weekStart: string, weekEnd: string) {
  return useQuery({
    queryKey: [AVAILABILITY_KEY, weekStart],
    queryFn: async (): Promise<AvailabilityRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .gte("day", weekStart)
        .lte("day", weekEnd);
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

/** Every player's typical week. Small enough to fetch whole and cache. */
export function useAvailabilityDefaults() {
  return useQuery({
    queryKey: DEFAULTS_KEY,
    queryFn: async (): Promise<AvailabilityDefaultRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("availability_defaults")
        .select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export type SlotEdit = {
  day: string;
  hour: number;
  /** null clears the row, letting the typical week show through again. */
  status: AvailabilityStatus | null;
};

/**
 * Writes a batch of the signed-in player's own slots. Setting and clearing
 * are separate statements because Supabase has no single upsert-or-delete;
 * both run before the cache is invalidated so the grid never shows a
 * half-applied day.
 */
export function useSetAvailability(weekStart: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (edits: SlotEdit[]) => {
      if (edits.length === 0) return;
      const supabase = createClient();
      const userId = await currentUserId();

      const cleared = edits.filter((edit) => edit.status === null);
      const set = edits.filter((edit) => edit.status !== null);

      if (set.length > 0) {
        const { error } = await supabase.from("availability").upsert(
          set.map((edit) => ({
            user_id: userId,
            day: edit.day,
            hour: edit.hour,
            status: edit.status as AvailabilityStatus,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "user_id,day,hour" },
        );
        if (error) throw new Error(error.message);
      }

      for (const edit of cleared) {
        const { error } = await supabase
          .from("availability")
          .delete()
          .eq("user_id", userId)
          .eq("day", edit.day)
          .eq("hour", edit.hour);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [AVAILABILITY_KEY, weekStart],
      }),
  });
}

export type DefaultEdit = {
  weekday: number;
  hour: number;
  status: AvailabilityStatus | null;
};

export function useSetAvailabilityDefaults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (edits: DefaultEdit[]) => {
      if (edits.length === 0) return;
      const supabase = createClient();
      const userId = await currentUserId();

      const cleared = edits.filter((edit) => edit.status === null);
      const set = edits.filter((edit) => edit.status !== null);

      if (set.length > 0) {
        const { error } = await supabase.from("availability_defaults").upsert(
          set.map((edit) => ({
            user_id: userId,
            weekday: edit.weekday,
            hour: edit.hour,
            status: edit.status as AvailabilityStatus,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "user_id,weekday,hour" },
        );
        if (error) throw new Error(error.message);
      }

      for (const edit of cleared) {
        const { error } = await supabase
          .from("availability_defaults")
          .delete()
          .eq("user_id", userId)
          .eq("weekday", edit.weekday)
          .eq("hour", edit.hour);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEFAULTS_KEY });
      // Cleared dates read through to the defaults, so every cached week is
      // now potentially stale.
      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_KEY] });
    },
  });
}
