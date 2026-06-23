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
