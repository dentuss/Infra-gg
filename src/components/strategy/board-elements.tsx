"use client";

import type Konva from "konva";
import { useEffect, useSyncExternalStore } from "react";
import {
  Arrow,
  Ellipse,
  Group,
  Image as KonvaImage,
  Line,
  Rect,
  Text,
} from "react-konva";

import { computeSnap, type Box } from "@/lib/board-snapping";
import { resolveIconSrc } from "@/lib/operator-icons";
import {
  DEFAULT_STROKE_WIDTH,
  diamondPoints,
  starPoints,
  trianglePoints,
  type BoardElement,
} from "@/lib/strategy";
import { useBoardStore } from "@/store/board-store";

function snapDraggedNode(node: Konva.Node, elementId: string) {
  const store = useBoardStore.getState();
  const stage = store.stage;
  const page = store.pages[store.activePage];
  if (!stage || !page) return;

  const moving = new Set(
    store.selectedIds.length > 0 ? store.selectedIds : [elementId],
  );
  const others: Box[] = page.elements
    .filter((candidate) => !moving.has(candidate.id))
    .flatMap((candidate) => {
      const other = stage.findOne(`#${candidate.id}`);
      return other ? [other.getClientRect({ relativeTo: stage })] : [];
    });

  const snap = computeSnap(node.getClientRect({ relativeTo: stage }), others);
  if (snap.dx !== 0 || snap.dy !== 0) {
    node.position({ x: node.x() + snap.dx, y: node.y() + snap.dy });
  }
  store.setGuides(
    snap.vGuides.length || snap.hGuides.length
      ? { v: snap.vGuides, h: snap.hGuides }
      : null,
  );
}

// Module-level image cache: the same icon placed many times loads once,
// and useSyncExternalStore keeps the effect free of setState calls.
const loadedImages = new Map<string, HTMLImageElement>();
const pendingImages = new Set<string>();
const imageListeners = new Set<() => void>();

function subscribeToImages(listener: () => void) {
  imageListeners.add(listener);
  return () => imageListeners.delete(listener);
}

export function useHtmlImage(src: string | null | undefined) {
  useEffect(() => {
    if (!src || loadedImages.has(src) || pendingImages.has(src)) return;
    pendingImages.add(src);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = resolveIconSrc(src);
    img.onload = () => {
      loadedImages.set(src, img);
      pendingImages.delete(src);
      imageListeners.forEach((listener) => listener());
    };
  }, [src]);

  return useSyncExternalStore(
    subscribeToImages,
    () => (src ? (loadedImages.get(src) ?? null) : null),
    () => null,
  );
}

export type ElementNodeProps = {
  element: BoardElement;
  draggable: boolean;
  onSelect: (additive: boolean) => void;
  onChange: (patch: Partial<BoardElement>, commit: boolean) => void;
  onTextEdit: () => void;
};

function IconImage({
  element,
  common,
}: {
  element: BoardElement;
  common: Record<string, unknown>;
}) {
  const image = useHtmlImage(element.src);
  const borderOn = element.borderEnabled ?? false;
  return (
    <KonvaImage
      {...common}
      image={image ?? undefined}
      width={element.width}
      height={element.height}
      strokeScaleEnabled={false}
      stroke={borderOn ? (element.borderColor ?? element.color) : undefined}
      strokeWidth={
        borderOn ? (element.strokeWidth ?? DEFAULT_STROKE_WIDTH) : undefined
      }
    />
  );
}

export function ElementNode({
  element,
  draggable,
  onSelect,
  onChange,
  onTextEdit,
}: ElementNodeProps) {
  const common = {
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    scaleX: element.scaleX,
    scaleY: element.scaleY,
    draggable,
    onClick: (konvaEvent: Konva.KonvaEventObject<MouseEvent>) =>
      onSelect(konvaEvent.evt.shiftKey),
    onTap: () => onSelect(false),
    onDragStart: () => {
      const store = useBoardStore.getState();
      if (!store.selectedIds.includes(element.id)) {
        store.select(element.id);
        return;
      }
      // Group drag: remember every selected node's starting position.
      if (store.selectedIds.length > 1 && store.stage) {
        const origins: Record<string, { x: number; y: number }> = {};
        for (const id of store.selectedIds) {
          const node = store.stage.findOne(`#${id}`);
          if (node) origins[id] = { x: node.x(), y: node.y() };
        }
        store.setDragOrigins(origins);
      }
    },
    onDragMove: (konvaEvent: Konva.KonvaEventObject<DragEvent>) => {
      snapDraggedNode(konvaEvent.target, element.id);
      const store = useBoardStore.getState();
      const origins = store.dragOrigins;
      const origin = origins?.[element.id];
      if (!origins || !origin || !store.stage) return;
      const dx = konvaEvent.target.x() - origin.x;
      const dy = konvaEvent.target.y() - origin.y;
      for (const id of store.selectedIds) {
        if (id === element.id) continue;
        const peerOrigin = origins[id];
        if (!peerOrigin) continue;
        store.stage
          .findOne(`#${id}`)
          ?.position({ x: peerOrigin.x + dx, y: peerOrigin.y + dy });
      }
    },
    onDragEnd: (konvaEvent: Konva.KonvaEventObject<DragEvent>) => {
      const store = useBoardStore.getState();
      store.setGuides(null);
      if (store.dragOrigins && store.stage) {
        const patches = store.selectedIds.flatMap((id) => {
          const node = store.stage?.findOne(`#${id}`);
          return node ? [{ id, patch: { x: node.x(), y: node.y() } }] : [];
        });
        store.updateElements(patches, { commit: true });
        store.setDragOrigins(null);
        return;
      }
      onChange({ x: konvaEvent.target.x(), y: konvaEvent.target.y() }, true);
    },
    onTransformEnd: (konvaEvent: Konva.KonvaEventObject<Event>) => {
      const node = konvaEvent.target;
      const boxBased = [
        "icon",
        "rect",
        "ellipse",
        "triangle",
        "diamond",
        "star",
        "hole",
      ];
      if (boxBased.includes(element.type)) {
        // Bake the scale into the box so strokes stay uniform.
        const width = Math.max(4, (element.width ?? 1) * node.scaleX());
        const height = Math.max(4, (element.height ?? 1) * node.scaleY());
        node.scaleX(1);
        node.scaleY(1);
        onChange(
          {
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            width,
            height,
            scaleX: 1,
            scaleY: 1,
          },
          true,
        );
        return;
      }
      onChange(
        {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
        },
        true,
      );
    },
  };

  const strokeWidth = element.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const shapeFill = element.filled ? element.color : undefined;
  // Shapes default to an outline; icons and text default to none.
  const borderOn =
    element.borderEnabled ??
    (element.type !== "icon" && element.type !== "text");
  const borderStroke = borderOn
    ? (element.borderColor ?? element.color)
    : undefined;

  switch (element.type) {
    case "icon":
      return <IconImage element={element} common={common} />;
    case "text":
      return (
        <Text
          {...common}
          text={element.text ?? ""}
          fontSize={element.fontSize ?? 28}
          fontStyle="bold"
          fill={element.color}
          onDblClick={onTextEdit}
          onDblTap={onTextEdit}
        />
      );
    case "rect":
      return (
        <Rect
          {...common}
          width={element.width ?? 1}
          height={element.height ?? 1}
          strokeScaleEnabled={false}
          stroke={borderStroke}
          fill={shapeFill}
          strokeWidth={strokeWidth}
          hitStrokeWidth={14}
        />
      );
    case "ellipse":
      return (
        <Ellipse
          {...common}
          radiusX={(element.width ?? 1) / 2}
          radiusY={(element.height ?? 1) / 2}
          strokeScaleEnabled={false}
          stroke={borderStroke}
          fill={shapeFill}
          strokeWidth={strokeWidth}
          hitStrokeWidth={14}
        />
      );
    case "hole": {
      const width = element.width ?? 1;
      const height = element.height ?? 1;
      return (
        <Group {...common}>
          <Ellipse
            radiusX={width / 2}
            radiusY={height / 2}
            strokeScaleEnabled={false}
            stroke={borderStroke}
            fill={shapeFill}
            strokeWidth={strokeWidth}
            hitStrokeWidth={14}
          />
          {element.label ? (
            <Text
              x={-width / 2}
              y={-height / 2}
              width={width}
              height={height}
              align="center"
              verticalAlign="middle"
              text={element.label}
              fontSize={height * 0.55}
              fontStyle="bold"
              fill="#09090b"
              listening={false}
            />
          ) : null}
        </Group>
      );
    }
    case "triangle":
    case "diamond":
    case "star": {
      const width = element.width ?? 1;
      const height = element.height ?? 1;
      const points =
        element.type === "triangle"
          ? trianglePoints(width, height)
          : element.type === "diamond"
            ? diamondPoints(width, height)
            : starPoints(width, height);
      return (
        <Line
          {...common}
          points={points}
          closed
          strokeScaleEnabled={false}
          stroke={borderStroke}
          fill={shapeFill}
          strokeWidth={strokeWidth}
          hitStrokeWidth={14}
          lineJoin="round"
        />
      );
    }
    case "line":
      return (
        <Line
          {...common}
          points={element.points ?? [0, 0, 0, 0]}
          stroke={element.color}
          strokeWidth={strokeWidth}
          hitStrokeWidth={16}
          lineCap="round"
        />
      );
    case "arrow":
      return (
        <Arrow
          {...common}
          points={element.points ?? [0, 0, 0, 0]}
          stroke={element.color}
          fill={element.color}
          strokeWidth={strokeWidth}
          hitStrokeWidth={16}
          pointerLength={10 + strokeWidth * 2}
          pointerWidth={10 + strokeWidth * 2}
          lineCap="round"
        />
      );
  }
}
