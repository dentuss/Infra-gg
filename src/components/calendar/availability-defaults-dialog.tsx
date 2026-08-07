"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import {
  AvailabilityGrid,
  type CellAddress,
  type GridColumn,
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
  DAY_HOURS,
  nextStatus,
  startOfWeek,
  type AvailabilityDefaultRow,
  type AvailabilityStatus,
} from "@/lib/availability";

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

  // Any known Monday works as an anchor for naming the seven weekdays.
  const columns: GridColumn[] = useMemo(() => {
    const monday = startOfWeek(new Date(2026, 7, 5));
    return Array.from({ length: 7 }, (_, weekday) => ({
      key: String(weekday),
      label: addDays(monday, weekday).toLocaleDateString(
        formattingLocale(locale),
        { weekday: "short" },
      ),
    }));
  }, [locale]);

  const mine = useMemo(() => {
    const map = new Map<string, AvailabilityStatus>();
    for (const row of defaults) {
      if (row.user_id === userId) {
        map.set(`${row.weekday}|${row.hour}`, row.status);
      }
    }
    return map;
  }, [defaults, userId]);

  const statusAt = useCallback(
    (columnKey: string, hour: number) =>
      mine.get(`${columnKey}|${hour}`) ?? null,
    [mine],
  );

  const mutateDefaults = setDefaults.mutate;
  const onPaint = useCallback(
    (cells: CellAddress[], status: AvailabilityStatus | null) =>
      mutateDefaults(
        cells.map((cell) => ({
          weekday: Number(cell.columnKey),
          hour: cell.hour,
          status,
        })),
      ),
    [mutateDefaults],
  );

  const onCycleColumn = useCallback(
    (columnKey: string) => {
      const first = DAY_HOURS[0];
      if (first === undefined) return;
      const target = nextStatus(statusAt(columnKey, first));
      mutateDefaults(
        DAY_HOURS.map((hour) => ({
          weekday: Number(columnKey),
          hour,
          status: target,
        })),
      );
    },
    [statusAt, mutateDefaults],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("defaultsTitle")}</DialogTitle>
          <DialogDescription>{t("defaultsDescription")}</DialogDescription>
        </DialogHeader>

        <AvailabilityGrid
          columns={columns}
          editable
          statusAt={statusAt}
          onPaint={onPaint}
          onCycleColumn={onCycleColumn}
        />

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
