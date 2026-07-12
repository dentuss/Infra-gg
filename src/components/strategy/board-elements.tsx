"use client";

import type Konva from "konva";
import { useEffect, useSyncExternalStore } from "react";
import {
  Arrow,
  Ellipse,
  Image as KonvaImage,
  Line,
  Rect,
  Text,
} from "react-konva";

import type { BoardElement } from "@/lib/strategy";

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
    img.src = src;
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
  onSelect: () => void;
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
  return (
    <KonvaImage
      {...common}
      image={image ?? undefined}
      width={element.width}
      height={element.height}
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
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (konvaEvent: Konva.KonvaEventObject<DragEvent>) =>
      onChange({ x: konvaEvent.target.x(), y: konvaEvent.target.y() }, true),
    onTransformEnd: (konvaEvent: Konva.KonvaEventObject<Event>) => {
      const node = konvaEvent.target;
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
          stroke={element.color}
          strokeWidth={3}
          hitStrokeWidth={14}
        />
      );
    case "ellipse":
      return (
        <Ellipse
          {...common}
          radiusX={(element.width ?? 1) / 2}
          radiusY={(element.height ?? 1) / 2}
          stroke={element.color}
          strokeWidth={3}
          hitStrokeWidth={14}
        />
      );
    case "line":
      return (
        <Line
          {...common}
          points={element.points ?? [0, 0, 0, 0]}
          stroke={element.color}
          strokeWidth={4}
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
          strokeWidth={4}
          hitStrokeWidth={16}
          pointerLength={14}
          pointerWidth={14}
          lineCap="round"
        />
      );
  }
}
