import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";
import { ConfidenceBadge, type ConfidenceLevel } from "./Badge";
import { ExportMenu } from "./ExportMenu";
import type { ColumnDef, ExportMeta, ExportRow } from "@/lib/export";

export interface ChartFrameProps {
  title: string;
  subtitle?: string;
  /** Footnote: data source attribution. */
  source?: string;
  /** Footnote: "as of" date label. */
  asOf?: string;
  /** Footnote: data-confidence level. */
  confidence?: ConfidenceLevel;
  /** Controls rendered top-right (toggles, legends, export, etc.). */
  actions?: React.ReactNode;
  /** When set, renders a Download (CSV / Excel) control in the header so the
   *  chart's underlying series can be exported with provenance. */
  exportData?: {
    columns: ColumnDef[];
    rows: ExportRow[];
    meta: ExportMeta;
    filename?: string;
  };
  className?: string;
  bodyClassName?: string;
  /** The chart itself (added in later phases). */
  children: React.ReactNode;
}

export function ChartFrame({
  title,
  subtitle,
  source,
  asOf,
  confidence,
  actions,
  exportData,
  className,
  bodyClassName,
  children,
}: ChartFrameProps) {
  const hasFootnote = Boolean(source || asOf || confidence);

  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {(actions || exportData) && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {exportData && (
              <ExportMenu
                columns={exportData.columns}
                rows={exportData.rows}
                meta={exportData.meta}
                filename={exportData.filename}
              />
            )}
          </div>
        )}
      </div>

      <div className={cn("min-h-[16rem] flex-1 px-3 py-2", bodyClassName)}>
        {children}
      </div>

      {hasFootnote && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-5 py-2.5 text-2xs text-muted-foreground">
          {source && (
            <span>
              <span className="font-medium text-foreground/70">Source</span>{" "}
              {source}
            </span>
          )}
          {asOf && <span>· As of {asOf}</span>}
          {confidence && (
            <span className="ml-auto">
              <ConfidenceBadge level={confidence} />
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
