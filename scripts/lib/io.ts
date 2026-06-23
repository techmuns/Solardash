import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Cadence, SourceRef, Snapshot } from "../../src/data/types/core";

// npm runs scripts with cwd = package root, so resolve everything from there.
const ROOT = process.cwd();
const MANUAL_DIR = join(ROOT, "manual-data");
const SNAPSHOT_DIR = join(ROOT, "src", "data", "snapshots");

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Reading curated/manual inputs
// ---------------------------------------------------------------------------

/** Minimal, quote-aware CSV line splitter (handles `""` escapes). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Parse CSV text into an array of header-keyed row objects. */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    return row;
  });
}

/** Read `manual-data/<relPath>` as CSV rows. */
export function readManualCsv(relPath: string): Record<string, string>[] {
  return parseCsv(readFileSync(join(MANUAL_DIR, relPath), "utf8"));
}

/** Read `manual-data/<relPath>` as JSON. */
export function readManualJson<T = unknown>(relPath: string): T {
  return JSON.parse(readFileSync(join(MANUAL_DIR, relPath), "utf8")) as T;
}

/** Read `manual-data/<relPath>` as JSON, or return null if the file is absent. */
export function readManualJsonIfExists<T = unknown>(relPath: string): T | null {
  const p = join(MANUAL_DIR, relPath);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as T;
}

// ---------------------------------------------------------------------------
// Fetch helpers (for later phases — public APIs / files)
// ---------------------------------------------------------------------------

export async function fetchText(
  url: string,
  init?: RequestInit,
): Promise<string> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`fetchText ${res.status} ${res.statusText} — ${url}`);
  }
  return res.text();
}

export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`fetchJson ${res.status} ${res.statusText} — ${url}`);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Writing snapshots (deterministic + validated)
// ---------------------------------------------------------------------------

/** Max `asOf` across sources — the data's effective date. */
export function maxAsOf(sources: SourceRef[]): string {
  return sources.reduce(
    (max, s) => (s.asOf > max ? s.asOf : max),
    sources[0]?.asOf ?? "",
  );
}

/** Recursively sort object keys (arrays keep order) for stable serialization. */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortKeysDeep(record[key]);
    }
    return sorted;
  }
  return value;
}

/** What a pipeline supplies; `dataset`, `section`, `updatedAt` are stamped on. */
export interface SnapshotPayload<T> {
  asOf: string;
  cadence: Cadence;
  coverage?: string;
  sources: SourceRef[];
  notes?: string[];
  data: T;
}

/**
 * Stamp, validate, and deterministically write a snapshot to
 * `src/data/snapshots/<section>/<dataset>.json`. Returns the written snapshot.
 */
export function writeSnapshot<T>(
  section: string,
  dataset: string,
  payload: SnapshotPayload<T>,
): Snapshot<T> {
  const id = `${section}/${dataset}`;

  if (!payload.sources || payload.sources.length === 0) {
    throw new Error(`[${id}] sources must be non-empty`);
  }
  for (const s of payload.sources) {
    if (!s.name) throw new Error(`[${id}] a source is missing "name"`);
    if (!ISO_DATE.test(s.asOf)) {
      throw new Error(`[${id}] source "${s.name}" asOf must be ISO YYYY-MM-DD (got "${s.asOf}")`);
    }
  }
  if (!ISO_DATE.test(payload.asOf)) {
    throw new Error(`[${id}] asOf must be ISO YYYY-MM-DD (got "${payload.asOf}")`);
  }

  // updatedAt is derived from the data (max source asOf), never wall-clock,
  // so re-running the build produces no spurious diff.
  const snapshot: Snapshot<T> = {
    dataset,
    section,
    asOf: payload.asOf,
    updatedAt: maxAsOf(payload.sources),
    cadence: payload.cadence,
    ...(payload.coverage ? { coverage: payload.coverage } : {}),
    sources: payload.sources,
    ...(payload.notes && payload.notes.length ? { notes: payload.notes } : {}),
    data: payload.data,
  };

  const json = JSON.stringify(sortKeysDeep(snapshot), null, 2) + "\n";
  const outPath = join(SNAPSHOT_DIR, section, `${dataset}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, json, "utf8");
  return snapshot;
}
