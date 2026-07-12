"use client";

import { Map as MapIcon, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LocalTime } from "@/components/local-time";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBlueprintMaps } from "@/hooks/use-board-assets";
import {
  useCreateStrategy,
  useDeleteStrategy,
  useStrategies,
  type StrategyRow,
} from "@/hooks/use-strategies";
import { newPage, titleize } from "@/lib/strategy";

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
  const createStrategy = useCreateStrategy();
  const deleteStrategy = useDeleteStrategy();

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [mapSlug, setMapSlug] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StrategyRow | null>(null);

  const onCreate = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    const map = maps?.find((candidate) => candidate.slug === mapSlug);
    if (!title.trim() || !map) return;
    const created = await createStrategy.mutateAsync({
      title: title.trim(),
      map: map.slug,
      scene: { pages: [newPage(map.floors[0]?.slug ?? "first_floor")] },
    });
    setCreateOpen(false);
    setTitle("");
    router.push(`/strategies/${created.id}`);
  };

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("loadError", { message: error.message })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canCreate ? (
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> {t("newStrategy")}
          </Button>
        </div>
      ) : null}

      {isPending ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : strategies?.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy) => (
            <li key={strategy.id}>
              <Card
                className="cursor-pointer transition-colors hover:bg-accent/40"
                onClick={() => router.push(`/strategies/${strategy.id}`)}
              >
                <CardContent className="flex items-center gap-3">
                  <MapIcon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {strategy.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {titleize(strategy.map)} ·{" "}
                      <LocalTime iso={strategy.updated_at} />
                    </p>
                  </div>
                  {isStaffRole || strategy.created_by === currentUserId ? (
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
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
            <DialogDescription>{t("createSubtitle")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="strategy-title">{t("titleLabel")}</Label>
              <Input
                id="strategy-title"
                value={title}
                maxLength={80}
                required
                placeholder={t("titlePlaceholder")}
                onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="strategy-map">{t("mapLabel")}</Label>
              <Select
                value={mapSlug}
                onValueChange={(value) => setMapSlug(value ?? "")}
              >
                <SelectTrigger id="strategy-map" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(maps ?? []).map((map) => (
                    <SelectItem key={map.slug} value={map.slug}>
                      {map.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {maps && maps.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noMaps")}</p>
              ) : null}
            </div>

            {createStrategy.error ? (
              <p role="alert" className="text-sm text-destructive">
                {createStrategy.error.message}
              </p>
            ) : null}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createStrategy.isPending || !mapSlug}
              >
                {createStrategy.isPending ? t("creating") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
