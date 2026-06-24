import { definePipeline } from "../lib/pipeline";
import { maxAsOf, readManualCsv, writeSnapshot } from "../lib/io";
import type { SourceRef } from "../../src/data/types/core";
import type { GlossaryTerm, ReferenceData } from "../../src/data/types/reference";

const REF_AS_OF = "2026-04-01";

export const referencePipeline = definePipeline({
  name: "reference",
  section: "reference",
  cadence: "adhoc",
  run() {
    const glossary: GlossaryTerm[] = readManualCsv("reference/glossary.csv").map(
      (r) => ({ term: r.term, definition: r.definition }),
    );

    const sources: SourceRef[] = [
      { name: "Solar Sector Dashboard glossary", asOf: REF_AS_OF, confidence: "high" },
    ];

    writeSnapshot<ReferenceData>("reference", "glossary", {
      asOf: maxAsOf(sources),
      cadence: "adhoc",
      coverage: "India · solar / renewable sector glossary",
      sources,
      notes: ["Reference glossary of sector terms used across the Solar Sector Dashboard."],
      data: { glossary },
    });
  },
});
