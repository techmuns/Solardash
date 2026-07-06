/**
 * Offline verification of the commissioning-guidance normalizer. Runs
 * `normalizeCommissioning` over a fixture that exercises the upsert, the
 * canonical sort, invalid-row rejection, and slippage across revisions.
 *
 *   tsx scripts/ingest/concalls.verify.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../lib/io";
import { normalizeCommissioning } from "./concalls";
import { quarterDiff } from "../../src/lib/fiscal";

const FIXTURE = join(
  process.cwd(),
  "scripts",
  "ingest",
  "__fixtures__",
  "commissioning-sample.csv",
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

console.log("Commissioning-guidance normalizer — CSV fixture\n");

const existing = parseCsv(readFileSync(FIXTURE, "utf8"));

// One incoming revision that pushes tranche T1 out by a quarter, plus a bad row.
const incoming = [
  {
    tranche_id: "T1",
    developer: "Test IPP",
    project: "Alpha solar",
    tech: "solar",
    capacity_gw: "1.2",
    stated_on: "2026-02-05",
    concall: "Q3 FY26 concall",
    target_period: "Q2FY27",
    status: "delayed",
    confidence: "high",
    source: "Concall",
    source_url: "",
    note: "monsoon land delay",
  },
  {
    tranche_id: "BAD",
    developer: "X",
    project: "Y",
    tech: "unicorn", // invalid tech → must be dropped
    capacity_gw: "1",
    stated_on: "2026-01-01",
    concall: "?",
    target_period: "Q1FY27",
    status: "on-track",
    confidence: "high",
    source: "s",
    source_url: "",
    note: "",
  },
];

const { rows, dropped } = normalizeCommissioning(existing, incoming);

// Fixture has 3 valid statements (T1 twice, T2 once); incoming adds a 3rd T1
// revision + 1 invalid row.
check("invalid row dropped", dropped, 1);

// Canonical sort: grouped by tranche_id, then stated_on ascending.
check(
  "sorted by (tranche_id, stated_on)",
  rows.map((r) => `${r.tranche_id}@${r.stated_on}`),
  ["T1@2025-05-10", "T1@2025-11-08", "T1@2026-02-05", "T2@2025-11-20"],
);

// Slippage across T1's revision history: first vs latest target.
const t1 = rows.filter((r) => r.tranche_id === "T1");
const slip = quarterDiff(t1[0].target_period, t1[t1.length - 1].target_period);
check("T1 slipped from original → latest target (quarters)", slip, 3);
check("latest T1 status is delayed", t1[t1.length - 1].status, "delayed");

// Upsert is idempotent on key (tranche_id|stated_on): re-normalizing is stable.
const again = normalizeCommissioning(rows, []);
check("idempotent re-normalize (same row count)", again.rows.length, rows.length);

console.log("");
if (failures > 0) {
  console.error(`FAILED — ${failures} assertion(s) did not match.`);
  process.exit(1);
}
console.log("PASSED — normalizer upserts, sorts, rejects bad rows, and tracks slippage.");
