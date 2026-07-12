import { cookies } from "next/headers";
import { z } from "zod";

import type { createClient } from "@/lib/supabase/server";

export const PENDING_INVITE_COOKIE = "pending_invite";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Redeem an invite code stored before authentication, if any. Runs in
 * contexts that may write cookies (route handlers, server actions).
 * Best-effort: an invalid or expired code just leaves the user on the
 * waiting page.
 */
export async function redeemPendingInvite(supabase: ServerSupabase) {
  const store = await cookies();
  const code = store.get(PENDING_INVITE_COOKIE)?.value;
  if (!code) return;

  store.delete(PENDING_INVITE_COOKIE);

  const parsed = z.uuid().safeParse(code);
  if (!parsed.success) return;

  await supabase.rpc("redeem_invite", { invite_code: parsed.data });
}
