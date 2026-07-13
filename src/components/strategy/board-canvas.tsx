"use client";

import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import {
  Image as KonvaImage,
  Layer,
  Rect,
  Stage,
  Transformer,
} from "react-konva";

import {
  ElementNode,
  useHtmlImage,
} from "@/components/strategy/board-elements";
import { BOARD_HEIGHT, BOARD_WIDTH, newId } from "@/lib/strategy";
import { newIconElement, useBoardStore } from "@/store/board-store";

export default function BoardCanvas({
  canEdit,
  floorUrl,
}: {
  canEdit: boolean;
  floorUrl: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const drawingRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const bandStartRef = useRef<{ x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [band, setBand] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const pages = useBoardStore((state) => state.pages);
  const activePage = useBoardStore((state) => state.activePage);
  const selectedIds = useBoardStore((state) => state.selectedIds);
  const editingTextId = useBoardStore((state) => state.editingTextId);
  const tool = useBoardStore((state) => state.tool);
  const color = useBoardStore((state) => state.color);
  const strokeWidth = useBoardStore((state) => state.strokeWidth);
  const filled = useBoardStore((state) => state.filled);
  const zoom = useBoardStore((state) => state.zoom);
  const stage = useBoardStore((state) => state.stage);

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
      if (!wheelEvent.ctrlKey) return;
      wheelEvent.preventDefault();
      const store = useBoardStore.getState();
      store.setZoom(store.zoom * (wheelEvent.deltaY < 0 ? 1.1 : 0.9));
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

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

  const relativePointer = () => {
    const position = stage?.getRelativePointerPosition();
    return position ? { x: position.x, y: position.y } : null;
  };

  const onMouseDown = (konvaEvent: Konva.KonvaEventObject<MouseEvent>) => {
    if (!canEdit) return;
    const store = useBoardStore.getState();
    const position = relativePointer();
    if (!position) return;

    if (tool === "select") {
      if (konvaEvent.target === konvaEvent.target.getStage()) {
        bandStartRef.current = position;
        setBand({ x: position.x, y: position.y, width: 0, height: 0 });
        store.setEditingText(null);
      }
      return;
    }

    if (tool === "text") {
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
    drawingRef.current = { id, x: position.x, y: position.y };
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
      color,
      strokeWidth,
      filled,
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

    if (tool === "line" || tool === "arrow") {
      store.updateElement(drawing.id, { points: [0, 0, dx, dy] });
      return;
    }
    if (tool === "ellipse") {
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
    useBoardStore
      .getState()
      .addElement(
        newIconElement(icon.url, icon.name, position.x - 32, position.y - 32),
      );
  };

  const editingElement = page?.elements.find(
    (element) => element.id === editingTextId,
  );

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-auto bg-black/40"
      onDragOver={(dragEvent) => dragEvent.preventDefault()}
      onDrop={onDrop}
    >
      {scale > 0 ? (
        <Stage
          ref={(node) => useBoardStore.getState().setStage(node)}
          width={BOARD_WIDTH * scale}
          height={BOARD_HEIGHT * scale}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
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

      {editingElement ? (
        <textarea
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
    </div>
  );
}
