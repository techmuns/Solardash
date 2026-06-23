"use client";

import * as React from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  exportCsv,
  exportXlsx,
  type ColumnDef,
  type ExportMeta,
  type ExportRow,
  type ExportSheet,
} from "@/lib/export";

export interface ExportMenuProps {
  /** Tabular data to export (also used as the single Excel sheet). */
  columns: ColumnDef[];
  rows: ExportRow[];
  meta: ExportMeta;
  /** Optional override for the download filename (sans extension handling). */
  filename?: string;
  /** Optional multi-sheet workbook for Excel (e.g. a page-level "Export all"). */
  sheets?: ExportSheet[];
  size?: "sm" | "md";
  /** Button label; falls back to icon-only when `false`. */
  label?: string | false;
  className?: string;
}

/**
 * Compact "Download ▾" control offering CSV and Excel (.xlsx). Excel lazily
 * loads SheetJS on click (code-split). Keyboard- and screen-reader-accessible.
 */
export function ExportMenu({
  columns,
  rows,
  meta,
  filename,
  sheets,
  size = "sm",
  label = "Download",
  className,
}: ExportMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const empty = rows.length === 0;

  const handleCsv = () => {
    exportCsv({ filename, columns, rows, meta });
    setOpen(false);
  };

  const handleXlsx = async () => {
    setBusy(true);
    try {
      await exportXlsx({
        filename,
        sheets: sheets ?? [{ name: meta.dataset, columns, rows, meta }],
        meta,
      });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const itemClass =
    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={empty}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Download data${meta.dataset ? ` — ${meta.dataset}` : ""} as CSV or Excel`}
        title={empty ? "No data to export" : "Download as CSV or Excel"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border bg-card font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm",
        )}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Download className="h-3.5 w-3.5" aria-hidden />
        )}
        {label && <span>{label}</span>}
        <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Export format"
          className="absolute right-0 z-30 mt-1 min-w-[11rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-panel"
        >
          <button type="button" role="menuitem" onClick={handleCsv} className={itemClass}>
            <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            CSV (.csv)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleXlsx}
            disabled={busy}
            className={itemClass}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {busy ? "Preparing…" : "Excel (.xlsx)"}
          </button>
        </div>
      )}
    </div>
  );
}
