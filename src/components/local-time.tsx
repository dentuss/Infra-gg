"use client";

import { useLocale } from "next-intl";

import { formattingLocale } from "@/i18n/config";

// Renders in the viewer's timezone; the server-rendered value may use a
// different zone, so hydration is allowed to correct it silently.
export function LocalTime({ iso }: { iso: string }) {
  const locale = useLocale();
  const formatted = new Date(iso).toLocaleString(formattingLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
