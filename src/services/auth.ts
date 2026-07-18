"use server";

import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  createLoginSchema,
  createRegisterSchema,
} from "@/lib/validations/auth";
import { redeemPendingInvite } from "@/services/invites";

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

  // Landing here via an invite link redeems it now that we know the user.
  await redeemPendingInvite(supabase);

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

function isOAuthProvider(value: string): value is "discord" | "google" {
  return value === "discord" || value === "google";
}

export async function signInWithProvider(formData: FormData) {
  const provider = String(formData.get("provider"));
  if (!isOAuthProvider(provider)) {
    redirect("/login?error=auth");
  }

  const origin =
    (await headers()).get("origin") ?? "https://infra-gg.vercel.app";
  const supabase = await createClient();
  // skipBrowserRedirect so the SSR client writes the PKCE verifier cookie here;
  // the browser is then sent to the provider, and /auth/callback exchanges the
  // code (redeeming a pending invite, exactly like the email flow).
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=auth");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
