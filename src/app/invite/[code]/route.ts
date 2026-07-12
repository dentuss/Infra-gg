import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { PENDING_INVITE_COOKIE } from "@/services/invites";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const { origin } = new URL(request.url);

  const parsed = z.uuid().safeParse(code);
  if (!parsed.success) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    const { data: redeemed } = await supabase.rpc("redeem_invite", {
      invite_code: parsed.data,
    });
    return NextResponse.redirect(
      redeemed ? `${origin}/dashboard` : `${origin}/welcome?invite=invalid`,
    );
  }

  // Not signed in yet: remember the code and send them to sign-up; the
  // code is redeemed right after authentication completes.
  const response = NextResponse.redirect(`${origin}/register`);
  response.cookies.set(PENDING_INVITE_COOKIE, parsed.data, {
    path: "/",
    maxAge: 60 * 60,
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}
