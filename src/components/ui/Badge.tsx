import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-muted text-muted-foreground",
        brand:
          "border-transparent bg-brand/15 text-brand-700 dark:text-brand-300",
        outline: "border-border bg-transparent text-foreground",
        positive:
          "border-transparent bg-positive/10 text-positive dark:bg-positive/15",
        negative:
          "border-transparent bg-negative/10 text-negative dark:bg-negative/15",
        neutral: "border-border bg-card text-muted-foreground",
        solid:
          "border-transparent bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

/** Data-confidence level attached to every datapoint in later phases. */
export type ConfidenceLevel = "high" | "medium" | "modelled";

const CONFIDENCE: Record<
  ConfidenceLevel,
  { label: string; dot: string; className: string }
> = {
  high: {
    label: "High",
    dot: "bg-positive",
    className: "border-positive/30 bg-positive/10 text-positive",
  },
  medium: {
    label: "Medium",
    dot: "bg-brand",
    className: "border-brand/40 bg-brand/10 text-brand-700 dark:text-brand-300",
  },
  modelled: {
    label: "Modelled",
    dot: "bg-energy-rtc",
    className:
      "border-dashed border-energy-rtc/50 bg-energy-rtc/10 text-energy-rtc",
  },
};

export interface ConfidenceBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  level: ConfidenceLevel;
  showDot?: boolean;
}

/** The `confidence` variant of Badge — high / medium / modelled. */
export function ConfidenceBadge({
  level,
  showDot = true,
  className,
  ...props
}: ConfidenceBadgeProps) {
  const c = CONFIDENCE[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
        c.className,
        className,
      )}
      title={`Confidence: ${c.label}`}
      {...props}
    >
      {showDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} aria-hidden />
      )}
      {c.label}
    </span>
  );
}
