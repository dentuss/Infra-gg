"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateStrategy, type StrategySide } from "@/hooks/use-strategies";
import { emptyLineup, newPage, styleLabelKey } from "@/lib/strategy";
import { cn } from "@/lib/utils";

export function NewStrategyDialog({
  open,
  onOpenChange,
  mapSlug,
  mapName,
  side,
  firstFloor,
  styles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapSlug: string;
  mapName: string;
  side: StrategySide;
  firstFloor: string;
  styles: string[];
}) {
  const t = useTranslations("strategy");
  const router = useRouter();
  const createStrategy = useCreateStrategy();
  const [title, setTitle] = useState("");
  const [chosenStyle, setChosenStyle] = useState<string | null>(null);

  const style = chosenStyle ?? styles[0] ?? "";

  const onCreate = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    if (!title.trim()) return;
    const created = await createStrategy.mutateAsync({
      title: title.trim(),
      map: mapSlug,
      side,
      scene: { pages: [newPage(firstFloor)], lineup: emptyLineup(), style },
    });
    onOpenChange(false);
    setTitle("");
    setChosenStyle(null);
    router.push(`/strategies/${created.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>
            {mapName} · {t(side)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="strategy-title">{t("titleLabel")}</Label>
            <Input
              id="strategy-title"
              value={title}
              maxLength={80}
              required
              placeholder={t("titlePlaceholder")}
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
            />
          </div>

          {styles.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Label>{t("styleLabel")}</Label>
              <div
                role="radiogroup"
                aria-label={t("styleLabel")}
                className="flex flex-wrap gap-2"
              >
                {styles.map((styleOption) => (
                  <button
                    key={styleOption}
                    type="button"
                    role="radio"
                    aria-checked={styleOption === style}
                    onClick={() => setChosenStyle(styleOption)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      styleOption === style
                        ? "border-primary bg-primary/10 font-medium text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {t(styleLabelKey(styleOption))}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t("styleHint")}</p>
            </div>
          ) : null}

          {createStrategy.error ? (
            <p role="alert" className="text-sm text-destructive">
              {createStrategy.error.message}
            </p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={createStrategy.isPending}>
              {createStrategy.isPending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
