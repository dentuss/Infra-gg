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

type SupabaseStorage = ReturnType<
  ReturnType<typeof createClient>["storage"]["from"]
>;

// Blueprints live under blueprints/<Map>/<Author>/<file>, so the flat list has
// to be walked. Supabase marks folders with a null id; files carry metadata.
async function listBlueprintFiles(
  storage: SupabaseStorage,
  prefix: string,
): Promise<{ path: string; name: string }[]> {
  const { data, error } = await storage.list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(error.message);

  const files: { path: string; name: string }[] = [];
  for (const entry of data ?? []) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id === null) {
      files.push(...(await listBlueprintFiles(storage, path)));
    } else if (IMAGE_EXTENSION.test(entry.name)) {
      files.push({ path, name: entry.name });
    }
  }
  return files;
}

export function useBlueprintMaps() {
  return useQuery({
    queryKey: ["board", "blueprints"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BlueprintMap[]> => {
      const supabase = createClient();
      const storage = supabase.storage.from("strategy");
      const files = await listBlueprintFiles(storage, "blueprints");

      return buildBlueprintMaps(
        files.map((file) => ({
          // path is blueprints/<Map>/…; the segment after it names the map.
          mapFolder: file.path.split("/")[1] ?? "",
          name: file.name,
          url: storage.getPublicUrl(file.path).data.publicUrl,
        })),
      );
    },
  });
}
