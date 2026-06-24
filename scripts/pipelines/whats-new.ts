import { definePipeline } from "../lib/pipeline";
import { readManualCsv, writeSnapshot } from "../lib/io";
import type { Confidence } from "../../src/data/types/core";
import type {
  Milestone,
  WhatsNewCategory,
  WhatsNewData,
} from "../../src/data/types/whats-new";

export const whatsNewPipeline = definePipeline({
  name: "whats-new",
  section: "whats-new",
  cadence: "adhoc",
  run() {
    const rows = readManualCsv("whats-new/milestones.csv");

    // Newest first; title tiebreak keeps same-date rows deterministic.
    const milestones: Milestone[] = rows
      .map((r) => ({
        date: r.date,
        category: r.category as WhatsNewCategory,
        title: r.title,
        detail: r.detail,
        href: r.href,
        ...(r.source_url?.trim() ? { sourceUrl: r.source_url.trim() } : {}),
      }))
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

    const maxDate = milestones.reduce(
      (m, x) => (x.date > m ? x.date : m),
      milestones[0]?.date ?? "1970-01-01",
    );

    const data: WhatsNewData = { milestones };

    writeSnapshot<WhatsNewData>("whats-new", "milestones", {
      asOf: maxDate,
      cadence: "adhoc",
      coverage:
        "India · curated solar-sector milestones (company results, capacity records, policy)",
      sources: [
        {
          name: "Munshot editorial + linked sources",
          asOf: maxDate,
          confidence: "high" as Confidence,
        },
      ],
      notes: [
        "Curated milestones (company results, capacity records, policy). The /whats-new feed merges these with auction awards and PPA signings from the tenders & developers snapshots.",
      ],
      data,
    });
  },
});
