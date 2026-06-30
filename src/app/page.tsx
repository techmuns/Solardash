import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  getCapacitySnapshot,
  getCompaniesSnapshot,
  getCompanyDetail,
  getTendersSnapshot,
} from "@/data";
import { getProfitPools } from "@/data/profit-pools";
import { Sparkline } from "@/components/charts/Sparkline";
import { ValueChainMap } from "@/components/industry-map/ValueChainMap";
import { VC_SOURCE } from "@/data/value-chain";
import { INSIGHTS } from "./trends/insights";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-static";
export const metadata = {
  title: "Industry Map",
  description:
    "India's solar value chain at a glance — where the money is made & lost. The full sector on one screen: the chain, profit pools, companies, trends and deployment, each linking to the detail.",
};

/** A clickable summary card whose whole surface drills to a detail tab. */
function SummaryCard({
  href,
  title,
  sub,
  cta,
  children,
}: {
  href: string;
  title: string;
  sub: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={href}
            className="text-sm font-semibold tracking-tight text-foreground outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-brand"
          >
            {title}
          </Link>
          <p className="text-2xs text-muted-foreground">{sub}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" aria-hidden />
      </div>
      <div className="mt-2 min-h-0 flex-1">{children}</div>
      <span className="mt-2 text-2xs font-medium text-brand">{cta} →</span>
    </div>
  );
}

function StatLine({ value, hint }: { value: string; hint: string }) {
  return (
    <div>
      <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      <p className="text-2xs leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function IndustryMapPage() {
  const pools = getProfitPools();
  const cap = getCapacitySnapshot().data;
  const tenders = getTendersSnapshot().data;
  const companies = getCompaniesSnapshot().data.companies;

  const mfgMargin =
    pools.marginByStage.find((s) => s.key === "manufacturing")?.points.map((p) => p.value) ??
    [];
  const installed = cap.installedHistory[0]?.points.map((p) => p.value) ?? [];
  const tariff = tenders.tariffHistory[0]?.points.map((p) => p.value) ?? [];

  // Aggregate listed revenue trajectory (Σ per-company annual revenue, last 7 FY).
  const revByFy = new Map<string, number>();
  for (const c of companies)
    for (const a of getCompanyDetail(c.slug)?.data.annual ?? [])
      if (a.revenue != null)
        revByFy.set(a.period, (revByFy.get(a.period) ?? 0) + a.revenue);
  const fyNum = (p: string) => Number(p.replace(/\D/g, ""));
  const revTrend = [...revByFy.keys()]
    .sort((a, b) => fyNum(a) - fyNum(b))
    .slice(-7)
    .map((k) => revByFy.get(k) ?? 0);
  const revSum = companies.reduce((s, c) => s + (c.revenueFy26Cr ?? 0), 0);

  const topInsights = INSIGHTS.filter((i) =>
    ["t1", "a1", "t2"].includes(i.id),
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7 p-4 sm:p-6">
      {/* Page header */}
      <header className="border-b border-border pb-4">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-brand">
          India Solar Sector · Value-Chain Intelligence
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
          The whole sector, on one screen
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Start with the value chain, then drill anywhere — every stage, chart and card
          links to its detailed tab. Source: {VC_SOURCE}.
        </p>
      </header>

      {/* Hero — the value-chain map */}
      <ValueChainMap />

      {/* Explore the detail — clickable summaries → detail tabs */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Explore the detail
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <SummaryCard
            href="/profit-pools"
            title="Profit Pools"
            sub="where value is shifting"
            cta="Open Profit Pools"
          >
            <div className="h-12">
              <Sparkline values={mfgMargin} color="#10B981" height={48} />
            </div>
            <p className="mt-1 text-2xs leading-snug text-muted-foreground">
              Manufacturing pool re-rated{" "}
              <span className="font-medium text-foreground/80">3.8% → 22.3%</span> — value
              moved upstream &amp; into storage.
            </p>
          </SummaryCard>

          <SummaryCard
            href="/companies"
            title="Companies"
            sub={`${companies.length} listed names`}
            cta="Open Companies"
          >
            <div className="h-12">
              <Sparkline values={revTrend} color="#2563EB" height={48} />
            </div>
            <p className="mt-1 text-2xs leading-snug text-muted-foreground">
              <span className="font-medium text-foreground/80">
                ₹{formatNumber(revSum)} cr
              </span>{" "}
              FY26 revenue. Integrated 20–31% vs pure assemblers 7–10%.
            </p>
          </SummaryCard>

          <SummaryCard
            href="/trends"
            title="Trends & Insights"
            sub="the buy-side synthesis"
            cta="Open Trends"
          >
            <ul className="space-y-1">
              {topInsights.map((i) => (
                <li
                  key={i.id}
                  className="flex gap-1.5 text-2xs leading-snug text-foreground/80"
                >
                  <span className="text-brand" aria-hidden>
                    ▸
                  </span>
                  <span className="line-clamp-2">{i.thesis}</span>
                </li>
              ))}
            </ul>
          </SummaryCard>

          <SummaryCard
            href="/power-system"
            title="Power System"
            sub="installed capacity & demand"
            cta="Open Power System"
          >
            <div className="h-12">
              <Sparkline values={installed} color="#F59E0B" height={48} />
            </div>
            <StatLine value="150.26 GW" hint="+44.61 GW FY26 · +87% YoY" />
          </SummaryCard>

          <SummaryCard
            href="/tenders"
            title="Tenders"
            sub="auctions & tariffs"
            cta="Open Tenders"
          >
            <div className="h-12">
              <Sparkline values={tariff} color="#EC4899" height={48} />
            </div>
            <StatLine value="₹2.86/kWh" hint="solar+storage · below ₹3 first time" />
          </SummaryCard>
        </div>
      </section>
    </div>
  );
}
