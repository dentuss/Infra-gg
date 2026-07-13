"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BOARD_COLORS } from "@/lib/strategy";
import { cn } from "@/lib/utils";

const HEX_PATTERN = /^#?([0-9a-f]{6})$/i;

export function ColorPicker({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (color: string) => void;
}) {
  const t = useTranslations("strategy");
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState("");

  const applyHex = () => {
    const digits = HEX_PATTERN.exec(hex.trim())?.[1];
    if (!digits) return;
    onChange(`#${digits.toLowerCase()}`);
    setHex("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        title={label}
        className="size-7 shrink-0 cursor-pointer rounded-sm border border-border"
        style={{ backgroundColor: value }}
      />
      <PopoverContent side="right" align="start" className="w-48 p-3">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
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
                  onChange(candidate);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Input
              value={hex}
              placeholder="#22c55e"
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
      </PopoverContent>
    </Popover>
  );
}
