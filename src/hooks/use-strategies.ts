"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BoardScene } from "@/lib/strategy";
import { createClient } from "@/lib/supabase/client";
import type { Json, Tables } from "@/types/database";

export type StrategyRow = Tables<"strategies">;

const STRATEGIES_KEY = ["strategies"] as const;

export function useStrategies() {
  return useQuery({
    queryKey: STRATEGIES_KEY,
    queryFn: async (): Promise<StrategyRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("strategies")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useStrategy(id: string) {
  return useQuery({
    queryKey: [...STRATEGIES_KEY, id],
    queryFn: async (): Promise<StrategyRow> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("strategies")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useCreateStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      map: string;
      scene: BoardScene;
    }): Promise<StrategyRow> => {
      const supabase = createClient();
      const { data: claims } = await supabase.auth.getClaims();
      const userId = claims?.claims.sub;
      if (!userId) throw new Error("Not signed in.");

      const { data, error } = await supabase
        .from("strategies")
        .insert({
          title: input.title,
          map: input.map,
          data: input.scene as unknown as Json,
          created_by: userId,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: STRATEGIES_KEY }),
  });
}

export function useSaveStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: { title?: string; data?: Json };
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("strategies")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: STRATEGIES_KEY }),
  });
}

export function useDeleteStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("strategies").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: STRATEGIES_KEY }),
  });
}
