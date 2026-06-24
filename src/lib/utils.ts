import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNowStrict } from "date-fns";

/**
 * Merge Tailwind class names with conflict resolution.
 * `clsx` handles conditional/array/object inputs; `tailwind-merge` dedupes
 * conflicting utilities (e.g. `px-2 px-4` -> `px-4`).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Format an "as-of" / "last-updated" date, e.g. `23 Jun 2026`. */
export function formatDate(value: DateInput, pattern = "d MMM yyyy"): string {
  return format(toDate(value), pattern);
}

/** Relative "as-of" label, e.g. `3 days ago`. */
export function formatRelative(value: DateInput): string {
  return formatDistanceToNowStrict(toDate(value), { addSuffix: true });
}

const compactNumber = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Compact number for dense KPIs, e.g. `1.2K`, `3.4M` (Indian locale). */
export function formatCompact(value: number): string {
  return compactNumber.format(value);
}

/**
 * Tidy chart-axis tick: thousands get a `k`/`M` suffix so big labels stay
 * narrow (2000 → `2k`, 26537 → `26.5k`), while sub-1000 values keep up to 2
 * decimals (160 → `160`, 2.42 → `2.42`, 0.14 → `0.14`).
 */
export function formatAxisTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${parseFloat((value / 1_000_000).toFixed(1))}M`;
  if (abs >= 1_000) return `${parseFloat((value / 1_000).toFixed(1))}k`;
  return parseFloat(value.toFixed(2)).toString();
}

/** Fixed-decimal number with grouping (Indian locale), e.g. `12,345.6`. */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Signed percentage for deltas, e.g. `+4.2%` / `-1.0%`. */
export function formatDelta(value: number, fractionDigits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

/** Turn a route slug into a readable label, e.g. `tata-power` -> `Tata Power`. */
export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Display labels for storage-friendly unit codes (data keeps ASCII units).
const UNIT_LABELS: Record<string, string> = {
  "Rs/kWh": "₹/kWh",
  "Rs/Wp": "₹/Wp",
  Rs_cr: "₹ cr",
  "Rs_cr/GW": "₹ cr/GW",
  "USD/Wp": "$/Wp",
  "USD/kWh": "$/kWh",
  "USD/kg": "$/kg",
  x: "×",
};

/** Map a unit code to its display form, e.g. `Rs/kWh` -> `₹/kWh`. */
export function formatUnit(unit?: string): string {
  if (!unit) return "";
  return UNIT_LABELS[unit] ?? unit;
}
