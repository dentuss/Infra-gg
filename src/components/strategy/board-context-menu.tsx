"use client";

import { useTranslations } from "next-intl";

import { useBoardStore } from "@/store/board-store";

export function ContextMenu({
  menu,
  onClose,
}: {
  menu: { x: number; y: number; onElement: boolean };
  onClose: () => void;
}) {
  const clipboard = useBoardStore((state) => state.clipboard);
  const t = useTranslations("strategy");

  const run = (action: () => void) => () => {
    action();
    onClose();
  };
  const store = () => useBoardStore.getState();

  return (
    <div
      className="fixed z-50 w-44 rounded-sm border border-border bg-popover p-1 text-popover-foreground shadow-md"
      style={{
        left: Math.min(menu.x, window.innerWidth - 190),
        top: Math.min(menu.y, window.innerHeight - 320),
      }}
      onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
    >
      {menu.onElement ? (
        <>
          <MenuItem
            label={`${t("cut")} (Ctrl+X)`}
            onSelect={run(() => store().cutSelected())}
          />
          <MenuItem
            label={`${t("copy")} (Ctrl+C)`}
            onSelect={run(() => store().copySelected())}
          />
        </>
      ) : null}
      <MenuItem
        label={`${t("paste")} (Ctrl+V)`}
        disabled={clipboard.length === 0}
        onSelect={run(() => store().paste())}
      />
      {menu.onElement ? (
        <>
          <MenuItem
            label={`${t("duplicate")} (Ctrl+D)`}
            onSelect={run(() => store().duplicateSelected())}
          />
          <MenuItem
            label={t("deleteElement")}
            onSelect={run(() => store().deleteSelected())}
          />
          <div className="my-1 border-t border-border" />
          <MenuItem
            label={t("toFront")}
            onSelect={run(() => store().reorderSelected("front"))}
          />
          <MenuItem
            label={t("bringForward")}
            onSelect={run(() => store().reorderSelected("forward"))}
          />
          <MenuItem
            label={t("sendBackward")}
            onSelect={run(() => store().reorderSelected("backward"))}
          />
          <MenuItem
            label={t("toBack")}
            onSelect={run(() => store().reorderSelected("back"))}
          />
        </>
      ) : null}
    </div>
  );
}

function MenuItem({
  label,
  disabled,
  onSelect,
}: {
  label: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="w-full rounded-xs px-2 py-1 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
    >
      {label}
    </button>
  );
}
