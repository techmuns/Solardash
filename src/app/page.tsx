import Link from "next/link";
import {
  Building2,
  Coins,
  Factory,
  Gavel,
  LineChart,
  ScrollText,
  Telescope,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ValueChainMap } from "@/components/industry-map/ValueChainMap";

export const dynamic = "force-static";
export const metadata = {
  title: "Industry Map",
  description:
    "India's solar value chain at a glance — who plays where across the chain, and a visual launcher into every detail view.",
};

const SECTIONS: { href: string; label: string; sub: string; icon: LucideIcon }[] = [
  { href: "/tenders", label: "Tenders", sub: "auctions & tariffs", icon: Gavel },
  { href: "/developers", label: "IPPs", sub: "developers & portfolios", icon: Building2 },
  { href: "/power-system", label: "Power System", sub: "capacity & demand", icon: Zap },
  { href: "/manufacturing", label: "Manufacturing", sub: "cells, modules, ALMM", icon: Factory },
  { href: "/companies", label: "Companies", sub: "listed screener", icon: LineChart },
  { href: "/policy", label: "Policy", sub: "schemes & duties", icon: ScrollText },
  { href: "/profit-pools", label: "Profit Pools", sub: "where value sits", icon: Coins },
  { href: "/trends", label: "Trends & Insights", sub: "the buy-side read", icon: Telescope },
];

export default function IndustryMapPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8 p-5 sm:p-8">
      <header>
        <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-brand">
          India · solar sector
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
          Where India plays across the chain
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow a panel from polysilicon to power — click any stage, company or section
          to dive into the detail.
        </p>
      </header>

      {/* The clean visual value-chain map */}
      <ValueChainMap />

      {/* Visual launcher into every detail view */}
      <section className="space-y-3">
        <h2 className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Explore the dashboard
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-5 text-center shadow-card outline-none transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground/70 transition-colors group-hover:bg-brand/10 group-hover:text-brand">
                <s.icon className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {s.label}
              </span>
              <span className="text-2xs text-muted-foreground">{s.sub}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
