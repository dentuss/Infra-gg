"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import {
  AvailabilityGrid,
  type CellAddress,
  type GridColumn,
} from "@/components/calendar/availability-grid";
import { MarkerPicker, type Marker } from "@/components/calendar/marker-picker";
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
import { useZones } from "@/hooks/use-timezone";
import { formattingLocale } from "@/i18n/config";
import {
  addDays,
  dateToKey,
  DAY_HOURS,
  startOfWeek,
  STATUS_ORDER,
  type AvailabilityDefaultRow,
  type AvailabilityStatus,
} from "@/lib/availability";
import { slotLabelInZone } from "@/lib/timezone";

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
  const setDefaults = useSetAvailabilityDefaults(userId);
  const { teamZone, viewZone } = useZones();

  // The typical week has no real dates, so labels are anchored to the current
  // week. Across a DST switch that is an hour out for part of one week a year.
  const labelAnchor = useMemo(() => dateToKey(startOfWeek(new Date())), []);
  const hourLabelFor = useCallback(
    (_columnKey: string, hour: number) =>
      slotLabelInZone(labelAnchor, hour, teamZone, viewZone),
    [labelAnchor, teamZone, viewZone],
  );
  const [marker, setMarker] = useState<Marker>(STATUS_ORDER[0] ?? null);

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
    (cells: CellAddress[], status: Marker) =>
      mutateDefaults(
        cells.map((cell) => ({
          weekday: Number(cell.columnKey),
          hour: cell.hour,
          status,
        })),
      ),
    [mutateDefaults],
  );

  const onPaintColumn = useCallback(
    (columnKey: string) =>
      mutateDefaults(
        DAY_HOURS.map((hour) => ({
          weekday: Number(columnKey),
          hour,
          status: marker,
        })),
      ),
    [mutateDefaults, marker],
  );

  const onClearAll = useCallback(
    () =>
      mutateDefaults(
        columns.flatMap((column) =>
          DAY_HOURS.map((hour) => ({
            weekday: Number(column.key),
            hour,
            status: null,
          })),
        ),
      ),
    [mutateDefaults, columns],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("defaultsTitle")}</DialogTitle>
          <DialogDescription>{t("defaultsDescription")}</DialogDescription>
        </DialogHeader>

        <MarkerPicker
          value={marker}
          onChange={setMarker}
          onClearAll={onClearAll}
          clearAllTitle={t("clearDefaultsTitle")}
          clearAllDescription={t("clearDefaultsDescription")}
        />

        <AvailabilityGrid
          columns={columns}
          editable
          marker={marker}
          statusAt={statusAt}
          onPaint={onPaint}
          onPaintColumn={onPaintColumn}
          hourLabelFor={hourLabelFor}
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
