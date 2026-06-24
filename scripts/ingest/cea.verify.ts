/**
 * Offline verification of the CEA Executive-Summary parser against a static
 * text fixture (representative extracted text). Runs `parseCeaText` and asserts
 * the mapped GW/BU values. The PDF→text step is validated live on the Action.
 *
 *   tsx scripts/ingest/cea.verify.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCeaText } from "./cea";

const FIXTURE = join(process.cwd(), "scripts", "ingest", "__fixtures__", "cea-sample.txt");

// Fixture: Peak Demand Met 2,40,560 MW → 240.56 GW; Energy Met 1,48,230 MU → 148.23 BU.
const EXPECT = { peakGw: 240.56, energyBu: 148.23 };

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

console.log("CEA Executive-Summary parser — text fixture\n");

const reading = parseCeaText(readFileSync(FIXTURE, "utf8"));
check("parsed a reading (not null)", reading != null, true);
check("peak demand met → GW", reading?.peakGw, EXPECT.peakGw);
check("energy met → BU", reading?.energyBu, EXPECT.energyBu);

// Negative case: text without the anchors must return null (no false positives).
check(
  "returns null when figures are absent",
  parseCeaText("Executive Summary — generation only, no supply table."),
  null,
);

console.log("");
if (failures > 0) {
  console.error(`FAILED — ${failures} assertion(s) did not match.`);
  process.exit(1);
}
console.log("PASSED — parser maps the CEA text fixture correctly.");
