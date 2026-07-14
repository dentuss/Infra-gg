"use client";

import { useTranslations } from "next-intl";

import {
  buildHatchCircle,
  buildHatchSquare,
  buildPanelHole,
  buildPanelReinforcement,
} from "@/lib/board-markers";
import { LINEUP_COLORS, type BoardElement } from "@/lib/strategy";
import { useBoardStore } from "@/store/board-store";

const HOLE_CHOICES: { value: string; key: string }[] = [
  { value: "", key: "holePlain" },
  { value: "1", key: "holeFeet" },
  { value: "2", key: "holeHead" },
  { value: "3", key: "holeThrow" },
];

function MenuButton({
  label,
  onSelect,
}: {
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-xs px-2 py-1 text-left text-sm hover:bg-accent"
    >
      {label}
    </button>
  );
}

/** Placement choices for the wall/hatch clicked in enhanced mode. */
export function EnhancedMenu({ scale }: { scale: number }) {
  const t = useTranslations("strategy");
  const target = useBoardStore((state) => state.enhancedTarget);
  const activeSlot = useBoardStore((state) => state.activeSlot);
  const color = useBoardStore((state) => state.color);

  if (!target) return null;

  const markerColor =
    activeSlot === null ? color : (LINEUP_COLORS[activeSlot] ?? color);
  const anchor =
    target.kind === "wall"
      ? {
          right:
            target.panel.cx +
            (target.panel.angle === 0
              ? target.panel.length
              : target.panel.thickness) /
              2,
          middle: target.panel.cy,
        }
      : {
          right: target.zone.x + target.zone.width,
          middle: target.zone.y + target.zone.height / 2,
        };

  const place = (element: BoardElement) => {
    const store = useBoardStore.getState();
    store.placeMarker(element);
    store.setEnhancedTarget(null);
  };

  return (
    <div
      className="absolute z-20 w-44 animate-in rounded-sm border border-border bg-popover p-1 text-popover-foreground shadow-md duration-200 fade-in slide-in-from-left-1"
      style={{
        left: anchor.right * scale + 10,
        top: Math.max(0, anchor.middle * scale - 44),
      }}
      onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
    >
      {target.kind === "wall" ? (
        <>
          <MenuButton
            label={t("placeReinforcement")}
            onSelect={() =>
              place(buildPanelReinforcement(target.panel, markerColor))
            }
          />
          <div className="my-1 border-t border-border" />
          <p className="px-2 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t("placeRotation")}
          </p>
          <div className="flex gap-1 px-2 pb-1">
            {HOLE_CHOICES.map(({ value, key }) => (
              <button
                key={key}
                type="button"
                aria-label={t(key)}
                title={t(key)}
                onClick={() =>
                  place(
                    buildPanelHole(
                      target.panel,
                      { x: target.clickX, y: target.clickY },
                      markerColor,
                      value,
                    ),
                  )
                }
                className="flex size-7 items-center justify-center rounded-sm border border-border text-xs font-bold hover:bg-accent"
              >
                {value || "·"}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <MenuButton
            label={t("hatchReinforced")}
            onSelect={() => place(buildHatchSquare(target.zone, markerColor))}
          />
          <MenuButton
            label={t("hatchOpened")}
            onSelect={() => place(buildHatchCircle(target.zone, markerColor))}
          />
        </>
      )}
    </div>
  );
}
