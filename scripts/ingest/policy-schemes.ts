/**
 * Policy-scheme ingestion — MNRE "What's New" documents scraper (no login).
 *
 * Fetches MNRE's live documents/notifications feed, keeps only genuine new
 * SOLAR / RE **schemes** (filters out amendments, SOPs, circulars, fees…),
 * infers a category + announcement date, dedupes against the curated
 * manual-data/policy/schemes.csv, and appends any new ones — hand-curated rows
 * are never touched. Mirrors the CEA / Screener Actions: a pure, offline-
 * verifiable parser + keep-last-good + append-on-change.
 *
 * CLI:
 *   tsx scripts/ingest/policy-schemes.ts                 # fetch MNRE, append new
 *   tsx scripts/ingest/policy-schemes.ts --dry-run       # fetch + print, don't write
 *   tsx scripts/ingest/policy-schemes.ts --file page.html --dry-run   # parse a local file
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import * as cheerio from "cheerio";
import { parseCsv } from "../lib/io";

const ROOT = process.cwd();
const SCHEMES_CSV = join(ROOT, "manual-data", "policy", "schemes.csv");
const MNRE_URL = "https://mnre.gov.in/en/whats-new/";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/124.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 30000;
const MAX_NEW_PER_RUN = 8; // don't flood the tracker in one pass

export interface SchemeCandidate {
  scheme: string;
  category: string;
  announced: string; // "Mon YYYY" or ""
  sourceUrl: string;
  highlights: string;
}

// A title must carry a scheme signal AND a renewable-energy context…
const SIGNAL =
  /\b(scheme|yojana|mission|viability gap funding|\bvgf\b|production[- ]linked|\bpli\b|policy for|approved list of models|\balmm\b|\brlmm\b|basic customs duty|\bbcd\b|waiver of|incentive|guidelines for)\b/i;
const RE_CONTEXT =
  /\b(solar|renewable|\bre\b|wind|hydrogen|storage|\bbess\b|battery|kusum|rooftop|surya|photovoltaic|\bpv\b|module|cell|wafer|ingot|electrolyser|offshore|repowering|green energy)\b/i;
// …and must NOT be routine housekeeping (amendments, SOPs, fees, notices…).
const NOISE =
  /\b(amendment|corrigendum|standard operating procedure|\bsop\b|application fee|circular|notice dated|minutes|salahkar|skilling|prototype|extension of (the )?last date|clarification|\bfaq\b|expression of interest|\beoi\b|empanel|vacancy|recruit|office memorandum|advertisement|tender document)\b/i;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Category from title keywords (matches the curated feed's vocabulary). */
export function inferCategory(title: string): string {
  const t = title.toLowerCase();
  if (/\b(vgf|bess|battery|storage|pumped)\b/.test(t)) return "Storage";
  if (/\b(customs|duty|\bbcd\b|import|export|trade)\b/.test(t)) return "Trade";
  if (/\b(rooftop|surya)\b/.test(t)) return "Rooftop";
  if (/\b(kusum|pump|agri)\b/.test(t)) return "Agri";
  if (/\b(almm|rlmm|pli|manufactur|module|cell|wafer|ingot|electrolyser|hydrogen)\b/.test(t))
    return "Manufacturing";
  return "Demand";
}

/** Extract an announcement date from the title or slug → "Mon YYYY" (or ""). */
export function extractAnnounced(title: string, url: string): string {
  const hay = `${title} ${url}`;
  const dmy = hay.match(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\b/);
  if (dmy) {
    const mo = Number(dmy[2]);
    if (mo >= 1 && mo <= 12) return `${MONTHS[mo - 1]} ${dmy[3]}`;
  }
  const monYear = hay.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s.\-]+(\d{4})\b/i,
  );
  if (monYear) {
    const idx = MONTHS.findIndex((m) => m.toLowerCase() === monYear[1].slice(0, 3).toLowerCase());
    if (idx >= 0) return `${MONTHS[idx]} ${monYear[2]}`;
  }
  const year = hay.match(/\b(20\d{2})\b/g);
  if (year) return year[year.length - 1]; // year-only fallback (still sortable)
  return "";
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const normKey = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(the|of|for|and|in|to|a)\b/g, " ").replace(/\s+/g, " ").trim();

/** Parse MNRE's What's-New HTML → filtered, de-noised scheme candidates. */
export function parseSchemeCandidates(html: string): SchemeCandidate[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const out: SchemeCandidate[] = [];
  $('a[href*="/document/"]').each((_, a) => {
    const url = ($(a).attr("href") ?? "").trim();
    const title = clean($(a).text());
    if (!url || title.length < 20) return;
    if (!SIGNAL.test(title) || !RE_CONTEXT.test(title) || NOISE.test(title)) return;
    const key = normKey(title);
    if (seen.has(key) || seen.has(url)) return;
    seen.add(key);
    seen.add(url);
    out.push({
      scheme: title.length > 90 ? `${title.slice(0, 88)}…` : title,
      category: inferCategory(title),
      announced: extractAnnounced(title, url),
      sourceUrl: url,
      highlights: title,
    });
  });
  return out; // listing is reverse-chronological → newest first
}

const CSV_HEADER =
  "scheme,category,target,status,allocation_cr,key_metric,announced,source_url,highlights,confidence,source,note";
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * Append new candidates to the schemes CSV, skipping any already present (by
 * URL or a normalised name). Returns the new CSV text + how many were added.
 * Curated rows are preserved verbatim.
 */
export function mergeSchemes(
  existingCsv: string,
  candidates: SchemeCandidate[],
): { csv: string; added: SchemeCandidate[] } {
  const rows = parseCsv(existingCsv);
  const knownUrls = new Set(rows.map((r) => (r.source_url ?? "").trim()).filter(Boolean));
  const knownNames = new Set(rows.map((r) => normKey(r.scheme ?? "")));
  const added: SchemeCandidate[] = [];
  for (const c of candidates) {
    if (added.length >= MAX_NEW_PER_RUN) break;
    if (knownUrls.has(c.sourceUrl) || knownNames.has(normKey(c.scheme))) continue;
    knownUrls.add(c.sourceUrl);
    knownNames.add(normKey(c.scheme));
    added.push(c);
  }
  if (added.length === 0) return { csv: existingCsv, added };

  // Preserve every existing line verbatim; append the new rows.
  const lines = existingCsv.replace(/\r\n/g, "\n").replace(/\n+$/, "").split("\n");
  for (const c of added) {
    lines.push(
      [
        c.scheme, c.category, "", "Active", "", "",
        c.announced, c.sourceUrl, c.highlights, "medium", "MNRE", "auto-ingested",
      ].map(csvCell).join(","),
    );
  }
  return { csv: lines.join("\n") + "\n", added };
}

// ---------------------------------------------------------------------------
// Fetch + CLI
// ---------------------------------------------------------------------------

async function fetchMnre(): Promise<string> {
  const res = await fetch(MNRE_URL, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`MNRE ${res.status} ${res.statusText}`);
  return res.text();
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileArg = flag(args, "file");
  const dryRun = args.includes("--dry-run");

  let html: string;
  try {
    html = fileArg ? readFileSync(fileArg, "utf8") : await fetchMnre();
  } catch (err) {
    console.error(`[policy] fetch failed: ${(err as Error).message} — kept existing schemes`);
    process.exit(1);
  }

  const candidates = parseSchemeCandidates(html);
  console.log(`[policy] ${candidates.length} scheme candidate(s) after filtering.`);

  const existing = existsSync(SCHEMES_CSV) ? readFileSync(SCHEMES_CSV, "utf8") : `${CSV_HEADER}\n`;
  const { csv, added } = mergeSchemes(existing, candidates);

  for (const a of added) console.log(`  + ${a.announced || "?"} · ${a.category} · ${a.scheme}`);

  if (dryRun) {
    console.log(`[policy] ${added.length} new (dry-run, not written).`);
    return;
  }
  if (added.length > 0) {
    mkdirSync(dirname(SCHEMES_CSV), { recursive: true });
    writeFileSync(SCHEMES_CSV, csv, "utf8");
    console.log(`[policy] appended ${added.length} new scheme(s) to schemes.csv.`);
  } else {
    console.log("[policy] no new schemes.");
  }
}

// Run only when invoked directly (not when imported by the verify script).
if (basename(process.argv[1] ?? "") === "policy-schemes.ts") {
  void main();
}
