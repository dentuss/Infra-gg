"use client";

import {
  Circle,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Diamond,
  MousePointer2,
  MoveUpRight,
  Redo2,
  Slash,
  Square,
  Star,
  Trash2,
  Triangle,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { ColorPicker } from "@/components/strategy/color-picker";
import { Button } from "@/components/ui/button";
import type { BoardTool } from "@/lib/strategy";
import { cn } from "@/lib/utils";
import { useBoardStore } from "@/store/board-store";

const TOOLS: { tool: BoardTool; icon: typeof Type; key: string }[] = [
  { tool: "select", icon: MousePointer2, key: "toolSelect" },
  { tool: "text", icon: Type, key: "toolText" },
  { tool: "line", icon: Slash, key: "toolLine" },
  { tool: "arrow", icon: MoveUpRight, key: "toolArrow" },
  { tool: "rect", icon: Square, key: "toolRect" },
  { tool: "ellipse", icon: Circle, key: "toolEllipse" },
  { tool: "triangle", icon: Triangle, key: "toolTriangle" },
  { tool: "diamond", icon: Diamond, key: "toolDiamond" },
  { tool: "star", icon: Star, key: "toolStar" },
];

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8, 12];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-2 text-[0.6rem] tracking-wide text-muted-foreground uppercase">
      {children}
    </span>
  );
}

export function BoardToolbar() {
  const t = useTranslations("strategy");
  const tool = useBoardStore((state) => state.tool);
  const color = useBoardStore((state) => state.color);
  const strokeWidth = useBoardStore((state) => state.strokeWidth);
  const filled = useBoardStore((state) => state.filled);
  const borderEnabled = useBoardStore((state) => state.borderEnabled);
  const borderColor = useBoardStore((state) => state.borderColor);
  const zoom = useBoardStore((state) => state.zoom);
  const selectedIds = useBoardStore((state) => state.selectedIds);
  const clipboard = useBoardStore((state) => state.clipboard);
  const historyIndex = useBoardStore((state) => state.historyIndex);
  const historyLength = useBoardStore((state) => state.history.length);

  const store = () => useBoardStore.getState();
  const hasSelection = selectedIds.length > 0;

  return (
    <aside className="flex w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-border py-2">
      {TOOLS.map(({ tool: candidate, icon: Icon, key }) => (
        <Button
          key={candidate}
          variant={tool === candidate ? "secondary" : "ghost"}
          size="icon"
          aria-label={t(key)}
          title={t(key)}
          onClick={() => store().setTool(candidate)}
        >
          <Icon />
        </Button>
      ))}

      <SectionLabel>{t("color")}</SectionLabel>
      <div className="flex items-center gap-1">
        <ColorPicker
          value={color}
          label={t("color")}
          onChange={(next) => store().setColor(next)}
        />
        <button
          type="button"
          aria-label={t("fillHollow")}
          title={filled ? t("fillFilled") : t("fillHollow")}
          onClick={() => store().setFilled(!filled)}
          className={cn(
            "flex size-7 items-center justify-center rounded-sm border border-border",
          )}
        >
          {filled ? (
            <span className="size-3.5 bg-foreground" />
          ) : (
            <span className="size-3.5 border-2 border-foreground" />
          )}
        </button>
      </div>

      <SectionLabel>{t("borderLabel")}</SectionLabel>
      <div className="flex items-center gap-1">
        <ColorPicker
          value={borderColor}
          label={t("borderColor")}
          onChange={(next) => store().setBorderColor(next)}
        />
        <button
          type="button"
          aria-label={t("toggleBorder")}
          title={t("toggleBorder")}
          onClick={() => store().setBorderEnabled(!borderEnabled)}
          className={cn(
            "flex size-7 items-center justify-center rounded-sm border border-border text-[0.6rem] font-bold uppercase",
            borderEnabled
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground line-through",
          )}
        >
          {t("borderShort")}
        </button>
      </div>
      <select
        aria-label={t("strokeWidth")}
        title={t("strokeWidth")}
        value={strokeWidth}
        onChange={(changeEvent) =>
          store().setStrokeWidth(Number(changeEvent.target.value))
        }
        className="mt-1 w-12 rounded-sm border border-border bg-background px-1 py-0.5 text-center text-xs"
      >
        {STROKE_WIDTHS.map((candidate) => (
          <option key={candidate} value={candidate}>
            {candidate}px
          </option>
        ))}
      </select>

      <div className="mt-2 flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("duplicate")}
          title={`${t("duplicate")} (Ctrl+D)`}
          disabled={!hasSelection}
          onClick={() => store().duplicateSelected()}
        >
          <CopyPlus />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("copy")}
          title={`${t("copy")} (Ctrl+C)`}
          disabled={!hasSelection}
          onClick={() => store().copySelected()}
        >
          <Copy />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("paste")}
          title={`${t("paste")} (Ctrl+V)`}
          disabled={clipboard.length === 0}
          onClick={() => store().paste()}
        >
          <ClipboardPaste />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("deleteElement")}
          title={t("deleteElement")}
          disabled={!hasSelection}
          className="text-destructive"
          onClick={() => store().deleteSelected()}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="mt-auto flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("undo")}
          title={`${t("undo")} (Ctrl+Z)`}
          disabled={historyIndex <= 0}
          onClick={() => store().undo()}
        >
          <Undo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("redo")}
          title={`${t("redo")} (Ctrl+Y)`}
          disabled={historyIndex >= historyLength - 1}
          onClick={() => store().redo()}
        >
          <Redo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("zoomIn")}
          title={t("zoomIn")}
          onClick={() => store().setZoom(zoom * 1.25)}
        >
          <ZoomIn />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("zoomOut")}
          title={t("zoomOut")}
          onClick={() => store().setZoom(zoom / 1.25)}
        >
          <ZoomOut />
        </Button>
      </div>
    </aside>
  );
}
