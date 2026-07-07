/**
 * Offline verification of the MNRE policy-scheme parser + merge against a
 * static HTML fixture (a synthetic What's-New page). Exercises the SIGNAL /
 * RE_CONTEXT / NOISE filters, date extraction, in-page dedup, and the merge's
 * dedup against curated rows. The live fetch is validated on the Action.
 *
 *   tsx scripts/ingest/policy-schemes.verify.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseSchemeCandidates,
  mergeSchemes,
  inferCategory,
  extractAnnounced,
} from "./policy-schemes";

const FIXTURE = join(
  process.cwd(),
  "scripts",
  "ingest",
  "__fixtures__",
  "mnre-whats-new.html",
);

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`);
  }
}

console.log("MNRE policy-scheme parser — HTML fixture\n");

const html = readFileSync(FIXTURE, "utf8");
const candidates = parseSchemeCandidates(html);

// The fixture has 3 genuine RE schemes; noise / non-RE / short / dup-in-page
// items must all be dropped (item 10 dedupes against item 2 by name).
check("keeps only the 3 genuine RE schemes", candidates.length, 3);

const titles = candidates.map((c) => c.scheme);
check(
  "picks up the PM Surya Ghar rooftop guidelines",
  titles.some((t) => /PM Surya Ghar/i.test(t)),
  true,
);
check(
  "picks up the Green Hydrogen electrolyser PLI",
  titles.some((t) => /Green Hydrogen Electrolyser/i.test(t)),
  true,
);
check(
  "picks up the Wind-Solar Hybrid VGF",
  titles.some((t) => /Wind-Solar Hybrid/i.test(t)),
  true,
);
check(
  "drops the amendment (noise)",
  titles.some((t) => /Amendment/i.test(t)),
  false,
);
check(
  "drops the SOP (noise)",
  titles.some((t) => /Standard Operating Procedure/i.test(t)),
  false,
);
check(
  "drops the application-fee circular (noise)",
  titles.some((t) => /application fee/i.test(t)),
  false,
);
check(
  "drops the non-RE coal scheme (no RE context)",
  titles.some((t) => /Coal Linkage/i.test(t)),
  false,
);

// Date extraction: dd.mm.yyyy in title, then "Month YYYY", then none.
const bySignal = (re: RegExp) => candidates.find((c) => re.test(c.scheme));
check(
  "extracts Mar 2026 from a dd.mm.yyyy title",
  bySignal(/PM Surya Ghar/i)?.announced,
  "Mar 2026",
);
check(
  "extracts Feb 2026 from a 'February 2026' title",
  bySignal(/Green Hydrogen/i)?.announced,
  "Feb 2026",
);
check(
  "leaves announced empty when no date present",
  bySignal(/Wind-Solar Hybrid/i)?.announced,
  "",
);

// Category inference.
check("VGF/hybrid storage → Storage", inferCategory("Wind-Solar Hybrid VGF storage"), "Storage");
check("electrolyser → Manufacturing", inferCategory("Green Hydrogen Electrolyser PLI"), "Manufacturing");
check("rooftop → Rooftop", inferCategory("PM Surya Ghar rooftop solar"), "Rooftop");
check("customs duty → Trade", inferCategory("Basic Customs Duty on solar cells"), "Trade");

// extractAnnounced units.
check("dd/mm/yyyy → Mon YYYY", extractAnnounced("notified 05/09/2025", ""), "Sep 2025");
check("dd-mm-yyyy slug → Mon YYYY", extractAnnounced("scheme", "as-on-03-03-2024"), "Mar 2024");
check("alpha month in slug → Mon YYYY", extractAnnounced("scheme", "notified-april-2024"), "Apr 2024");
check("year-only fallback", extractAnnounced("solar mission 2023 update", ""), "2023");
check("no date → empty", extractAnnounced("solar mission guidelines", "/doc/xyz"), "");

// Merge dedup: against a curated CSV, an already-known URL is skipped and the
// three genuine new schemes are appended (item 8 shares a curated ALMM URL).
const curated =
  "scheme,category,target,status,allocation_cr,key_metric,announced,source_url,highlights,confidence,source,note\n" +
  "ALMM List-I (Solar PV Modules),Manufacturing,,Active,,,Jan 2019," +
  "https://mnre.gov.in/en/approved-list-of-models-and-manufacturers-almm/,,high,MNRE,\n";
const merged = mergeSchemes(curated, candidates);
check("merge appends the 3 new schemes", merged.added.length, 3);
check(
  "merge skips the curated ALMM URL",
  merged.added.some((a) =>
    /approved-list-of-models-and-manufacturers-almm\/$/.test(a.sourceUrl),
  ),
  false,
);
check(
  "merged CSV keeps the curated row + adds 3 (5 lines incl. header)",
  merged.csv.trim().split("\n").length,
  1 + 1 + 3,
);

// Idempotency: merging the same candidates into the merged CSV adds nothing.
const again = mergeSchemes(merged.csv, candidates);
check("re-merge is idempotent (0 added)", again.added.length, 0);

console.log("");
if (failures > 0) {
  console.error(`FAILED — ${failures} assertion(s) did not match.`);
  process.exit(1);
}
console.log("PASSED — MNRE policy-scheme parser + merge behave correctly.");
