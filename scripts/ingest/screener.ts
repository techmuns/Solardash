/**
 * Screener.in financials ingestion — public-page HTML scraper (no login).
 *
 * Reads each company's public Screener page and parses the on-page financial
 * tables with cheerio. The session cookie is OPTIONAL: if SCREENER_SESSIONID is
 * set it is sent as an anti-blocking aid, otherwise the page is fetched
 * anonymously. Output feeds the companies pipeline as `screener` precedence
 * (manual > screener > registry).
 *
 * CLI:
 *   tsx scripts/ingest/screener.ts                       # all companies in the codes file
 *   tsx scripts/ingest/screener.ts --slug waaree-energies
 *   tsx scripts/ingest/screener.ts --file page.html --slug fixture --dry-run
 *   tsx scripts/ingest/screener.ts --dry-run             # parse + print, don't write
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import * as cheerio from "cheerio";
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
  "Chrome/124.0 Safari/537.36";
const FETCH_DELAY_MS = 2500;
const FETCH_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// Feed shape
// ---------------------------------------------------------------------------

export interface ScreenerFeed {
  slug: string;
  annual: AnnualRow[];
  quarterly: QuarterRow[];
  valuation?: { peX?: number; pbX?: number; cmp?: number };
  rocePct?: number;
  roePct?: number;
  shareholding?: Shareholding;
  /** Derived from the latest reported period (NOT wall-clock). */
  asOf: string;
}

interface Period {
  month: number;
  year: number;
}

// ---------------------------------------------------------------------------
// Number / period helpers
// ---------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const QUARTER: Record<number, string> = { 6: "Q1", 9: "Q2", 12: "Q3", 3: "Q4" };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Parse a numeric cell: strips `, % ₹` and spaces; `—`/`-`/empty → undefined;
 *  handles negatives (leading minus or parentheses). */
export function parseNum(text: string | null | undefined): number | undefined {
  if (text == null) return undefined;
  const s = String(text).trim();
  if (s === "" || s === "-" || s === "—" || s === "–") return undefined;
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  const digits = s.replace(/[^0-9.]/g, "");
  if (digits === "" || digits === ".") return undefined;
  const n = Number(digits);
  if (Number.isNaN(n)) return undefined;
  return round2(negative ? -n : n);
}

/** Extract `Mon YYYY` / `Mon-YYYY` → {month, year}; non-dates (e.g. "TTM") → null. */
function extractPeriod(text: string): Period | null {
  const m = text.trim().match(/([A-Za-z]{3,9})[\s-]+(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return { month, year: Number(m[2]) };
}

const fyOf = (p: Period): number => (p.month <= 3 ? p.year : p.year + 1);
const fyLabel = (p: Period): string => `FY${String(fyOf(p)).slice(2)}`;
const annualLabel = (p: Period): string => fyLabel(p);
function quarterLabel(p: Period): string | null {
  const q = QUARTER[p.month];
  return q ? `${q}${fyLabel(p)}` : null;
}

/** Period header → {label, period}, labelled for the section kind. */
function parsePeriod(
  headerText: string,
  kind: "annual" | "quarter",
): { label: string; period: Period } | null {
  const period = extractPeriod(headerText);
  if (!period) return null;
  const label = kind === "annual" ? annualLabel(period) : quarterLabel(period);
  return label ? { label, period } : null;
}

/** Last day of the period's month, ISO. */
function periodEndIso(p: Period): string {
  const lastDay = new Date(p.year, p.month, 0).getDate();
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

const norm = (s: string): string => s.replace(/\s+/g, " ").trim().toLowerCase();

// ---------------------------------------------------------------------------
// HTML parsing (label-based, defensive)
// ---------------------------------------------------------------------------

/** Parse a `#<sectionId> table.data-table` into rows keyed by FY/quarter. */
function parseFinancials(
  $: cheerio.CheerioAPI,
  sectionId: string,
  kind: "annual" | "quarter",
): { rows: (AnnualRow & QuarterRow)[]; periods: Period[] } {
  const table = $(`#${sectionId} table.data-table`).first();
  if (!table.length) return { rows: [], periods: [] };

  const headTexts = table
    .find("thead")
    .first()
    .find("th")
    .toArray()
    .map((el) => $(el).text());
  const cols: { pos: number; label: string; period: Period }[] = [];
  headTexts.forEach((text, pos) => {
    if (pos === 0) return; // first cell is the row-label header
    const p = parsePeriod(text, kind);
    if (p) cols.push({ pos, label: p.label, period: p.period });
  });
  if (cols.length === 0) return { rows: [], periods: [] };

  const bodyRows = table
    .find("tbody tr")
    .toArray()
    .map((tr) => $(tr).find("td").toArray().map((td) => $(td).text()));
  const findRow = (label: string): string[] | null => {
    for (const cells of bodyRows) {
      if (norm(cells[0] ?? "").startsWith(label)) return cells;
    }
    return null;
  };

  const sales = findRow("sales");
  const op = findRow("operating profit");
  const opm = findRow("opm");
  const np = findRow("net profit");
  const eps = findRow("eps");

  const rows = cols.map(({ pos, label }) => {
    const at = (cells: string[] | null) => (cells ? parseNum(cells[pos]) : undefined);
    const revenue = at(sales);
    const ebitda = at(op);
    const ebitdaMarginPct = at(opm);
    const pat = at(np);
    const row: AnnualRow & QuarterRow = { period: label };
    if (revenue != null) row.revenue = revenue;
    if (ebitda != null) row.ebitda = ebitda;
    if (ebitdaMarginPct != null) row.ebitdaMarginPct = ebitdaMarginPct;
    if (pat != null) row.pat = pat;
    if (kind === "annual") {
      const epsRs = at(eps);
      if (epsRs != null) row.epsRs = epsRs;
    } else if (pat != null && revenue) {
      row.patMarginPct = round2((pat / revenue) * 100);
    }
    return row;
  });
  return { rows, periods: cols.map((c) => c.period) };
}

/** Read the `#top-ratios` name/value list. */
function parseTopRatios($: cheerio.CheerioAPI): {
  cmp?: number;
  peX?: number;
  bookValue?: number;
  rocePct?: number;
  roePct?: number;
} {
  const out: { cmp?: number; peX?: number; bookValue?: number; rocePct?: number; roePct?: number } = {};
  $("#top-ratios li").each((_, li) => {
    const name = norm($(li).find(".name").first().text());
    const valueText = $(li).find(".number").first().text() || $(li).find(".value").first().text();
    const v = parseNum(valueText);
    if (v == null) return;
    if (name === "current price") out.cmp = v;
    else if (name === "stock p/e" || name === "p/e") out.peX = v;
    else if (name === "book value") out.bookValue = v;
    else if (name === "roce") out.rocePct = v;
    else if (name === "roe") out.roePct = v;
  });
  return out;
}

/** Latest-column shareholding from `#shareholding`. */
function parseShareholding($: cheerio.CheerioAPI, asOf: string): Shareholding | undefined {
  const table = $("#shareholding table.data-table").first();
  if (!table.length) return undefined;
  const bodyRows = table
    .find("tbody tr")
    .toArray()
    .map((tr) => $(tr).find("td").toArray().map((td) => $(td).text()));
  const latest = (label: string): number | undefined => {
    for (const cells of bodyRows) {
      if (norm(cells[0] ?? "").startsWith(label)) {
        for (let i = cells.length - 1; i >= 1; i--) {
          const v = parseNum(cells[i]);
          if (v != null) return v;
        }
      }
    }
    return undefined;
  };
  const promoterPct = latest("promoter");
  const fiiPct = latest("fii");
  const diiPct = latest("dii");
  const publicPct = latest("public");
  if ([promoterPct, fiiPct, diiPct, publicPct].every((x) => x == null)) return undefined;
  return {
    ...(promoterPct != null ? { promoterPct } : {}),
    ...(fiiPct != null ? { fiiPct } : {}),
    ...(diiPct != null ? { diiPct } : {}),
    ...(publicPct != null ? { publicPct } : {}),
    ...(asOf ? { asOf } : {}),
  };
}

/** Parse a Screener public company page → feed (sans slug). Tolerant of
 *  missing sections / rows. */
export function parseCompanyHtml(html: string): Omit<ScreenerFeed, "slug"> {
  const $ = cheerio.load(html);
  const annual = parseFinancials($, "profit-loss", "annual");
  const quarterly = parseFinancials($, "quarters", "quarter");
  const ratios = parseTopRatios($);

  const periods = [...annual.periods, ...quarterly.periods];
  const latest = periods.reduce<Period | null>(
    (best, p) =>
      best == null || p.year * 100 + p.month > best.year * 100 + best.month ? p : best,
    null,
  );
  const asOf = latest ? periodEndIso(latest) : "";

  const valuation: { peX?: number; pbX?: number; cmp?: number } = {};
  if (ratios.peX != null) valuation.peX = ratios.peX;
  if (ratios.cmp != null && ratios.bookValue) valuation.pbX = round2(ratios.cmp / ratios.bookValue);
  if (ratios.cmp != null) valuation.cmp = ratios.cmp;

  const shareholding = parseShareholding($, asOf);

  return {
    annual: annual.rows,
    quarterly: quarterly.rows,
    ...(Object.keys(valuation).length ? { valuation } : {}),
    ...(ratios.rocePct != null ? { rocePct: ratios.rocePct } : {}),
    ...(ratios.roePct != null ? { roePct: ratios.roePct } : {}),
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
    ...(parsed.valuation ? { valuation: parsed.valuation } : {}),
    ...(parsed.rocePct != null ? { rocePct: parsed.rocePct } : {}),
    ...(parsed.roePct != null ? { roePct: parsed.roePct } : {}),
    ...(parsed.shareholding ? { shareholding: parsed.shareholding } : {}),
    asOf: parsed.asOf,
  };
}

// ---------------------------------------------------------------------------
// IO: read a local HTML file (--file) / write a feed
// ---------------------------------------------------------------------------

export function readHtmlFile(path: string): string {
  return readFileSync(path, "utf8");
}

function writeFeed(feed: ScreenerFeed): string {
  mkdirSync(SCREENER_DIR, { recursive: true });
  const path = join(SCREENER_DIR, `${feed.slug}.json`);
  writeFileSync(path, JSON.stringify(feed, null, 2) + "\n", "utf8");
  return path;
}

// ---------------------------------------------------------------------------
// Fetch — public page, cookie optional
// ---------------------------------------------------------------------------

async function fetchCompanyHtml(symbol: string, sessionid?: string): Promise<string> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
  if (sessionid) headers.Cookie = `sessionid=${sessionid}`;
  const get = (path: string) =>
    fetch(`https://www.screener.in${path}`, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  for (const path of [`/company/${symbol}/consolidated/`, `/company/${symbol}/`]) {
    const res = await get(path);
    if (res.ok) return res.text();
    if (res.status !== 404) throw new Error(`company page ${res.status} ${res.statusText}`);
  }
  throw new Error("company page not found (404)");
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

  // --file: parse a local HTML page (offline testing/tuning).
  if (fileArg) {
    const slug = slugArg ?? basename(fileArg).replace(/\.[^.]+$/, "");
    const feed = toFeed(slug, parseCompanyHtml(readHtmlFile(fileArg)));
    if (dryRun || !slugArg) console.log(JSON.stringify(feed, null, 2));
    else console.log(`[ok] ${slug} → ${writeFeed(feed)}`);
    return;
  }

  const codes = readManualCsv("companies/screener-codes.csv");
  const targets = slugArg ? codes.filter((c) => c.slug === slugArg) : codes;
  if (targets.length === 0) {
    console.error(`no companies matched${slugArg ? ` --slug ${slugArg}` : ""}`);
    process.exit(1);
  }

  // Cookie is optional — fetch anonymously when unset, use it as an aid if set.
  const sessionid = process.env.SCREENER_SESSIONID || undefined;
  console.log(
    sessionid
      ? "Fetching Screener public pages (with session cookie)."
      : "Fetching Screener public pages anonymously (no cookie).",
  );

  let ok = 0;
  let failed = 0;
  let skipped = 0;
  for (const [i, c] of targets.entries()) {
    try {
      const html = await fetchCompanyHtml(c.symbol, sessionid);
      const parsed = parseCompanyHtml(html);
      // Keep-last-good: a block / empty parse must never wipe good data.
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

  // A total wipe-out (0 succeeded) usually means Screener is blocking the IP.
  // Partial failures stay exit 0 — keep-last-good preserves the rest.
  if (ok === 0) {
    console.error(
      "All Screener fetches failed — likely IP-blocked. Add a free-account " +
        "SCREENER_SESSIONID secret (optional cookie) or use the manual --file fallback.",
    );
    process.exit(1);
  }
}

// Run only when invoked directly (not when imported by the verify script).
if (basename(process.argv[1] ?? "") === "screener.ts") {
  void main();
}
