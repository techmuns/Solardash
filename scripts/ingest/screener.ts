/**
 * Screener.in financials ingestion.
 *
 * Pulls a listed company's "Export to Excel" Data Sheet from Screener (behind a
 * session cookie) and maps it into a per-company feed JSON that the companies
 * pipeline merges as `screener` precedence (manual > screener > registry).
 *
 * Auth: set `SCREENER_SESSIONID` (the `sessionid` cookie). Screener blocks our
 * build IP, so live fetching runs from GitHub's runners; everything here is
 * verifiable offline via `--file` against a synthetic fixture.
 *
 * CLI:
 *   tsx scripts/ingest/screener.ts                 # all companies in the codes file
 *   tsx scripts/ingest/screener.ts --slug waaree-energies
 *   tsx scripts/ingest/screener.ts --file sample.xlsx --slug fixture --dry-run
 *   tsx scripts/ingest/screener.ts --dry-run       # parse + print, don't write
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import * as XLSX from "xlsx";
import { readManualCsv } from "../lib/io";
import type {
  AnnualRow,
  QuarterRow,
  Shareholding,
} from "../../src/data/types/companies";

const ROOT = process.cwd();
const SCREENER_DIR = join(ROOT, "manual-data", "companies", "screener");
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/124.0 Safari/537.36 Solardash-ingest/1.0";
const FETCH_DELAY_MS = 2500;
const FETCH_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// Parsed shapes
// ---------------------------------------------------------------------------

export interface ScreenerFeed {
  slug: string;
  annual: AnnualRow[];
  quarterly: QuarterRow[];
  rocePct?: number;
  shareholding?: Shareholding;
  /** Derived from the latest period (NOT wall-clock) so the file only changes
   *  when the underlying data does. */
  asOf: string;
}

type Cell = string | number | boolean | Date | null | undefined;
type Aoa = Cell[][];
interface Period {
  month: number;
  year: number;
}
interface PeriodCol {
  idx: number;
  period: Period;
}

// ---------------------------------------------------------------------------
// Cell / period helpers (tolerant — no hard-coded coordinates)
// ---------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const QUARTER: Record<number, string> = { 6: "Q1", 9: "Q2", 12: "Q3", 3: "Q4" };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Lower-cased, trimmed, trailing-colon-stripped label. */
function norm(c: Cell): string {
  return String(c ?? "").trim().toLowerCase().replace(/:+$/, "");
}

/** Parse a numeric cell (strips commas / %); blank or "-" → undefined. */
function num(c: Cell): number | undefined {
  if (c == null || c === "") return undefined;
  if (typeof c === "number") return Number.isFinite(c) ? round2(c) : undefined;
  const s = String(c).replace(/,/g, "").replace(/%/g, "").trim();
  if (s === "" || s === "-") return undefined;
  const n = Number(s);
  return Number.isNaN(n) ? undefined : round2(n);
}

/** Parse a Screener "Report Date" cell → {month, year}. Handles "Mar-2024",
 *  "Mar 2024", "Mar-24" and real Excel dates; "TTM"/non-dates → null. */
function parsePeriod(c: Cell): Period | null {
  if (c == null || c === "") return null;
  if (c instanceof Date) return { month: c.getMonth() + 1, year: c.getFullYear() };
  const m = String(c).trim().match(/^([A-Za-z]{3,9})[\s-]+(\d{2,4})$/);
  if (!m) return null;
  const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  let year = Number(m[2]);
  if (year < 100) year += 2000;
  return { month, year };
}

/** Indian fiscal year of a period end (Apr–Mar; Mar-2026 → 2026). */
const fyOf = (p: Period): number => (p.month <= 3 ? p.year : p.year + 1);
const fyLabel = (p: Period): string => `FY${String(fyOf(p)).slice(2)}`;
const annualLabel = (p: Period): string => fyLabel(p);
function quarterLabel(p: Period): string | null {
  const q = QUARTER[p.month];
  return q ? `${q}${fyLabel(p)}` : null;
}
/** Last day of the period's month, ISO. */
function periodEndIso(p: Period): string {
  const lastDay = new Date(p.year, p.month, 0).getDate();
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Section / row location
// ---------------------------------------------------------------------------

const SECTION_LABELS = [
  "profit & loss", "quarters", "balance sheet", "cash flow", "derived", "price",
];

/** First row whose column-0 label matches one of the known section headers. */
function sectionStarts(aoa: Aoa): number[] {
  const starts: number[] = [];
  for (let r = 0; r < aoa.length; r++) {
    const t = norm(aoa[r]?.[0]);
    if (t && SECTION_LABELS.some((w) => t === w || t.startsWith(w))) starts.push(r);
  }
  return starts;
}

/** Row index of the section whose header equals `label`, else -1. */
function findSection(aoa: Aoa, label: string): number {
  const want = norm(label);
  for (let r = 0; r < aoa.length; r++) {
    if (norm(aoa[r]?.[0]) === want) return r;
  }
  return -1;
}

/** End (exclusive) of the section starting at `start` = next section, else len. */
function sectionEnd(start: number, starts: number[], len: number): number {
  const next = starts.filter((s) => s > start).sort((a, b) => a - b)[0];
  return next ?? len;
}

function collectPeriods(row: Cell[]): PeriodCol[] {
  const out: PeriodCol[] = [];
  for (let c = 1; c < row.length; c++) {
    const period = parsePeriod(row[c]);
    if (period) out.push({ idx: c, period });
  }
  return out;
}

/** Locate the period header within [start,end): the "Report Date" row, else the
 *  first row carrying ≥2 parseable periods. */
function findPeriodRow(
  aoa: Aoa,
  start: number,
  end: number,
): { row: number; cols: PeriodCol[] } | null {
  for (let r = start; r < end; r++) {
    if (norm(aoa[r]?.[0]).startsWith("report date")) {
      const cols = collectPeriods(aoa[r] ?? []);
      if (cols.length) return { row: r, cols };
    }
  }
  for (let r = start; r < end; r++) {
    const cols = collectPeriods(aoa[r] ?? []);
    if (cols.length >= 2) return { row: r, cols };
  }
  return null;
}

/** First row in [start,end) whose column-0 label starts with `label`. */
function findMetric(aoa: Aoa, start: number, end: number, label: string): Cell[] | null {
  const want = norm(label);
  for (let r = start; r < end; r++) {
    if (norm(aoa[r]?.[0]).startsWith(want)) return aoa[r] ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Section parsers
// ---------------------------------------------------------------------------

function parseAnnual(
  aoa: Aoa,
  start: number,
  end: number,
  roceByFy: Record<string, number>,
): { rows: AnnualRow[]; cols: PeriodCol[] } {
  const ph = findPeriodRow(aoa, start, end);
  if (!ph) return { rows: [], cols: [] };
  const sales = findMetric(aoa, ph.row, end, "Sales");
  const op = findMetric(aoa, ph.row, end, "Operating Profit");
  const opm = findMetric(aoa, ph.row, end, "OPM");
  const np = findMetric(aoa, ph.row, end, "Net profit");
  const eps = findMetric(aoa, ph.row, end, "EPS");

  const rows = ph.cols.map(({ idx, period }) => {
    const fy = annualLabel(period);
    const row: AnnualRow = { period: fy };
    const set = (key: keyof AnnualRow, arr: Cell[] | null) => {
      if (!arr) return;
      const v = num(arr[idx]);
      if (v != null) (row as unknown as Record<string, number>)[key] = v;
    };
    set("revenue", sales);
    set("ebitda", op);
    set("ebitdaMarginPct", opm);
    set("pat", np);
    set("epsRs", eps);
    if (roceByFy[fy] != null) row.rocePct = roceByFy[fy];
    return row;
  });
  return { rows, cols: ph.cols };
}

function parseQuarters(aoa: Aoa, start: number, end: number): {
  rows: QuarterRow[];
  cols: PeriodCol[];
} {
  const ph = findPeriodRow(aoa, start, end);
  if (!ph) return { rows: [], cols: [] };
  const sales = findMetric(aoa, ph.row, end, "Sales");
  const op = findMetric(aoa, ph.row, end, "Operating Profit");
  const opm = findMetric(aoa, ph.row, end, "OPM");
  const np = findMetric(aoa, ph.row, end, "Net profit");

  const rows: QuarterRow[] = [];
  for (const { idx, period } of ph.cols) {
    const label = quarterLabel(period);
    if (!label) continue;
    const row: QuarterRow = { period: label };
    const revenue = sales ? num(sales[idx]) : undefined;
    const pat = np ? num(np[idx]) : undefined;
    if (revenue != null) row.revenue = revenue;
    if (op) { const v = num(op[idx]); if (v != null) row.ebitda = v; }
    if (opm) { const v = num(opm[idx]); if (v != null) row.ebitdaMarginPct = v; }
    if (pat != null) row.pat = pat;
    if (pat != null && revenue) row.patMarginPct = round2((pat / revenue) * 100);
    rows.push(row);
  }
  return { rows, cols: ph.cols };
}

/** ROCE by FY from the DERIVED section. Uses the section's own period header if
 *  present, else reuses the annual columns (Screener aligns derived to P&L). */
function parseRoce(
  aoa: Aoa,
  start: number,
  end: number,
  annualCols: PeriodCol[],
): Record<string, number> {
  if (start < 0) return {};
  const ph = findPeriodRow(aoa, start, end);
  const cols = ph?.cols ?? annualCols;
  const from = ph?.row ?? start;
  const roce =
    findMetric(aoa, from, end, "Return on Capital Employed") ??
    findMetric(aoa, from, end, "ROCE");
  if (!roce) return {};
  const out: Record<string, number> = {};
  for (const { idx, period } of cols) {
    const v = num(roce[idx]);
    if (v != null) out[annualLabel(period)] = v;
  }
  return out;
}

/** Best-effort latest-column shareholding (Promoters/FIIs/DIIs/Public). */
function parseShareholding(aoa: Aoa, asOf: string): Shareholding | undefined {
  const find = (label: string): number | undefined => {
    for (let r = 0; r < aoa.length; r++) {
      if (norm(aoa[r]?.[0]).startsWith(label)) {
        const row = aoa[r] ?? [];
        for (let c = row.length - 1; c >= 1; c--) {
          const v = num(row[c]);
          if (v != null) return v;
        }
      }
    }
    return undefined;
  };
  const promoterPct = find("promoter");
  const fiiPct = find("fii");
  const diiPct = find("dii");
  const publicPct = find("public");
  if ([promoterPct, fiiPct, diiPct, publicPct].every((x) => x == null)) return undefined;
  return {
    ...(promoterPct != null ? { promoterPct } : {}),
    ...(fiiPct != null ? { fiiPct } : {}),
    ...(diiPct != null ? { diiPct } : {}),
    ...(publicPct != null ? { publicPct } : {}),
    asOf,
  };
}

/**
 * Parse a Screener "Data Sheet" workbook → screener feed (sans slug). Tolerant:
 * locates sections + metrics by label, never by fixed cell coordinates.
 */
export function parseDataSheet(wb: XLSX.WorkBook): Omit<ScreenerFeed, "slug"> {
  const sheetName =
    wb.SheetNames.find((n) => norm(n) === "data sheet") ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<Cell[]>(ws, {
    header: 1,
    blankrows: true,
    defval: null,
    raw: true,
  });

  const starts = sectionStarts(aoa);
  const plStart = findSection(aoa, "PROFIT & LOSS");
  const qStart = findSection(aoa, "Quarters");
  const dStart = findSection(aoa, "DERIVED:");
  const len = aoa.length;

  const annualEnd = plStart >= 0 ? sectionEnd(plStart, starts, len) : len;
  const annual0 =
    plStart >= 0 ? parseAnnual(aoa, plStart, annualEnd, {}) : { rows: [], cols: [] };
  const roceByFy =
    dStart >= 0 ? parseRoce(aoa, dStart, sectionEnd(dStart, starts, len), annual0.cols) : {};
  // Re-run annual with ROCE now that derived columns are known.
  const annual =
    plStart >= 0 && Object.keys(roceByFy).length
      ? parseAnnual(aoa, plStart, annualEnd, roceByFy)
      : annual0;

  const quarterly =
    qStart >= 0
      ? parseQuarters(aoa, qStart, sectionEnd(qStart, starts, len))
      : { rows: [], cols: [] };

  // Latest period end across annual + quarterly → asOf.
  const allPeriods = [...annual.cols, ...quarterly.cols].map((c) => c.period);
  const latest = allPeriods.reduce<Period | null>(
    (best, p) =>
      best == null || p.year * 100 + p.month > best.year * 100 + best.month ? p : best,
    null,
  );
  const asOf = latest ? periodEndIso(latest) : "";

  // Top-level rocePct = latest annual ROCE.
  const fysWithRoce = annual.rows.filter((r) => r.rocePct != null);
  const rocePct = fysWithRoce.length ? fysWithRoce[fysWithRoce.length - 1].rocePct : undefined;

  const shareholding = parseShareholding(aoa, asOf);

  return {
    annual: annual.rows,
    quarterly: quarterly.rows,
    ...(rocePct != null ? { rocePct } : {}),
    ...(shareholding ? { shareholding } : {}),
    asOf,
  };
}

/** Assemble the full feed (adds slug, fixes key order for stable JSON). */
export function toFeed(slug: string, parsed: Omit<ScreenerFeed, "slug">): ScreenerFeed {
  return {
    slug,
    annual: parsed.annual,
    quarterly: parsed.quarterly,
    ...(parsed.rocePct != null ? { rocePct: parsed.rocePct } : {}),
    ...(parsed.shareholding ? { shareholding: parsed.shareholding } : {}),
    asOf: parsed.asOf,
  };
}

// ---------------------------------------------------------------------------
// IO: read a local workbook (--file) / write a feed
// ---------------------------------------------------------------------------

export function readWorkbookFile(path: string): XLSX.WorkBook {
  return XLSX.read(readFileSync(path), { type: "buffer", cellDates: true });
}

function writeFeed(feed: ScreenerFeed): string {
  mkdirSync(SCREENER_DIR, { recursive: true });
  const path = join(SCREENER_DIR, `${feed.slug}.json`);
  writeFileSync(path, JSON.stringify(feed, null, 2) + "\n", "utf8");
  return path;
}

// ---------------------------------------------------------------------------
// Live fetch (runs only on GitHub's runners — Screener blocks the build IP)
// ---------------------------------------------------------------------------

async function fetchCompanyWorkbook(
  symbol: string,
  sessionid: string,
): Promise<XLSX.WorkBook> {
  const headers = { Cookie: `sessionid=${sessionid}`, "User-Agent": USER_AGENT };
  const get = (path: string) =>
    fetch(`https://www.screener.in${path}`, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  let html: string | null = null;
  for (const path of [`/company/${symbol}/consolidated/`, `/company/${symbol}/`]) {
    const res = await get(path);
    if (res.ok) {
      html = await res.text();
      break;
    }
    if (res.status !== 404) {
      throw new Error(`company page ${res.status} ${res.statusText}`);
    }
  }
  if (html == null) throw new Error("company page not found (404)");

  const m = html.match(/\/user\/company\/export\/\d+\//);
  if (!m) throw new Error("export link not found (auth / session expired?)");

  const res = await get(m[0]);
  if (!res.ok) throw new Error(`export ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return XLSX.read(buf, { type: "buffer", cellDates: true });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const slugArg = flag(args, "slug");
  const fileArg = flag(args, "file");
  const dryRun = args.includes("--dry-run");

  // --file: parse a local workbook (offline testing/tuning).
  if (fileArg) {
    const slug = slugArg ?? basename(fileArg).replace(/\.[^.]+$/, "");
    const feed = toFeed(slug, parseDataSheet(readWorkbookFile(fileArg)));
    if (dryRun || !slugArg) {
      console.log(JSON.stringify(feed, null, 2));
    } else {
      console.log(`[ok] ${slug} → ${writeFeed(feed)}`);
    }
    return;
  }

  const codes = readManualCsv("companies/screener-codes.csv");
  const targets = slugArg ? codes.filter((c) => c.slug === slugArg) : codes;
  if (targets.length === 0) {
    console.error(`no companies matched${slugArg ? ` --slug ${slugArg}` : ""}`);
    process.exit(1);
  }

  const sessionid = process.env.SCREENER_SESSIONID;
  if (!sessionid) {
    // No cookie (local dev / secret not configured) → graceful no-op, exit 0.
    console.log(
      "SCREENER_SESSIONID not set — skipping live fetch (no-op). Set the cookie, or use --file for offline parsing.",
    );
    return;
  }

  let ok = 0;
  let failed = 0;
  let skipped = 0;
  for (const [i, c] of targets.entries()) {
    try {
      const wb = await fetchCompanyWorkbook(c.symbol, sessionid);
      const parsed = parseDataSheet(wb);
      // Keep-last-good: a transient block / empty parse must never wipe data.
      if (parsed.annual.length === 0) {
        skipped++;
        console.warn(`[skip] ${c.slug} (${c.symbol}): zero annual rows — kept existing file`);
        continue;
      }
      const feed = toFeed(c.slug, parsed);
      if (dryRun) {
        console.log(JSON.stringify(feed, null, 2));
      } else {
        writeFeed(feed);
        console.log(
          `[ok] ${c.slug}: ${feed.annual.length} annual, ${feed.quarterly.length} quarters, asOf ${feed.asOf}`,
        );
      }
      ok++;
    } catch (err) {
      failed++;
      console.warn(
        `[skip] ${c.slug} (${c.symbol}): ${(err as Error).message} — kept existing file`,
      );
    }
    if (i < targets.length - 1) await delay(FETCH_DELAY_MS);
  }

  console.log(`Screener: ${ok} ok, ${failed} failed, ${skipped} skipped`);

  // A total wipe-out (0 succeeded) almost always means the cookie expired — make
  // it loud so the scheduled run fails visibly. Partial failures stay exit 0;
  // keep-last-good preserves every company that wasn't refreshed.
  if (ok === 0) {
    console.error(
      "All Screener fetches failed — SCREENER_SESSIONID likely expired; refresh the secret.",
    );
    process.exit(1);
  }
}

// Run only when invoked directly (not when imported by the verify script).
if (basename(process.argv[1] ?? "") === "screener.ts") {
  void main();
}
