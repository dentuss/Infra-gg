"use client";

import { Eraser, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
 * Pick a marker, then paint with it. Sticks to the top of its scroll container
 * so the markers stay reachable once the grid is scrolled past — the grid is
 * seventeen rows tall and the bar would otherwise be off screen for most of it.
 */
export function MarkerPicker({
  value,
  onChange,
  onClearAll,
  clearAllTitle,
  clearAllDescription,
}: {
  value: Marker;
  onChange: (marker: Marker) => void;
  /** Omit to hide the Clear all button. */
  onClearAll?: () => void;
  clearAllTitle?: string;
  clearAllDescription?: string;
}) {
  const t = useTranslations("availability");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const option = (selected: boolean) =>
    cn(
      "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
      selected
        ? "border-primary bg-primary/10 font-medium"
        : "border-border hover:bg-muted",
    );

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1.5 border-b border-border/60 bg-background py-2">
      <div
        role="radiogroup"
        aria-label={t("markerPicker")}
        className="flex flex-wrap items-center gap-1.5"
      >
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={value === status}
            onClick={() => onChange(status)}
            className={option(value === status)}
          >
            <span
              className={cn(
                "inline-block size-3.5 rounded-[3px]",
                STATUS_CLASS[status],
              )}
            />
            {t(`status.${status}`)}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          onClick={() => onChange(null)}
          title={t("eraserHint")}
          className={option(value === null)}
        >
          <Eraser className="size-3.5 text-muted-foreground" />
          {t("clear")}
        </button>
      </div>

      {onClearAll ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 /> {t("clearAll")}
        </Button>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {clearAllTitle ?? t("clearAll")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {clearAllDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onClearAll?.();
                setConfirmOpen(false);
              }}
            >
              {t("clearAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
