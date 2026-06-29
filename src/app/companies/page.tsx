import { getCompaniesSnapshot, getCompanyDetail } from "@/data";
import { categoricalColor } from "@/lib/colors";
import { formatDate, formatNumber } from "@/lib/utils";
import { categoryToExport, snapshotMeta } from "@/lib/export";
import { FillCategoryBar } from "@/components/charts/FillCharts";
import {
  SectionCanvas,
  RankList,
  type CanvasKpi,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import type { CompanyDetail } from "@/data/types/companies";
import { ScreenerTable } from "./ScreenerTable";

export const dynamic = "force-static";
export const metadata = {
  title: "Listed Companies",
  description:
    "A screener of India's listed solar & renewable names — revenue, profitability, margins and valuation in one combined panel, plus per-stock pages.",
};

export default function CompaniesPage() {
  const snapshot = getCompaniesSnapshot();
  const companies = snapshot.data.companies;
  const asOf = formatDate(snapshot.updatedAt);
  const source = "Company filings / broker estimates";
  const meta = (dataset: string) => snapshotMeta(snapshot, { dataset });

  // Full per-company models for the compare dialog (built once, server-side).
  const details = companies
    .map((c) => getCompanyDetail(c.slug)?.data)
    .filter((d): d is CompanyDetail => Boolean(d));

  const revSum = companies.reduce((s, c) => s + (c.revenueFy26Cr ?? 0), 0);
  const patSum = companies.reduce((s, c) => s + (c.patFy26Cr ?? 0), 0);
  const withMargin = companies.filter((c) => c.ebitdaMarginPct != null);
  const topMargin = withMargin.reduce(
    (b, c) => ((c.ebitdaMarginPct ?? 0) > (b.ebitdaMarginPct ?? 0) ? c : b),
    withMargin[0],
  );

  // Aggregate revenue / PAT trajectories — Σ per-company annual financials.
  const annualByFy = new Map<string, { rev: number; pat: number }>();
  for (const det of details)
    for (const a of det.annual ?? []) {
      const e = annualByFy.get(a.period) ?? { rev: 0, pat: 0 };
      e.rev += a.revenue ?? 0;
      e.pat += a.pat ?? 0;
      annualByFy.set(a.period, e);
    }
  const fyNum = (p: string) => Number(p.replace(/[^0-9]/g, ""));
  const recentFy = [...annualByFy.keys()]
    .sort((a, b) => fyNum(a) - fyNum(b))
    .slice(-7);
  const revTrend = recentFy.map((k) => annualByFy.get(k)?.rev ?? 0);
  const patTrend = recentFy.map((k) => annualByFy.get(k)?.pat ?? 0);

  const kpis: CanvasKpi[] = [
    {
      label: "Aggregate revenue",
      value: formatNumber(revSum),
      unit: "₹ cr",
      hint: `FY26E · ${companies.length} names`,
      trend: revTrend,
      color: "#2563EB",
    },
    {
      label: "Aggregate PAT",
      value: formatNumber(patSum),
      unit: "₹ cr",
      hint: "FY26E",
      trend: patTrend,
      color: "#10B981",
    },
    { label: "Companies tracked", value: `${companies.length}`, hint: "listed names" },
    {
      label: "Best EBITDA margin",
      value: `${topMargin?.ebitdaMarginPct ?? "—"}`,
      unit: "%",
      hint: topMargin?.name,
    },
  ];

  // Stable per-company colour across the comparison charts.
  const colorBySlug: Record<string, string> = {};
  companies.forEach((c, i) => (colorBySlug[c.slug] = categoricalColor(i)));

  const peData = companies
    .filter((c) => c.peX != null)
    .sort((a, b) => (a.peX ?? 0) - (b.peX ?? 0)) // cheapest first
    .map((c) => ({
      key: c.slug,
      label: c.name,
      value: c.peX ?? 0,
      color: colorBySlug[c.slug],
    }));
  const marginData = [...withMargin]
    .sort((a, b) => (b.ebitdaMarginPct ?? 0) - (a.ebitdaMarginPct ?? 0))
    .map((c) => ({
      key: c.slug,
      label: c.name,
      value: c.ebitdaMarginPct ?? 0,
      color: colorBySlug[c.slug],
    }));

  const topRevRows = [...companies]
    .sort((a, b) => (b.revenueFy26Cr ?? 0) - (a.revenueFy26Cr ?? 0))
    .slice(0, 5)
    .map((c) => ({ label: c.name, value: formatNumber(c.revenueFy26Cr ?? 0) }));
  const revSide = {
    title: "Top · revenue ₹ cr",
    node: <RankList rows={topRevRows} />,
  };

  const tabs: CanvasTab[] = [
    {
      id: "financials",
      label: "Financials",
      title: "Screener — all companies",
      subtitle:
        "Revenue · PAT · EBITDA margin · P/E · CMP — one combined, sortable panel",
      source,
      body: (
        <div className="min-h-0 flex-1 overflow-auto">
          <ScreenerTable companies={companies} details={details} />
        </div>
      ),
      exportData: {
        columns: [
          { key: "name", label: "Company" },
          { key: "type", label: "Type" },
          { key: "revenueFy26Cr", label: "Revenue FY26 (₹ cr)" },
          { key: "patFy26Cr", label: "PAT FY26 (₹ cr)" },
          { key: "ebitdaMarginPct", label: "EBITDA margin (%)" },
          { key: "peX", label: "P/E (×)" },
          { key: "cmp", label: "CMP (₹)" },
        ],
        rows: companies.map((c) => ({
          name: c.name,
          type: c.type,
          revenueFy26Cr: c.revenueFy26Cr ?? null,
          patFy26Cr: c.patFy26Cr ?? null,
          ebitdaMarginPct: c.ebitdaMarginPct ?? null,
          peX: c.peX ?? null,
          cmp: c.cmp ?? null,
        })),
        meta: meta("screener"),
      },
    },
    {
      id: "valuation",
      label: "Valuation",
      title: "Valuation — P/E by company",
      subtitle: "× (price ÷ earnings) · lower = cheaper",
      source,
      body: <FillCategoryBar data={peData} unit="×" categoryWidth={132} showValues />,
      side: revSide,
      exportData: {
        ...categoryToExport(peData, "Company", "P/E (×)"),
        meta: meta("valuation"),
      },
    },
    {
      id: "margins",
      label: "Margins",
      title: "EBITDA margin by company",
      subtitle: "% · the buy-side discriminator",
      source,
      body: (
        <FillCategoryBar data={marginData} unit="%" categoryWidth={132} showValues />
      ),
      side: revSide,
      exportData: {
        ...categoryToExport(marginData, "Company", "EBITDA margin (%)"),
        meta: meta("margins"),
      },
    },
  ];

  return (
    <SectionCanvas kpis={kpis} tabs={tabs} asOf={asOf} defaultSource={source} />
  );
}
