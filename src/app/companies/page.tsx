import { getCompaniesSnapshot, getCompanyDetail } from "@/data";
import { formatDate } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { SectionCanvas, type CanvasTab } from "@/components/sections/SectionCanvas";
import type { CompanyDetail } from "@/data/types/companies";
import { ScreenerTable } from "./ScreenerTable";

export const dynamic = "force-static";
export const metadata = {
  title: "Listed Companies",
  description:
    "A screener of India's listed solar & renewable names — market cap, revenue, EBITDA margin and P/E in one combined panel, plus per-stock pages.",
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

  const tabs: CanvasTab[] = [
    {
      id: "financials",
      label: "Financials",
      title: "Screener — all companies",
      subtitle:
        "Market cap · revenue · EBITDA margin · P/E — valuation refreshed daily, financials monthly",
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
  ];

  return (
    <SectionCanvas tabs={tabs} asOf={asOf} defaultSource={source} />
  );
}
