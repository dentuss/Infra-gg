"use client";

import type Konva from "konva";
import { useEffect, useRef } from "react";
import { Group, Image as KonvaImage, Rect, Text } from "react-konva";

import { useHtmlImage } from "@/components/strategy/board-elements";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  LINEUP_COLORS,
  LINEUP_HEIGHT,
  LINEUP_SLOT_WIDTH,
  type LineupSlot,
} from "@/lib/strategy";
import { useBoardStore } from "@/store/board-store";

export const NICKNAME_BOX = { x: 60, y: 12, width: 200, height: 28 };
const OPERATOR_BOX = { size: 92, y: 44 };
const GADGET_BOX = { size: 48, y: 142 };

/** Activation highlight that fades in and out instead of snapping. */
function ActiveGlow({
  x,
  y,
  width,
  height,
  color,
  active,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  active: boolean;
}) {
  const ref = useRef<Konva.Rect>(null);
  useEffect(() => {
    ref.current?.to({ opacity: active ? 1 : 0, duration: 0.25 });
  }, [active]);
  return (
    <Rect
      ref={ref}
      x={x}
      y={y}
      width={width}
      height={height}
      cornerRadius={10}
      stroke={color}
      strokeWidth={3}
      fill={`${color}1a`}
      opacity={0}
      listening={false}
    />
  );
}

function SlotImage({
  src,
  x,
  y,
  size,
}: {
  src: string;
  x: number;
  y: number;
  size: number;
}) {
  const image = useHtmlImage(src);
  if (!image) return null;
  return (
    <KonvaImage
      image={image}
      x={x}
      y={y}
      width={size}
      height={size}
      listening={false}
    />
  );
}

function LineupSlotNode({
  index,
  slot,
  active,
}: {
  index: number;
  slot: LineupSlot;
  active: boolean;
}) {
  const cellX = index * LINEUP_SLOT_WIDTH;
  const y = BOARD_HEIGHT;
  const color = LINEUP_COLORS[index] ?? "#fafafa";
  const centerX = (boxSize: number) =>
    cellX + (LINEUP_SLOT_WIDTH - boxSize) / 2;

  const toggleActive = () => {
    const store = useBoardStore.getState();
    const activating = store.activeSlot !== index;
    store.setActiveSlot(activating ? index : null);
    if (activating) store.showHint("slotColor");
  };
  const patchSlot = (patch: Partial<LineupSlot>) =>
    useBoardStore.getState().setLineupSlot(index, patch);

  return (
    <Group onClick={toggleActive}>
      <Rect
        x={cellX + 6}
        y={y + 6}
        width={LINEUP_SLOT_WIDTH - 12}
        height={LINEUP_HEIGHT - 12}
        cornerRadius={10}
        stroke={color}
        strokeWidth={1.5}
      />
      <ActiveGlow
        x={cellX + 6}
        y={y + 6}
        width={LINEUP_SLOT_WIDTH - 12}
        height={LINEUP_HEIGHT - 12}
        color={color}
        active={active}
      />

      {/* Plate is invisible once a nickname is set, but stays clickable
          (Konva hit detection ignores opacity). */}
      <Rect
        x={cellX + NICKNAME_BOX.x}
        y={y + NICKNAME_BOX.y}
        width={NICKNAME_BOX.width}
        height={NICKNAME_BOX.height}
        cornerRadius={6}
        fill="#1c1c20"
        opacity={slot.nickname ? 0 : 1}
        onClick={(konvaEvent) => {
          konvaEvent.cancelBubble = true;
          useBoardStore.getState().setEditingNickname(index);
        }}
      />
      <Text
        x={cellX + NICKNAME_BOX.x}
        y={y + NICKNAME_BOX.y}
        width={NICKNAME_BOX.width}
        height={NICKNAME_BOX.height}
        text={slot.nickname || "+"}
        fill={color}
        opacity={slot.nickname ? 1 : 0.5}
        fontSize={16}
        fontStyle="bold"
        align="center"
        verticalAlign="middle"
        listening={false}
      />

      <Rect
        x={centerX(OPERATOR_BOX.size)}
        y={y + OPERATOR_BOX.y}
        width={OPERATOR_BOX.size}
        height={OPERATOR_BOX.size}
        cornerRadius={8}
        stroke={color}
        strokeWidth={3}
        fill="#1c1c20"
        onDblClick={(konvaEvent) => {
          konvaEvent.cancelBubble = true;
          patchSlot({ operator: undefined });
        }}
      />
      {slot.operator ? (
        <SlotImage
          src={slot.operator.src}
          x={centerX(OPERATOR_BOX.size) + 4}
          y={y + OPERATOR_BOX.y + 4}
          size={OPERATOR_BOX.size - 8}
        />
      ) : (
        <Text
          x={centerX(OPERATOR_BOX.size)}
          y={y + OPERATOR_BOX.y}
          width={OPERATOR_BOX.size}
          height={OPERATOR_BOX.size}
          text="+"
          fill={color}
          opacity={0.4}
          fontSize={34}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      )}

      <Rect
        x={centerX(GADGET_BOX.size)}
        y={y + GADGET_BOX.y}
        width={GADGET_BOX.size}
        height={GADGET_BOX.size}
        cornerRadius={6}
        stroke={color}
        strokeWidth={2}
        fill="#1c1c20"
        onDblClick={(konvaEvent) => {
          konvaEvent.cancelBubble = true;
          patchSlot({ gadget: undefined });
        }}
      />
      {slot.gadget ? (
        <SlotImage
          src={slot.gadget.src}
          x={centerX(GADGET_BOX.size) + 3}
          y={y + GADGET_BOX.y + 3}
          size={GADGET_BOX.size - 6}
        />
      ) : null}
    </Group>
  );
}

/** The five player slots rendered under the blueprint. */
export function LineupStrip({ canEdit }: { canEdit: boolean }) {
  const lineup = useBoardStore((state) => state.lineup);
  const activeSlot = useBoardStore((state) => state.activeSlot);

  return (
    <Group listening={canEdit}>
      <Rect
        x={0}
        y={BOARD_HEIGHT}
        width={BOARD_WIDTH}
        height={LINEUP_HEIGHT}
        fill="#101013"
        listening={false}
      />
      {lineup.map((slot, index) => (
        <LineupSlotNode
          key={index}
          index={index}
          slot={slot}
          active={activeSlot === index}
        />
      ))}
    </Group>
  );
}
