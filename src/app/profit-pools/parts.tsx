import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Hourglass,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { AnalysisTag } from "@/components/ui/AnalysisTag";
import type { ProfitPoolGroup } from "@/data/profit-pools";

// Re-export so the existing profit-pools views keep one import site.
export { AnalysisTag };

/** Side-panel list of the pool's listed constituents + the method caveat. */
export function Constituents({ groups }: { groups: ProfitPoolGroup[] }) {
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: g.color }}
              aria-hidden
            />
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              {g.label}
            </span>
          </div>
          <ul className="mt-1 space-y-0.5 pl-3.5">
            {g.companies.map((c) => (
              <li key={c} className="truncate text-xs text-foreground/80">
                {c}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="border-t border-border pt-2 text-2xs leading-snug text-muted-foreground">
        Revenue-weighted EBITDA margin (Σ EBITDA ÷ Σ revenue). Listed
        constituents grow across the window as names IPO&apos;d.
      </p>
    </div>
  );
}

/** One value-shift direction → its colour, icon and label. */
export type Direction = "expanding" | "squeezed" | "shifting";

const DIRECTION: Record<Direction, { label: string; color: string; Icon: LucideIcon }> = {
  expanding: { label: "Expanding", color: "#10B981", Icon: TrendingUp },
  squeezed: { label: "Squeezed", color: "#EF4444", Icon: TrendingDown },
  shifting: { label: "Shifting", color: "#F59E0B", Icon: ArrowLeftRight },
};

export interface ScorecardClaim {
  title: string;
  direction: Direction;
  /** What the data shows — sourced fact, stated plainly. */
  detail: string;
  /** A real Phase-1 / filings trajectory (the linked trend, as a thumbnail). */
  trend: number[];
  /** Drill to the full evidence chart. */
  href: string;
  hrefLabel: string;
}

function DirectionBadge({ direction }: { direction: Direction }) {
  const d = DIRECTION[direction];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-semibold"
      style={{ background: `${d.color}1a`, color: d.color }}
    >
      <d.Icon className="h-3 w-3" aria-hidden />
      {d.label}
    </span>
  );
}

function ClaimCard({ claim }: { claim: ScorecardClaim }) {
  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-border bg-card p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-tight tracking-tight text-foreground">
          {claim.title}
        </h4>
        <DirectionBadge direction={claim.direction} />
      </div>
      <p className="mt-0.5 text-2xs leading-snug text-muted-foreground">
        {claim.detail}
      </p>
      <div className="mt-2">
        <Sparkline
          values={claim.trend}
          color={DIRECTION[claim.direction].color}
          height={84}
        />
      </div>
      <Link
        href={claim.href}
        className="mt-2 inline-flex shrink-0 items-center gap-1 self-start rounded-md text-2xs font-medium text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand"
      >
        {claim.hrefLabel}
        <ArrowUpRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  );
}

/**
 * The value-migration scorecard — only claims our committed data can evidence,
 * each linked to its real trend. Pack-fed claims are listed as "more coming"
 * with NO numbers until the sourced benchmark pack lands.
 */
export function Scorecard({
  claims,
  pending,
}: {
  claims: ScorecardClaim[];
  pending: string[];
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1">
        <AnalysisTag />
        <span className="text-2xs text-muted-foreground">
          The linked trend is sourced fact; the expanding / squeezed / shifting
          call is our read.
        </span>
      </div>
      <div className="grid min-h-0 flex-1 content-start grid-cols-1 gap-3 sm:grid-cols-2">
        {claims.map((c) => (
          <ClaimCard key={c.title} claim={c} />
        ))}
      </div>
      <div className="shrink-0 rounded-xl border border-dashed border-border bg-muted/30 p-3">
        <div className="flex items-center gap-1.5">
          <Hourglass className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            More coming · awaiting sourced benchmark pack
          </span>
        </div>
        <p className="mt-1 text-2xs leading-snug text-muted-foreground">
          {pending.join(" · ")} — added once the sourced data lands. No estimates
          shown until then.
        </p>
      </div>
    </div>
  );
}
