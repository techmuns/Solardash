/**
 * Daily valuation ingestion — the price-driven metrics that move every trading
 * day: Current Price, Market Cap, P/E, P/B and EV/EBITDA. These are scraped (or
 * computed) from each company's public Screener.in page and written to
 * manual-data/companies/valuation.csv, which the companies pipeline merges with
 * precedence ABOVE the monthly financials feed. The heavy filings-based
 * financials (revenue, PAT, margins, annual/quarterly) stay on the monthly
 * screener.ts cadence — only these ratios refresh daily.
 *
 * P/E, Market Cap and P/B come straight off Screener's top-ratios. EV/EBITDA is
 * not a Screener top-ratio, so it is computed as (Market Cap + Borrowings) ÷
 * EBITDA(TTM) — Market Cap being the daily-moving input; borrowings & TTM EBITDA
 * come off the same page and only really change quarterly. Net debt is
 * approximated by gross borrowings (Screener doesn't isolate cash cleanly).
 *
 * CLI:
 *   tsx scripts/ingest/valuation.ts                       # all companies, stamp today
 *   tsx scripts/ingest/valuation.ts --slug waaree-energies
 *   tsx scripts/ingest/valuation.ts --file page.html --slug fixture --dry-run
 *   tsx scripts/ingest/valuation.ts --date 2026-07-14 --dry-run   # fixed as-of
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import * as cheerio from "cheerio";
import { parseCsv, readManualCsv } from "../lib/io";
import { parseNum } from "./screener";

const ROOT = process.cwd();
const VALUATION_CSV = join(ROOT, "manual-data", "companies", "valuation.csv");
const CSV_HEADER = "slug,cmp,market_cap_cr,pe_x,pb_x,ev_ebitda_x,as_of";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/124.0 Safari/537.36";
const FETCH_DELAY_MS = 2500;
const FETCH_TIMEOUT_MS = 30000;

const round2 = (n: number) => Math.round(n * 100) / 100;
const norm = (s: string): string => s.replace(/\s+/g, " ").trim().toLowerCase();

export interface ValuationParse {
  cmp?: number;
  marketCapCr?: number;
  peX?: number;
  pbX?: number;
  evEbitdaX?: number;
}

/** Latest (right-most numeric) value of a labelled row in a section's table. */
function latestRowValue(
  $: cheerio.CheerioAPI,
  sectionId: string,
  label: string,
): number | undefined {
  const table = $(`#${sectionId} table.data-table`).first();
  if (!table.length) return undefined;
  for (const tr of table.find("tbody tr").toArray()) {
    const cells = $(tr).find("td").toArray().map((td) => $(td).text());
    if (norm(cells[0] ?? "").startsWith(label)) {
      for (let i = cells.length - 1; i >= 1; i--) {
        const v = parseNum(cells[i]);
        if (v != null) return v;
      }
    }
  }
  return undefined;
}

/** EBITDA(TTM): the P&L "Operating Profit" under the TTM header column, else the
 *  latest annual Operating Profit. */
function ttmOperatingProfit($: cheerio.CheerioAPI): number | undefined {
  const table = $("#profit-loss table.data-table").first();
  if (!table.length) return undefined;
  const heads = table.find("thead th").toArray().map((el) => norm($(el).text()));
  const ttmCol = heads.findIndex((h) => h === "ttm");
  const opRow = table
    .find("tbody tr")
    .toArray()
    .find((tr) => norm($(tr).find("td").first().text()).startsWith("operating profit"));
  if (!opRow) return undefined;
  const cells = $(opRow).find("td").toArray().map((td) => $(td).text());
  if (ttmCol >= 1) {
    const v = parseNum(cells[ttmCol]);
    if (v != null) return v;
  }
  // Fallback: right-most numeric (latest annual).
  for (let i = cells.length - 1; i >= 1; i--) {
    const v = parseNum(cells[i]);
    if (v != null) return v;
  }
  return undefined;
}

/** Parse the price-driven valuation from a Screener public page. Tolerant of
 *  missing sections — any field it can't resolve is simply left undefined. */
export function parseValuation(html: string): ValuationParse {
  const $ = cheerio.load(html);
  let cmp: number | undefined;
  let marketCapCr: number | undefined;
  let peX: number | undefined;
  let bookValue: number | undefined;
  $("#top-ratios li").each((_, li) => {
    const name = norm($(li).find(".name").first().text());
    const v = parseNum(
      $(li).find(".number").first().text() || $(li).find(".value").first().text(),
    );
    if (v == null) return;
    if (name === "current price") cmp = v;
    else if (name === "stock p/e" || name === "p/e") peX = v;
    else if (name === "book value") bookValue = v;
    else if (name === "market cap") marketCapCr = v; // Screener quotes ₹ Cr
  });

  const pbX = cmp != null && bookValue ? round2(cmp / bookValue) : undefined;

  // EV/EBITDA = (Market Cap + gross borrowings) ÷ EBITDA(TTM).
  const borrowings = latestRowValue($, "balance-sheet", "borrowings");
  const ebitdaTtm = ttmOperatingProfit($);
  const evEbitdaX =
    marketCapCr != null && ebitdaTtm && ebitdaTtm > 0
      ? round2((marketCapCr + (borrowings ?? 0)) / ebitdaTtm)
      : undefined;

  return {
    ...(cmp != null ? { cmp } : {}),
    ...(marketCapCr != null ? { marketCapCr } : {}),
    ...(peX != null ? { peX } : {}),
    ...(pbX != null ? { pbX } : {}),
    ...(evEbitdaX != null ? { evEbitdaX } : {}),
  };
}

// ---------------------------------------------------------------------------
// CSV upsert (keep-last-good per row)
// ---------------------------------------------------------------------------

export interface ValuationRow extends ValuationParse {
  slug: string;
  asOf: string;
}

const cell = (v: number | undefined) => (v == null ? "" : String(v));

/** Serialise rows to CSV in the fixed column order, slug-sorted (deterministic). */
export function toCsv(rows: ValuationRow[]): string {
  const sorted = [...rows].sort((a, b) => a.slug.localeCompare(b.slug));
  const lines = sorted.map((r) =>
    [r.slug, cell(r.cmp), cell(r.marketCapCr), cell(r.peX), cell(r.pbX), cell(r.evEbitdaX), r.asOf].join(","),
  );
  return `${CSV_HEADER}\n${lines.join("\n")}\n`;
}

/** Parse valuation.csv back into rows. */
export function fromCsv(csv: string): ValuationRow[] {
  return parseCsv(csv).map((r) => ({
    slug: r.slug,
    ...(parseNum(r.cmp) != null ? { cmp: parseNum(r.cmp) } : {}),
    ...(parseNum(r.market_cap_cr) != null ? { marketCapCr: parseNum(r.market_cap_cr) } : {}),
    ...(parseNum(r.pe_x) != null ? { peX: parseNum(r.pe_x) } : {}),
    ...(parseNum(r.pb_x) != null ? { pbX: parseNum(r.pb_x) } : {}),
    ...(parseNum(r.ev_ebitda_x) != null ? { evEbitdaX: parseNum(r.ev_ebitda_x) } : {}),
    asOf: r.as_of ?? "",
  }));
}

/**
 * Merge freshly-scraped rows over the existing CSV: a fresh row REPLACES the
 * old one for that slug; a slug we failed to scrape keeps its previous row
 * verbatim (keep-last-good). Returns the new CSV + how many rows advanced.
 */
export function upsertCsv(
  existingCsv: string,
  fresh: ValuationRow[],
): { csv: string; updated: number } {
  const bySlug = new Map<string, ValuationRow>();
  for (const r of fromCsv(existingCsv)) bySlug.set(r.slug, r);
  let updated = 0;
  for (const r of fresh) {
    bySlug.set(r.slug, r);
    updated++;
  }
  return { csv: toCsv([...bySlug.values()]), updated };
}

// ---------------------------------------------------------------------------
// Fetch — public page, cookie optional (same contract as screener.ts)
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
const hasAny = (v: ValuationParse) => Object.keys(v).length > 0;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

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
  const dateArg = flag(args, "date");
  const dryRun = args.includes("--dry-run");
  const asOf = dateArg ?? isoDate(new Date());

  // --file: parse a local HTML page (offline testing / tuning).
  if (fileArg) {
    const slug = slugArg ?? basename(fileArg).replace(/\.[^.]+$/, "");
    const row: ValuationRow = { slug, ...parseValuation(readFileSync(fileArg, "utf8")), asOf };
    console.log(JSON.stringify(row, null, 2));
    return;
  }

  const codes = readManualCsv("companies/screener-codes.csv");
  const targets = slugArg ? codes.filter((c) => c.slug === slugArg) : codes;
  if (targets.length === 0) {
    console.error(`no companies matched${slugArg ? ` --slug ${slugArg}` : ""}`);
    process.exit(1);
  }

  const sessionid = process.env.SCREENER_SESSIONID || undefined;
  console.log(
    `Valuation refresh (${asOf}) — Screener public pages ${sessionid ? "with" : "without"} session cookie.`,
  );

  const fresh: ValuationRow[] = [];
  let ok = 0;
  let failed = 0;
  for (const [i, c] of targets.entries()) {
    try {
      const parsed = parseValuation(await fetchCompanyHtml(c.symbol, sessionid));
      if (!hasAny(parsed)) {
        failed++;
        console.warn(`[skip] ${c.slug} (${c.symbol}): no ratios parsed — kept existing row`);
      } else {
        fresh.push({ slug: c.slug, ...parsed, asOf });
        ok++;
        console.log(
          `[ok] ${c.slug}: P/E ${parsed.peX ?? "—"} · MCap ${parsed.marketCapCr ?? "—"} · P/B ${parsed.pbX ?? "—"} · EV/EBITDA ${parsed.evEbitdaX ?? "—"}`,
        );
      }
    } catch (err) {
      failed++;
      console.warn(`[skip] ${c.slug} (${c.symbol}): ${(err as Error).message} — kept existing row`);
    }
    if (i < targets.length - 1) await delay(FETCH_DELAY_MS);
  }

  const existing = existsSync(VALUATION_CSV) ? readFileSync(VALUATION_CSV, "utf8") : `${CSV_HEADER}\n`;
  const { csv, updated } = upsertCsv(existing, fresh);
  console.log(`Valuation: ${ok} ok, ${failed} failed → ${updated} row(s) refreshed`);

  if (dryRun) {
    console.log("(dry-run, not written)");
    return;
  }
  if (ok === 0) {
    console.error(
      "All valuation fetches failed — likely IP-blocked. Add a free-account " +
        "SCREENER_SESSIONID secret, or run with --file for the offline fallback.",
    );
    process.exit(1);
  }
  mkdirSync(dirname(VALUATION_CSV), { recursive: true });
  writeFileSync(VALUATION_CSV, csv, "utf8");
  console.log(`Wrote ${VALUATION_CSV}`);
}

// Run only when invoked directly (not when imported by the verify script).
if (basename(process.argv[1] ?? "") === "valuation.ts") {
  void main();
}
