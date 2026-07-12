"use client";

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
  const [state, formAction, pending] = useActionState(
    redeemInvite,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Almost there, {username}</CardTitle>
        <CardDescription>
          This workspace is invite-only. Enter the invite code you received from
          your coach or manager.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Invite code</Label>
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
            {pending ? "Checking…" : "Join workspace"}
          </Button>
        </form>

        <form action={signOut}>
          <Button type="submit" variant="ghost" className="w-full">
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
