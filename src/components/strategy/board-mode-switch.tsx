"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { useBoardStore, type BoardMode } from "@/store/board-store";

const MODES: { mode: BoardMode; key: string }[] = [
  { mode: "default", key: "modeDefault" },
  { mode: "enhanced", key: "modeEnhanced" },
];

/** Slider-style switch between default and enhanced editing. */
export function BoardModeSwitch() {
  const t = useTranslations("strategy");
  const boardMode = useBoardStore((state) => state.boardMode);

  const select = (mode: BoardMode) => {
    const store = useBoardStore.getState();
    store.setBoardMode(mode);
    if (mode === "enhanced") store.showHint("enhanced");
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("modeLabel")}
      className="relative flex h-8 shrink-0 items-center rounded-full border border-border bg-muted/40 p-0.5 text-xs"
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-0.5 bottom-0.5 left-0.5 w-24 rounded-full bg-secondary transition-transform duration-[250ms] ease-out",
          boardMode === "enhanced" ? "translate-x-24" : "translate-x-0",
        )}
      />
      {MODES.map(({ mode, key }) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={boardMode === mode}
          onClick={() => select(mode)}
          className={cn(
            "relative z-10 w-24 rounded-full px-2 py-1 text-center transition-colors duration-[250ms]",
            boardMode === mode
              ? "font-semibold text-secondary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(key)}
        </button>
      ))}
    </div>
  );
}
