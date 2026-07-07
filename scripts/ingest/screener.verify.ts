/**
 * Offline verification of the Screener HTML parser against the static fixture.
 * Parses scripts/ingest/__fixtures__/sample-company.html through the same
 * `readHtmlFile` path the `--file` CLI flag uses, then asserts every mapped
 * value (annual / quarterly / valuation / shareholding) + FY-quarter labels.
 * No live fetch.
 *
 *   tsx scripts/ingest/screener.verify.ts
 */
import { join } from "node:path";
import { parseCompanyHtml, readHtmlFile, toFeed } from "./screener";

const FIXTURE = join(process.cwd(), "scripts", "ingest", "__fixtures__", "sample-company.html");

const EXPECT = {
  annual: [
    { period: "FY24", revenue: 1000, ebitda: 150, ebitdaMarginPct: 15, pat: 90, epsRs: 9 },
    { period: "FY25", revenue: 1500, ebitda: 240, ebitdaMarginPct: 16, pat: 160, epsRs: 16 },
    { period: "FY26", revenue: 2200, ebitda: 396, ebitdaMarginPct: 18, pat: 280, epsRs: 28 },
  ],
  quarterly: [
    { period: "Q3FY26", revenue: 550, ebitda: 99, ebitdaMarginPct: 18, pat: 70, patMarginPct: 12.73 },
    { period: "Q4FY26", revenue: 620, ebitda: 124, ebitdaMarginPct: 20, pat: 88, patMarginPct: 14.19 },
  ],
  valuation: { peX: 24.5, pbX: 3, cmp: 456, marketCapCr: 12000 },
  rocePct: 22.4,
  roePct: 18.6,
  shareholding: { promoterPct: 63.01, fiiPct: 1.82, diiPct: 1.26, publicPct: 33.91, asOf: "2026-03-31" },
  asOf: "2026-03-31",
} as const;

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

const feed = toFeed("fixture", parseCompanyHtml(readHtmlFile(FIXTURE)));

console.log("Screener HTML parser — synthetic fixture\n");

check("asOf (latest period, not wall-clock)", feed.asOf, EXPECT.asOf);
check("annual FY labels", feed.annual.map((r) => r.period), EXPECT.annual.map((r) => r.period));
check("quarterly labels", feed.quarterly.map((r) => r.period), EXPECT.quarterly.map((r) => r.period));

EXPECT.annual.forEach((exp, i) => {
  const g = feed.annual[i];
  check(`annual[${exp.period}] revenue→ebitda→OPM→pat→EPS`,
    [g?.revenue, g?.ebitda, g?.ebitdaMarginPct, g?.pat, g?.epsRs],
    [exp.revenue, exp.ebitda, exp.ebitdaMarginPct, exp.pat, exp.epsRs]);
});
EXPECT.quarterly.forEach((exp, i) => {
  const g = feed.quarterly[i];
  check(`quarter[${exp.period}] revenue→ebitda→OPM→pat→PATM`,
    [g?.revenue, g?.ebitda, g?.ebitdaMarginPct, g?.pat, g?.patMarginPct],
    [exp.revenue, exp.ebitda, exp.ebitdaMarginPct, exp.pat, exp.patMarginPct]);
});

check("valuation { peX, pbX, cmp }", feed.valuation, EXPECT.valuation);
check("rocePct (top-ratios)", feed.rocePct, EXPECT.rocePct);
check("roePct (top-ratios)", feed.roePct, EXPECT.roePct);
check("shareholding (latest column)", feed.shareholding, EXPECT.shareholding);

console.log("");
if (failures > 0) {
  console.error(`FAILED — ${failures} assertion(s) did not match.`);
  process.exit(1);
}
console.log("PASSED — parser maps the synthetic HTML fixture correctly.");
