"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { useBoardIcons } from "@/hooks/use-board-assets";
import { listOperatorIcons, operatorIconDataUrl } from "@/lib/operator-icons";
import { BOARD_HEIGHT, BOARD_WIDTH } from "@/lib/strategy";
import { useBoardStore } from "@/store/board-store";

type AssetItem = { name: string; src: string; preview: string };

const OPERATOR_ASSETS: AssetItem[] = listOperatorIcons().map((operator) => ({
  name: operator.name,
  src: operator.src,
  preview: operatorIconDataUrl(operator.id) ?? "",
}));

function AssetButton({ asset }: { asset: AssetItem }) {
  return (
    <button
      type="button"
      title={asset.name}
      draggable
      onDragStart={(dragEvent) =>
        dragEvent.dataTransfer.setData(
          "application/x-board-icon",
          JSON.stringify({ url: asset.src, name: asset.name }),
        )
      }
      onClick={() =>
        useBoardStore
          .getState()
          .insertIcon(
            asset.src,
            asset.name,
            BOARD_WIDTH / 2 - 32,
            BOARD_HEIGHT / 2 - 32,
          )
      }
      className="flex aspect-square items-center justify-center border border-border bg-muted/30 p-1 hover:bg-accent"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.preview}
        alt={asset.name}
        loading="lazy"
        className="max-h-full max-w-full object-contain"
      />
    </button>
  );
}

function AssetSection({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
        {title}
        <span className="ml-auto font-normal">{count}</span>
      </button>
      {open ? children : null}
    </section>
  );
}

function matches(assets: AssetItem[], search: string): AssetItem[] {
  if (!search) return assets;
  return assets.filter((asset) => asset.name.toLowerCase().includes(search));
}

export function AssetsPanel() {
  const t = useTranslations("strategy");
  const { data: gadgets, isPending, error } = useBoardIcons();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState({ operators: true, gadgets: true });

  const search = query.trim().toLowerCase();
  const operatorAssets = matches(OPERATOR_ASSETS, search);
  const gadgetAssets = matches(
    (gadgets ?? []).map((icon) => ({
      name: icon.name,
      src: icon.url,
      preview: icon.url,
    })),
    search,
  );

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto border-l border-border p-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t("assetsTitle")}
      </h3>
      <Input
        type="search"
        value={query}
        onChange={(changeEvent) => setQuery(changeEvent.target.value)}
        placeholder={t("searchAssets")}
        aria-label={t("searchAssets")}
        className="h-8"
      />
      <p className="text-xs text-muted-foreground">{t("assetsHint")}</p>

      {search && operatorAssets.length === 0 && gadgetAssets.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noResults")}</p>
      ) : null}

      {!search || operatorAssets.length > 0 ? (
        <AssetSection
          title={t("operatorsSection")}
          count={operatorAssets.length}
          open={!!search || open.operators}
          onToggle={() =>
            setOpen((state) => ({ ...state, operators: !state.operators }))
          }
        >
          <div className="grid grid-cols-3 gap-2">
            {operatorAssets.map((asset) => (
              <AssetButton key={asset.src} asset={asset} />
            ))}
          </div>
        </AssetSection>
      ) : null}

      {!search || gadgetAssets.length > 0 ? (
        <AssetSection
          title={t("gadgetsSection")}
          count={gadgetAssets.length}
          open={!!search || open.gadgets}
          onToggle={() =>
            setOpen((state) => ({ ...state, gadgets: !state.gadgets }))
          }
        >
          {error ? (
            <p className="text-xs text-destructive">{error.message}</p>
          ) : isPending ? (
            <p className="text-xs text-muted-foreground">{t("loading")}</p>
          ) : gadgetAssets.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("gadgetsEmpty")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {gadgetAssets.map((asset) => (
                <AssetButton key={asset.src} asset={asset} />
              ))}
            </div>
          )}
        </AssetSection>
      ) : null}
    </aside>
  );
}
