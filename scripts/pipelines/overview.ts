import { definePipeline } from "../lib/pipeline";
import { maxAsOf, readManualCsv, writeSnapshot } from "../lib/io";
import type { Confidence, SourceRef } from "../../src/data/types/core";
import type { Insight, OverviewData } from "../../src/data/types/overview";

// Editorial digest vintage — aligns with the latest section data (demand, Apr 2026).
const OVERVIEW_AS_OF = "2026-04-01";

export const overviewPipeline = definePipeline({
  name: "overview",
  section: "overview",
  cadence: "quarterly",
  run() {
    const rows = readManualCsv("overview/insights.csv");
    const insights: Insight[] = rows.map((r) => ({
      text: r.text,
      section: r.section,
      confidence: r.confidence as Confidence,
    }));

    // Provenance: distinct (source, confidence) pairs.
    const srcMap = new Map<string, SourceRef>();
    for (const r of rows) {
      if (!r.source) continue;
      const key = `${r.source}|${r.confidence}`;
      if (!srcMap.has(key)) {
        srcMap.set(key, { name: r.source, asOf: OVERVIEW_AS_OF, confidence: r.confidence as Confidence });
      }
    }
    const sources = [...srcMap.values()].sort(
      (a, b) => a.name.localeCompare(b.name) || a.confidence.localeCompare(b.confidence),
    );

    writeSnapshot<OverviewData>("overview", "summary", {
      asOf: maxAsOf(sources),
      cadence: "quarterly",
      coverage: "India · cross-section editorial digest",
      sources,
      notes: [
        "Editorial digest only — the landing page reads real metrics live from each section's snapshot at render time; only the curated insights live here.",
      ],
      data: { insights, asOf: OVERVIEW_AS_OF },
    });
  },
});
