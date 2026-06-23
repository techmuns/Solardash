import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav";

export const dynamic = "force-static";
export const metadata = { title: "Overview" };

const PREVIEW_KPIS = [
  { label: "Tenders tracked", unit: "" },
  { label: "Capacity auctioned", unit: "GW" },
  { label: "Avg. winning tariff", unit: "₹/kWh" },
  { label: "Listed companies", unit: "" },
];

export default function OverviewPage() {
  const modules = NAV_ITEMS.filter((item) => item.href !== "/");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        subtitle="A buy-side terminal for India's solar & renewable-energy value chain — tenders, developers, manufacturing, capacity, demand, listed companies, and policy."
        asOf={<Badge variant="outline">Foundation build</Badge>}
      />

      {/* Headline metrics — component preview, no data wired yet. */}
      <section className="space-y-3">
        <SectionHeader
          title="Headline metrics"
          subtitle="Placeholders — wired to live snapshots in a later phase."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PREVIEW_KPIS.map((kpi) => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value="—"
              unit={kpi.unit}
              hint="Awaiting data"
            />
          ))}
        </div>
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

      <EmptyState
        icon={Sparkles}
        title="Live data & charts coming soon"
        description="This is the foundation shell. Tender, capacity, manufacturing, and financial datasets — plus interactive charts — are built in later phases."
      />
    </div>
  );
}
