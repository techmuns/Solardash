import {
  Activity,
  Building2,
  Factory,
  Gavel,
  Handshake,
  LineChart,
  ScrollText,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { WhatsNewCategory } from "@/data/types/whats-new";

/** Per-category label, icon and accent colour for the activity feed + teaser. */
export const CATEGORY_META: Record<
  WhatsNewCategory,
  { label: string; icon: LucideIcon; color: string }
> = {
  tender: { label: "Tender", icon: Gavel, color: "#F59E0B" },
  ppa: { label: "PPA", icon: Handshake, color: "#10B981" },
  company: { label: "Company", icon: LineChart, color: "#2563EB" },
  developer: { label: "IPP", icon: Building2, color: "#8B5CF6" },
  capacity: { label: "Capacity", icon: Zap, color: "#EAB308" },
  manufacturing: { label: "Manufacturing", icon: Factory, color: "#64748B" },
  demand: { label: "Demand", icon: Activity, color: "#EC4899" },
  policy: { label: "Policy", icon: ScrollText, color: "#6366F1" },
};
