"use client";

import { Eraser } from "lucide-react";
import { useTranslations } from "next-intl";

import { STATUS_ORDER, type AvailabilityStatus } from "@/lib/availability";
import { cn } from "@/lib/utils";

export const STATUS_CLASS: Record<AvailabilityStatus, string> = {
  available: "bg-emerald-500/80",
  maybe: "bg-amber-400/80",
  unavailable: "bg-rose-500/75",
};

/** null is the eraser — it clears a slot back to unset. */
export type Marker = AvailabilityStatus | null;

/**
 * Pick a marker, then paint with it. Chosen over click-to-cycle because
 * cycling makes setting one specific colour take up to three clicks per cell,
 * and gives no way to say "paint this run red" in a single drag.
 */
export function MarkerPicker({
  value,
  onChange,
}: {
  value: Marker;
  onChange: (marker: Marker) => void;
}) {
  const t = useTranslations("availability");

  return (
    <div
      role="radiogroup"
      aria-label={t("markerPicker")}
      className="flex flex-wrap items-center gap-1.5"
    >
      {STATUS_ORDER.map((status) => {
        const selected = value === status;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(status)}
            className={cn(
              "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
              selected
                ? "border-primary bg-primary/10 font-medium"
                : "border-border hover:bg-muted",
            )}
          >
            <span
              className={cn(
                "inline-block size-3.5 rounded-[3px]",
                STATUS_CLASS[status],
              )}
            />
            {t(`status.${status}`)}
          </button>
        );
      })}
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        onClick={() => onChange(null)}
        title={t("eraserHint")}
        className={cn(
          "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
          value === null
            ? "border-primary bg-primary/10 font-medium"
            : "border-border hover:bg-muted",
        )}
      >
        <Eraser className="size-3.5 text-muted-foreground" />
        {t("clear")}
      </button>
    </div>
  );
}
