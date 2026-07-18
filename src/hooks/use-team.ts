"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { sortByRole, type Profile } from "@/lib/team";
import type { Tables } from "@/types/database";

const MEMBERS_KEY = ["team", "members"] as const;
const INVITES_KEY = ["team", "invites"] as const;

export type InviteRow = Tables<"invites"> & {
  used_by_profile: { username: string } | null;
};

export function useMembers() {
  return useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: async (): Promise<Profile[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_member", true);
      if (error) throw new Error(error.message);
      return sortByRole(data);
    },
  });
}

export function useSetMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { memberId: string; role: Profile["role"] }) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("set_member_role", {
        member_id: input.memberId,
        new_role: input.role,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MEMBERS_KEY }),
  });
}

export function useUpdateMemberProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      username: string;
      full_name: string | null;
      // Staff-assigned in-game role — written via an RPC so it never touches the
      // player's own `ingame_role` set in their account settings.
      assigned_role: string | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ username: input.username, full_name: input.full_name })
        .eq("id", input.id);
      if (error) throw new Error(error.message);

      const { error: roleError } = await supabase.rpc(
        "set_member_ingame_role",
        {
          member_id: input.id,
          new_role: input.assigned_role,
        },
      );
      if (roleError) throw new Error(roleError.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MEMBERS_KEY }),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("remove_member", {
        member_id: memberId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MEMBERS_KEY }),
  });
}

export function useInvites(enabled: boolean) {
  return useQuery({
    queryKey: INVITES_KEY,
    enabled,
    queryFn: async (): Promise<InviteRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("invites")
        .select("*, used_by_profile:profiles!invites_used_by_fkey(username)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { data: claims } = await supabase.auth.getClaims();
      const userId = claims?.claims.sub;
      if (!userId) throw new Error("Not signed in.");

      const { error } = await supabase
        .from("invites")
        .insert({ created_by: userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITES_KEY }),
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("invites").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITES_KEY }),
  });
}

export function useUpdateTeamName() {
  return useMutation({
    mutationFn: async (name: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("team_settings")
        .update({ name })
        .eq("id", true);
      if (error) throw new Error(error.message);
    },
  });
}
