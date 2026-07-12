"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  inviteCodeSchema,
  loginSchema,
  registerSchema,
} from "@/lib/validations/auth";

export type AuthFormState = {
  error: string | null;
  message?: string | null;
};

async function requestOrigin() {
  return (await headers()).get("origin") ?? "http://localhost:3000";
}

export async function signInWithPassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect("/dashboard");
}

export async function signUpWithPassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${await requestOrigin()}/auth/callback` },
  });
  if (error) {
    return { error: error.message };
  }

  return {
    error: null,
    message: "Check your inbox to confirm your email, then sign in.",
  };
}

export async function signInWithDiscord() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: { redirectTo: `${await requestOrigin()}/auth/callback` },
  });

  if (error || !data.url) {
    redirect("/login?error=discord");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function redeemInvite(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = inviteCodeSchema.safeParse(
    String(formData.get("code") ?? "").trim(),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invite code." };
  }

  const supabase = await createClient();
  const { data: redeemed, error } = await supabase.rpc("redeem_invite", {
    invite_code: parsed.data,
  });
  if (error) {
    return { error: "Could not redeem the invite. Please try again." };
  }
  if (!redeemed) {
    return { error: "This invite code is invalid, already used, or expired." };
  }

  redirect("/dashboard");
}
