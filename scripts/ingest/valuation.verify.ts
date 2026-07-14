/**
 * Offline verification of the daily-valuation parser + CSV upsert against the
 * shared Screener fixture. The live fetch is validated on the Action.
 *
 *   tsx scripts/ingest/valuation.verify.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseValuation, upsertCsv, toCsv, fromCsv, type ValuationRow } from "./valuation";

const FIXTURE = join(process.cwd(), "scripts", "ingest", "__fixtures__", "sample-company.html");

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`);
  }
}

console.log("Daily-valuation parser — Screener fixture\n");

const v = parseValuation(readFileSync(FIXTURE, "utf8"));
// Fixture: Market Cap 12,000 · Current Price 456 · Stock P/E 24.5 · Book Value 152
// Borrowings latest 250 · Operating Profit TTM 410.
check("current price → cmp", v.cmp, 456);
check("market cap (₹ Cr)", v.marketCapCr, 12000);
check("stock P/E", v.peX, 24.5);
check("P/B = cmp ÷ book value (456/152)", v.pbX, 3);
check("EV/EBITDA = (12000+250)/410", v.evEbitdaX, 29.88);

// Negative case: a page with no ratios yields an empty parse (keep-last-good).
check("empty page → no fields", parseValuation("<html><body>nope</body></html>"), {});

// CSV round-trip.
const rows: ValuationRow[] = [
  // Key order mirrors fromCsv's insertion order so the round-trip compares equal.
  { slug: "b-co", cmp: 100, marketCapCr: 500, peX: 10, pbX: 2, evEbitdaX: 8, asOf: "2026-07-14" },
  { slug: "a-co", marketCapCr: 900, peX: 20, asOf: "2026-07-14" },
];
const csv = toCsv(rows);
check("toCsv sorts by slug (a-co first)", csv.split("\n")[1].startsWith("a-co,"), true);
check("fromCsv round-trips a full row", fromCsv(csv).find((r) => r.slug === "b-co"), rows[0]);

// Upsert: a fresh row replaces the same slug; an un-scraped slug is kept verbatim.
const seed = toCsv([
  { slug: "a-co", peX: 20, marketCapCr: 900, asOf: "2026-07-01" },
  { slug: "keep-co", peX: 5, marketCapCr: 100, asOf: "2026-07-01" },
]);
const { csv: merged, updated } = upsertCsv(seed, [
  { slug: "a-co", peX: 25, marketCapCr: 1000, evEbitdaX: 9, cmp: 111, pbX: 3, asOf: "2026-07-14" },
]);
const mrows = fromCsv(merged);
check("upsert advances the scraped row", mrows.find((r) => r.slug === "a-co")?.peX, 25);
check("upsert keeps the un-scraped row", mrows.find((r) => r.slug === "keep-co")?.peX, 5);
check("upsert keeps the un-scraped as_of", mrows.find((r) => r.slug === "keep-co")?.asOf, "2026-07-01");
check("upsert reports 1 updated", updated, 1);

console.log("");
if (failures > 0) {
  console.error(`FAILED — ${failures} assertion(s) did not match.`);
  process.exit(1);
}
console.log("PASSED — daily-valuation parser + CSV upsert behave correctly.");
