import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { ConfidenceBadge } from "@/components/ui/Badge";
import { getGlossary, getProvenance } from "@/data";
import { formatDate } from "@/lib/utils";
import { ProvenanceTable } from "./ProvenanceTable";
import { GlossaryTable } from "./GlossaryTable";

export const dynamic = "force-static";
export const metadata = {
  title: "Data & Methodology",
  description:
    "How Solardash is built: the static-first data model, per-snapshot provenance, what's modelled, the update workflow, and a sector glossary.",
};

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8em] text-foreground">
      {children}
    </code>
  );
}

const MODELLED = [
  {
    title: "Quarterly cell production",
    body: "Each producer's FY26E annual output is split across quarters with a fixed ramp [0.22, 0.24, 0.26, 0.28]; real (player, quarter) actuals override the modelled split.",
    path: "manual-data/manufacturing/cell-production-quarterly-override.csv",
  },
  {
    title: "IPP funnel splits",
    body: "Per-developer operational / under-construction / pipeline and the tech mix are partly modelled from investor disclosures.",
    path: "manual-data/developers/developers.csv",
  },
  {
    title: "Tender winner attribution",
    body: "Developer-level MW within each auction is illustrative and user-maintained; aggregate awarded capacity is from official results.",
    path: "manual-data/tenders/auctions.csv",
  },
  {
    title: "BESS cost curve (forward)",
    body: "The 2026 and 2030 points on the BESS $/kWh curve are modelled projections; historical points are sourced.",
    path: "manual-data/policy/bess-cost-curve.csv",
  },
];

export default function DataSourcesPage() {
  const provenance = getProvenance();
  const glossary = getGlossary();
  const asOf = provenance
    .map((p) => p.updatedAt)
    .reduce((m, a) => (a > m ? a : m), provenance[0]?.updatedAt ?? "");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Data & Methodology"
        subtitle="How Solardash is built — the static-first model, every dataset's provenance, what's modelled, and how to refresh it."
        asOf={`As of ${formatDate(asOf)}`}
      />

      {/* § Methodology */}
      <section className="space-y-3">
        <SectionHeader title="Methodology" subtitle="Static-first — no live database." />
        <Card className="space-y-4 p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Solardash is <span className="font-medium text-foreground">static-first</span>.
            Offline pipelines (<Code>tsx</Code> scripts) read human-maintained feeds in{" "}
            <Code>manual-data/</Code>, derive metrics, and write committed JSON snapshots.
            Pages are prerendered (<Code>force-static</Code>) and read those snapshots — there
            is no runtime database or client-side fetching, so every figure is reproducible
            and versioned in git.
          </p>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Confidence legend
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="flex items-center gap-3">
                <ConfidenceBadge level="high" showDot={false} />
                <span className="text-muted-foreground">
                  Official / disclosed — MNRE, CEA, SECI, or company filings.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <ConfidenceBadge level="medium" showDot={false} />
                <span className="text-muted-foreground">
                  Public data with Solardash aggregation / derivation.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <ConfidenceBadge level="modelled" showDot={false} />
                <span className="text-muted-foreground">
                  Solardash estimate or model (splits, forward curves, attribution).
                </span>
              </li>
            </ul>
          </div>
        </Card>
      </section>

      {/* § Data provenance */}
      <section className="space-y-3">
        <SectionHeader
          title="Data provenance"
          subtitle="Every committed snapshot — auto-generated from the live data layer."
        />
        <ChartFrame
          title="Snapshot provenance"
          subtitle="Section · dataset · cadence · vintage · sources"
          source="Solardash data layer"
          asOf={formatDate(asOf)}
        >
          <ProvenanceTable
            rows={provenance}
            exportMeta={{
              section: "data-sources",
              dataset: "provenance",
              asOf,
              source: "Solardash data layer (all snapshots)",
              confidence: "high",
              notes: ["Per-dataset sources and confidence levels are in the table rows."],
            }}
          />
        </ChartFrame>
      </section>

      {/* § Modelled metrics */}
      <section className="space-y-3">
        <SectionHeader
          title="Modelled metrics"
          subtitle="What's estimated, how, and where to refine it."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {MODELLED.map((m) => (
            <Card key={m.title} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{m.title}</h3>
                <ConfidenceBadge level="modelled" showDot={false} />
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{m.body}</p>
              <p className="mt-2 text-2xs text-muted-foreground">
                Refine in <Code>{m.path}</Code>
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* § Update workflow */}
      <section className="space-y-3">
        <SectionHeader title="Update workflow" subtitle="Edit a feed, rebuild, commit." />
        <Card className="p-5">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Edit the relevant feed under <Code>manual-data/&lt;section&gt;/…</Code>.
            </li>
            <li>
              Run <Code>npm run data:build</Code> (or <Code>:monthly</Code> /{" "}
              <Code>:quarterly</Code>) to regenerate the committed snapshots
              deterministically.
            </li>
            <li>
              Commit the changed feed and snapshot. See{" "}
              <Code>docs/ARCHITECTURE.md §9</Code> for the full recipe.
            </li>
          </ol>
        </Card>
      </section>

      {/* § Glossary */}
      <section className="space-y-3">
        <SectionHeader title="Glossary" subtitle="Sector terms used across Solardash." />
        <ChartFrame
          title="Glossary"
          subtitle={`${glossary.length} terms`}
          source="Solardash"
          asOf={formatDate(asOf)}
        >
          <GlossaryTable rows={glossary} />
        </ChartFrame>
      </section>
    </div>
  );
}
