"use server";

import { cookies } from "next/headers";

import { isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setTheme(theme: Theme) {
  if (!isTheme(theme)) {
    return;
  }
  (await cookies()).set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
}
