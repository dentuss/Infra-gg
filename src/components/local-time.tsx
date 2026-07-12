"use client";

// Renders in the viewer's timezone; the server-rendered value may use a
// different zone, so hydration is allowed to correct it silently.
// en-GB pins European day-month order and the 24-hour clock.
export function LocalTime({ iso }: { iso: string }) {
  const formatted = new Date(iso).toLocaleString("en-GB", {
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
