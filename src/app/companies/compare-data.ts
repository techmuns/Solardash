import type { AnnualRow, CompanyDetail } from "@/data/types/companies";
import type { Series } from "@/data/types/core";
import type { CompareGroup } from "@/components/compare/CompareDialog";
import { categoricalColor } from "@/lib/colors";
import { upsidePct } from "./company-ui";

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const cr = (v: number) => Math.round(v).toLocaleString("en-IN");
const oneDp = (v: number) => v.toFixed(1);
const pct = (v: number) => `${v.toFixed(1)}%`;

/** The FY26 annual row (or the latest available) for ROE/ROCE etc. */
function latestAnnual(d: CompanyDetail): AnnualRow | undefined {
  const annual = d.annual ?? [];
  return annual.find((a) => /FY26/.test(a.period)) ?? annual[annual.length - 1];
}

/** Side-by-side metric rows (grouped) for the companies compare dialog. */
export function buildCompanyGroups(details: CompanyDetail[]): CompareGroup[] {
  const col = <T,>(get: (d: CompanyDetail) => T) => details.map(get);
  return [
    {
      category: "Valuation",
      metrics: [
        { label: "P/E", unit: "×", direction: "low", values: col((d) => d.peX ?? null), format: oneDp },
        { label: "EV/EBITDA", unit: "×", direction: "low", values: col((d) => d.evEbitdaX ?? null), format: oneDp },
        { label: "Target price", unit: "₹", direction: "high", values: col((d) => d.targetPrice ?? null), format: inr },
        { label: "Upside", unit: "%", direction: "high", values: col((d) => upsidePct(d.targetPrice, d.cmp) ?? d.valuation?.upsidePct ?? null), format: pct },
      ],
    },
    {
      category: "Financials (FY26)",
      metrics: [
        { label: "Revenue", unit: "₹cr", direction: "high", values: col((d) => d.revenueFy26Cr ?? latestAnnual(d)?.revenue ?? null), format: cr },
        { label: "EBITDA margin", unit: "%", direction: "high", values: col((d) => d.ebitdaMarginPct ?? latestAnnual(d)?.ebitdaMarginPct ?? null), format: pct },
        { label: "PAT", unit: "₹cr", direction: "high", values: col((d) => d.patFy26Cr ?? latestAnnual(d)?.pat ?? null), format: cr },
        { label: "ROE", unit: "%", direction: "high", values: col((d) => latestAnnual(d)?.roePct ?? null), format: pct },
        { label: "ROCE", unit: "%", direction: "high", values: col((d) => latestAnnual(d)?.rocePct ?? null), format: pct },
      ],
    },
    {
      category: "Operating",
      metrics: [
        { label: "Order book", unit: "₹cr", direction: "high", values: col((d) => d.orderBookCr ?? d.operating?.orderBookCr ?? null), format: cr },
        { label: "Module capacity", unit: "GW", direction: "high", values: col((d) => d.moduleGw ?? null), format: oneDp },
        { label: "Cell capacity", unit: "GW", direction: "high", values: col((d) => d.cellGw ?? null), format: oneDp },
      ],
    },
    {
      category: "Ownership",
      metrics: [
        { label: "Promoter holding", unit: "%", direction: "info", values: col((d) => d.shareholding?.promoterPct ?? null), format: pct },
      ],
    },
  ];
}

/** Overlaid Revenue (₹cr) and EBITDA-margin (%) series built from annual[]. */
export function buildCompanyTrends(details: CompanyDetail[]): {
  revenue: Series[];
  margin: Series[];
  periodOrder: string[];
} {
  const periods = new Set<string>();
  for (const d of details) for (const a of d.annual ?? []) periods.add(a.period);
  const periodOrder = [...periods].sort();

  const series = (pick: (a: AnnualRow) => number | undefined): Series[] =>
    details.map((d, i) => ({
      key: d.slug,
      label: d.name,
      color: categoricalColor(i),
      points: (d.annual ?? [])
        .filter((a) => pick(a) != null)
        .map((a) => ({ period: a.period, value: pick(a) as number })),
    }));

  return {
    revenue: series((a) => a.revenue),
    margin: series((a) => a.ebitdaMarginPct),
    periodOrder,
  };
}
