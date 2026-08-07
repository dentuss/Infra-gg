"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyAvailabilityEdits,
  applyDefaultEdits,
  type AvailabilityDefaultRow,
  type AvailabilityRow,
  type AvailabilityStatus,
  type DefaultEdit,
  type SlotEdit,
} from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";

const AVAILABILITY_KEY = "availability";
const DEFAULTS_KEY = ["availability-defaults"] as const;

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

/**
 * Writes a batch of the signed-in player's own slots.
 *
 * Setting and clearing are separate statements because Supabase has no single
 * upsert-or-delete. The cache is updated optimistically first: without that the
 * cell reverts to the stale server value the moment the gesture ends and only
 * fills in when the refetch lands, which shows up as a flash back to grey.
 * `userId` is only used to address the cache — Row Level Security is what
 * actually decides whose rows may be written.
 */
export function useSetAvailability(weekStart: string, userId: string | null) {
  const queryClient = useQueryClient();
  const key = [AVAILABILITY_KEY, weekStart];

  return useMutation({
    mutationFn: async (edits: SlotEdit[]) => {
      if (edits.length === 0 || !userId) return;
      const supabase = createClient();

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
    onMutate: async (edits: SlotEdit[]) => {
      if (!userId) return;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AvailabilityRow[]>(key);
      queryClient.setQueryData<AvailabilityRow[]>(key, (rows) =>
        applyAvailabilityEdits(
          rows ?? [],
          userId,
          edits,
          new Date().toISOString(),
        ),
      );
      return { previous };
    },
    onError: (_error, _edits, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useSetAvailabilityDefaults(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (edits: DefaultEdit[]) => {
      if (edits.length === 0 || !userId) return;
      const supabase = createClient();

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
    onMutate: async (edits: DefaultEdit[]) => {
      if (!userId) return;
      await queryClient.cancelQueries({ queryKey: DEFAULTS_KEY });
      const previous =
        queryClient.getQueryData<AvailabilityDefaultRow[]>(DEFAULTS_KEY);
      queryClient.setQueryData<AvailabilityDefaultRow[]>(DEFAULTS_KEY, (rows) =>
        applyDefaultEdits(rows ?? [], userId, edits, new Date().toISOString()),
      );
      return { previous };
    },
    onError: (_error, _edits, context) => {
      if (context?.previous) {
        queryClient.setQueryData(DEFAULTS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DEFAULTS_KEY });
      // Cleared dates read through to the defaults, so every cached week is
      // now potentially stale.
      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_KEY] });
    },
  });
}
