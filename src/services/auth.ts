"use server";

import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  createInviteCodeSchema,
  createLoginSchema,
  createRegisterSchema,
} from "@/lib/validations/auth";

export type AuthFormState = {
  error: string | null;
  message?: string | null;
};

export async function signInWithPassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations("auth.login");

  const parsed = createLoginSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errorCallback") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: t("errorInvalidCredentials") };
  }

  redirect("/dashboard");
}

export async function signUpWithPassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations("auth.register");

  const parsed = createRegisterSchema(t).safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errorFailed") };
  }

  const origin =
    (await headers()).get("origin") ?? "https://infra-gg.vercel.app";
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    return { error: error.message };
  }

  return { error: null, message: t("success") };
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
  const t = await getTranslations("auth.join");

  const parsed = createInviteCodeSchema(t).safeParse(
    String(formData.get("code") ?? "").trim(),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errorInvalidCode") };
  }

  const supabase = await createClient();
  const { data: redeemed, error } = await supabase.rpc("redeem_invite", {
    invite_code: parsed.data,
  });
  if (error) {
    return { error: t("errorFailed") };
  }
  if (!redeemed) {
    return { error: t("errorUsed") };
  }

  redirect("/dashboard");
}
