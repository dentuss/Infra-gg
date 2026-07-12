"use client";

import {
  Circle,
  MousePointer2,
  MoveUpRight,
  Redo2,
  Slash,
  Square,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { BOARD_COLORS, type BoardTool } from "@/lib/strategy";
import { cn } from "@/lib/utils";
import { useBoardStore } from "@/store/board-store";

const TOOLS: { tool: BoardTool; icon: typeof Type; key: string }[] = [
  { tool: "select", icon: MousePointer2, key: "toolSelect" },
  { tool: "text", icon: Type, key: "toolText" },
  { tool: "line", icon: Slash, key: "toolLine" },
  { tool: "arrow", icon: MoveUpRight, key: "toolArrow" },
  { tool: "rect", icon: Square, key: "toolRect" },
  { tool: "ellipse", icon: Circle, key: "toolEllipse" },
];

export function BoardToolbar() {
  const t = useTranslations("strategy");
  const tool = useBoardStore((state) => state.tool);
  const color = useBoardStore((state) => state.color);
  const zoom = useBoardStore((state) => state.zoom);
  const selectedId = useBoardStore((state) => state.selectedId);
  const historyIndex = useBoardStore((state) => state.historyIndex);
  const historyLength = useBoardStore((state) => state.history.length);

  const store = () => useBoardStore.getState();

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-border py-2">
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

      <div className="my-2 grid grid-cols-2 gap-1 px-1">
        {BOARD_COLORS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-label={t("color")}
            className={cn(
              "size-5 rounded-sm border border-border",
              color === candidate && "ring-2 ring-ring",
            )}
            style={{ backgroundColor: candidate }}
            onClick={() => store().setColor(candidate)}
          />
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label={t("deleteElement")}
        title={t("deleteElement")}
        disabled={!selectedId}
        className="text-destructive"
        onClick={() => store().deleteSelected()}
      >
        <Trash2 />
      </Button>

      <div className="mt-auto flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("undo")}
          title={t("undo")}
          disabled={historyIndex <= 0}
          onClick={() => store().undo()}
        >
          <Undo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("redo")}
          title={t("redo")}
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
