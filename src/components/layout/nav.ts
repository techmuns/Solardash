import {
  Building2,
  Database,
  Factory,
  Gavel,
  LayoutDashboard,
  LineChart,
  ScrollText,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Short description used on the Overview module directory. */
  description?: string;
  /** Hero item — visually emphasised in the sidebar (Tenders). */
  hero?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Market",
    items: [
      {
        href: "/",
        label: "Overview",
        icon: LayoutDashboard,
        description: "Cross-sector snapshot and entry point.",
      },
      {
        href: "/whats-new",
        label: "What's New",
        icon: Sparkles,
        description:
          "Recent activity — auction awards, PPA signings, results, and records.",
      },
      {
        href: "/tenders",
        label: "Tenders & Auctions",
        icon: Gavel,
        description:
          "Central & state tenders, auction results, winning tariffs, and the live pipeline.",
        hero: true,
      },
      {
        href: "/developers",
        label: "IPPs",
        icon: Building2,
        description:
          "Independent power producers — portfolios, capacity funnel, PPAs, and the technology mix.",
      },
    ],
  },
  {
    label: "Power System",
    items: [
      {
        href: "/power-system",
        label: "Power System",
        icon: Zap,
        description:
          "Installed capacity & mix, commissioning, the solar build-out, and power demand — supply to demand.",
      },
    ],
  },
  {
    label: "Supply Chain",
    items: [
      {
        href: "/manufacturing",
        label: "Manufacturing",
        icon: Factory,
        description:
          "Module / cell / wafer capacity, ALMM & DCR, PLI awards, and trade flows.",
      },
    ],
  },
  {
    label: "Companies",
    items: [
      {
        href: "/companies",
        label: "Listed Companies",
        icon: LineChart,
        description:
          "Financial screener and per-stock pages for listed solar & renewable plays.",
      },
    ],
  },
  {
    label: "Reference",
    items: [
      {
        href: "/policy",
        label: "Policy & Pricing",
        icon: ScrollText,
        description:
          "Schemes, regulations, ALMM/DCR, and module & cell price trends.",
      },
      {
        href: "/data-sources",
        label: "Data & Methodology",
        icon: Database,
        description:
          "Sources, definitions, update cadence, and confidence methodology.",
      },
    ],
  },
];

/** Flattened list of all nav items (handy for breadcrumbs / lookups). */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/**
 * Primary horizontal tabs for the top-bar shell. Order is the client's:
 * Overview · Tenders · Developers · Power System · Manufacturing · Companies ·
 * Policy. (What's New folds into Overview; Capacity + Demand merged into Power
 * System; Data & Methodology stays reachable via ⌘K + the as-of stamp.)
 */
export interface PrimaryTab {
  href: string;
  label: string;
}

export const PRIMARY_TABS: PrimaryTab[] = [
  { href: "/", label: "Overview" },
  { href: "/tenders", label: "Tenders" },
  { href: "/developers", label: "IPPs" },
  { href: "/power-system", label: "Power System" },
  { href: "/manufacturing", label: "Manufacturing" },
  { href: "/companies", label: "Companies" },
  { href: "/policy", label: "Policy" },
];

/** Routes that own the full content area (no-scroll, self-padded canvas). */
export const FULLBLEED_ROUTES = new Set([
  "/",
  "/tenders",
  "/developers",
  "/power-system",
  "/manufacturing",
  "/companies",
  "/policy",
]);
