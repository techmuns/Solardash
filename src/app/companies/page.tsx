import { getCompaniesSnapshot, getCompanyDetail } from "@/data";
import { categoricalColor } from "@/lib/colors";
import { formatDate, formatNumber } from "@/lib/utils";
import { categoryToExport, snapshotMeta } from "@/lib/export";
import { FillCategoryBar } from "@/components/charts/FillCharts";
import {
  SectionCanvas,
  RankList,
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

  const withMargin = companies.filter((c) => c.ebitdaMarginPct != null);

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
        "Market cap · revenue · EBITDA margin · P/E — Screener.in financials, refreshed monthly",
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
          { key: "marketCapCr", label: "Market cap (₹ cr)" },
          { key: "revenueFy26Cr", label: "Revenue FY26 (₹ cr)" },
          { key: "patFy26Cr", label: "PAT FY26 (₹ cr)" },
          { key: "ebitdaMarginPct", label: "EBITDA margin (%)" },
          { key: "peX", label: "P/E (×)" },
        ],
        rows: companies.map((c) => ({
          name: c.name,
          type: c.type,
          marketCapCr: c.marketCapCr ?? null,
          revenueFy26Cr: c.revenueFy26Cr ?? null,
          patFy26Cr: c.patFy26Cr ?? null,
          ebitdaMarginPct: c.ebitdaMarginPct ?? null,
          peX: c.peX ?? null,
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
    <SectionCanvas tabs={tabs} asOf={asOf} defaultSource={source} />
  );
}
