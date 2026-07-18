"use client";

import { FileUp, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBlueprintMaps } from "@/hooks/use-board-assets";
import { usePptxImport, type StratPlan } from "@/hooks/use-pptx-import";
import type { StrategySide } from "@/hooks/use-strategies";
import { newId } from "@/lib/strategy";

type Strat = { id: string; name: string; map: string; side: StrategySide };

const baseName = (fileName: string) =>
  fileName
    .replace(/\.pptx$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("strategy");
  const router = useRouter();
  const { data: maps } = useBlueprintMaps();
  const {
    deck,
    parsing,
    error,
    progress,
    importing,
    parseFile,
    runImport,
    reset,
  } = usePptxImport();
  const inputRef = useRef<HTMLInputElement>(null);
  const [strats, setStrats] = useState<Strat[]>([]);
  const [assign, setAssign] = useState<Record<number, string | null>>({});

  // Parse the picked deck, then seed one strat (content slides on, titles off).
  const onFile = async (file: File) => {
    const parsed = await parseFile(file);
    if (!parsed) return;
    const first: Strat = {
      id: newId(),
      name: baseName(file.name),
      map: maps?.[0]?.slug ?? "",
      side: "attack",
    };
    setStrats([first]);
    setAssign(
      Object.fromEntries(
        parsed.slides.map((slide) => [
          slide.index,
          slide.hasMap ? first.id : null,
        ]),
      ),
    );
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
      setStrats([]);
      setAssign({});
    }
    onOpenChange(next);
  };

  const patchStrat = (id: string, patch: Partial<Strat>) =>
    setStrats((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );

  const firstFloorOf = (slug: string) =>
    maps?.find((m) => m.slug === slug)?.floors[0]?.slug ?? "first_floor";

  const onImport = async () => {
    if (!deck) return;
    const plans: StratPlan[] = strats
      .map((s) => ({
        name: s.name.trim(),
        map: s.map,
        side: s.side,
        firstFloor: firstFloorOf(s.map),
        slides: deck.slides.filter((slide) => assign[slide.index] === s.id),
      }))
      .filter((plan) => plan.slides.length > 0 && plan.name && plan.map);
    if (!plans.length) return;
    const firstId = await runImport(deck, plans);
    if (firstId) {
      onOpenChange(false);
      router.push(`/strategies/${firstId}`);
    }
  };

  const canImport =
    !!deck &&
    strats.some(
      (s) =>
        s.name.trim() &&
        s.map &&
        deck.slides.some((slide) => assign[slide.index] === s.id),
    );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("import.title")}</DialogTitle>
          <DialogDescription>{t("import.description")}</DialogDescription>
        </DialogHeader>

        {!deck ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
            <FileUp className="size-8 text-muted-foreground" />
            <input
              ref={inputRef}
              type="file"
              accept=".pptx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={parsing}
            >
              {parsing ? t("import.parsing") : t("import.pick")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("import.pptxOnly")}
            </p>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex max-h-[62vh] flex-col gap-5 overflow-y-auto pr-1">
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>{t("import.strategiesTitle")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setStrats((prev) => [
                      ...prev,
                      {
                        id: newId(),
                        name: "",
                        map: maps?.[0]?.slug ?? "",
                        side: "attack",
                      },
                    ])
                  }
                >
                  <Plus /> {t("import.addStrat")}
                </Button>
              </div>
              {strats.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex min-w-40 flex-1 flex-col gap-1">
                    <Label className="text-xs">{t("import.stratName")}</Label>
                    <Input
                      value={s.name}
                      maxLength={80}
                      placeholder={t("titlePlaceholder")}
                      onChange={(event) =>
                        patchStrat(s.id, { name: event.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">{t("import.mapLabel")}</Label>
                    <Select
                      value={s.map}
                      onValueChange={(v) => {
                        if (v) patchStrat(s.id, { map: v });
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(maps ?? []).map((m) => (
                          <SelectItem key={m.slug} value={m.slug}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">{t("import.sideLabel")}</Label>
                    <Select
                      value={s.side}
                      onValueChange={(v) => {
                        if (v) patchStrat(s.id, { side: v as StrategySide });
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="attack">{t("attack")}</SelectItem>
                        <SelectItem value="defense">{t("defense")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {strats.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label={t("import.removeStrat")}
                      onClick={() => {
                        setStrats((prev) => prev.filter((x) => x.id !== s.id));
                        setAssign((prev) =>
                          Object.fromEntries(
                            Object.entries(prev).map(([k, v]) => [
                              k,
                              v === s.id ? null : v,
                            ]),
                          ),
                        );
                      }}
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </div>
              ))}
            </section>

            <section className="flex flex-col gap-2">
              <Label>
                {t("import.slidesTitle")} ({deck.slides.length})
              </Label>
              <div className="flex flex-col gap-1">
                {deck.slides.map((slide) => (
                  <div
                    key={slide.index}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-1.5"
                  >
                    <span className="w-16 font-mono text-xs text-muted-foreground">
                      {t("import.slide", { n: slide.index })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("import.objects", { count: slide.elements.length })}
                    </span>
                    {!slide.hasMap ? (
                      <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground uppercase">
                        {t("import.titleSlide")}
                      </span>
                    ) : null}
                    <Select
                      value={assign[slide.index] ?? "skip"}
                      onValueChange={(v) =>
                        setAssign((prev) => ({
                          ...prev,
                          [slide.index]: v && v !== "skip" ? v : null,
                        }))
                      }
                    >
                      <SelectTrigger className="ml-auto w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">{t("import.skip")}</SelectItem>
                        {strats.map((s, index) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name.trim() ||
                              t("import.stratN", { n: index + 1 })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </section>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          {deck ? (
            <Button
              type="button"
              onClick={onImport}
              disabled={!canImport || importing}
            >
              {importing && progress
                ? t("import.importing", {
                    done: progress.done,
                    total: progress.total,
                  })
                : t("import.import")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
