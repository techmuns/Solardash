/**
 * Offline verification of the PVInsights price parser against a static HTML
 * fixture. Asserts the four value-chain stages parse with their native-unit
 * averages and the page date. The live page fetch + exact DOM are validated on
 * the Action (this proves the parsing logic without network access).
 *
 *   tsx scripts/ingest/prices.verify.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePrices, STAGES } from "./prices";

const FIXTURE = join(
  process.cwd(),
  "scripts",
  "ingest",
  "__fixtures__",
  "prices-pvinsights.html",
);

// Expected averages from the fixture table (native units).
const EXPECT: Record<string, { value: number; unit: string }> = {
  Polysilicon: { value: 5.1, unit: "USD/kg" },
  Wafer: { value: 0.135, unit: "USD/piece" },
  Cell: { value: 0.032, unit: "USD/W" },
  Module: { value: 0.102, unit: "USD/W" },
};

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

console.log("PVInsights price parser — HTML fixture\n");

const parsed = parsePrices(readFileSync(FIXTURE, "utf8"), "pvinsights");
check("parsed a result (not null)", parsed != null, true);
check("page date (from the page, not the clock)", parsed?.asOf, "2026-06-17");
check("four stages", parsed?.stages.length, 4);

for (const spec of STAGES) {
  const obs = parsed?.stages.find((s) => s.item === spec.item);
  check(`${spec.item} → value`, obs?.value, EXPECT[spec.item].value);
  check(`${spec.item} → native unit`, obs?.unit, EXPECT[spec.item].unit);
}

// Negative case: a page without a published date is unsuitable → null.
check(
  "returns null when the page has no date",
  parsePrices("<table><tr><td>Polysilicon</td><td>5.1</td></tr></table>", "pvinsights"),
  null,
);

console.log("");
if (failures > 0) {
  console.error(`FAILED — ${failures} assertion(s) did not match.`);
  process.exit(1);
}
console.log("PASSED — parser maps the PVInsights fixture correctly.");
