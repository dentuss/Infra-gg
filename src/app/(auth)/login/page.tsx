import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

const CALLBACK_ERRORS: Record<string, string> = {
  auth: "Sign-in failed. Please try again.",
  discord: "Discord sign-in is unavailable right now.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <LoginForm callbackError={error ? CALLBACK_ERRORS[error] : undefined} />
  );
}
