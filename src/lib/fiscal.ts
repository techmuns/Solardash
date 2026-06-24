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
