"use client";

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
const OPERATOR_BOX = { size: 92, y: 48 };
const GADGET_BOX = { size: 52, y: 144 };

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
    store.setActiveSlot(store.activeSlot === index ? null : index);
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
        strokeWidth={active ? 3 : 1.5}
        fill={active ? `${color}1a` : undefined}
      />

      <Rect
        x={cellX + NICKNAME_BOX.x}
        y={y + NICKNAME_BOX.y}
        width={NICKNAME_BOX.width}
        height={NICKNAME_BOX.height}
        cornerRadius={6}
        fill="#1c1c20"
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
