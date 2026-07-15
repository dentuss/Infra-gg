"use client";

import {
  ChevronRight,
  Folder,
  GalleryHorizontalEnd,
  Plus,
  Shield,
  Swords,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LocalTime } from "@/components/local-time";
import { NewStrategyDialog } from "@/components/strategy/new-strategy-dialog";
import { StrategyBrowseDialog } from "@/components/strategy/strategy-browse-dialog";
import { StrategyThumbnail } from "@/components/strategy/strategy-thumbnail";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBlueprintMaps } from "@/hooks/use-board-assets";
import {
  useDeleteStrategy,
  useStrategies,
  type StrategyRow,
  type StrategySide,
} from "@/hooks/use-strategies";
import { titleize } from "@/lib/strategy";

const SIDES: { key: StrategySide; icon: typeof Swords }[] = [
  { key: "attack", icon: Swords },
  { key: "defense", icon: Shield },
];

function FolderCard({
  icon: Icon,
  name,
  count,
  onOpen,
}: {
  icon: typeof Folder;
  name: string;
  count: string;
  onOpen: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/40"
      onClick={onOpen}
    >
      <CardContent className="flex items-center gap-3">
        <Icon className="size-6 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{count}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StrategiesList({
  currentUserId,
  isStaffRole,
  canCreate,
}: {
  currentUserId: string;
  isStaffRole: boolean;
  canCreate: boolean;
}) {
  const t = useTranslations("strategy");
  const router = useRouter();
  const { data: strategies, isPending, error } = useStrategies();
  const { data: maps } = useBlueprintMaps();
  const deleteStrategy = useDeleteStrategy();

  const [mapSlug, setMapSlug] = useState<string | null>(null);
  const [side, setSide] = useState<StrategySide | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [browseIndex, setBrowseIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StrategyRow | null>(null);

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("loadError", { message: error.message })}
      </p>
    );
  }
  if (isPending) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  // Folders are the union of blueprint maps and maps referenced by strats.
  const mapFolders = new Map<string, { name: string; count: number }>();
  (maps ?? []).forEach((map) =>
    mapFolders.set(map.slug, { name: map.name, count: 0 }),
  );
  (strategies ?? []).forEach((strategy) => {
    const entry = mapFolders.get(strategy.map) ?? {
      name: titleize(strategy.map),
      count: 0,
    };
    entry.count += 1;
    mapFolders.set(strategy.map, entry);
  });

  const currentMap = mapSlug
    ? {
        slug: mapSlug,
        name: mapFolders.get(mapSlug)?.name ?? titleize(mapSlug),
      }
    : null;
  const inMap = (strategies ?? []).filter((s) => s.map === mapSlug);
  const inFolder = inMap
    .filter((s) => s.side === side)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const folderName = currentMap
    ? `${currentMap.name} · ${side ? t(side) : ""}`
    : "";

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label={t("title")} className="flex items-center gap-1 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMapSlug(null);
            setSide(null);
          }}
        >
          {t("allMaps")}
        </Button>
        {currentMap ? (
          <>
            <ChevronRight className="size-4 text-muted-foreground" />
            <Button variant="ghost" size="sm" onClick={() => setSide(null)}>
              {currentMap.name}
            </Button>
          </>
        ) : null}
        {side ? (
          <>
            <ChevronRight className="size-4 text-muted-foreground" />
            <span className="px-2 font-medium">{t(side)}</span>
          </>
        ) : null}
      </nav>

      {!currentMap ? (
        mapFolders.size === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noMaps")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[...mapFolders.entries()]
              .sort(([, a], [, b]) => a.name.localeCompare(b.name))
              .map(([slug, folder]) => (
                <li key={slug}>
                  <FolderCard
                    icon={Folder}
                    name={folder.name}
                    count={t("strategyCount", { count: folder.count })}
                    onOpen={() => setMapSlug(slug)}
                  />
                </li>
              ))}
          </ul>
        )
      ) : !side ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SIDES.map((entry) => (
            <li key={entry.key}>
              <FolderCard
                icon={entry.icon}
                name={t(entry.key)}
                count={t("strategyCount", {
                  count: inMap.filter((s) => s.side === entry.key).length,
                })}
                onOpen={() => setSide(entry.key)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="flex justify-end gap-2">
            {inFolder.length > 0 ? (
              <Button variant="outline" onClick={() => setBrowseIndex(0)}>
                <GalleryHorizontalEnd /> {t("browse")}
              </Button>
            ) : null}
            {canCreate ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> {t("newStrategy")}
              </Button>
            ) : null}
          </div>

          {inFolder.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("emptyFolder")}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inFolder.map((strategy) => (
                <li key={strategy.id}>
                  <Card
                    className="cursor-pointer py-3 transition-colors hover:bg-accent/40"
                    onClick={() => router.push(`/strategies/${strategy.id}`)}
                  >
                    <CardContent className="flex flex-col gap-2 px-3">
                      <StrategyThumbnail strategy={strategy} />
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {strategy.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <LocalTime iso={strategy.updated_at} />
                          </p>
                        </div>
                        {isStaffRole ||
                        strategy.created_by === currentUserId ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            aria-label={t("deleteStrategy")}
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              setDeleteTarget(strategy);
                            }}
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          {currentMap && side ? (
            <NewStrategyDialog
              open={createOpen}
              onOpenChange={setCreateOpen}
              mapSlug={currentMap.slug}
              mapName={currentMap.name}
              side={side}
              firstFloor={
                maps?.find((m) => m.slug === currentMap.slug)?.floors[0]
                  ?.slug ?? "first_floor"
              }
              styles={
                maps?.find((m) => m.slug === currentMap.slug)?.styles ?? []
              }
            />
          ) : null}

          <StrategyBrowseDialog
            strategies={inFolder}
            index={browseIndex}
            folderName={folderName}
            onIndexChange={setBrowseIndex}
            onClose={() => setBrowseIndex(null)}
          />
        </>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("deleteTitle", { title: deleteTarget?.title ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteStrategy.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteStrategy.mutate(deleteTarget.id);
                }
                setDeleteTarget(null);
              }}
            >
              {t("deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
