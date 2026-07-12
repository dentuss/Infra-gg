"use client";

import Link from "next/link";
import { useActionState } from "react";

import { DiscordSignInButton } from "@/components/auth/discord-sign-in-button";
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
import { Separator } from "@/components/ui/separator";
import { signInWithPassword, type AuthFormState } from "@/services/auth";

const initialState: AuthFormState = { error: null };

export function LoginForm({ callbackError }: { callbackError?: string }) {
  const [state, formAction, pending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const error = state.error ?? callbackError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your team workspace</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <DiscordSignInButton />

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          No account yet?{" "}
          <Link href="/register" className="text-foreground underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
