"use client";

import Konva from "konva";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Transformer,
} from "react-konva";

import { ContextMenu } from "@/components/strategy/board-context-menu";
import {
  ElementNode,
  useHtmlImage,
} from "@/components/strategy/board-elements";
import { LineupStrip, NICKNAME_BOX } from "@/components/strategy/board-lineup";
import { OPERATOR_SRC_PREFIX } from "@/lib/operator-icons";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  LINEUP_COLORS,
  LINEUP_SIZE,
  LINEUP_SLOT_WIDTH,
  newId,
  STAGE_HEIGHT,
} from "@/lib/strategy";
import { useBoardStore } from "@/store/board-store";

// Supersample the canvas so edges stay crisp on standard-density
// displays; browsers cap the cost at one board.
if (typeof window !== "undefined") {
  Konva.pixelRatio = Math.max(2, window.devicePixelRatio || 1);
}

export default function BoardCanvas({
  canEdit,
  floorUrl,
}: {
  canEdit: boolean;
  floorUrl: string | null;
}) {
  const t = useTranslations("strategy");
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const drawingRef = useRef<{
    id: string;
    x: number;
    y: number;
    tool:
      "line" | "arrow" | "rect" | "ellipse" | "triangle" | "diamond" | "star";
  } | null>(null);
  const bandStartRef = useRef<{ x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [band, setBand] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    onElement: boolean;
  } | null>(null);

  const pages = useBoardStore((state) => state.pages);
  const activePage = useBoardStore((state) => state.activePage);
  const selectedIds = useBoardStore((state) => state.selectedIds);
  const editingTextId = useBoardStore((state) => state.editingTextId);
  const activeSlot = useBoardStore((state) => state.activeSlot);
  const editingNickname = useBoardStore((state) => state.editingNickname);
  const lineup = useBoardStore((state) => state.lineup);
  const tool = useBoardStore((state) => state.tool);
  const color = useBoardStore((state) => state.color);
  const strokeWidth = useBoardStore((state) => state.strokeWidth);
  const filled = useBoardStore((state) => state.filled);
  const borderEnabled = useBoardStore((state) => state.borderEnabled);
  const borderColor = useBoardStore((state) => state.borderColor);
  const zoom = useBoardStore((state) => state.zoom);
  const stage = useBoardStore((state) => state.stage);
  const guides = useBoardStore((state) => state.guides);
  const zoomAnchorRef = useRef<{
    boardX: number;
    boardY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const page = pages[activePage];
  const background = useHtmlImage(floorUrl);
  const scale = containerWidth ? (containerWidth / BOARD_WIDTH) * zoom : 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() =>
      setContainerWidth(container.clientWidth),
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Attach the transformer to all selected nodes.
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer || !stage) return;
    const nodes = selectedIds.flatMap((id) => {
      const node = stage.findOne(`#${id}`);
      return node ? [node] : [];
    });
    transformer.nodes(nodes);
  }, [selectedIds, stage, pages, activePage]);

  // Ctrl+wheel zoom needs a non-passive listener: React attaches wheel
  // handlers passively, so preventDefault there cannot stop the
  // browser's own page zoom.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (wheelEvent: WheelEvent) => {
      wheelEvent.preventDefault();
      const store = useBoardStore.getState();
      const rect = container.getBoundingClientRect();
      const offsetX = wheelEvent.clientX - rect.left;
      const offsetY = wheelEvent.clientY - rect.top;
      const currentScale = (container.clientWidth / BOARD_WIDTH) * store.zoom;
      // Keep the board point under the cursor stationary through the zoom.
      zoomAnchorRef.current = {
        boardX: (container.scrollLeft + offsetX) / currentScale,
        boardY: (container.scrollTop + offsetY) / currentScale,
        offsetX,
        offsetY,
      };
      store.setZoom(store.zoom * (wheelEvent.deltaY < 0 ? 1.05 : 1 / 1.05));
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  // Apply the pending zoom anchor after the stage re-rendered at the
  // new scale.
  useEffect(() => {
    const container = containerRef.current;
    const anchor = zoomAnchorRef.current;
    if (!container || !anchor) return;
    zoomAnchorRef.current = null;
    container.scrollLeft = anchor.boardX * scale - anchor.offsetX;
    container.scrollTop = anchor.boardY * scale - anchor.offsetY;
  }, [scale]);

  // Middle-mouse drag pans the view.
  const panRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  const startPan = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    panRef.current = {
      startX: clientX,
      startY: clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
    container.style.cursor = "grabbing";
    const onMove = (moveEvent: MouseEvent) => {
      const pan = panRef.current;
      if (!pan) return;
      container.scrollLeft = pan.scrollLeft - (moveEvent.clientX - pan.startX);
      container.scrollTop = pan.scrollTop - (moveEvent.clientY - pan.startY);
    };
    const onUp = () => {
      panRef.current = null;
      container.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onContainerMouseDown = (mouseEvent: React.MouseEvent) => {
    if (mouseEvent.button !== 1) return;
    mouseEvent.preventDefault();
    startPan(mouseEvent.clientX, mouseEvent.clientY);
  };

  // Close the context menu on outside clicks or Escape.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") close();
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  // Keyboard: delete, copy/paste/duplicate, undo/redo.
  useEffect(() => {
    if (!canEdit) return;
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      const target = keyEvent.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const store = useBoardStore.getState();

      if (keyEvent.key === "Delete" || keyEvent.key === "Backspace") {
        store.deleteSelected();
        return;
      }
      if (!(keyEvent.ctrlKey || keyEvent.metaKey)) return;
      const key = keyEvent.key.toLowerCase();
      if (key === "z") {
        keyEvent.preventDefault();
        if (keyEvent.shiftKey) store.redo();
        else store.undo();
      } else if (key === "y") {
        keyEvent.preventDefault();
        store.redo();
      } else if (key === "c") {
        store.copySelected();
      } else if (key === "x") {
        keyEvent.preventDefault();
        store.cutSelected();
      } else if (key === "v") {
        store.paste();
      } else if (key === "d") {
        keyEvent.preventDefault();
        store.duplicateSelected();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canEdit]);

  // Belt to the preventDefault suspenders: whatever ends up focused after
  // the opening click, pull focus back to the text editor.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!editingTextId) return;
    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [editingTextId]);

  const relativePointer = () => {
    const position = stage?.getRelativePointerPosition();
    return position ? { x: position.x, y: position.y } : null;
  };

  const onMouseDown = (konvaEvent: Konva.KonvaEventObject<MouseEvent>) => {
    if (konvaEvent.evt.button !== 0) return;
    const store = useBoardStore.getState();
    const position = relativePointer();
    if (!position) return;
    const onEmptyBoard = konvaEvent.target === konvaEvent.target.getStage();

    if (!canEdit || tool === "select") {
      if (!canEdit || !onEmptyBoard) return;
      store.setEditingText(null);
      bandStartRef.current = position;
      setBand({ x: position.x, y: position.y, width: 0, height: 0 });
      return;
    }

    // The lineup strip is not a drawing surface.
    if (position.y > BOARD_HEIGHT) return;

    if (tool === "text") {
      // Without this the browser moves focus to the canvas after the
      // handlers run, instantly blurring the freshly opened textarea.
      konvaEvent.evt.preventDefault();
      const id = newId();
      store.addElement({
        id,
        type: "text",
        x: position.x,
        y: position.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        text: "",
        fontSize: 28,
        color,
      });
      store.setEditingText(id);
      return;
    }

    const id = newId();
    drawingRef.current = { id, x: position.x, y: position.y, tool };
    store.addElement({
      id,
      type: tool,
      x: position.x,
      y: position.y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      width: 1,
      height: 1,
      points: [0, 0, 1, 1],
      // Lines and arrows start black unless a player color is active.
      color:
        tool === "line" || tool === "arrow"
          ? activeSlot === null
            ? "#09090b"
            : (LINEUP_COLORS[activeSlot] ?? "#09090b")
          : color,
      strokeWidth,
      filled,
      borderEnabled,
      borderColor,
    });
  };

  const onMouseMove = () => {
    const position = relativePointer();
    if (!position) return;
    const bandStart = bandStartRef.current;
    if (bandStart) {
      setBand({
        x: Math.min(bandStart.x, position.x),
        y: Math.min(bandStart.y, position.y),
        width: Math.abs(position.x - bandStart.x),
        height: Math.abs(position.y - bandStart.y),
      });
      return;
    }
    const drawing = drawingRef.current;
    if (!drawing) return;
    const store = useBoardStore.getState();
    const dx = position.x - drawing.x;
    const dy = position.y - drawing.y;

    if (drawing.tool === "line" || drawing.tool === "arrow") {
      store.updateElement(drawing.id, { points: [0, 0, dx, dy] });
      return;
    }
    if (drawing.tool === "ellipse") {
      store.updateElement(drawing.id, {
        x: drawing.x + dx / 2,
        y: drawing.y + dy / 2,
        width: Math.abs(dx),
        height: Math.abs(dy),
      });
      return;
    }
    store.updateElement(drawing.id, {
      x: Math.min(drawing.x, position.x),
      y: Math.min(drawing.y, position.y),
      width: Math.abs(dx),
      height: Math.abs(dy),
    });
  };

  const onMouseUp = () => {
    const store = useBoardStore.getState();

    if (bandStartRef.current) {
      bandStartRef.current = null;
      const area = band;
      setBand(null);
      if (!area || !stage || (area.width < 4 && area.height < 4)) {
        store.clearSelection();
        return;
      }
      // Select every element whose box intersects the rubber band.
      const hits = (page?.elements ?? []).filter((element) => {
        const node = stage.findOne(`#${element.id}`);
        if (!node) return false;
        const box = node.getClientRect({ relativeTo: stage });
        return (
          box.x < area.x + area.width &&
          box.x + box.width > area.x &&
          box.y < area.y + area.height &&
          box.y + box.height > area.y
        );
      });
      store.selectMany(hits.map((element) => element.id));
      return;
    }

    const drawing = drawingRef.current;
    if (!drawing) return;
    drawingRef.current = null;
    store.updateElement(drawing.id, {}, { commit: true });
    store.setTool("select");
    store.select(drawing.id);
  };

  const onDrop = (dropEvent: React.DragEvent) => {
    dropEvent.preventDefault();
    if (!canEdit || !stage) return;
    const raw = dropEvent.dataTransfer.getData("application/x-board-icon");
    if (!raw) return;
    const icon = JSON.parse(raw) as { url: string; name: string };
    stage.setPointersPositions(dropEvent.nativeEvent);
    const position = stage.getRelativePointerPosition();
    if (!position) return;
    const store = useBoardStore.getState();

    // Dropping onto a lineup slot assigns it instead of adding an element.
    if (position.y > BOARD_HEIGHT) {
      const slotIndex = Math.min(
        LINEUP_SIZE - 1,
        Math.max(0, Math.floor(position.x / LINEUP_SLOT_WIDTH)),
      );
      const item = { src: icon.url, name: icon.name };
      if (icon.url.startsWith(OPERATOR_SRC_PREFIX)) {
        store.setLineupSlot(slotIndex, { operator: item });
      } else {
        store.setLineupSlot(slotIndex, { gadget: item });
      }
      return;
    }

    store.insertIcon(icon.url, icon.name, position.x - 32, position.y - 32);
  };

  const editingElement = page?.elements.find(
    (element) => element.id === editingTextId,
  );

  return (
    <div
      ref={containerRef}
      className="relative min-w-0 flex-1 overflow-auto bg-black/40"
      onDragOver={(dragEvent) => dragEvent.preventDefault()}
      onDrop={onDrop}
      onMouseDown={onContainerMouseDown}
    >
      {scale > 0 ? (
        <Stage
          ref={(node) => useBoardStore.getState().setStage(node)}
          width={BOARD_WIDTH * scale}
          height={STAGE_HEIGHT * scale}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onContextMenu={(konvaEvent) => {
            konvaEvent.evt.preventDefault();
            if (!canEdit) return;
            const store = useBoardStore.getState();
            let onElement = false;
            const target = konvaEvent.target;
            if (target !== target.getStage()) {
              const id = target.id();
              if (id && page?.elements.some((element) => element.id === id)) {
                onElement = true;
                if (!store.selectedIds.includes(id)) {
                  store.select(id);
                }
              }
            }
            setMenu({
              x: konvaEvent.evt.clientX,
              y: konvaEvent.evt.clientY,
              onElement,
            });
          }}
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              width={BOARD_WIDTH}
              height={BOARD_HEIGHT}
              fill="#18181b"
              listening={false}
            />
            {background ? (
              <KonvaImage
                image={background}
                x={0}
                y={0}
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                listening={false}
              />
            ) : null}
            {page?.elements.map((element) => (
              <ElementNode
                key={element.id}
                element={element}
                draggable={canEdit && tool === "select"}
                onSelect={(additive) =>
                  useBoardStore.getState().select(element.id, additive)
                }
                onChange={(patch, commit) =>
                  useBoardStore
                    .getState()
                    .updateElement(element.id, patch, { commit })
                }
                onTextEdit={() =>
                  canEdit && useBoardStore.getState().setEditingText(element.id)
                }
              />
            ))}
            <LineupStrip canEdit={canEdit} />
            {guides?.v.map((x) => (
              <Line
                key={`v-${x}`}
                points={[x, 0, x, BOARD_HEIGHT]}
                stroke="#d946ef"
                strokeWidth={1 / Math.max(scale, 0.01)}
                dash={[8, 6]}
                listening={false}
              />
            ))}
            {guides?.h.map((y) => (
              <Line
                key={`h-${y}`}
                points={[0, y, BOARD_WIDTH, y]}
                stroke="#d946ef"
                strokeWidth={1 / Math.max(scale, 0.01)}
                dash={[8, 6]}
                listening={false}
              />
            ))}
            {band ? (
              <Rect
                x={band.x}
                y={band.y}
                width={band.width}
                height={band.height}
                stroke="#3b82f6"
                strokeWidth={1 / Math.max(scale, 0.01)}
                dash={[6, 4]}
                fill="rgba(59, 130, 246, 0.1)"
                listening={false}
              />
            ) : null}
            {canEdit ? (
              <Transformer
                ref={transformerRef}
                rotateEnabled
                flipEnabled={false}
              />
            ) : null}
          </Layer>
        </Stage>
      ) : null}

      {menu ? <ContextMenu menu={menu} onClose={() => setMenu(null)} /> : null}

      {editingElement ? (
        <textarea
          ref={textareaRef}
          autoFocus
          value={editingElement.text ?? ""}
          onChange={(changeEvent) =>
            useBoardStore.getState().updateElement(editingElement.id, {
              text: changeEvent.target.value,
            })
          }
          onBlur={() => {
            const store = useBoardStore.getState();
            store.updateElement(editingElement.id, {}, { commit: true });
            store.setEditingText(null);
          }}
          onKeyDown={(keyEvent) => {
            if (keyEvent.key === "Enter" && !keyEvent.shiftKey) {
              keyEvent.preventDefault();
              (keyEvent.target as HTMLTextAreaElement).blur();
            }
          }}
          className="absolute z-10 w-64 resize-none border border-ring bg-background/90 p-1 text-sm outline-none"
          style={{
            left: editingElement.x * scale,
            top: editingElement.y * scale,
          }}
        />
      ) : null}

      {editingNickname !== null && canEdit ? (
        <input
          key={editingNickname}
          autoFocus
          defaultValue={lineup[editingNickname]?.nickname ?? ""}
          maxLength={20}
          aria-label={t("lineupNickname")}
          onBlur={(blurEvent) => {
            const store = useBoardStore.getState();
            store.setLineupSlot(editingNickname, {
              nickname: blurEvent.target.value.trim() || undefined,
            });
            store.setEditingNickname(null);
          }}
          onKeyDown={(keyEvent) => {
            if (keyEvent.key === "Enter") {
              (keyEvent.target as HTMLInputElement).blur();
            }
            if (keyEvent.key === "Escape") {
              useBoardStore.getState().setEditingNickname(null);
            }
          }}
          className="absolute z-10 border border-ring bg-background/90 p-1 text-center text-sm outline-none"
          style={{
            left:
              (editingNickname * LINEUP_SLOT_WIDTH + NICKNAME_BOX.x) * scale,
            top: (BOARD_HEIGHT + NICKNAME_BOX.y) * scale,
            width: NICKNAME_BOX.width * scale,
            height: Math.max(NICKNAME_BOX.height * scale, 24),
          }}
        />
      ) : null}
    </div>
  );
}
