"use client";

// Renders in the viewer's timezone; the server-rendered value may use a
// different zone, so hydration is allowed to correct it silently.
export function LocalTime({ iso }: { iso: string }) {
  const formatted = new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
