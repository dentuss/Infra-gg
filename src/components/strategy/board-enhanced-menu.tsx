"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import {
  buildHatchCircle,
  buildHatchSquare,
  buildPanelHole,
  buildPanelReinforcement,
  HOLE_LABELS,
} from "@/lib/board-markers";
import { BOARD_WIDTH, LINEUP_COLORS, type BoardElement } from "@/lib/strategy";
import { useBoardStore } from "@/store/board-store";

const MENU_WIDTH = 176; // w-44
const GAP = 10;

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
      role="menuitem"
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
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking anywhere outside the menu. The opening click sets
  // the target on mouseup, after which this subscribes — so it never
  // self-closes.
  useEffect(() => {
    if (!target) return;
    const onDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        useBoardStore.getState().setEnhancedTarget(null);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [target]);

  if (!target) return null;

  const markerColor =
    activeSlot === null ? color : (LINEUP_COLORS[activeSlot] ?? color);

  const span =
    target.kind === "wall"
      ? (target.panel.angle === 0
          ? target.panel.length
          : target.panel.thickness) / 2
      : target.zone.width / 2;
  const centerX =
    target.kind === "wall"
      ? target.panel.cx
      : target.zone.x + target.zone.width / 2;
  const middle =
    target.kind === "wall"
      ? target.panel.cy
      : target.zone.y + target.zone.height / 2;

  // Anchor to the right of the target; flip to the left if that would run
  // past the board's right edge.
  const wrapperWidth = BOARD_WIDTH * scale;
  const rightPlacement = (centerX + span) * scale + GAP;
  const flip = rightPlacement + MENU_WIDTH > wrapperWidth;
  const left = flip
    ? (centerX - span) * scale - MENU_WIDTH - GAP
    : rightPlacement;
  const clampedLeft = Math.max(
    4,
    Math.min(left, wrapperWidth - MENU_WIDTH - 4),
  );

  const place = (element: BoardElement) => {
    const store = useBoardStore.getState();
    store.placeMarker(element);
    store.setEnhancedTarget(null);
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t("enhancedMenuLabel")}
      className="absolute z-20 w-44 animate-in rounded-sm border border-border bg-popover p-1 text-popover-foreground shadow-md duration-200 fade-in slide-in-from-left-1"
      style={{
        left: clampedLeft,
        top: Math.max(0, middle * scale - 44),
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
            {HOLE_LABELS.map(({ value, key }) => (
              <button
                key={key}
                type="button"
                role="menuitem"
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
