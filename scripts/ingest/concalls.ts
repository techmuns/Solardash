/**
 * Concall commissioning-guidance ingestion — normalize / upsert.
 *
 * Commissioning guidance is a *maintained* feed: each row is one dated statement
 * from a company concall / investor disclosure about when a capacity tranche
 * will be commissioned (COD). New statements are appended over time; keeping
 * every revision is what lets the dashboard show slippage (a pushed-out date).
 *
 * Live concalls are audio + PDF transcripts, so there is no reliable scraper.
 * Instead this script maintains `manual-data/developers/commissioning.csv`:
 *   • validates + normalizes every row (tech/status/confidence enums, FY-quarter
 *     targets, ISO `stated_on`, numeric capacity),
 *   • canonically sorts (tranche_id, stated_on, concall) for byte-stable diffs,
 *   • optionally merges a batch of new statements from `--file`, upserting by
 *     `tranche_id | stated_on` (keep-last-good — re-stating a key overwrites it).
 *
 * Mirrors the Screener / CEA ingestion conventions: a pure, offline-testable
 * core (`normalizeCommissioning`), keep-last-good upsert, `--dry-run`, and
 * exit-non-zero on total failure so the Action surfaces a broken feed.
 *
 * CLI:
 *   tsx scripts/ingest/concalls.ts               # validate + normalize in place
 *   tsx scripts/ingest/concalls.ts --dry-run     # validate + print, don't write
 *   tsx scripts/ingest/concalls.ts --file new.csv  # merge new statements, then normalize
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parseCsv } from "../lib/io";
import { fyQuarterIndex } from "../../src/lib/fiscal";

const ROOT = process.cwd();
const CSV = join(ROOT, "manual-data", "developers", "commissioning.csv");

export const COMMISSIONING_HEADER = [
  "tranche_id",
  "developer",
  "project",
  "tech",
  "capacity_gw",
  "stated_on",
  "concall",
  "target_period",
  "status",
  "confidence",
  "source",
  "source_url",
  "note",
] as const;

const TECHS = new Set(["solar", "wind", "hybrid", "fdre", "rtc", "solar-bess", "bess", "peak"]);
const STATUSES = new Set(["commissioned", "on-track", "delayed", "at-risk"]);
const CONFIDENCES = new Set(["high", "medium", "modelled"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface NormalizeResult {
  rows: Record<string, string>[];
  warnings: string[];
  dropped: number;
}

/**
 * Pure core: validate, drop-with-warning malformed rows, upsert by
 * `tranche_id|stated_on`, and canonically sort. Offline-testable (no I/O).
 */
export function normalizeCommissioning(
  existing: Record<string, string>[],
  incoming: Record<string, string>[] = [],
): NormalizeResult {
  const warnings: string[] = [];
  const byKey = new Map<string, Record<string, string>>();
  let dropped = 0;

  const ingest = (rows: Record<string, string>[], origin: string) => {
    for (const r of rows) {
      const id = (r.tranche_id ?? "").trim();
      const statedOn = (r.stated_on ?? "").trim();
      const problems: string[] = [];
      if (!id) problems.push("missing tranche_id");
      if (!ISO_DATE.test(statedOn)) problems.push(`bad stated_on "${statedOn}"`);
      if (!TECHS.has((r.tech ?? "").trim())) problems.push(`bad tech "${r.tech}"`);
      if (!STATUSES.has((r.status ?? "").trim())) problems.push(`bad status "${r.status}"`);
      if (!CONFIDENCES.has((r.confidence ?? "").trim()))
        problems.push(`bad confidence "${r.confidence}"`);
      if (!Number.isFinite(fyQuarterIndex((r.target_period ?? "").trim())))
        problems.push(`unparseable target_period "${r.target_period}"`);
      if (!Number.isFinite(Number(r.capacity_gw)))
        problems.push(`non-numeric capacity_gw "${r.capacity_gw}"`);
      if (problems.length) {
        warnings.push(`[${origin}] dropped ${id || "?"}@${statedOn || "?"}: ${problems.join("; ")}`);
        dropped++;
        continue;
      }
      const clean: Record<string, string> = {};
      for (const h of COMMISSIONING_HEADER) clean[h] = (r[h] ?? "").trim();
      byKey.set(`${id}|${statedOn}`, clean); // upsert — incoming overwrites existing
    }
  };

  ingest(existing, "existing");
  ingest(incoming, "incoming");

  const rows = [...byKey.values()].sort(
    (a, b) =>
      a.tranche_id.localeCompare(b.tranche_id) ||
      a.stated_on.localeCompare(b.stated_on) ||
      a.concall.localeCompare(b.concall),
  );
  return { rows, warnings, dropped };
}

/** Serialize a CSV field, quoting when it contains a comma / quote / newline. */
function csvField(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function serializeCommissioning(rows: Record<string, string>[]): string {
  const head = COMMISSIONING_HEADER.join(",");
  const body = rows
    .map((r) => COMMISSIONING_HEADER.map((h) => csvField(r[h] ?? "")).join(","))
    .join("\n");
  return `${head}\n${body}\n`;
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileArg = flag(args, "file");

  if (!existsSync(CSV)) {
    console.error(`Missing ${CSV}. Nothing to normalize.`);
    process.exit(1);
  }
  const existing = parseCsv(readFileSync(CSV, "utf8"));
  const incoming = fileArg ? parseCsv(readFileSync(fileArg, "utf8")) : [];

  const { rows, warnings, dropped } = normalizeCommissioning(existing, incoming);
  for (const w of warnings) console.warn(w);

  if (rows.length === 0) {
    console.error("No valid commissioning rows after normalize — check the feed.");
    process.exit(1);
  }

  const tranches = new Set(rows.map((r) => r.tranche_id)).size;
  if (!dryRun) {
    mkdirSync(dirname(CSV), { recursive: true });
    writeFileSync(CSV, serializeCommissioning(rows), "utf8");
  }
  console.log(
    `Commissioning: ${rows.length} statements across ${tranches} tranches` +
      (incoming.length ? `, merged ${incoming.length} incoming` : "") +
      (dropped ? `, dropped ${dropped}` : "") +
      (dryRun ? " (dry-run, not written)" : ""),
  );
}

// Run only when invoked directly (not when imported by the verify script).
if (basename(process.argv[1] ?? "") === "concalls.ts") {
  main();
}
