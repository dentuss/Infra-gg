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
  const [containerWidth, setContainerWidth] = useState(0);

  const pages = useBoardStore((state) => state.pages);
  const activePage = useBoardStore((state) => state.activePage);
  const selectedId = useBoardStore((state) => state.selectedId);
  const editingTextId = useBoardStore((state) => state.editingTextId);
  const tool = useBoardStore((state) => state.tool);
  const color = useBoardStore((state) => state.color);
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

  // Attach the transformer to the selected node.
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer || !stage) return;
    const node = selectedId ? stage.findOne(`#${selectedId}`) : null;
    transformer.nodes(node ? [node] : []);
  }, [selectedId, stage, pages, activePage]);

  // Delete key removes the selection while not editing text.
  useEffect(() => {
    if (!canEdit) return;
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      const target = keyEvent.target as HTMLElement;
      if (
        (keyEvent.key === "Delete" || keyEvent.key === "Backspace") &&
        !["INPUT", "TEXTAREA"].includes(target.tagName)
      ) {
        useBoardStore.getState().deleteSelected();
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
        store.select(null);
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
    });
  };

  const onMouseMove = () => {
    const drawing = drawingRef.current;
    if (!drawing) return;
    const position = relativePointer();
    if (!position) return;
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
    const drawing = drawingRef.current;
    if (!drawing) return;
    drawingRef.current = null;
    const store = useBoardStore.getState();
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
      onWheel={(wheelEvent) => {
        if (!wheelEvent.ctrlKey) return;
        wheelEvent.preventDefault();
        const store = useBoardStore.getState();
        store.setZoom(zoom * (wheelEvent.deltaY < 0 ? 1.1 : 0.9));
      }}
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
                onSelect={() => useBoardStore.getState().select(element.id)}
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
