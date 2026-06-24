/**
 * CEA monthly power-demand ingestion — Executive Summary PDF parser.
 *
 * Fetches CEA's monthly "Executive Summary on Power Sector" PDF, extracts the
 * text (pdf-parse), and label-anchors the all-India Peak Demand Met (MW) and
 * Energy Met (MU) for the report month → GW / BU. Mirrors the Screener Action:
 * offline-verifiable pure parser, keep-last-good (a failed parse never wipes a
 * good row), commit-on-change, summary + exit-on-total-failure.
 *
 * CLI:
 *   tsx scripts/ingest/cea.ts                 # last 12 months, newest first
 *   tsx scripts/ingest/cea.ts --months 6
 *   tsx scripts/ingest/cea.ts --dry-run       # fetch + parse + print, don't write
 *   tsx scripts/ingest/cea.ts --file report.pdf   # parse a local PDF, no fetch
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parseCsv } from "../lib/io";

const ROOT = process.cwd();
const CEA_CSV = join(ROOT, "manual-data", "demand", "cea-monthly.csv");
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/124.0 Safari/537.36";
const FETCH_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 30000;

// Full English month names — used both in the URL and the report title.
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------

/**
 * Candidate Executive-Summary URLs for a month, in preference order. CEA names
 * the file `Executive_Summary_<Month>_<YYYY>_<suffix>.pdf` under a
 * `/executive/<YYYY>/<MM>/` directory; the suffix varies by vintage.
 */
export function ceaUrls(year: number, month: number): string[] {
  const mm = String(month).padStart(2, "0");
  const name = MONTH_NAMES[month - 1];
  const base = `https://cea.nic.in/wp-content/uploads/executive/${year}/${mm}/Executive_Summary_${name}_${year}`;
  return [`${base}_Actual.pdf`, `${base}_Provisional.pdf`, `${base}.pdf`];
}

// ---------------------------------------------------------------------------
// Parse (pure, offline-testable)
// ---------------------------------------------------------------------------

export interface CeaReading {
  peakGw: number;
  energyBu: number;
}

/** Strip Indian/Western digit grouping and parse, e.g. `2,40,560` -> 240560. */
function toNumber(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

/**
 * Find the first plausible number within a window just after `label`. Tolerates
 * spacing / line breaks (it scans every number in the window) and uses a value
 * range to ignore percentages, deficits and column indices.
 */
function anchoredNumber(
  text: string,
  label: RegExp,
  lo: number,
  hi: number,
): number | null {
  const m = label.exec(text);
  if (!m) return null;
  const start = m.index + m[0].length;
  const window = text.slice(start, start + 140);
  for (const raw of window.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) {
    const n = toNumber(raw);
    if (Number.isFinite(n) && n >= lo && n <= hi) return n;
  }
  return null;
}

/**
 * Pure parser: extracted Executive-Summary text → { peakGw, energyBu } or null.
 * Anchors on the all-India "Peak Demand Met" (MW → ÷1000 = GW) and
 * "Energy Met" / "Energy Supplied" (MU → ÷1000 = BU). Returns null if either
 * figure isn't confidently found.
 */
export function parseCeaText(text: string): CeaReading | null {
  const t = text.replace(/\u00a0/g, " ");
  // All-India peak demand met: ~150–270 GW = 150k–270k MW (range padded).
  const peakMw = anchoredNumber(t, /peak\s+(?:demand\s+)?met\b/i, 120000, 350000);
  // Monthly all-India energy met: ~100–180 BU = 100k–180k MU (range padded).
  const energyMu = anchoredNumber(t, /energy\s+(?:met|supplied)\b/i, 60000, 250000);
  if (peakMw == null || energyMu == null) return null;
  return { peakGw: round2(peakMw / 1000), energyBu: round2(energyMu / 1000) };
}

// ---------------------------------------------------------------------------
// PDF -> text (live; lazy import so the parser stays offline-testable)
// ---------------------------------------------------------------------------

export async function pdfToText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text;
}

// ---------------------------------------------------------------------------
// Fetch — try suffix variants, require an actual PDF
// ---------------------------------------------------------------------------

async function fetchMonthPdf(
  year: number,
  month: number,
  debug = false,
): Promise<{ buffer: Buffer; url: string } | null> {
  for (const url of ceaUrls(year, month)) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/pdf,*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const type = (res.headers.get("content-type") ?? "").toLowerCase();
      if (!res.ok) {
        if (debug) console.log(`[cea] ${url} -> ${res.status} ${res.statusText} (${type || "?"})`);
        continue;
      }
      // Accept a PDF by content-type OR the %PDF- magic header — cea.nic.in
      // serves some Executive Summaries as application/octet-stream, which the
      // strict content-type check used to reject.
      const buffer = Buffer.from(await res.arrayBuffer());
      const magic = buffer.subarray(0, 5).toString("latin1");
      const isPdf = type.includes("pdf") || magic === "%PDF-";
      if (debug) {
        console.log(
          `[cea] ${url} -> 200 (${type || "?"}; ${buffer.length}b; magic="${magic.replace(/[^\x20-\x7e]/g, ".")}") ${isPdf ? "PDF" : "not-pdf"}`,
        );
      }
      if (isPdf) return { buffer, url };
    } catch (err) {
      if (debug) console.log(`[cea] ${url} threw: ${(err as Error)?.message ?? String(err)}`);
    }
  }
  return null;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The last `n` calendar months, newest first (current month back). */
function recentMonths(n: number): { year: number; month: number }[] {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth() + 1;
  const out: { year: number; month: number }[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ year, month });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// CSV upsert (keep-last-good)
// ---------------------------------------------------------------------------

interface CeaRow {
  month: string;
  peak_gw: string;
  energy_bu: string;
  confidence: string;
  source: string;
  source_url: string;
}

const HEADER = "month,peak_gw,energy_bu,confidence,source,source_url";

function upsertCsv(
  readings: { month: string; reading: CeaReading; url: string }[],
): void {
  const existing: Record<string, string>[] = existsSync(CEA_CSV)
    ? parseCsv(readFileSync(CEA_CSV, "utf8"))
    : [];
  const byMonth = new Map<string, CeaRow>();
  for (const r of existing) {
    byMonth.set(r.month, {
      month: r.month,
      peak_gw: r.peak_gw,
      energy_bu: r.energy_bu,
      confidence: r.confidence,
      source: r.source,
      source_url: r.source_url ?? "",
    });
  }
  // New successful parses overwrite; months that failed aren't here, so their
  // existing rows survive (keep-last-good).
  for (const { month, reading, url } of readings) {
    byMonth.set(month, {
      month,
      peak_gw: String(reading.peakGw),
      energy_bu: String(reading.energyBu),
      confidence: "high",
      source: "CEA Executive Summary",
      source_url: url,
    });
  }
  const rows = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  const body = rows
    .map((r) =>
      [r.month, r.peak_gw, r.energy_bu, r.confidence, r.source, r.source_url].join(","),
    )
    .join("\n");
  mkdirSync(dirname(CEA_CSV), { recursive: true });
  writeFileSync(CEA_CSV, `${HEADER}\n${body}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileArg = flag(args, "file");
  const dryRun = args.includes("--dry-run");
  const debug = args.includes("--debug");
  const months = Number(flag(args, "months") ?? 12);

  // --file: parse a local PDF (offline tuning), print the reading, no fetch.
  if (fileArg) {
    const reading = parseCeaText(await pdfToText(readFileSync(fileArg)));
    if (!reading) {
      console.error(`Could not parse peak/energy from ${fileArg}.`);
      process.exit(1);
    }
    console.log(JSON.stringify(reading, null, 2));
    return;
  }

  const targets = recentMonths(months);
  console.log(`Fetching CEA Executive Summaries for the last ${months} months…`);

  const readings: { month: string; reading: CeaReading; url: string }[] = [];
  let ok = 0;
  let failed = 0;
  for (const [i, { year, month }] of targets.entries()) {
    const label = `${year}-${String(month).padStart(2, "0")}`;
    try {
      const pdf = await fetchMonthPdf(year, month, debug);
      if (!pdf) {
        failed++;
        console.warn(`[skip] ${label}: no PDF found (not yet published?) — kept existing`);
      } else {
        const reading = parseCeaText(await pdfToText(pdf.buffer));
        if (!reading) {
          failed++;
          console.warn(`[skip] ${label}: peak/energy not found in PDF — kept existing`);
        } else {
          readings.push({ month: label, reading, url: pdf.url });
          ok++;
          console.log(
            `[ok] ${label}: peak ${reading.peakGw} GW, energy ${reading.energyBu} BU`,
          );
        }
      }
    } catch (err) {
      failed++;
      console.warn(`[skip] ${label}: ${(err as Error).message} — kept existing`);
    }
    if (i < targets.length - 1) await delay(FETCH_DELAY_MS);
  }

  if (!dryRun && readings.length > 0) upsertCsv(readings);
  console.log(`CEA: ${ok} ok, ${failed} failed${dryRun ? " (dry-run, not written)" : ""}`);

  // A total wipe-out usually means the URL pattern or parser needs updating.
  if (ok === 0) {
    console.error(
      "All CEA fetches failed — URL pattern or parser may need updating. " +
        "Send a sample Executive Summary PDF, or run with --file on a downloaded PDF.",
    );
    process.exit(1);
  }
}

// Run only when invoked directly (not when imported by the verify script).
if (basename(process.argv[1] ?? "") === "cea.ts") {
  void main();
}
