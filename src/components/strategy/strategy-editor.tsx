"use client";

import type Konva from "konva";
import { ArrowLeft, Download, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { AssetsPanel } from "@/components/strategy/assets-panel";
import { BoardModeSwitch } from "@/components/strategy/board-mode-switch";
import { BoardToolbar } from "@/components/strategy/board-toolbar";
import { badgeVariants } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBlueprintMaps } from "@/hooks/use-board-assets";
import { useSaveStrategy, useStrategy } from "@/hooks/use-strategies";
import {
  BOARD_WIDTH,
  newPage,
  parseScene,
  resolveVariant,
  styleLabelKey,
  styleSupportsEnhanced,
  titleize,
} from "@/lib/strategy";
import { cn } from "@/lib/utils";
import { uploadStrategyThumbnail } from "@/services/strategy-thumbnails";
import { useBoardStore } from "@/store/board-store";
import type { Json } from "@/types/database";

const BoardCanvas = dynamic(
  () => import("@/components/strategy/board-canvas"),
  { ssr: false },
);

/** Full-board PNG at a fixed pixel width, selection handles hidden. */
function stageSnapshot(stage: Konva.Stage, pixelWidth: number): string {
  const helpers = stage.find("Transformer");
  helpers.forEach((node) => node.visible(false));
  const dataUrl = stage.toDataURL({ pixelRatio: pixelWidth / stage.width() });
  helpers.forEach((node) => node.visible(true));
  return dataUrl;
}

const KNOWN_FLOORS = new Set([
  "basement",
  "ground_floor",
  "middle_floor",
  "first_floor",
  "second_floor",
  "third_floor",
  "top_floor",
  "roof",
]);

export function StrategyEditor({
  strategyId,
  userId,
  isStaffRole,
  canAuthorRole,
}: {
  strategyId: string;
  userId: string;
  isStaffRole: boolean;
  canAuthorRole: boolean;
}) {
  const t = useTranslations("strategy");
  const { data: strategy, isPending, error } = useStrategy(strategyId);
  const { data: maps } = useBlueprintMaps();
  const saveStrategy = useSaveStrategy();
  const loadedForId = useRef<string | null>(null);

  const pages = useBoardStore((state) => state.pages);
  const lineup = useBoardStore((state) => state.lineup);
  const activePage = useBoardStore((state) => state.activePage);
  const dirty = useBoardStore((state) => state.dirty);
  const style = useBoardStore((state) => state.style);

  const mapInfo = maps?.find((candidate) => candidate.slug === strategy?.map);
  const canEdit =
    !!strategy &&
    (isStaffRole || (canAuthorRole && strategy.created_by === userId));

  // Load the scene once per strategy; seed an initial page when empty.
  useEffect(() => {
    if (!strategy || !maps || loadedForId.current === strategy.id) return;
    loadedForId.current = strategy.id;
    const scene = parseScene(strategy.data);
    if (scene.pages.length === 0) {
      const firstFloor =
        maps.find((candidate) => candidate.slug === strategy.map)?.floors[0]
          ?.slug ?? "first_floor";
      scene.pages = [newPage(firstFloor)];
    }
    useBoardStore.getState().load(scene);
  }, [strategy, maps]);

  // First visit: explain zoom, pan, and the context menu.
  useEffect(() => {
    if (canEdit) useBoardStore.getState().showHint("boardBasics");
  }, [canEdit]);

  // Debounced autosave whenever the scene is dirty.
  useEffect(() => {
    if (!canEdit || !dirty || !strategy) return;
    const timer = setTimeout(() => {
      saveStrategy.mutate(
        {
          id: strategy.id,
          patch: { data: { pages, lineup, style } as unknown as Json },
        },
        {
          onSuccess: () => {
            useBoardStore.getState().markSaved();
            const stage = useBoardStore.getState().stage;
            if (stage) {
              void uploadStrategyThumbnail(
                strategy.id,
                stageSnapshot(stage, 640),
              );
            }
          },
        },
      );
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, lineup, style, dirty, canEdit, strategy?.id]);

  const page = pages[activePage];
  // Style chosen for the strategy, falling back to the map's first render.
  const effectiveStyle = style || mapInfo?.styles[0] || "";
  const currentFloor =
    mapInfo?.floors.find((floor) => floor.slug === page?.floor) ?? null;
  const variant = currentFloor
    ? resolveVariant(currentFloor, effectiveStyle)
    : null;
  // Imported pages carry their own fixed background; it overrides the blueprint.
  const floorUrl = page?.background ?? variant?.url ?? null;
  const resolvedStyle = variant?.style ?? effectiveStyle;
  const enhancedAvailable =
    !page?.background && !!variant && styleSupportsEnhanced(resolvedStyle);

  // BW line-art can't be tagged, so never leave the board stuck in enhanced.
  useEffect(() => {
    if (
      !enhancedAvailable &&
      useBoardStore.getState().boardMode === "enhanced"
    ) {
      useBoardStore.getState().setBoardMode("default");
    }
  }, [enhancedAvailable]);

  if (error) {
    return (
      <p role="alert" className="p-6 text-sm text-destructive">
        {t("loadError", { message: error.message })}
      </p>
    );
  }
  if (isPending || !strategy) {
    return <p className="p-6 text-sm text-muted-foreground">{t("loading")}</p>;
  }

  const floorName = (slug: string) =>
    KNOWN_FLOORS.has(slug) ? t(`floors.${slug}`) : titleize(slug);

  const exportPng = () => {
    const stage = useBoardStore.getState().stage;
    if (!stage) return;
    const link = document.createElement("a");
    link.download = `${strategy.title}.png`;
    // Export at a fixed 3200x1800 regardless of the on-screen zoom.
    link.href = stageSnapshot(stage, BOARD_WIDTH * 2);
    link.click();
  };

  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Link
          href="/strategies"
          aria-label={t("back")}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft />
        </Link>

        {canEdit ? (
          <Input
            defaultValue={strategy.title}
            maxLength={80}
            className="w-56"
            onBlur={(blurEvent) => {
              const title = blurEvent.target.value.trim();
              if (title && title !== strategy.title) {
                saveStrategy.mutate({ id: strategy.id, patch: { title } });
              }
            }}
          />
        ) : (
          <span className="font-semibold">{strategy.title}</span>
        )}

        <span className="text-sm text-muted-foreground">
          {mapInfo?.name ?? titleize(strategy.map)}
        </span>

        <span
          className={cn(
            badgeVariants({ variant: "outline" }),
            "border-amber-500/40 text-amber-500",
          )}
        >
          {t("inDev")}
        </span>

        {page ? (
          <Select
            value={page.floor}
            onValueChange={(floor) => {
              if (canEdit && floor) {
                useBoardStore.getState().setActiveFloor(floor);
              }
            }}
          >
            <SelectTrigger className="w-40" disabled={!canEdit}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(mapInfo?.floors ?? []).map((floor) => (
                <SelectItem key={floor.slug} value={floor.slug}>
                  {floorName(floor.slug)}
                </SelectItem>
              ))}
              {mapInfo?.floors.every((floor) => floor.slug !== page.floor) ? (
                <SelectItem value={page.floor}>
                  {floorName(page.floor)}
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        ) : null}

        <div className="flex items-center gap-1">
          {pages.map((candidate, index) => (
            <Button
              key={candidate.id}
              variant={index === activePage ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 px-0"
              onClick={() => useBoardStore.getState().setActivePage(index)}
            >
              {index + 1}
            </Button>
          ))}
          {canEdit ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 px-0"
                aria-label={t("addPage")}
                title={t("addPage")}
                onClick={() =>
                  useBoardStore
                    .getState()
                    .addPage(page?.floor ?? mapInfo?.floors[0]?.slug ?? "")
                }
              >
                <Plus />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 px-0 text-destructive"
                aria-label={t("removePage")}
                title={t("removePage")}
                disabled={pages.length <= 1}
                onClick={() => useBoardStore.getState().removeActivePage()}
              >
                <Trash2 />
              </Button>
            </>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {canEdit && (mapInfo?.styles.length ?? 0) > 0 ? (
            <Select
              value={effectiveStyle}
              onValueChange={(next) => {
                if (canEdit && next) useBoardStore.getState().setStyle(next);
              }}
            >
              <SelectTrigger className="w-36" aria-label={t("styleLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(mapInfo?.styles ?? []).map((styleOption) => (
                  <SelectItem key={styleOption} value={styleOption}>
                    {t(styleLabelKey(styleOption))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {canEdit ? <BoardModeSwitch available={enhancedAvailable} /> : null}
          <span className="text-xs text-muted-foreground">
            {saveStrategy.isPending
              ? t("saving")
              : dirty
                ? t("unsaved")
                : t("saved")}
          </span>
          <Button variant="outline" size="sm" onClick={exportPng}>
            <Download /> {t("exportPng")}
          </Button>
        </div>
      </header>

      {!canEdit ? (
        <p className="border-b border-border px-4 py-1 text-xs text-muted-foreground">
          {t("readOnly")}
        </p>
      ) : null}

      {canEdit && resolvedStyle === "bw" ? (
        <p className="border-b border-border px-4 py-1 text-xs text-amber-500/90">
          {t("enhancedUnavailableBw")}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {canEdit ? <BoardToolbar /> : null}
        <BoardCanvas canEdit={canEdit} floorUrl={floorUrl} />
        {canEdit ? <AssetsPanel /> : null}
      </div>
    </div>
  );
}
