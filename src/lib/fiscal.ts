/**
 * Indian fiscal-year helpers. The FY runs Apr–Mar and is labelled by the
 * calendar year in which it ends (Apr 2025 – Mar 2026 = FY26). Quarters:
 * Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar.
 */

/** Map an ISO date (or Date) to its FY-quarter label, e.g. `2026-02-20` → `Q4FY26`. */
export function fyQuarter(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const month = d.getUTCMonth() + 1; // 1–12 (UTC keeps it timezone-stable)
  const year = d.getUTCFullYear();
  const fy = month <= 3 ? year : year + 1;
  const q = month <= 3 ? 4 : month <= 6 ? 1 : month <= 9 ? 2 : 3;
  return `Q${q}FY${String(fy).slice(-2)}`;
}

/** Render a period label with a space, e.g. `Q4FY26` → `Q4 FY26`. */
export function formatFyQuarter(period: string): string {
  return period.replace(/FY/, " FY");
}

/**
 * Map an FY-quarter label to a monotonic integer for ordering / differencing:
 * `Q4FY26` → 26·4 + 4 = 108. Tolerant of a bare `FY27` (treated as its Q4) and
 * of the spaced form `Q4 FY26`. Returns `NaN` for anything unparseable.
 */
export function fyQuarterIndex(period: string): number {
  const m = /Q([1-4])\s*FY(\d{2})/.exec(period);
  if (m) return Number(m[2]) * 4 + Number(m[1]);
  const fyOnly = /FY(\d{2})/.exec(period); // bare "FY27" → year-end (Q4)
  if (fyOnly) return Number(fyOnly[1]) * 4 + 4;
  return NaN;
}

/**
 * Quarters between two FY-quarter labels: `to − from`. Positive means `to` is
 * later than `from` (i.e. a commissioning target that has slipped out).
 */
export function quarterDiff(from: string, to: string): number {
  return fyQuarterIndex(to) - fyQuarterIndex(from);
}

/** Inverse of `fyQuarterIndex`: `108` → `Q4FY26`. */
export function fyQuarterLabel(index: number): string {
  const fy = Math.floor((index - 1) / 4);
  const q = index - fy * 4;
  return `Q${q}FY${String(fy).padStart(2, "0")}`;
}

/** Add `n` quarters to an FY-quarter label (n may be negative). `Q3FY26` +2 → `Q1FY27`. */
export function addQuarters(period: string, n: number): string {
  return fyQuarterLabel(fyQuarterIndex(period) + n);
}

/** Inclusive list of FY-quarter labels from `start` to `end`, e.g. `["Q4FY26","Q1FY27",…]`. */
export function fyQuartersBetween(start: string, end: string): string[] {
  const a = fyQuarterIndex(start);
  const b = fyQuarterIndex(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return [];
  const out: string[] = [];
  for (let i = a; i <= b; i++) {
    const fy = Math.floor((i - 1) / 4);
    const q = i - fy * 4;
    out.push(`Q${q}FY${String(fy).padStart(2, "0")}`);
  }
  return out;
}

/** Fiscal-year label for an FY-quarter, e.g. `Q1FY27` → `FY27`. */
export function fyOf(period: string): string {
  const m = /FY(\d{2})/.exec(period);
  return m ? `FY${m[1]}` : period;
}
