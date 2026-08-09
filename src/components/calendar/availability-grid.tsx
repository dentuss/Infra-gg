"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { STATUS_CLASS, type Marker } from "@/components/calendar/marker-picker";
import {
  DAY_HOURS,
  hourLabel,
  type AvailabilityStatus,
} from "@/lib/availability";
import { cn } from "@/lib/utils";

const STATUS_HOVER: Record<AvailabilityStatus, string> = {
  available: "hover:bg-emerald-500",
  maybe: "hover:bg-amber-400",
  unavailable: "hover:bg-rose-500",
};

const UNSET_CLASS = "bg-muted/40";

/** Shared by the hour label and every slot so the rows line up exactly. */
export const ROW_HEIGHT = "h-8";

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
  /** The marker a click or drag paints. Ignored when not editable. */
  marker?: Marker;
  statusAt: (columnKey: string, hour: number) => AvailabilityStatus | null;
  /** True when the value is inherited from the typical week rather than set. */
  isDefaulted?: (columnKey: string, hour: number) => boolean;
  onPaint?: (cells: CellAddress[], status: Marker) => void;
  /** Clicking a column header paints the whole day with the current marker. */
  onPaintColumn?: (columnKey: string) => void;
  /** Replaces the default cell — used by the team overlap view. */
  renderCell?: (columnKey: string, hour: number) => ReactNode;
  /**
   * How a row is labelled. Slots are stored against the team's zone, so a
   * viewer elsewhere sees the same rows under shifted labels; defaults to
   * team time when no zone is in play.
   */
  hourLabelFor?: (columnKey: string, hour: number) => string;
  /** Rendered in the empty corner above the hour labels. */
  cornerSlot?: ReactNode;
};

/**
 * Days across, hours down — the same shape as the schedule's week view, so the
 * two halves of the calendar page read the same way. One subject at a time:
 * a single player's week, or the roster overlap.
 */
export function AvailabilityGrid({
  columns,
  editable,
  marker = null,
  statusAt,
  isDefaulted,
  onPaint,
  onPaintColumn,
  renderCell,
  hourLabelFor,
  cornerSlot,
}: AvailabilityGridProps) {
  const t = useTranslations("availability");
  const [dragCells, setDragCells] = useState<CellAddress[] | null>(null);

  // The gesture must finish even if the pointer leaves the grid, otherwise a
  // release outside would strand the drag and keep painting. Bound only while
  // a drag is live, so the listener always sees the current cells.
  useEffect(() => {
    if (!dragCells || !onPaint) return;
    const finish = () => {
      onPaint(dragCells, marker);
      setDragCells(null);
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [dragCells, marker, onPaint]);

  const beginDrag = useCallback(
    (columnKey: string, hour: number) => {
      if (!editable) return;
      setDragCells([{ columnKey, hour }]);
    },
    [editable],
  );

  // Every cell belongs to the same player, so a drag may wander in both
  // directions — down an evening or across several days.
  const extendDrag = useCallback((columnKey: string, hour: number) => {
    setDragCells((current) => {
      if (!current) return current;
      const seen = current.some(
        (cell) => cell.columnKey === columnKey && cell.hour === hour,
      );
      return seen ? current : [...current, { columnKey, hour }];
    });
  }, []);

  const isPending = (columnKey: string, hour: number) =>
    dragCells?.some(
      (cell) => cell.columnKey === columnKey && cell.hour === hour,
    ) ?? false;

  const headerInner = (column: GridColumn) => (
    <>
      <span className="block text-sm font-semibold">{column.label}</span>
      {column.sublabel ? (
        <span className="block text-xs font-normal text-muted-foreground tabular-nums">
          {column.sublabel}
        </span>
      ) : null}
    </>
  );

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full min-w-[40rem] table-fixed border-separate border-spacing-1 text-sm select-none"
        onDragStart={(event) => event.preventDefault()}
      >
        <thead>
          <tr>
            <th scope="col" className="w-16 align-bottom">
              {cornerSlot ?? <span className="sr-only">{t("time")}</span>}
            </th>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="pb-1">
                {onPaintColumn && editable ? (
                  <button
                    type="button"
                    onClick={() => onPaintColumn(column.key)}
                    title={t("wholeDayHint")}
                    className={cn(
                      "w-full rounded-md border px-1 py-2 leading-tight transition-colors hover:bg-muted",
                      column.highlight
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/60 bg-muted/40",
                    )}
                  >
                    {headerInner(column)}
                  </button>
                ) : (
                  <div
                    className={cn(
                      "rounded-md border px-1 py-2 leading-tight",
                      column.highlight
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/60 bg-muted/40",
                    )}
                  >
                    {headerInner(column)}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAY_HOURS.map((hour) => {
            const anchorKey = columns[0]?.key ?? "";
            const rowLabel = hourLabelFor
              ? hourLabelFor(anchorKey, hour)
              : hourLabel(hour);
            return (
              <tr key={hour}>
                {/* The label and the slots must be the same fixed height, or
                  the two columns drift apart down the grid. */}
                <th
                  scope="row"
                  className={cn(
                    ROW_HEIGHT,
                    "rounded-md border border-border/60 bg-muted/40 px-2 text-right align-middle text-xs font-medium text-foreground/80 tabular-nums",
                  )}
                >
                  {rowLabel}
                </th>
                {columns.map((column) => {
                  if (renderCell) {
                    return (
                      <td key={column.key} className="p-0 align-middle">
                        {renderCell(column.key, hour)}
                      </td>
                    );
                  }
                  const pending = isPending(column.key, hour);
                  const status = pending ? marker : statusAt(column.key, hour);
                  const defaulted =
                    !pending && isDefaulted?.(column.key, hour) === true;
                  return (
                    <td key={column.key} className="p-0 align-middle">
                      <button
                        type="button"
                        disabled={!editable}
                        aria-label={`${column.label} ${
                          hourLabelFor
                            ? hourLabelFor(column.key, hour)
                            : hourLabel(hour)
                        } — ${
                          status ? t(`status.${status}`) : t("status.unset")
                        }`}
                        className={cn(
                          // `block`, not the default inline-block: an inline
                          // button sits on the cell's text baseline, which adds
                          // descender space below it and knocks the slots out of
                          // line with the hour labels.
                          ROW_HEIGHT,
                          "block w-full rounded-[4px] transition-colors",
                          status ? STATUS_CLASS[status] : UNSET_CLASS,
                          editable &&
                            (marker ? STATUS_HOVER[marker] : "hover:bg-muted"),
                          // A dimmed cell was never set for this date; it is
                          // showing through from the typical week, and any paint
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
