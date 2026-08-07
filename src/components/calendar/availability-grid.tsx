"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
  DAY_HOURS,
  hourLabel,
  nextStatus,
  type AvailabilityStatus,
} from "@/lib/availability";
import { cn } from "@/lib/utils";

export const STATUS_CLASS: Record<AvailabilityStatus, string> = {
  available: "bg-emerald-500/80",
  maybe: "bg-amber-400/80",
  unavailable: "bg-rose-500/75",
};

const STATUS_HOVER: Record<AvailabilityStatus, string> = {
  available: "hover:bg-emerald-500",
  maybe: "hover:bg-amber-400",
  unavailable: "hover:bg-rose-500",
};

const UNSET_CLASS = "bg-muted/40";

/** One column of the grid — a date in the week view, a weekday in defaults. */
export type GridColumn = {
  key: string;
  label: string;
  sublabel?: string;
  /** Marks the current day, mirroring the calendar's today highlight. */
  highlight?: boolean;
};

export type CellAddress = { columnKey: string; hour: number };

export type AvailabilityGridProps = {
  columns: readonly GridColumn[];
  editable: boolean;
  statusAt: (columnKey: string, hour: number) => AvailabilityStatus | null;
  /** True when the value is inherited from the typical week rather than set. */
  isDefaulted?: (columnKey: string, hour: number) => boolean;
  /** Every cell a gesture covered, and the status to write to all of them. */
  onPaint?: (cells: CellAddress[], status: AvailabilityStatus | null) => void;
  /** Clicking a column header sets that whole day at once. */
  onCycleColumn?: (columnKey: string) => void;
  /** Replaces the default cell — used by the team overlap view. */
  renderCell?: (columnKey: string, hour: number) => ReactNode;
};

/**
 * Days across, hours down — the same shape as the schedule's week view, so the
 * two halves of the calendar page read the same way. One subject at a time:
 * a single player's week, or the roster overlap.
 */
export function AvailabilityGrid({
  columns,
  editable,
  statusAt,
  isDefaulted,
  onPaint,
  onCycleColumn,
  renderCell,
}: AvailabilityGridProps) {
  const t = useTranslations("availability");
  const [drag, setDrag] = useState<{
    status: AvailabilityStatus | null;
    cells: CellAddress[];
  } | null>(null);

  // The gesture must finish even if the pointer leaves the grid, otherwise a
  // release outside would strand the drag and keep painting. Bound only while
  // a drag is live, so the listener always sees the current cells.
  useEffect(() => {
    if (!drag || !onPaint) return;
    const finish = () => {
      onPaint(drag.cells, drag.status);
      setDrag(null);
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [drag, onPaint]);

  const beginDrag = useCallback(
    (columnKey: string, hour: number) => {
      if (!editable) return;
      setDrag({
        status: nextStatus(statusAt(columnKey, hour)),
        cells: [{ columnKey, hour }],
      });
    },
    [editable, statusAt],
  );

  // Every cell belongs to the same player, so a drag may wander in both
  // directions — down an evening or across several days.
  const extendDrag = useCallback((columnKey: string, hour: number) => {
    setDrag((current) => {
      if (!current) return current;
      const seen = current.cells.some(
        (cell) => cell.columnKey === columnKey && cell.hour === hour,
      );
      if (seen) return current;
      return { ...current, cells: [...current.cells, { columnKey, hour }] };
    });
  }, []);

  const pendingStatus = (columnKey: string, hour: number) =>
    drag?.cells.some(
      (cell) => cell.columnKey === columnKey && cell.hour === hour,
    )
      ? drag.status
      : undefined;

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full min-w-[38rem] border-separate border-spacing-0.5 text-sm select-none"
        onDragStart={(event) => event.preventDefault()}
      >
        <thead>
          <tr>
            <th scope="col" className="w-14">
              <span className="sr-only">{t("time")}</span>
            </th>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="pb-1">
                {onCycleColumn && editable ? (
                  <button
                    type="button"
                    onClick={() => onCycleColumn(column.key)}
                    title={t("wholeDayHint")}
                    className={cn(
                      "w-full rounded-md px-1 py-1 leading-tight transition-colors hover:bg-muted",
                      column.highlight && "bg-primary/10",
                    )}
                  >
                    <span className="block text-xs font-semibold">
                      {column.label}
                    </span>
                    {column.sublabel ? (
                      <span className="block text-[0.65rem] font-normal text-muted-foreground tabular-nums">
                        {column.sublabel}
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <div
                    className={cn(
                      "rounded-md px-1 py-1 leading-tight",
                      column.highlight && "bg-primary/10",
                    )}
                  >
                    <span className="block text-xs font-semibold">
                      {column.label}
                    </span>
                    {column.sublabel ? (
                      <span className="block text-[0.65rem] font-normal text-muted-foreground tabular-nums">
                        {column.sublabel}
                      </span>
                    ) : null}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAY_HOURS.map((hour) => (
            <tr key={hour}>
              <th
                scope="row"
                className="pr-2 text-right align-middle text-[0.7rem] font-normal text-muted-foreground tabular-nums"
              >
                {hourLabel(hour)}
              </th>
              {columns.map((column) => {
                if (renderCell) {
                  return (
                    <td key={column.key} className="p-0">
                      {renderCell(column.key, hour)}
                    </td>
                  );
                }
                const pending = pendingStatus(column.key, hour);
                const status =
                  pending !== undefined ? pending : statusAt(column.key, hour);
                const defaulted =
                  pending === undefined && isDefaulted?.(column.key, hour);
                return (
                  <td key={column.key} className="p-0">
                    <button
                      type="button"
                      disabled={!editable}
                      aria-label={`${column.label} ${hourLabel(hour)} — ${
                        status ? t(`status.${status}`) : t("status.unset")
                      }`}
                      className={cn(
                        "h-6 w-full rounded-[3px] transition-colors",
                        status ? STATUS_CLASS[status] : UNSET_CLASS,
                        editable &&
                          (status ? STATUS_HOVER[status] : "hover:bg-muted"),
                        // A dimmed cell was never set for this date; it is
                        // showing through from the typical week, and any click
                        // replaces it.
                        defaulted && "opacity-55",
                        editable ? "cursor-pointer" : "cursor-default",
                      )}
                      onPointerDown={() => beginDrag(column.key, hour)}
                      onPointerEnter={() => extendDrag(column.key, hour)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
