"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

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
import { redeemInvite, signOut, type AuthFormState } from "@/services/auth";

const initialState: AuthFormState = { error: null };

export function JoinForm({ username }: { username: string }) {
  const t = useTranslations("auth.join");
  const [state, formAction, pending] = useActionState(
    redeemInvite,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title", { username })}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">{t("codeLabel")}</Label>
            <Input
              id="code"
              name="code"
              placeholder="123e4567-e89b-…"
              autoComplete="off"
              required
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

        <form action={signOut}>
          <Button type="submit" variant="ghost" className="w-full">
            {t("signOut")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
