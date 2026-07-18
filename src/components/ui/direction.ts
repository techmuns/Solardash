import {
  ArrowLeftRight,
  Minus,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { DirectionClass } from "@/data/types/profit-pools";

/**
 * Shared visual meta for the stage-economics value-shift direction — one
 * colour/icon language everywhere a direction read appears (profit-pools
 * benchmark tabs, the industry-map economics strip, the stage detail popup).
 */
export const DIRECTION_CLASS: Record<
  DirectionClass,
  { label: string; color: string; Icon: LucideIcon }
> = {
  expanding: { label: "Expanding", color: "#10B981", Icon: TrendingUp },
  stable: { label: "Stable", color: "#3B82F6", Icon: Minus },
  squeezed: { label: "Squeezed", color: "#EF4444", Icon: TrendingDown },
  mixed: { label: "Mixed", color: "#F59E0B", Icon: ArrowLeftRight },
};
