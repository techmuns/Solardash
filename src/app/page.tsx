import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, ConfidenceBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { BarSeriesChart } from "@/components/charts/BarSeriesChart";
import {
  getCapacitySnapshot,
  getCompaniesSnapshot,
  getDemandSnapshot,
  getDevelopersSnapshot,
  getManufacturingSnapshot,
  getOverviewSnapshot,
  getPolicySnapshot,
  getTendersSnapshot,
} from "@/data";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav";
import type { Kpi } from "@/data/types/core";

export const dynamic = "force-static";
export const metadata = { title: "Overview" };

function kpiVal(k?: Kpi): string {
  if (!k) return "—";
  if (typeof k.value === "string") return k.value;
  // Preserve the value's natural precision (up to 2dp, no trailing zeros).
  return Number.isInteger(k.value)
    ? formatNumber(k.value)
    : parseFloat(k.value.toFixed(2)).toString();
}
const findKpi = (kpis: Kpi[], key: string) => kpis.find((k) => k.key === key);

export default function LandingPage() {
  const overview = getOverviewSnapshot();
  const tenders = getTendersSnapshot();
  const developers = getDevelopersSnapshot();
  const manufacturing = getManufacturingSnapshot();
  const capacity = getCapacitySnapshot();
  const demand = getDemandSnapshot();
  const companiesSnap = getCompaniesSnapshot();
  const policy = getPolicySnapshot();
  const companies = companiesSnap.data.companies;

  // Landing as-of = the freshest section snapshot.
  const asOf = [
    overview,
    tenders,
    developers,
    manufacturing,
    capacity,
    demand,
    companiesSnap,
    policy,
  ]
    .map((s) => s.updatedAt)
    .reduce((m, a) => (a > m ? a : m));

  const tK = tenders.data.kpis;
  const quarters = tenders.data.awardsByQuarter[0]?.points.map((p) => p.period) ?? [];

  // Derived companies KPIs (the registry has no precomputed kpis).
  const withPe = companies.filter((c) => c.peX != null);
  const cheapest = withPe.length
    ? withPe.reduce((b, c) => ((c.peX ?? Infinity) < (b.peX ?? Infinity) ? c : b))
    : undefined;
  const companiesTracked: Kpi = {
    key: "companies_tracked",
    label: "Listed names tracked",
    value: companies.length,
    confidence: "medium",
    hint: "screener",
  };
  const cheapestKpi: Kpi | undefined = cheapest
    ? {
        key: "cheapest_pe",
        label: "Cheapest on P/E",
        value: cheapest.name,
        confidence: "medium",
        hint: `${cheapest.peX}× P/E`,
      }
    : undefined;

  const heroKpis = [
    findKpi(tK, "awarded_fy26"),
    findKpi(tK, "lowest_tariff"),
    findKpi(tK, "leading_type"),
    findKpi(tK, "top_developer"),
  ];

  // Cross-section KPI grid (1–2 landing-worthy KPIs per section, each linked).
  const grid: { href: string; k?: Kpi }[] = [
    { href: "/tenders", k: findKpi(tK, "awarded_fy26") },
    { href: "/tenders", k: findKpi(tK, "lowest_tariff") },
    { href: "/developers", k: findKpi(developers.data.kpis, "operational_gw") },
    { href: "/developers", k: findKpi(developers.data.kpis, "largest") },
    { href: "/manufacturing", k: findKpi(manufacturing.data.kpis, "cell_production") },
    { href: "/manufacturing", k: findKpi(manufacturing.data.kpis, "overcapacity") },
    { href: "/capacity", k: findKpi(capacity.data.kpis, "total_installed") },
    { href: "/capacity", k: findKpi(capacity.data.kpis, "re_share") },
    { href: "/demand", k: findKpi(demand.data.kpis, "latest_peak") },
    { href: "/demand", k: findKpi(demand.data.kpis, "fy26_peak_growth") },
    { href: "/companies", k: companiesTracked },
    { href: "/companies", k: cheapestKpi },
    { href: "/policy", k: findKpi(policy.data.kpis, "surya_progress") },
    { href: "/policy", k: findKpi(policy.data.kpis, "tam_fy35") },
  ];
  const gridCards = grid.filter((c): c is { href: string; k: Kpi } => Boolean(c.k));

  // One hero metric per section for the navigator.
  const heroMetric: Record<string, string> = {
    "/tenders": `${kpiVal(findKpi(tK, "awarded_fy26"))} GW awarded · FY26`,
    "/developers": `${kpiVal(findKpi(developers.data.kpis, "operational_gw"))} GW operational`,
    "/capacity": `${kpiVal(findKpi(capacity.data.kpis, "total_installed"))} GW installed`,
    "/demand": `${kpiVal(findKpi(demand.data.kpis, "latest_peak"))} GW peak demand`,
    "/manufacturing": `${kpiVal(findKpi(manufacturing.data.kpis, "module_capacity"))} GW module capacity`,
    "/companies": `${companies.length} listed names`,
    "/policy": `${kpiVal(findKpi(policy.data.kpis, "active_schemes"))} active schemes`,
    "/data-sources": "Sources & methodology",
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Solardash"
        subtitle="India solar sector — buy-side intelligence."
        asOf={`As of ${formatDate(asOf)}`}
      >
        <p className="text-xs text-muted-foreground">
          Synthesized live from seven section datasets · confidence ranges high →
          modelled by source.
        </p>
      </PageHeader>

      {/* Hero band — tenders-led */}
      <Card className="overflow-hidden border-brand/30 bg-gradient-to-br from-brand/[0.06] to-transparent">
        <div className="grid grid-cols-1 lg:grid-cols-5">
          <div className="flex flex-col justify-between gap-6 p-6 lg:col-span-2">
            <div>
              <Badge variant="brand">Hero · Tenders &amp; Auctions</Badge>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                India&apos;s RE auction pipeline
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The clearest read on sector demand — what&apos;s awarded, to whom,
                and at what price.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {heroKpis.map(
                (k) =>
                  k && (
                    <div key={k.key}>
                      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                        {k.label}
                      </p>
                      <p className="mt-0.5 truncate text-lg font-semibold tabular-nums text-foreground">
                        {kpiVal(k)}
                        {k.unit && (
                          <span className="ml-1 text-sm font-medium text-muted-foreground">
                            {formatUnit(k.unit)}
                          </span>
                        )}
                      </p>
                    </div>
                  ),
              )}
            </div>
            <Link
              href="/tenders"
              className="inline-flex w-fit items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-brand-dark"
            >
              View all tenders <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="border-t border-border p-4 lg:col-span-3 lg:border-l lg:border-t-0">
            <p className="px-2 pb-1 text-xs text-muted-foreground">
              Awarded MW by quarter · stacked by tender type
            </p>
            <BarSeriesChart
              series={tenders.data.awardsByQuarter}
              stacked
              unit="MW"
              periodOrder={quarters}
              height={260}
            />
          </div>
        </div>
      </Card>

      {/* Cross-section KPI grid */}
      <section className="space-y-3">
        <SectionHeader
          title="Sector dashboard"
          subtitle="The headline read across every section — click any metric to dive in."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {gridCards.map((c, i) => (
            <Link
              key={`${c.href}-${c.k.key}-${i}`}
              href={c.href}
              className="group rounded-lg outline-none"
            >
              <StatCard
                label={c.k.label}
                value={kpiVal(c.k)}
                unit={c.k.unit ? formatUnit(c.k.unit) : undefined}
                hint={c.k.hint}
                icon={ArrowUpRight}
                className="h-full transition-colors group-hover:border-brand/40 group-focus-visible:ring-2 group-focus-visible:ring-brand"
                footer={
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs capitalize text-muted-foreground">
                      {c.href.replace("/", "")}
                    </span>
                    <ConfidenceBadge level={c.k.confidence} showDot={false} />
                  </div>
                }
              />
            </Link>
          ))}
        </div>
      </section>

      {/* What's notable — insights */}
      <section className="space-y-3">
        <SectionHeader
          title="What's notable"
          subtitle="Curated cross-section reads for the desk."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overview.data.insights.map((ins, i) => (
            <Link key={i} href={`/${ins.section}`} className="group rounded-lg outline-none">
              <Card
                variant="elevated"
                className="flex h-full flex-col justify-between gap-3 p-4 transition-colors group-hover:border-brand/40 group-focus-visible:ring-2 group-focus-visible:ring-brand"
              >
                <p className="text-sm text-foreground/90">{ins.text}</p>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="capitalize">
                    {ins.section}
                  </Badge>
                  <ConfidenceBadge level={ins.confidence} showDot={false} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Explore — section navigator */}
      <section className="space-y-3">
        <SectionHeader title="Explore" subtitle="Jump into any section of the terminal." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {NAV_ITEMS.filter((item) => item.href !== "/").map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-lg outline-none"
              >
                <Card
                  variant="elevated"
                  className="h-full p-4 transition-colors group-hover:border-brand/40 group-focus-visible:ring-2 group-focus-visible:ring-brand"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand/10 text-brand">
                      <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-brand"
                      aria-hidden
                    />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    {item.label}
                  </h3>
                  <p className="text-xs font-medium tabular-nums text-brand">
                    {heroMetric[item.href]}
                  </p>
                  {item.description && (
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
