/**
 * PV value-chain spot-price ingestion — PVInsights (primary) weekly averages.
 *
 * Fetches the source's server-rendered price page, extracts the weekly-average
 * spot for Polysilicon / Wafer / Cell / Module in the source's NATIVE units
 * (USD/kg, USD/piece, USD/W, USD/W) plus the page's published price date, and
 * overwrites those four rows in manual-data/policy/prices.csv in place (the
 * LCOE row and any other rows are preserved). Mirrors the CEA Action: an
 * offline-verifiable pure parser, keep-last-good (a failed parse never wipes a
 * good row), and date-from-page — never the clock — so re-runs are byte-identical.
 *
 * CLI:
 *   tsx scripts/ingest/prices.ts                      # fetch PVInsights, upsert
 *   tsx scripts/ingest/prices.ts --dry-run            # fetch + parse + print only
 *   tsx scripts/ingest/prices.ts --file page.html     # parse a local file, no fetch
 *   tsx scripts/ingest/prices.ts --source pvinsights  # default; infolink/taiyangnews/trendforce
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import * as cheerio from "cheerio";
import { parseCsv } from "../lib/io";

const ROOT = process.cwd();
const PRICES_CSV = join(ROOT, "manual-data", "policy", "prices.csv");
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/124.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// Stage specs — the four value-chain rows, in the csv's row order, each with
// the source's NATIVE unit and a sanity range used to reject bad scrapes.
// ---------------------------------------------------------------------------
export interface StageSpec {
  /** `item` value in prices.csv — the scraper overwrites this exact row. */
  item: string;
  /** Matches the source page's row label. */
  match: RegExp;
  /** Native unit published by the source (no conversion, no FX). */
  unit: string;
  lo: number;
  hi: number;
}

export const STAGES: StageSpec[] = [
  { item: "Polysilicon", match: /polysilicon/i, unit: "USD/kg", lo: 2, hi: 60 },
  { item: "Wafer", match: /wafer/i, unit: "USD/piece", lo: 0.03, hi: 1.5 },
  { item: "Cell", match: /\bcell\b/i, unit: "USD/W", lo: 0.01, hi: 0.25 },
  { item: "Module", match: /module/i, unit: "USD/W", lo: 0.05, hi: 0.6 },
];

export interface PriceObs {
  item: string;
  value: number;
  unit: string;
}

export interface PricesParse {
  /** The price date the source publishes (ISO yyyy-mm-dd). */
  asOf: string;
  stages: PriceObs[];
}

// ---------------------------------------------------------------------------
// Date — taken from the PAGE (never the clock). ISO or "Mon DD, YYYY".
// ---------------------------------------------------------------------------
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function extractDate(text: string): string | null {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const long = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (long) {
    const mi = MONTHS.indexOf(long[1].slice(0, 3).toLowerCase());
    if (mi >= 0) {
      const mm = String(mi + 1).padStart(2, "0");
      const dd = String(Number(long[2])).padStart(2, "0");
      return `${long[3]}-${mm}-${dd}`;
    }
  }
  return null;
}

function toNumber(raw: string): number | null {
  const n = Number(raw.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// PVInsights parser (pure, offline-testable)
// ---------------------------------------------------------------------------
/**
 * Parse a PVInsights solar-price page: the published price date + the four
 * stage averages in native units. Returns null if the date or any stage is
 * missing (keep-last-good upstream). Label-anchored and column-detected, so it
 * tolerates layout drift; the live DOM is validated on the first Action run.
 */
export function parsePvinsights(html: string): PricesParse | null {
  const $ = cheerio.load(html);
  const asOf = extractDate($.root().text());
  if (!asOf) return null;

  const rows: string[][] = [];
  $("tr").each((_, tr) => {
    const cells = $(tr)
      .find("td,th")
      .map((_, c) => $(c).text().trim())
      .get();
    if (cells.length) rows.push(cells);
  });

  // Prefer the source's "Average" column; fall back to the first in-range cell.
  let avgCol = -1;
  for (const cells of rows) {
    const idx = cells.findIndex((c) => /^(average|avg)\b/i.test(c.trim()));
    if (idx >= 0) {
      avgCol = idx;
      break;
    }
  }

  const stages: PriceObs[] = [];
  for (const spec of STAGES) {
    const row = rows.find((cells) => spec.match.test(cells[0] ?? ""));
    if (!row) continue;
    let value: number | null =
      avgCol >= 0 && row[avgCol] != null ? toNumber(row[avgCol]) : null;
    if (value == null || value < spec.lo || value > spec.hi) {
      value = null;
      for (const c of row.slice(1)) {
        const n = toNumber(c);
        if (n != null && n >= spec.lo && n <= spec.hi) {
          value = n;
          break;
        }
      }
    }
    if (value != null) stages.push({ item: spec.item, value, unit: spec.unit });
  }
  if (stages.length !== STAGES.length) return null;
  return { asOf, stages };
}

// Fallback sources — selectable via --source; stubs until validated live.
type Parser = (html: string) => PricesParse | null;
const PARSERS: Record<string, Parser> = {
  pvinsights: parsePvinsights,
  infolink: () => null,
  taiyangnews: () => null,
  trendforce: () => null,
};

export const SOURCES: Record<string, { name: string; url: string }> = {
  pvinsights: { name: "PVInsights", url: "https://www.pvinsights.com/" },
  infolink: { name: "InfoLink", url: "https://www.infolink-group.com/spot-price/" },
  taiyangnews: { name: "TaiyangNews", url: "https://taiyangnews.info/price-index" },
  trendforce: { name: "TrendForce", url: "https://www.trendforce.com/price/pv" },
};

/** Pure entry point: parse a page for the named source. */
export function parsePrices(html: string, source = "pvinsights"): PricesParse | null {
  return (PARSERS[source] ?? (() => null))(html);
}

// ---------------------------------------------------------------------------
// Fetch (live; offline path uses --file so the parser stays testable)
// ---------------------------------------------------------------------------
async function fetchPrices(source: string, debug = false): Promise<string | null> {
  const url = SOURCES[source]?.url;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const type = res.headers.get("content-type") ?? "?";
    if (!res.ok) {
      console.warn(`[prices] ${url} -> HTTP ${res.status} ${res.statusText} (${type})`);
      return null;
    }
    const body = await res.text();
    if (debug) {
      console.log(`[prices] ${url} -> 200 (${type}; ${body.length} bytes)`);
      // Discovery: structural fingerprint + the first table + price-unit context,
      // so an alternate source's parser can be written against the real DOM.
      const n = (re: RegExp) => (body.match(re) ?? []).length;
      console.log(
        `[prices] structure: <table>=${n(/<table/gi)} <tr>=${n(/<tr/gi)} USD=${n(/USD/g)} "/kg"=${n(/\/\s*kg/gi)} __NEXT_DATA__=${n(/__NEXT_DATA__/g)} __NUXT__=${n(/__NUXT__|window\.__NUXT/g)} /api/=${n(/\/api\//gi)} ld+json=${n(/application\/ld\+json/gi)}`,
      );
      // Endpoint hints for JS-rendered sources (absolute URLs / paths naming an API or price feed).
      const hints = [
        ...new Set(body.match(/https?:\/\/[^"'`\s)]*(api|spot[-_]?price|price[-_]?index|prices)[^"'`\s)]*/gi) ?? []),
        ...new Set(body.match(/["'`](\/[a-z0-9_\-/.]*(api|price)[a-z0-9_\-/.]*)["'`]/gi) ?? []),
      ];
      hints.slice(0, 14).forEach((h) => console.log(`[prices]   hint: ${h}`));
      const tbl = body.search(/<table/i);
      if (tbl >= 0) {
        console.log(`[prices] first <table>:\n${body.slice(tbl, tbl + 3200)}\n[prices] --- /table ---`);
      }
      const unit = /(USD|RMB|CNY)\s*\/?\s*(kg|pc|piece|w|wp|pcs|g)\b/gi;
      let m: RegExpExecArray | null;
      let hits = 0;
      while ((m = unit.exec(body)) !== null && hits < 10) {
        if (m.index < 3000) continue;
        console.log(
          `[prices]   unit@${m.index}: …${body.slice(m.index - 140, m.index + 50).replace(/\s+/g, " ").trim()}…`,
        );
        hits++;
      }
    }
    return body;
  } catch (err) {
    const e = err as { message?: string; cause?: { code?: string; message?: string } };
    const cause = e.cause ? ` (cause: ${e.cause.code ?? ""} ${e.cause.message ?? ""})` : "";
    console.warn(`[prices] ${url} -> fetch threw: ${e.message ?? String(err)}${cause}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sanity + CSV upsert (overwrite the four stage rows; keep every other row)
// ---------------------------------------------------------------------------
function withinBounds(stages: PriceObs[]): boolean {
  return STAGES.every((spec) => {
    const o = stages.find((s) => s.item === spec.item);
    return o != null && o.value >= spec.lo && o.value <= spec.hi;
  });
}

interface PriceRow {
  item: string;
  value: string;
  unit: string;
  confidence: string;
  source: string;
  note: string;
}
const HEADER = "item,value,unit,confidence,source,note";

function upsertCsv(parse: PricesParse, sourceName: string): void {
  const existing: Record<string, string>[] = existsSync(PRICES_CSV)
    ? parseCsv(readFileSync(PRICES_CSV, "utf8"))
    : [];
  const order: string[] = existing.map((r) => r.item);
  const byItem = new Map<string, PriceRow>();
  for (const r of existing) {
    byItem.set(r.item, {
      item: r.item,
      value: r.value,
      unit: r.unit,
      confidence: r.confidence,
      source: r.source,
      note: r.note ?? "",
    });
  }
  // New scrapes overwrite their stage row; untouched rows (e.g. LCOE) survive.
  for (const obs of parse.stages) {
    if (!order.includes(obs.item)) order.push(obs.item);
    byItem.set(obs.item, {
      item: obs.item,
      value: String(obs.value),
      unit: obs.unit,
      confidence: "high",
      source: sourceName,
      note: `${parse.asOf} · spot`,
    });
  }
  const body = order
    .map((item) => {
      const r = byItem.get(item)!;
      return [r.item, r.value, r.unit, r.confidence, r.source, r.note].join(",");
    })
    .join("\n");
  mkdirSync(dirname(PRICES_CSV), { recursive: true });
  writeFileSync(PRICES_CSV, `${HEADER}\n${body}\n`, "utf8");
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
  const dryRun = args.includes("--dry-run");
  const debug = args.includes("--debug");
  const fileArg = flag(args, "file");
  const source = (flag(args, "source") ?? "pvinsights").toLowerCase();
  const meta = SOURCES[source];
  if (!meta) {
    console.error(
      `Unknown --source "${source}". Known: ${Object.keys(SOURCES).join(", ")}.`,
    );
    process.exit(1);
  }

  const html = fileArg ? readFileSync(fileArg, "utf8") : await fetchPrices(source, debug);
  // keep-last-good: any failure writes NOTHING and exits 0 (a quiet weekly run).
  if (!html) {
    console.warn(`[prices] ${meta.name}: fetch failed — kept existing rows.`);
    return;
  }

  const parse = parsePrices(html, source);
  if (!parse) {
    console.warn(
      `[prices] ${meta.name}: no dated 4-stage table found — kept existing rows.`,
    );
    return;
  }
  if (!withinBounds(parse.stages)) {
    console.warn(
      `[prices] ${meta.name}: values out of sanity bounds — kept existing rows.`,
    );
    return;
  }

  console.log(`[prices] ${meta.name} @ ${parse.asOf}`);
  for (const s of parse.stages) console.log(`  ${s.item}: ${s.value} ${s.unit}`);

  if (dryRun) {
    console.log("(dry-run — not written)");
    return;
  }
  upsertCsv(parse, meta.name);
  console.log(
    `[prices] wrote ${parse.stages.length} stage rows to manual-data/policy/prices.csv (other rows preserved).`,
  );
}

// Run only when invoked directly (not when imported by the verify script).
if (basename(process.argv[1] ?? "") === "prices.ts") {
  void main();
}
