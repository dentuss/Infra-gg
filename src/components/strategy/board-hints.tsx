"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useBoardStore } from "@/store/board-store";

const HINT_LIFETIME_MS = 5000;

/** One-time hint toast pinned to the top right of the board. */
export function BoardHintToast() {
  const hint = useBoardStore((state) => state.hint);
  const t = useTranslations("strategy");

  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(
      () => useBoardStore.getState().closeHint(),
      HINT_LIFETIME_MS,
    );
    return () => clearTimeout(timer);
  }, [hint]);

  if (!hint) return null;

  return (
    <div
      key={hint}
      role="status"
      className="absolute top-3 right-3 z-30 w-72 animate-in rounded-md border border-border bg-popover/95 p-3 shadow-lg backdrop-blur-sm duration-300 fade-in slide-in-from-top-2"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{t(`hints.${hint}.title`)}</p>
        <Button
          variant="ghost"
          size="icon"
          className="-mt-1 -mr-1 size-6"
          aria-label={t("hintClose")}
          onClick={() => useBoardStore.getState().closeHint()}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(`hints.${hint}.body`)}
      </p>
      <Button
        variant="link"
        size="sm"
        className="mt-1 h-auto p-0 text-xs text-muted-foreground"
        onClick={() => useBoardStore.getState().closeHint(true)}
      >
        {t("hintDontShowAgain")}
      </Button>
    </div>
  );
}
