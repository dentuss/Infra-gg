"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { hourLabel } from "@/lib/availability";
import type { Clash } from "@/lib/event-clashes";
import { cn } from "@/lib/utils";

/** "20:00", or "20:00–22:00" for a run, collapsing the listed hours. */
function hourRange(hours: readonly number[]): string {
  const sorted = [...hours].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first === undefined || last === undefined) return "";
  return first === last
    ? hourLabel(first)
    : `${hourLabel(first)}–${hourLabel(last + 1)}`;
}

export function ClashWarning({ clashes }: { clashes: readonly Clash[] }) {
  const t = useTranslations("eventDialog");
  if (clashes.length === 0) return null;

  const blocking = clashes.filter((clash) => clash.status === "unavailable");

  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
        <TriangleAlert className="size-4 shrink-0" />
        {blocking.length > 0
          ? t("clashTitle", { count: blocking.length })
          : t("clashMaybeTitle", { count: clashes.length })}
      </p>
      <ul className="flex flex-col gap-1 text-sm">
        {clashes.map((clash) => (
          <li
            key={`${clash.userId}-${clash.status}`}
            className="flex flex-wrap items-center gap-x-2"
          >
            <span className="font-medium">{clash.username}</span>
            <span className="text-muted-foreground tabular-nums">
              {hourRange(clash.hours)}
            </span>
            <span
              className={cn(
                "rounded-sm px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase",
                clash.status === "unavailable"
                  ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                  : "bg-amber-400/25 text-amber-700 dark:text-amber-300",
              )}
            >
              {t(`clashStatus.${clash.status}`)}
            </span>
          </li>
        ))}
      </ul>
      {blocking.length > 0 ? (
        <p className="text-xs text-muted-foreground">{t("clashConfirmHint")}</p>
      ) : null}
    </div>
  );
}
