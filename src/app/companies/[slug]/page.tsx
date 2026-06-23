import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { Card } from "@/components/ui/Card";
import { ConfidenceBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ComboBarLineChart } from "@/components/charts/ComboBarLineChart";
import { PieSeriesChart } from "@/components/charts/PieSeriesChart";
import { getCompanyDetail, getCompanySlugs } from "@/data";
import { categoricalColor } from "@/lib/colors";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { CompanyDetail } from "@/data/types/companies";
import { RatingBadge, TYPE_LABELS, TypeBadge, upsidePct } from "../company-ui";
import { FinancialsTable } from "./FinancialsTable";
import { QuarterlyTable } from "./QuarterlyTable";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getCompanySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const snap = getCompanyDetail(slug);
  return { title: snap?.data.name ?? "Company" };
}

interface KpiItem {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}
const present = (items: (KpiItem | null | false | undefined)[]): KpiItem[] =>
  items.filter((x): x is KpiItem => Boolean(x));

function KpiRow({ items, confidence }: { items: KpiItem[]; confidence: CompanyDetail["confidence"] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((k) => (
        <StatCard
          key={k.label}
          label={k.label}
          value={k.value}
          unit={k.unit}
          hint={k.hint}
          footer={
            <div className="flex justify-end">
              <ConfidenceBadge level={confidence} />
            </div>
          }
        />
      ))}
    </div>
  );
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const snap = getCompanyDetail(slug);
  if (!snap) notFound();

  const c = snap.data;
  const asOf = formatDate(snap.updatedAt);
  const source = c.sourceNote ?? "Company";
  const up = upsidePct(c.targetPrice, c.cmp);

  return (
    <div className="space-y-8">
      <Link
        href="/companies"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All companies
      </Link>

      <PageHeader
        title={c.name}
        subtitle={c.description ?? `Listed ${TYPE_LABELS[c.type]} — per-stock model.`}
        asOf={`As of ${asOf}`}
        actions={
          <div className="flex items-center gap-2">
            <TypeBadge type={c.type} />
            <RatingBadge rating={c.rating} />
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {c.cmp != null && (
            <span>
              <span className="text-muted-foreground">CMP</span>{" "}
              <span className="font-semibold tabular-nums">₹{formatNumber(c.cmp)}</span>
            </span>
          )}
          {c.targetPrice != null && (
            <span>
              <span className="text-muted-foreground">Target</span>{" "}
              <span className="font-semibold tabular-nums">₹{formatNumber(c.targetPrice)}</span>
            </span>
          )}
          {up != null && (
            <span
              className={cn(
                "font-semibold tabular-nums",
                up > 0 ? "text-positive" : up < 0 ? "text-negative" : "",
              )}
            >
              {up > 0 ? "+" : ""}
              {up.toFixed(1)}% upside
            </span>
          )}
          {c.tickerNse && (
            <span className="text-muted-foreground">NSE: {c.tickerNse}</span>
          )}
          {c.tickerBse && (
            <span className="text-muted-foreground">BSE: {c.tickerBse}</span>
          )}
          <ConfidenceBadge level={c.confidence} />
        </div>
      </PageHeader>

      {c.hasDetail ? (
        <RichDetail c={c} asOf={asOf} source={source} />
      ) : (
        <HeadlineOnly c={c} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rich detail (hasDetail)
// ---------------------------------------------------------------------------
function RichDetail({
  c,
  asOf,
  source,
}: {
  c: CompanyDetail;
  asOf: string;
  source: string;
}) {
  const annual = c.annual ?? [];
  const quarterly = c.quarterly ?? [];
  const v = c.valuation;
  const o = c.operating;
  const sh = c.shareholding;
  const up = upsidePct(c.targetPrice, c.cmp);

  const headlineKpis = present([
    o?.orderBookGw != null
      ? { label: "Order book", value: o.orderBookGw.toFixed(2), unit: "GW", hint: "vs installed capacity" }
      : c.orderBookCr != null
        ? { label: "Order book", value: `₹${formatNumber(c.orderBookCr)}`, unit: "cr" }
        : null,
    c.revenueFy26Cr != null && { label: "Revenue FY26E", value: formatNumber(c.revenueFy26Cr), unit: "₹ cr" },
    c.ebitdaMarginPct != null && { label: "EBITDA margin", value: String(c.ebitdaMarginPct), unit: "%" },
    (v?.peX ?? c.peX) != null && { label: "P/E", value: (v?.peX ?? c.peX ?? 0).toFixed(1), unit: "×" },
    c.targetPrice != null && { label: "Target price", value: `₹${formatNumber(c.targetPrice)}`, hint: up != null ? `${up > 0 ? "+" : ""}${up.toFixed(1)}% upside` : undefined },
    o?.realisationRsPerWp != null && { label: "Realisation", value: o.realisationRsPerWp.toFixed(2), unit: "₹/Wp" },
    o?.ebitdaRsPerWp != null && { label: "EBITDA / Wp", value: o.ebitdaRsPerWp.toFixed(2), unit: "₹/Wp" },
  ]);

  const valuationKpis = present([
    v?.peX != null && { label: "P/E", value: v.peX.toFixed(1), unit: "×" },
    v?.evEbitdaX != null && { label: "EV / EBITDA", value: v.evEbitdaX.toFixed(1), unit: "×" },
    v?.pbX != null && { label: "P/B", value: v.pbX.toFixed(1), unit: "×" },
    v?.targetPrice != null && { label: "Target price", value: `₹${formatNumber(v.targetPrice)}` },
    v?.upsidePct != null && { label: "Upside", value: `+${v.upsidePct}`, unit: "%" },
  ]);

  const operatingKpis = present([
    o?.realisationRsPerWp != null && { label: "Realisation", value: o.realisationRsPerWp.toFixed(2), unit: "₹/Wp" },
    o?.ebitdaRsPerWp != null && { label: "EBITDA / Wp", value: o.ebitdaRsPerWp.toFixed(2), unit: "₹/Wp" },
    o?.utilizationPct != null && { label: "Utilisation", value: String(o.utilizationPct), unit: "%" },
    o?.orderBookGw != null && { label: "Order book", value: o.orderBookGw.toFixed(2), unit: "GW" },
    o?.dcrSharePct != null && { label: "DCR share", value: String(o.dcrSharePct), unit: "%" },
    o?.exportSharePct != null && { label: "Export share", value: String(o.exportSharePct), unit: "%" },
  ]);

  const orderMix = (o?.orderMix ?? []).map((m, i) => ({
    key: m.segment,
    label: m.segment,
    value: m.sharePct,
    color: categoricalColor(i),
  }));

  const shData = present([
    sh?.promoterPct != null && { label: "Promoter", value: String(sh.promoterPct) },
    sh?.fiiPct != null && { label: "FII", value: String(sh.fiiPct) },
    sh?.diiPct != null && { label: "DII", value: String(sh.diiPct) },
    sh?.mfPct != null && { label: "MF", value: String(sh.mfPct) },
    sh?.publicPct != null && { label: "Public", value: String(sh.publicPct) },
  ]).map((x, i) => ({
    key: x.label,
    label: x.label,
    value: Number(x.value),
    color: categoricalColor(i),
  }));

  return (
    <div className="space-y-8">
      {/* Highlights */}
      {c.highlights && c.highlights.length > 0 && (
        <Card className="p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Highlights
          </h2>
          <ul className="mt-3 space-y-2">
            {c.highlights.map((h, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-foreground/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* KPI row */}
      <KpiRow items={headlineKpis} confidence={c.confidence} />

      {/* Financials (annual) */}
      <section className="space-y-3">
        <SectionHeader title="Financials" subtitle="Annual · ₹ crore · E = estimate." />
        <ChartFrame title="Annual financials" subtitle="₹ crore · FY25 → FY28E" source={source} asOf={asOf} confidence={c.confidence}>
          <FinancialsTable rows={annual} />
        </ChartFrame>
        <ChartFrame title="Revenue, EBITDA & margin" subtitle="Bars ₹cr (left) · margin % (right)" source={source} asOf={asOf} confidence={c.confidence}>
          <ComboBarLineChart
            categories={annual.map((a) => a.period)}
            bars={[
              { key: "revenue", label: "Revenue", color: "#2563EB", values: annual.map((a) => a.revenue ?? 0) },
              { key: "ebitda", label: "EBITDA", color: "#10B981", values: annual.map((a) => a.ebitda ?? 0) },
            ]}
            line={{ key: "margin", label: "EBITDA margin", color: "#F59E0B", values: annual.map((a) => a.ebitdaMarginPct ?? null) }}
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
          <ChartFrame title="Quarterly financials" subtitle="₹ crore" source={source} asOf={asOf} confidence={c.confidence}>
            <QuarterlyTable rows={quarterly} />
          </ChartFrame>
          <ChartFrame title="Revenue & margin trend" subtitle="Bars ₹cr (left) · margin % (right)" source={source} asOf={asOf} confidence={c.confidence}>
            <ComboBarLineChart
              categories={quarterly.map((q) => q.period)}
              bars={[
                { key: "revenue", label: "Revenue", color: "#2563EB", values: quarterly.map((q) => q.revenue ?? 0) },
                { key: "ebitda", label: "EBITDA", color: "#10B981", values: quarterly.map((q) => q.ebitda ?? 0) },
              ]}
              line={{ key: "margin", label: "EBITDA margin", color: "#F59E0B", values: quarterly.map((q) => q.ebitdaMarginPct ?? null) }}
              barUnit="₹cr"
              lineUnit="%"
              height={300}
            />
          </ChartFrame>
        </div>
      </section>

      {/* Valuation */}
      {valuationKpis.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Valuation" subtitle={v?.asOf ? `As of ${formatDate(v.asOf)}` : undefined} />
          <KpiRow items={valuationKpis} confidence={c.confidence} />
          {v?.methodology && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">Methodology:</span>{" "}
              {v.methodology}
            </p>
          )}
        </section>
      )}

      {/* Operating & mix */}
      <section className="space-y-3">
        <SectionHeader title="Operating & order mix" subtitle="Unit economics and the order book." />
        <KpiRow items={operatingKpis} confidence={c.confidence} />
        {orderMix.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartFrame title="Order book by segment" subtitle="% of order book" source={source} asOf={asOf} confidence={c.confidence}>
              <PieSeriesChart data={orderMix} unit="%" height={280} />
            </ChartFrame>
            {shData.length > 0 && (
              <ChartFrame title="Shareholding pattern" subtitle={sh?.asOf ? `% · as of ${formatDate(sh.asOf)}` : "%"} source={source} asOf={asOf} confidence={c.confidence}>
                <PieSeriesChart data={shData} unit="%" height={280} />
              </ChartFrame>
            )}
          </div>
        )}
      </section>

      {/* Shareholding (standalone if no order mix) */}
      {orderMix.length === 0 && shData.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Shareholding" subtitle={sh?.asOf ? `% · as of ${formatDate(sh.asOf)}` : "%"} />
          <ChartFrame title="Shareholding pattern" subtitle="%" source={source} asOf={asOf} confidence={c.confidence}>
            <PieSeriesChart data={shData} unit="%" height={280} />
          </ChartFrame>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Headline-only fallback (no detail JSON yet)
// ---------------------------------------------------------------------------
function HeadlineOnly({ c }: { c: CompanyDetail }) {
  const up = upsidePct(c.targetPrice, c.cmp);
  const items = present([
    c.moduleGw != null && { label: "Module capacity", value: String(c.moduleGw), unit: "GW" },
    c.cellGw != null && { label: "Cell capacity", value: String(c.cellGw), unit: "GW" },
    c.orderBookCr != null
      ? { label: "Order book", value: `₹${formatNumber(c.orderBookCr)}`, unit: "cr" }
      : c.orderBookGw != null
        ? { label: "Order book", value: String(c.orderBookGw), unit: "GW" }
        : null,
    c.revenueFy26Cr != null && { label: "Revenue FY26", value: formatNumber(c.revenueFy26Cr), unit: "₹ cr" },
    c.ebitdaMarginPct != null && { label: "EBITDA margin", value: String(c.ebitdaMarginPct), unit: "%" },
    c.peX != null && { label: "P/E", value: c.peX.toFixed(1), unit: "×" },
    c.targetPrice != null && { label: "Target price", value: `₹${formatNumber(c.targetPrice)}`, hint: up != null ? `${up > 0 ? "+" : ""}${up.toFixed(1)}% upside` : undefined },
  ]);

  return (
    <div className="space-y-6">
      {items.length > 0 && <KpiRow items={items} confidence={c.confidence} />}
      <EmptyState
        icon={Sparkles}
        title="Detailed coverage pending"
        description={`Headline metrics are shown from the screener registry. A full model (financials, valuation, operating & shareholding) appears once manual-data/companies/${c.slug}.json is added.`}
      />
    </div>
  );
}
