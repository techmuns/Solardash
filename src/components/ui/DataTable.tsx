"use client";

import * as React from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportMenu } from "./ExportMenu";
import type { ColumnDef, ExportMeta, ExportRow, ExportValue } from "@/lib/export";

type Align = "left" | "right" | "center";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  align?: Align;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  /** Value used for sorting; defaults to `row[key]`. */
  accessor?: (row: T) => string | number | null | undefined;
  /** Custom cell renderer; defaults to the raw `row[key]` value. */
  render?: (row: T) => React.ReactNode;
  /** Raw value for CSV/Excel export; defaults to `row[key]`. Use for synthetic
   *  columns (joined arrays, derived values) so exports stay unformatted. */
  exportValue?: (row: T) => ExportValue;
  /** Export header when `header` isn't plain text; defaults to `header` (if a
   *  string) or `key`. */
  exportLabel?: string;
  /** Omit this column from exports (e.g. purely-visual columns). */
  exportExclude?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowKey?: (row: T, index: number) => React.Key;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  dense?: boolean;
  className?: string;
  emptyMessage?: string;
  /** Show a Download (CSV / Excel) control in a toolbar above the table. */
  exportable?: boolean;
  /** Provenance + identity for the export (required when `exportable`). */
  exportMeta?: ExportMeta;
  /** Optional filename override for the export. */
  exportFilename?: string;
}

const alignClass = (a?: Align) =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  stickyHeader = true,
  dense = false,
  className,
  emptyMessage = "No data available.",
  exportable = false,
  exportMeta,
  exportFilename,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<{
    key: string;
    dir: "asc" | "desc";
  } | null>(null);

  const sorted = React.useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    const get =
      col.accessor ??
      ((row: T) =>
        (row as Record<string, unknown>)[sort.key] as
          | string
          | number
          | null
          | undefined);
    const copy = [...data];
    copy.sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const r =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === "asc" ? r : -r;
    });
    return copy;
  }, [data, sort, columns]);

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key
        ? prev.dir === "asc"
          ? { key, dir: "desc" }
          : null
        : { key, dir: "asc" },
    );
  }

  // Derive raw export columns/rows from the table's own columns over the FULL
  // data set (not the visible sort). Synthetic columns supply `exportValue`.
  const exportColumns: ColumnDef[] = React.useMemo(
    () =>
      columns
        .filter((c) => !c.exportExclude)
        .map((c) => ({
          key: c.key,
          label:
            c.exportLabel ??
            (typeof c.header === "string" ? c.header : c.key),
        })),
    [columns],
  );
  const exportRows: ExportRow[] = React.useMemo(
    () =>
      data.map((row) => {
        const out: ExportRow = {};
        for (const c of columns) {
          if (c.exportExclude) continue;
          out[c.key] = c.exportValue
            ? c.exportValue(row)
            : ((row as Record<string, unknown>)[c.key] as ExportValue);
        }
        return out;
      }),
    [columns, data],
  );

  const table = (
    <div
      className={cn(
        "relative w-full overflow-auto rounded-lg border border-border scrollbar-thin",
        className,
      )}
    >
      <table className="w-full border-collapse text-sm">
        <thead className={cn(stickyHeader && "sticky top-0 z-10")}>
          <tr className="border-b border-border bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/70">
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  aria-sort={
                    active
                      ? sort?.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : col.sortable
                        ? "none"
                        : undefined
                  }
                  className={cn(
                    "h-9 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    alignClass(col.align),
                    col.sortable &&
                      "cursor-pointer select-none hover:text-foreground",
                    col.headerClassName,
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      col.align === "right" && "flex-row-reverse",
                      col.align === "center" && "justify-center",
                    )}
                  >
                    {col.header}
                    {col.sortable &&
                      (active ? (
                        sort?.dir === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                        )
                      ) : (
                        <ChevronsUpDown
                          className="h-3.5 w-3.5 opacity-40"
                          aria-hidden
                        />
                      ))}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-10 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={getRowKey ? getRowKey(row, i) : i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-border/70 transition-colors last:border-0",
                  onRowClick && "cursor-pointer hover:bg-muted/50",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      dense ? "px-3 py-1.5" : "px-3 py-2.5",
                      "tabular-nums text-foreground/90",
                      alignClass(col.align),
                      col.className,
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : String(
                          (row as Record<string, unknown>)[col.key] ?? "",
                        )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  if (!exportable || !exportMeta) return table;

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ExportMenu
          columns={exportColumns}
          rows={exportRows}
          meta={exportMeta}
          filename={exportFilename}
        />
      </div>
      {table}
    </div>
  );
}
