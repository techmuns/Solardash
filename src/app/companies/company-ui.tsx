import { Badge } from "@/components/ui/Badge";
import type { CompanyType } from "@/data/types/companies";

export const TYPE_LABELS: Record<CompanyType, string> = {
  manufacturer: "Manufacturer",
  integrated: "Integrated",
  ipp: "IPP",
  epc: "EPC / O&M",
  wind: "Wind",
  utility: "Utility / PSU",
};

export function TypeBadge({ type }: { type: CompanyType }) {
  const variant =
    type === "integrated"
      ? "brand"
      : type === "ipp" || type === "utility"
        ? "neutral"
        : "outline";
  return <Badge variant={variant}>{TYPE_LABELS[type]}</Badge>;
}

export function RatingBadge({ rating }: { rating?: string }) {
  if (!rating) return <span className="text-muted-foreground/50">—</span>;
  const r = rating.toUpperCase();
  const variant = /BUY|ADD|ACCUMULATE/.test(r)
    ? "positive"
    : /SELL|REDUCE/.test(r)
      ? "negative"
      : "neutral";
  return <Badge variant={variant}>{rating}</Badge>;
}

/** Upside % from target vs CMP (1dp), or null if either is missing. */
export function upsidePct(targetPrice?: number, cmp?: number): number | null {
  if (targetPrice == null || cmp == null || cmp === 0) return null;
  return Math.round((targetPrice / cmp - 1) * 1000) / 10;
}
