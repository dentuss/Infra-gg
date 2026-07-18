"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";

import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpWithPassword, type AuthFormState } from "@/services/auth";

const initialState: AuthFormState = { error: null };

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const [state, formAction, pending] = useActionState(
    signUpWithPassword,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state.message ? (
          <p role="status" className="text-sm">
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="register-email">{t("email")}</Label>
              <Input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="register-password">{t("password")}</Label>
              <Input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="register-confirm">{t("confirmPassword")}</Label>
              <Input
                id="register-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? t("submitting") : t("submit")}
            </Button>
          </form>
        )}

        <OAuthButtons />

        <p className="text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/login" className="text-foreground underline">
            {t("signIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
