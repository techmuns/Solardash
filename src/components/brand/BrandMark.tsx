import { Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type BrandSize = "sm" | "md" | "lg";

const SIZES: Record<BrandSize, { box: string; icon: string; radius: string }> = {
  sm: { box: "h-8 w-8", icon: "h-5 w-5", radius: "rounded-lg" },
  md: { box: "h-10 w-10", icon: "h-6 w-6", radius: "rounded-xl" },
  lg: { box: "h-12 w-12", icon: "h-7 w-7", radius: "rounded-xl" },
};

/**
 * Munshot brand mark — a rounded amber→orange gradient square with a white Sun
 * glyph. The single source of truth for the product logo badge.
 */
export function BrandMark({
  size = "md",
  className,
}: {
  size?: BrandSize;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br from-[#FBBF24] via-[#F59E0B] to-[#F97316] text-white shadow-sm",
        s.box,
        s.radius,
        className,
      )}
      aria-hidden
    >
      <Sun className={s.icon} />
    </span>
  );
}

/**
 * Brand mark + "Solar Sector Dashboard" wordmark + a muted "by Munshot" line.
 * For light surfaces (uses semantic foreground tokens).
 */
export function BrandLockup({
  size = "md",
  subtitle = "by Munshot",
  className,
}: {
  size?: BrandSize;
  subtitle?: string | null;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-semibold tracking-tight text-foreground">
          Solar Sector Dashboard
        </span>
        {subtitle && (
          <span className="truncate text-xs font-medium text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
