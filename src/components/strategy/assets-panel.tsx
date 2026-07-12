"use client";

import { useTranslations } from "next-intl";

import { useBoardIcons } from "@/hooks/use-board-assets";
import { BOARD_HEIGHT, BOARD_WIDTH } from "@/lib/strategy";
import { newIconElement, useBoardStore } from "@/store/board-store";

export function AssetsPanel() {
  const t = useTranslations("strategy");
  const { data: icons, isPending, error } = useBoardIcons();

  const addAtCenter = (url: string, name: string) => {
    useBoardStore
      .getState()
      .addElement(
        newIconElement(url, name, BOARD_WIDTH / 2 - 32, BOARD_HEIGHT / 2 - 32),
      );
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-2 overflow-y-auto border-l border-border p-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t("assetsTitle")}
      </h3>

      {error ? (
        <p className="text-xs text-destructive">{error.message}</p>
      ) : null}

      {isPending ? (
        <p className="text-xs text-muted-foreground">{t("loading")}</p>
      ) : icons?.length ? (
        <>
          <p className="text-xs text-muted-foreground">{t("assetsHint")}</p>
          <div className="grid grid-cols-3 gap-2">
            {icons.map((icon) => (
              <button
                key={icon.url}
                type="button"
                title={icon.name}
                draggable
                onDragStart={(dragEvent) =>
                  dragEvent.dataTransfer.setData(
                    "application/x-board-icon",
                    JSON.stringify({ url: icon.url, name: icon.name }),
                  )
                }
                onClick={() => addAtCenter(icon.url, icon.name)}
                className="flex aspect-square items-center justify-center border border-border bg-muted/30 p-1 hover:bg-accent"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={icon.url}
                  alt={icon.name}
                  loading="lazy"
                  className="max-h-full max-w-full object-contain"
                />
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{t("assetsEmpty")}</p>
      )}
    </aside>
  );
}
