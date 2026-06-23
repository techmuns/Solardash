import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { Badge, ConfidenceBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { BarSeriesChart } from "@/components/charts/BarSeriesChart";
import { getOverviewSnapshot } from "@/data";
import { cn, formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav";

export const dynamic = "force-static";
export const metadata = { title: "Overview" };

/** Integers grouped; small decimals to 2dp, larger to 1dp. */
function kpiValue(v: number): string {
  if (Number.isInteger(v)) return formatNumber(v);
  return v.toFixed(v < 5 ? 2 : 1);
}

export default function OverviewPage() {
  const snapshot = getOverviewSnapshot();
  const { kpis, reAdditions } = snapshot.data;
  const reSource = reAdditions[0]?.source;
  const modules = NAV_ITEMS.filter((item) => item.href !== "/");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        subtitle="A buy-side terminal for India's solar & renewable-energy value chain — tenders, developers, manufacturing, capacity, demand, listed companies, and policy."
        asOf={`As of ${formatDate(snapshot.updatedAt)}`}
      />

      {/* Headline metrics — live from the overview snapshot. */}
      <section className="space-y-3">
        <SectionHeader
          title="Headline metrics"
          subtitle="India aggregates across the solar & renewables complex."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map((kpi) => (
            <StatCard
              key={kpi.key}
              label={kpi.label}
              value={kpiValue(kpi.value)}
              unit={formatUnit(kpi.unit)}
              footer={
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="truncate text-2xs text-muted-foreground"
                    title={kpi.source.name}
                  >
                    {kpi.source.name}
                  </span>
                  <ConfidenceBadge level={kpi.source.confidence} />
                </div>
              }
            />
          ))}
        </div>
      </section>

      {/* Example provenance-stamped chart. */}
      <section className="space-y-3">
        <SectionHeader
          title="Quarterly RE additions"
          subtitle="Capacity added by source."
        />
        <ChartFrame
          title="RE capacity additions by source"
          subtitle="Quarterly · GW · stacked"
          source={reSource?.name}
          asOf={reSource ? formatDate(reSource.asOf) : undefined}
          confidence={reSource?.confidence}
        >
          <BarSeriesChart series={reAdditions} stacked unit="GW" height={300} />
        </ChartFrame>
      </section>

      {/* Module directory. */}
      <section className="space-y-3">
        <SectionHeader
          title="Modules"
          subtitle="Jump into a section of the terminal."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group rounded-lg outline-none"
              >
                <Card
                  variant="elevated"
                  className={cn(
                    "h-full p-4 transition-colors group-hover:border-brand/40 group-focus-visible:ring-2 group-focus-visible:ring-brand",
                    m.hero && "ring-1 ring-brand/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand/10 text-brand">
                        <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">
                        {m.label}
                      </h3>
                      {m.hero && <Badge variant="brand">Primary</Badge>}
                    </div>
                    <ArrowUpRight
                      className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-brand"
                      aria-hidden
                    />
                  </div>
                  {m.description && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {m.description}
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
