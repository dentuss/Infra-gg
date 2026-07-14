"use client";

import type Konva from "konva";
import { Group, Rect } from "react-konva";

import type {
  BlueprintAnalysis,
  HatchZone,
  WallPanel,
} from "@/lib/blueprint-analyze";
import { useBoardStore } from "@/store/board-store";

const WALL_TINT = "#3b82f6";
const HATCH_TINT = "#f97316";
const IDLE_OPACITY = 0.55;

const hoverHandlers = {
  onMouseEnter: (konvaEvent: Konva.KonvaEventObject<MouseEvent>) => {
    konvaEvent.target.opacity(1);
    const stage = konvaEvent.target.getStage();
    if (stage) stage.container().style.cursor = "pointer";
  },
  onMouseLeave: (konvaEvent: Konva.KonvaEventObject<MouseEvent>) => {
    konvaEvent.target.opacity(IDLE_OPACITY);
    const stage = konvaEvent.target.getStage();
    if (stage) stage.container().style.cursor = "";
  },
};

function PanelHighlight({ panel }: { panel: WallPanel }) {
  const width = panel.length + 6;
  const height = panel.thickness + 6;
  return (
    <Rect
      x={panel.cx}
      y={panel.cy}
      offsetX={width / 2}
      offsetY={height / 2}
      width={width}
      height={height}
      rotation={panel.angle}
      cornerRadius={3}
      fill={`${WALL_TINT}55`}
      stroke={WALL_TINT}
      strokeWidth={1.5}
      opacity={IDLE_OPACITY}
      {...hoverHandlers}
      onClick={(konvaEvent) => {
        konvaEvent.cancelBubble = true;
        const position = konvaEvent.target
          .getStage()
          ?.getRelativePointerPosition();
        useBoardStore.getState().setEnhancedTarget({
          kind: "wall",
          panel,
          clickX: position?.x ?? panel.cx,
          clickY: position?.y ?? panel.cy,
        });
      }}
    />
  );
}

function HatchHighlight({ zone }: { zone: HatchZone }) {
  return (
    <Rect
      x={zone.x - 3}
      y={zone.y - 3}
      width={zone.width + 6}
      height={zone.height + 6}
      cornerRadius={3}
      fill={`${HATCH_TINT}55`}
      stroke={HATCH_TINT}
      strokeWidth={1.5}
      opacity={IDLE_OPACITY}
      {...hoverHandlers}
      onClick={(konvaEvent) => {
        konvaEvent.cancelBubble = true;
        useBoardStore.getState().setEnhancedTarget({ kind: "hatch", zone });
      }}
    />
  );
}

/** Clickable highlights over every detected wall panel and hatch. */
export function EnhancedOverlay({ analysis }: { analysis: BlueprintAnalysis }) {
  return (
    <Group>
      {analysis.panels.map((panel, index) => (
        <PanelHighlight key={`panel-${index}`} panel={panel} />
      ))}
      {analysis.hatches.map((zone, index) => (
        <HatchHighlight key={`hatch-${index}`} zone={zone} />
      ))}
    </Group>
  );
}
