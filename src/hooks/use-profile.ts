"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

async function currentUserId() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) throw new Error("Not signed in.");
  return userId;
}

export function useUpdateOwnProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: {
      username: string;
      full_name: string | null;
      ingame_role: string | null;
    }) => {
      const supabase = createClient();
      const userId = await currentUserId();
      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["team", "members"] }),
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const supabase = createClient();
      const userId = await currentUserId();
      const path = `${userId}/avatar`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);

      // Cache-bust: the file lives at a stable path.
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);
      if (error) throw new Error(error.message);

      return url;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["team", "members"] }),
  });
}
