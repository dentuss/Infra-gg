"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { clamp01, hexToHsv, hsvToHex, type Hsv } from "@/lib/color";
import { BOARD_COLORS } from "@/lib/strategy";
import { cn } from "@/lib/utils";

const HEX_PATTERN = /^#?([0-9a-f]{6})$/i;

function PickerPanel({
  value,
  label,
  onPick,
  onDone,
}: {
  value: string;
  label: string;
  onPick: (color: string) => void;
  onDone: () => void;
}) {
  const t = useTranslations("strategy");
  // The panel mounts fresh every time the popover opens.
  const [hsv, setHsvState] = useState<Hsv>(() => hexToHsv(value));
  const hsvRef = useRef(hsv);
  const [hex, setHex] = useState("");

  const setHsv = (next: Hsv) => {
    hsvRef.current = next;
    setHsvState(next);
  };

  const commit = () => onPick(hsvToHex(hsvRef.current));

  const onSvPointer = (pointerEvent: React.PointerEvent<HTMLDivElement>) => {
    const rect = pointerEvent.currentTarget.getBoundingClientRect();
    setHsv({
      ...hsvRef.current,
      s: clamp01((pointerEvent.clientX - rect.left) / rect.width),
      v: clamp01(1 - (pointerEvent.clientY - rect.top) / rect.height),
    });
  };

  const onHuePointer = (pointerEvent: React.PointerEvent<HTMLDivElement>) => {
    const rect = pointerEvent.currentTarget.getBoundingClientRect();
    setHsv({
      ...hsvRef.current,
      h: 360 * clamp01((pointerEvent.clientX - rect.left) / rect.width),
    });
  };

  const applyHex = () => {
    const digits = HEX_PATTERN.exec(hex.trim())?.[1];
    if (!digits) return;
    onPick(`#${digits.toLowerCase()}`);
    onDone();
  };

  const current = hsvToHex(hsv);
  const hueColor = hsvToHex({ h: hsv.h, s: 1, v: 1 });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>

      <div
        role="slider"
        aria-label={label}
        aria-valuenow={Math.round(hsv.v * 100)}
        className="relative h-28 w-full cursor-crosshair touch-none rounded-sm border border-border"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
        }}
        onPointerDown={(pointerEvent) => {
          pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
          onSvPointer(pointerEvent);
        }}
        onPointerMove={(pointerEvent) => {
          if (pointerEvent.buttons & 1) onSvPointer(pointerEvent);
        }}
        onPointerUp={commit}
      >
        <span
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: current,
          }}
        />
      </div>

      <div
        role="slider"
        aria-label="Hue"
        aria-valuenow={Math.round(hsv.h)}
        className="relative h-4 w-full cursor-pointer touch-none rounded-sm border border-border"
        style={{
          background:
            "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
        onPointerDown={(pointerEvent) => {
          pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
          onHuePointer(pointerEvent);
        }}
        onPointerMove={(pointerEvent) => {
          if (pointerEvent.buttons & 1) onHuePointer(pointerEvent);
        }}
        onPointerUp={commit}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white bg-transparent shadow"
          style={{ left: `${(hsv.h / 360) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-6 gap-1">
        {BOARD_COLORS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            title={candidate}
            className={cn(
              "size-6 rounded-sm border border-border",
              value === candidate && "ring-2 ring-ring",
            )}
            style={{ backgroundColor: candidate }}
            onClick={() => {
              onPick(candidate);
              onDone();
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-1">
        <span
          className="size-7 shrink-0 rounded-sm border border-border"
          style={{ backgroundColor: current }}
        />
        <Input
          value={hex}
          placeholder={current}
          className="h-7 flex-1 font-mono text-xs"
          onChange={(changeEvent) => setHex(changeEvent.target.value)}
          onKeyDown={(keyEvent) => {
            if (keyEvent.key === "Enter") {
              keyEvent.preventDefault();
              applyHex();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 px-2 text-xs"
          disabled={!HEX_PATTERN.test(hex.trim())}
          onClick={applyHex}
        >
          {t("hexApply")}
        </Button>
      </div>
    </div>
  );
}

export function ColorPicker({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        title={label}
        className="size-7 shrink-0 cursor-pointer rounded-sm border border-border"
        style={{ backgroundColor: value }}
      />
      <PopoverContent side="right" align="start" className="w-56 p-3">
        <PickerPanel
          value={value}
          label={label}
          onPick={onChange}
          onDone={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
