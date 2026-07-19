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

type OperatorGroupKey = "attackers" | "defenders" | "recruits";

const GROUP_BY_SIDE: Record<string, OperatorGroupKey> = {
  Attacker: "attackers",
  Defender: "defenders",
  Recruit: "recruits",
};

const OPERATOR_GROUPS: { key: OperatorGroupKey; assets: AssetItem[] }[] = [
  { key: "attackers" as const, assets: [] },
  { key: "defenders" as const, assets: [] },
  { key: "recruits" as const, assets: [] },
].map((group) => ({
  ...group,
  assets: listOperatorIcons()
    .filter((operator) => GROUP_BY_SIDE[operator.side] === group.key)
    .map((operator) => ({
      name: operator.name,
      src: operator.src,
      preview: operatorIconDataUrl(operator.id) ?? "",
    })),
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
          .insertIcon(asset.src, asset.name, BOARD_WIDTH / 2, BOARD_HEIGHT / 2)
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
  nested = false,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  nested?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col gap-2 ${nested ? "pl-2" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={`flex w-full items-center gap-1 font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground ${
          nested ? "text-[11px]" : "text-xs"
        }`}
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
  const [open, setOpen] = useState({
    operators: true,
    attackers: true,
    defenders: true,
    recruits: false,
    gadgets: true,
  });
  const toggle = (key: keyof typeof open) =>
    setOpen((state) => ({ ...state, [key]: !state[key] }));

  const search = query.trim().toLowerCase();
  const operatorGroups = OPERATOR_GROUPS.map((group) => ({
    key: group.key,
    assets: matches(group.assets, search),
  }));
  const operatorCount = operatorGroups.reduce(
    (sum, group) => sum + group.assets.length,
    0,
  );
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

      {search && operatorCount === 0 && gadgetAssets.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noResults")}</p>
      ) : null}

      {!search || operatorCount > 0 ? (
        <AssetSection
          title={t("operatorsSection")}
          count={operatorCount}
          open={!!search || open.operators}
          onToggle={() => toggle("operators")}
        >
          <div className="flex flex-col gap-2">
            {operatorGroups.map((group) =>
              !search || group.assets.length > 0 ? (
                <AssetSection
                  key={group.key}
                  nested
                  title={t(group.key)}
                  count={group.assets.length}
                  open={!!search || open[group.key]}
                  onToggle={() => toggle(group.key)}
                >
                  <div className="grid grid-cols-3 gap-2">
                    {group.assets.map((asset) => (
                      <AssetButton key={asset.src} asset={asset} />
                    ))}
                  </div>
                </AssetSection>
              ) : null,
            )}
          </div>
        </AssetSection>
      ) : null}

      {!search || gadgetAssets.length > 0 ? (
        <AssetSection
          title={t("gadgetsSection")}
          count={gadgetAssets.length}
          open={!!search || open.gadgets}
          onToggle={() => toggle("gadgets")}
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
