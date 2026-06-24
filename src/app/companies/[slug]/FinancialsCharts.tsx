"use client";

import * as React from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChartFrame } from "@/components/ui/ChartFrame";
import type { ConfidenceLevel } from "@/components/ui/Badge";
import { ComboBarLineChart } from "@/components/charts/ComboBarLineChart";
import {
  PeriodSelector,
  visiblePeriodOptions,
  type PeriodOption,
} from "@/components/charts/PeriodSelector";
import type { AnnualRow, QuarterRow } from "@/data/types/companies";
import type { ExportMeta } from "@/lib/export";
import { FinancialsTable } from "./FinancialsTable";
import { QuarterlyTable } from "./QuarterlyTable";

const ANNUAL_OPTIONS: PeriodOption[] = [
  { label: "3Y", count: 3 },
  { label: "5Y", count: 5 },
  { label: "All", count: "all" },
];
const QUARTERLY_OPTIONS: PeriodOption[] = [
  { label: "4Q", count: 4 },
  { label: "8Q", count: 8 },
  { label: "All", count: "all" },
];

/** Last-N rows (chronological), or all when count is "all". */
function lastN<T>(rows: T[], count: number | "all"): T[] {
  return count === "all" ? rows : rows.slice(-count);
}

/**
 * Client wrapper around the annual + quarterly financial charts. Owns the
 * selected range for each and slices the underlying rows to the last N periods
 * — categories + every value series stay aligned because they're rebuilt from
 * the same sliced row array. Tables keep the full history.
 */
export function FinancialsCharts({
  annual,
  quarterly,
  source,
  asOf,
  confidence,
  annualTableMeta,
  quarterlyTableMeta,
}: {
  annual: AnnualRow[];
  quarterly: QuarterRow[];
  source: string;
  asOf: string;
  confidence: ConfidenceLevel;
  annualTableMeta: ExportMeta;
  quarterlyTableMeta: ExportMeta;
}) {
  const annualOpts = visiblePeriodOptions(ANNUAL_OPTIONS, annual.length, "5Y");
  const quarterlyOpts = visiblePeriodOptions(QUARTERLY_OPTIONS, quarterly.length, "8Q");

  const [annualRange, setAnnualRange] = React.useState(annualOpts.defaultLabel);
  const [quarterlyRange, setQuarterlyRange] = React.useState(quarterlyOpts.defaultLabel);

  const annualCount =
    annualOpts.options.find((o) => o.label === annualRange)?.count ?? "all";
  const quarterlyCount =
    quarterlyOpts.options.find((o) => o.label === quarterlyRange)?.count ?? "all";

  const a = lastN(annual, annualCount);
  const q = lastN(quarterly, quarterlyCount);

  return (
    <>
      {/* Financials (annual) */}
      <section className="space-y-3">
        <SectionHeader title="Financials" subtitle="Annual · ₹ crore · E = estimate." />
        <ChartFrame title="Annual financials" subtitle="₹ crore · FY25 → FY28E" source={source} asOf={asOf} confidence={confidence}>
          <FinancialsTable rows={annual} exportMeta={annualTableMeta} />
        </ChartFrame>
        <ChartFrame
          title="Revenue, EBITDA & margin"
          subtitle="Bars ₹cr (left) · margin % (right)"
          source={source}
          asOf={asOf}
          confidence={confidence}
          actions={
            annualOpts.options.length > 1 ? (
              <PeriodSelector
                options={annualOpts.options}
                value={annualRange}
                onChange={setAnnualRange}
                ariaLabel="Annual range"
              />
            ) : undefined
          }
        >
          <ComboBarLineChart
            categories={a.map((r) => r.period)}
            bars={[
              { key: "revenue", label: "Revenue", color: "#2563EB", values: a.map((r) => r.revenue ?? 0) },
              { key: "ebitda", label: "EBITDA", color: "#10B981", values: a.map((r) => r.ebitda ?? 0) },
            ]}
            line={{ key: "margin", label: "EBITDA margin", color: "#F59E0B", values: a.map((r) => r.ebitdaMarginPct ?? null) }}
            barUnit="₹cr"
            lineUnit="%"
            height={320}
          />
        </ChartFrame>
      </section>

      {/* Quarterly */}
      <section className="space-y-3">
        <SectionHeader title="Quarterly" subtitle="₹ crore · recent quarters." />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartFrame title="Quarterly financials" subtitle="₹ crore" source={source} asOf={asOf} confidence={confidence}>
            <QuarterlyTable rows={quarterly} exportMeta={quarterlyTableMeta} />
          </ChartFrame>
          <ChartFrame
            title="Revenue & margin trend"
            subtitle="Bars ₹cr (left) · margin % (right)"
            source={source}
            asOf={asOf}
            confidence={confidence}
            actions={
              quarterlyOpts.options.length > 1 ? (
                <PeriodSelector
                  options={quarterlyOpts.options}
                  value={quarterlyRange}
                  onChange={setQuarterlyRange}
                  ariaLabel="Quarterly range"
                />
              ) : undefined
            }
          >
            <ComboBarLineChart
              categories={q.map((r) => r.period)}
              bars={[
                { key: "revenue", label: "Revenue", color: "#2563EB", values: q.map((r) => r.revenue ?? 0) },
                { key: "ebitda", label: "EBITDA", color: "#10B981", values: q.map((r) => r.ebitda ?? 0) },
              ]}
              line={{ key: "margin", label: "EBITDA margin", color: "#F59E0B", values: q.map((r) => r.ebitdaMarginPct ?? null) }}
              barUnit="₹cr"
              lineUnit="%"
              height={300}
            />
          </ChartFrame>
        </div>
      </section>
    </>
  );
}
