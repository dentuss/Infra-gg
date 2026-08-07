"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import {
  DAY_HOURS,
  hourLabel,
  nextStatus,
  type AvailabilityStatus,
} from "@/lib/availability";
import { cn } from "@/lib/utils";

export const STATUS_CLASS: Record<AvailabilityStatus, string> = {
  available: "bg-emerald-500/80 hover:bg-emerald-500",
  maybe: "bg-amber-400/80 hover:bg-amber-400",
  unavailable: "bg-rose-500/75 hover:bg-rose-500",
};

const UNSET_CLASS = "bg-muted/40 hover:bg-muted";

export type GridRow = {
  /** Stable identity for the row — a user id, or a weekday index as a string. */
  id: string;
  label: string;
  sublabel?: string;
  editable: boolean;
};

export type CellAddress = { rowId: string; hour: number };

export type AvailabilityGridProps = {
  rows: readonly GridRow[];
  statusAt: (rowId: string, hour: number) => AvailabilityStatus | null;
  /** True when the value is inherited from the typical week rather than set. */
  isDefaulted?: (rowId: string, hour: number) => boolean;
  /** Called with every cell a gesture covered, and the status to write to all. */
  onPaint: (cells: CellAddress[], status: AvailabilityStatus | null) => void;
  /** Optional strip under the grid summarising the whole roster per hour. */
  renderFooter?: (hour: number) => React.ReactNode;
  footerLabel?: string;
};

/**
 * A roster-by-hour grid. Dragging paints: the status is decided from the cell
 * the gesture starts on (one step round the cycle) and then applied to every
 * cell dragged over, which is how a whole evening gets set in one motion.
 */
export function AvailabilityGrid({
  rows,
  statusAt,
  isDefaulted,
  onPaint,
  renderFooter,
  footerLabel,
}: AvailabilityGridProps) {
  const t = useTranslations("availability");
  const [drag, setDrag] = useState<{
    rowId: string;
    status: AvailabilityStatus | null;
    cells: CellAddress[];
  } | null>(null);
  // The gesture must finish even if the pointer leaves the grid entirely,
  // otherwise a release outside would strand the drag and keep painting.
  // Bound only while a drag is live, so the listener always closes over the
  // current cells without a ref written during render.
  useEffect(() => {
    if (!drag) return;
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
    (row: GridRow, hour: number) => {
      if (!row.editable) return;
      const target = nextStatus(statusAt(row.id, hour));
      setDrag({
        rowId: row.id,
        status: target,
        cells: [{ rowId: row.id, hour }],
      });
    },
    [statusAt],
  );

  const extendDrag = useCallback((row: GridRow, hour: number) => {
    setDrag((current) => {
      if (!current || current.rowId !== row.id) return current;
      if (current.cells.some((cell) => cell.hour === hour)) return current;
      return { ...current, cells: [...current.cells, { rowId: row.id, hour }] };
    });
  }, []);

  const pendingStatus = (rowId: string, hour: number) =>
    drag && drag.rowId === rowId && drag.cells.some((c) => c.hour === hour)
      ? drag.status
      : undefined;

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full min-w-[44rem] border-separate border-spacing-0.5 text-sm select-none"
        // Painting is a drag; the browser's own text/image drag fights it.
        onDragStart={(event) => event.preventDefault()}
      >
        <thead>
          <tr>
            <th scope="col" className="w-32 text-left font-medium sm:w-40">
              <span className="sr-only">{t("player")}</span>
            </th>
            {DAY_HOURS.map((hour) => (
              <th
                key={hour}
                scope="col"
                className="pb-1 text-[0.65rem] font-normal text-muted-foreground tabular-nums"
              >
                {hourLabel(hour).slice(0, 2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th
                scope="row"
                className="max-w-32 truncate pr-2 text-left font-medium sm:max-w-40"
              >
                <span className="truncate">{row.label}</span>
                {row.sublabel ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    {row.sublabel}
                  </span>
                ) : null}
              </th>
              {DAY_HOURS.map((hour) => {
                const pending = pendingStatus(row.id, hour);
                const status =
                  pending !== undefined ? pending : statusAt(row.id, hour);
                const defaulted =
                  pending === undefined && isDefaulted?.(row.id, hour);
                return (
                  <td key={hour} className="p-0">
                    <button
                      type="button"
                      disabled={!row.editable}
                      aria-label={`${row.label} ${hourLabel(hour)} — ${
                        status ? t(`status.${status}`) : t("status.unset")
                      }`}
                      className={cn(
                        "h-7 w-full rounded-[3px] transition-colors",
                        status ? STATUS_CLASS[status] : UNSET_CLASS,
                        // A dotted edge marks a value the player never set for
                        // this date; it is showing through from their typical
                        // week and any explicit click replaces it.
                        defaulted && "opacity-60 outline-1 outline-current/30",
                        row.editable
                          ? "cursor-pointer"
                          : "cursor-default opacity-90",
                      )}
                      onPointerDown={() => beginDrag(row, hour)}
                      onPointerEnter={() => extendDrag(row, hour)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {renderFooter ? (
          <tfoot>
            <tr>
              <th
                scope="row"
                className="pt-2 pr-2 text-left text-xs font-medium text-muted-foreground"
              >
                {footerLabel}
              </th>
              {DAY_HOURS.map((hour) => (
                <td key={hour} className="pt-2 align-bottom">
                  {renderFooter(hour)}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
