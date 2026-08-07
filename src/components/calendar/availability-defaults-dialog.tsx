"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import {
  AvailabilityGrid,
  type CellAddress,
  type GridRow,
} from "@/components/calendar/availability-grid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSetAvailabilityDefaults } from "@/hooks/use-availability";
import { formattingLocale } from "@/i18n/config";
import {
  addDays,
  startOfWeek,
  type AvailabilityDefaultRow,
  type AvailabilityStatus,
} from "@/lib/availability";

function weekdayNames(locale: string): string[] {
  // Any known Monday works as an anchor for naming the seven weekdays.
  const monday = startOfWeek(new Date(2026, 7, 5));
  return Array.from({ length: 7 }, (_, index) =>
    addDays(monday, index).toLocaleDateString(formattingLocale(locale), {
      weekday: "short",
    }),
  );
}

export function AvailabilityDefaultsDialog({
  open,
  onOpenChange,
  userId,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  defaults: readonly AvailabilityDefaultRow[];
}) {
  const t = useTranslations("availability");
  const locale = useLocale();
  const setDefaults = useSetAvailabilityDefaults();

  const names = useMemo(() => weekdayNames(locale), [locale]);

  const mine = useMemo(() => {
    const map = new Map<string, AvailabilityStatus>();
    for (const row of defaults) {
      if (row.user_id === userId)
        map.set(`${row.weekday}|${row.hour}`, row.status);
    }
    return map;
  }, [defaults, userId]);

  const rows: GridRow[] = useMemo(
    () =>
      names.map((label, weekday) => ({
        id: String(weekday),
        label,
        editable: true,
      })),
    [names],
  );

  const statusAt = (rowId: string, hour: number) =>
    mine.get(`${rowId}|${hour}`) ?? null;

  // Stable identity — the grid keys its pointerup listener on this.
  const mutateDefaults = setDefaults.mutate;
  const onPaint = useCallback(
    (cells: CellAddress[], status: AvailabilityStatus | null) =>
      mutateDefaults(
        cells.map((cell) => ({
          weekday: Number(cell.rowId),
          hour: cell.hour,
          status,
        })),
      ),
    [mutateDefaults],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("defaultsTitle")}</DialogTitle>
          <DialogDescription>{t("defaultsDescription")}</DialogDescription>
        </DialogHeader>

        <AvailabilityGrid rows={rows} statusAt={statusAt} onPaint={onPaint} />

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
