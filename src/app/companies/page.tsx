import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { ConfidenceBadge } from "@/components/ui/Badge";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { StackedCategoryBarChart } from "@/components/charts/StackedCategoryBarChart";
import { getCompaniesSnapshot } from "@/data";
import { categoricalColor } from "@/lib/colors";
import { formatDate, formatNumber } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { ScreenerTable } from "./ScreenerTable";

export const dynamic = "force-static";
export const metadata = {
  title: "Listed Companies",
  description:
    "A screener of India's listed solar & renewable names — capacity, order books, profitability and valuation, side by side.",
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function CompaniesPage() {
  const snapshot = getCompaniesSnapshot();
  const companies = snapshot.data.companies;
  const asOf = formatDate(snapshot.updatedAt);
  const source = "Company filings / broker estimates";

  const withMargin = companies.filter((c) => c.ebitdaMarginPct != null);
  const withOrderCr = companies.filter((c) => c.orderBookCr != null);
  const withPe = companies.filter((c) => c.peX != null);

  const combinedOrderCr = withOrderCr.reduce((s, c) => s + (c.orderBookCr ?? 0), 0);
  const combinedModuleGw = round1(
    companies.reduce((s, c) => s + (c.moduleGw ?? 0), 0),
  );
  const avgMargin = withMargin.length
    ? round1(
        withMargin.reduce((s, c) => s + (c.ebitdaMarginPct ?? 0), 0) /
          withMargin.length,
      )
    : 0;
  const lowestPe = withPe.reduce(
    (best, c) => ((c.peX ?? Infinity) < (best.peX ?? Infinity) ? c : best),
    withPe[0],
  );
  const topMargin = withMargin.reduce(
    (best, c) =>
      (c.ebitdaMarginPct ?? 0) > (best.ebitdaMarginPct ?? 0) ? c : best,
    withMargin[0],
  );

  // Stable per-company colour across the comparison charts.
  const colorBySlug: Record<string, string> = {};
  companies.forEach((c, i) => (colorBySlug[c.slug] = categoricalColor(i)));

  const marginData = [...withMargin]
    .sort((a, b) => (b.ebitdaMarginPct ?? 0) - (a.ebitdaMarginPct ?? 0))
    .map((c) => ({ key: c.slug, label: c.name, value: c.ebitdaMarginPct ?? 0, color: colorBySlug[c.slug] }));
  const orderData = [...withOrderCr]
    .sort((a, b) => (b.orderBookCr ?? 0) - (a.orderBookCr ?? 0))
    .map((c) => ({ key: c.slug, label: c.name, value: c.orderBookCr ?? 0, color: colorBySlug[c.slug] }));
  const peData = [...withPe]
    .sort((a, b) => (b.peX ?? 0) - (a.peX ?? 0))
    .map((c) => ({ key: c.slug, label: c.name, value: c.peX ?? 0, color: colorBySlug[c.slug] }));

  const capCompanies = companies
    .filter((c) => c.moduleGw != null || c.cellGw != null)
    .sort(
      (a, b) =>
        (b.moduleGw ?? 0) + (b.cellGw ?? 0) - ((a.moduleGw ?? 0) + (a.cellGw ?? 0)),
    );

  const kpis = [
    { key: "count", label: "Companies tracked", value: String(companies.length), unit: "" },
    { key: "order", label: "Combined order book", value: formatNumber(combinedOrderCr), unit: "₹ cr", hint: "where disclosed" },
    { key: "module", label: "Combined module capacity", value: String(combinedModuleGw), unit: "GW" },
    { key: "margin", label: "Avg EBITDA margin", value: String(avgMargin), unit: "%", hint: `${withMargin.length} reporting` },
    { key: "pe", label: "Lowest P/E", value: lowestPe ? lowestPe.peX?.toFixed(0) ?? "—" : "—", unit: "×", hint: lowestPe?.name },
    { key: "topmargin", label: "Highest EBITDA margin", value: topMargin?.name ?? "—", hint: topMargin ? `${topMargin.ebitdaMarginPct}% margin` : undefined },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Listed Companies"
        subtitle="A screener of India's listed solar & renewable names — capacity, order books, profitability and valuation, side by side."
        asOf={`As of ${asOf}`}
      />

      {/* KPI row */}
      <section className="space-y-3">
        <SectionHeader title="Sector screen" subtitle="Across the tracked listed names." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map((k) => (
            <StatCard
              key={k.key}
              label={k.label}
              value={k.value}
              unit={k.unit || undefined}
              hint={k.hint}
              footer={
                <div className="flex justify-end">
                  <ConfidenceBadge level="medium" />
                </div>
              }
            />
          ))}
        </div>
      </section>

      {/* Comparison charts */}
      <section className="space-y-3">
        <SectionHeader
          title="Compare"
          subtitle="Only companies reporting each metric are shown."
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartFrame title="EBITDA margin by company" subtitle="% · the buy-side discriminator" source={source} asOf={asOf} confidence="medium">
            <CategoryBarChart data={marginData} unit="%" height={300} categoryWidth={130} />
          </ChartFrame>
          <ChartFrame title="Order book by company" subtitle="₹ cr · where disclosed" source={source} asOf={asOf} confidence="medium">
            <CategoryBarChart data={orderData} unit="₹cr" height={300} categoryWidth={130} />
          </ChartFrame>
          <ChartFrame title="Valuation — P/E by company" subtitle="× (price / earnings)" source={source} asOf={asOf} confidence="medium">
            <CategoryBarChart data={peData} unit="×" height={300} categoryWidth={130} />
          </ChartFrame>
          <ChartFrame title="Capacity — module vs cell" subtitle="GW · stacked" source={source} asOf={asOf} confidence="medium">
            <StackedCategoryBarChart
              categories={capCompanies.map((c) => c.name)}
              series={[
                { key: "module", label: "Module", color: "#F59E0B", values: capCompanies.map((c) => c.moduleGw ?? 0) },
                { key: "cell", label: "Cell", color: "#0EA5E9", values: capCompanies.map((c) => c.cellGw ?? 0) },
              ]}
              unit="GW"
              height={300}
              categoryWidth={130}
            />
          </ChartFrame>
        </div>
      </section>

      {/* Screener table */}
      <section className="space-y-3">
        <SectionHeader
          title="Screener"
          subtitle="Sort any column · filter by type · click a company for the full model."
        />
        <ChartFrame
          title="All companies"
          subtitle="Headline metrics · — where not disclosed"
          source={source}
          asOf={asOf}
        >
          <ScreenerTable
            companies={companies}
            exportMeta={snapshotMeta(snapshot, { dataset: "screener" })}
          />
        </ChartFrame>
      </section>
    </div>
  );
}
