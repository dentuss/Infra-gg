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
import { newPage } from "@/lib/strategy";

export function NewStrategyDialog({
  open,
  onOpenChange,
  mapSlug,
  mapName,
  side,
  firstFloor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapSlug: string;
  mapName: string;
  side: StrategySide;
  firstFloor: string;
}) {
  const t = useTranslations("strategy");
  const router = useRouter();
  const createStrategy = useCreateStrategy();
  const [title, setTitle] = useState("");

  const onCreate = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    if (!title.trim()) return;
    const created = await createStrategy.mutateAsync({
      title: title.trim(),
      map: mapSlug,
      side,
      scene: { pages: [newPage(firstFloor)] },
    });
    onOpenChange(false);
    setTitle("");
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
