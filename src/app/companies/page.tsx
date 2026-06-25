import { getCompaniesSnapshot, getCompanyDetail } from "@/data";
import { categoricalColor } from "@/lib/colors";
import { formatDate, formatNumber } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
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

  const kpis: CanvasKpi[] = [
    {
      label: "Aggregate revenue",
      value: formatNumber(revSum),
      unit: "₹ cr",
      hint: `FY26E · ${companies.length} names`,
    },
    {
      label: "Aggregate PAT",
      value: formatNumber(patSum),
      unit: "₹ cr",
      hint: "FY26E",
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
          <ScreenerTable
            companies={companies}
            details={details}
            exportMeta={snapshotMeta(snapshot, { dataset: "screener" })}
          />
        </div>
      ),
    },
    {
      id: "valuation",
      label: "Valuation",
      title: "Valuation — P/E by company",
      subtitle: "× (price ÷ earnings) · lower = cheaper",
      source,
      body: <FillCategoryBar data={peData} unit="×" categoryWidth={132} />,
      side: revSide,
    },
    {
      id: "margins",
      label: "Margins",
      title: "EBITDA margin by company",
      subtitle: "% · the buy-side discriminator",
      source,
      body: <FillCategoryBar data={marginData} unit="%" categoryWidth={132} />,
      side: revSide,
    },
  ];

  return (
    <SectionCanvas kpis={kpis} tabs={tabs} asOf={asOf} defaultSource={source} />
  );
}
