/**
 * Offline verification of the Screener parser against the synthetic fixture.
 * Builds the sample workbook, writes it to a temp `.xlsx`, reads it back through
 * the same `readWorkbookFile` path the `--file` CLI flag uses, parses it, and
 * asserts every mapped value + FY/quarter label. No live fetch.
 *
 *   tsx scripts/ingest/screener.verify.ts
 */
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as XLSX from "xlsx";
import { buildSampleWorkbook, SAMPLE_EXPECT } from "./__fixtures__/make-sample";
import { parseDataSheet, readWorkbookFile, toFeed } from "./screener";

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

// 1. Build the fixture and round-trip it through the --file read path.
const tmp = join(tmpdir(), `solardash-screener-fixture-${process.pid}.xlsx`);
XLSX.writeFile(buildSampleWorkbook(), tmp);
let feed;
try {
  feed = toFeed("fixture", parseDataSheet(readWorkbookFile(tmp)));
} finally {
  rmSync(tmp, { force: true });
}

console.log("Screener parser — synthetic fixture\n");

// 2. Assert structure + every value.
check("slug", feed.slug, "fixture");
check("asOf (latest period, not wall-clock)", feed.asOf, SAMPLE_EXPECT.asOf);
check("annual row count", feed.annual.length, SAMPLE_EXPECT.annual.length);
check("quarterly row count", feed.quarterly.length, SAMPLE_EXPECT.quarterly.length);
check("annual FY labels", feed.annual.map((r) => r.period), SAMPLE_EXPECT.annual.map((r) => r.period));
check("quarterly labels", feed.quarterly.map((r) => r.period), SAMPLE_EXPECT.quarterly.map((r) => r.period));

SAMPLE_EXPECT.annual.forEach((exp, i) => {
  const got = feed.annual[i];
  check(`annual[${exp.period}] revenue→ebitda→OPM→pat→EPS→ROCE`,
    [got?.revenue, got?.ebitda, got?.ebitdaMarginPct, got?.pat, got?.epsRs, got?.rocePct],
    [exp.revenue, exp.ebitda, exp.ebitdaMarginPct, exp.pat, exp.epsRs, exp.rocePct]);
});
SAMPLE_EXPECT.quarterly.forEach((exp, i) => {
  const got = feed.quarterly[i];
  check(`quarter[${exp.period}] revenue→ebitda→OPM→pat→PATM`,
    [got?.revenue, got?.ebitda, got?.ebitdaMarginPct, got?.pat, got?.patMarginPct],
    [exp.revenue, exp.ebitda, exp.ebitdaMarginPct, exp.pat, exp.patMarginPct]);
});
check("top-level rocePct (latest annual)", feed.rocePct, SAMPLE_EXPECT.rocePct);

console.log("");
if (failures > 0) {
  console.error(`FAILED — ${failures} assertion(s) did not match.`);
  process.exit(1);
}
console.log("PASSED — parser maps the synthetic fixture correctly.");
