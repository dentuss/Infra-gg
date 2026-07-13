"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { StrategyThumbnail } from "@/components/strategy/strategy-thumbnail";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StrategyRow } from "@/hooks/use-strategies";

function BrowseNavButton({
  label,
  strategy,
  direction,
  onClick,
}: {
  label: string;
  strategy: StrategyRow | undefined;
  direction: "back" | "next";
  onClick: () => void;
}) {
  if (!strategy) {
    return <div className="w-44" aria-hidden />;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-44 items-center gap-2 rounded-md border border-border p-2 text-left hover:bg-accent"
    >
      {direction === "back" ? (
        <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
      ) : null}
      <div className="w-16 shrink-0">
        <StrategyThumbnail strategy={strategy} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-xs font-medium">{strategy.title}</p>
      </div>
      {direction === "next" ? (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      ) : null}
    </button>
  );
}

/** Flips through a folder's strategies one by one, slideshow style. */
export function StrategyBrowseDialog({
  strategies,
  index,
  folderName,
  onIndexChange,
  onClose,
}: {
  strategies: StrategyRow[];
  index: number | null;
  folderName: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations("strategy");
  const router = useRouter();

  const current = index === null ? undefined : strategies[index];
  if (index === null || !current) return null;

  const previous = strategies[index - 1];
  const next = strategies[index + 1];

  const onKeyDown = (keyEvent: React.KeyboardEvent) => {
    if (keyEvent.key === "ArrowLeft" && previous) onIndexChange(index - 1);
    if (keyEvent.key === "ArrowRight" && next) onIndexChange(index + 1);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl" onKeyDown={onKeyDown}>
        <DialogHeader>
          <DialogTitle>{current.title}</DialogTitle>
          <DialogDescription>
            {folderName} · {index + 1} / {strategies.length}
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          aria-label={t("openStrategy")}
          onClick={() => router.push(`/strategies/${current.id}`)}
          className="cursor-pointer transition-opacity hover:opacity-90"
        >
          <StrategyThumbnail strategy={current} />
        </button>

        <div className="flex items-center justify-between gap-2">
          <BrowseNavButton
            label={t("browseBack")}
            strategy={previous}
            direction="back"
            onClick={() => onIndexChange(index - 1)}
          />
          <Button
            variant="outline"
            onClick={() => router.push(`/strategies/${current.id}`)}
          >
            {t("openStrategy")}
          </Button>
          <BrowseNavButton
            label={t("browseNext")}
            strategy={next}
            direction="next"
            onClick={() => onIndexChange(index + 1)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
