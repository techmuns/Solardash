import { definePipeline } from "../lib/pipeline";
import { maxAsOf, readManualCsv, writeSnapshot } from "../lib/io";
import type {
  Confidence,
  Series,
  SourceRef,
} from "../../src/data/types/core";
import type {
  OverviewKpi,
  OverviewSummary,
} from "../../src/data/types/overview";

// Energy-source columns in re-additions.csv, in stack order.
const RE_SOURCES = ["solar", "wind", "hybrid", "bess"] as const;
const RE_LABELS: Record<string, string> = {
  solar: "Solar",
  wind: "Wind",
  hybrid: "Hybrid",
  bess: "BESS",
};

/** Dedupe sources by name|url|asOf so distinct vintages are preserved. */
function dedupeSources(sources: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const s of sources) {
    const id = `${s.name}|${s.url ?? ""}|${s.asOf}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(s);
  }
  return out;
}

export const overviewPipeline = definePipeline({
  name: "overview",
  section: "overview",
  cadence: "quarterly",
  run() {
    // --- KPIs (per-metric provenance) ---
    const kpis: OverviewKpi[] = readManualCsv("overview/kpis.csv").map((r) => ({
      key: r.key,
      label: r.label,
      value: Number(r.value),
      unit: r.unit,
      source: {
        name: r.source,
        ...(r.url ? { url: r.url } : {}),
        asOf: r.asOf,
        confidence: r.confidence as Confidence,
      },
    }));

    // --- Quarterly RE additions (illustrative seed; all points modelled) ---
    const seedSource: SourceRef = {
      name: "Solardash seed (verify in Prompt 6)",
      asOf: "2026-03-31",
      confidence: "modelled",
    };
    const addRows = readManualCsv("overview/re-additions.csv");
    const reAdditions: Series[] = RE_SOURCES.map((key) => ({
      key,
      label: RE_LABELS[key] ?? key,
      unit: "GW",
      source: seedSource,
      points: addRows.map((r) => ({
        period: r.period,
        value: Number(r[key]),
        modelled: true,
      })),
    }));

    // --- Snapshot-level provenance = unique KPI sources + the seed source ---
    const sources = dedupeSources([
      ...kpis.map((k) => k.source),
      seedSource,
    ]);

    writeSnapshot<OverviewSummary>("overview", "summary", {
      asOf: maxAsOf(sources),
      cadence: "quarterly",
      coverage: "India · all-India aggregates",
      sources,
      notes: [
        "Provisional seed values to prove the data pipeline end-to-end; replaced by section pipelines in later phases.",
        "RE additions are illustrative and modelled — verify in Prompt 6.",
      ],
      data: { kpis, reAdditions },
    });
  },
});
