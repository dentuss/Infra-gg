"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

const CHILL_DAYS_KEY = ["chill-days"] as const;

/** Chill days as local date strings (YYYY-MM-DD). */
export function useChillDays() {
  return useQuery({
    queryKey: CHILL_DAYS_KEY,
    queryFn: async (): Promise<string[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.from("chill_days").select("day");
      if (error) throw new Error(error.message);
      return data.map((row) => row.day);
    },
  });
}

export function useAddChillDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (day: string) => {
      const supabase = createClient();
      const { data: claims } = await supabase.auth.getClaims();
      const userId = claims?.claims.sub;
      if (!userId) throw new Error("Not signed in.");

      const { error } = await supabase
        .from("chill_days")
        .insert({ day, created_by: userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CHILL_DAYS_KEY }),
  });
}

export function useRemoveChillDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (day: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("chill_days")
        .delete()
        .eq("day", day);
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CHILL_DAYS_KEY }),
  });
}
