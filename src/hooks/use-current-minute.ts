"use client";

import { useSyncExternalStore } from "react";

// One ticker for everything on the page that shows the time, aligned to the
// minute boundary so nothing sits a stale minute behind. Kept outside React
// because the clock is an external source, not derived state.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function scheduleNextMinute() {
  timer = setTimeout(
    () => {
      listeners.forEach((listener) => listener());
      scheduleNextMinute();
    },
    60_000 - (Date.now() % 60_000),
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) scheduleNextMinute();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
}

/** Stable within a minute, so re-renders only happen when the display changes. */
const currentMinute = (): number | null => Math.floor(Date.now() / 60_000);
/** Null on the server: the two clocks would disagree and hydration would warn. */
const noMinuteOnServer = (): number | null => null;

/**
 * The current time, re-rendering once a minute. Null during server rendering
 * and the first client paint, so callers must handle "not known yet" rather
 * than assume a Date.
 */
export function useCurrentMinute(): Date | null {
  const minute = useSyncExternalStore(
    subscribe,
    currentMinute,
    noMinuteOnServer,
  );
  return minute === null ? null : new Date(minute * 60_000);
}
