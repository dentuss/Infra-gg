"use client";

import { useQuery } from "@tanstack/react-query";

import {
  buildBlueprintMaps,
  titleize,
  type BlueprintMap,
} from "@/lib/strategy";
import { createClient } from "@/lib/supabase/client";

const IMAGE_EXTENSION = /\.(png|jpe?g|webp|svg)$/i;

export type BoardIcon = { name: string; url: string };

export function useBoardIcons() {
  return useQuery({
    queryKey: ["board", "icons"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BoardIcon[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("strategy")
        .list("icons", {
          limit: 1000,
          sortBy: { column: "name", order: "asc" },
        });
      if (error) throw new Error(error.message);

      return data
        .filter((file) => IMAGE_EXTENSION.test(file.name))
        .map((file) => ({
          name: titleize(file.name.replace(IMAGE_EXTENSION, "")),
          url: supabase.storage
            .from("strategy")
            .getPublicUrl(`icons/${file.name}`).data.publicUrl,
        }));
    },
  });
}

export function useBlueprintMaps() {
  return useQuery({
    queryKey: ["board", "blueprints"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BlueprintMap[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("strategy")
        .list("blueprints", {
          limit: 1000,
          sortBy: { column: "name", order: "asc" },
        });
      if (error) throw new Error(error.message);

      return buildBlueprintMaps(
        data
          .filter((file) => IMAGE_EXTENSION.test(file.name))
          .map((file) => ({
            name: file.name,
            url: supabase.storage
              .from("strategy")
              .getPublicUrl(`blueprints/${file.name}`).data.publicUrl,
          })),
      );
    },
  });
}
