import {
  Building2,
  Coins,
  Database,
  Factory,
  Gavel,
  LayoutDashboard,
  LineChart,
  Network,
  ScrollText,
  Sparkles,
  Telescope,
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
    label: "Industry Map",
    items: [
      {
        href: "/",
        label: "Industry Map",
        icon: Network,
        description:
          "The solar value chain — polysilicon to offtake to grid — with the trend where we track it and a drill-down into the evidence.",
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
    label: "Profit Pools",
    items: [
      {
        href: "/profit-pools",
        label: "Profit Pools",
        icon: Coins,
        description:
          "Where value is shifting across the chain — stage profitability over time and the value-migration scorecard, from listed filings.",
      },
    ],
  },
  {
    label: "Trends & Insights",
    items: [
      {
        href: "/trends",
        label: "Trends & Insights",
        icon: Telescope,
        description:
          "The buy-side synthesis — structural trends, anomalies, and what most people miss, plus the power demand & peak trend; each insight evidenced and flagged Munshot analysis.",
      },
    ],
  },
  {
    // Today's sections, re-tiered as the Deep-Dive evidence layer behind the map.
    label: "Deep Dive",
    items: [
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
      {
        href: "/manufacturing",
        label: "Manufacturing",
        icon: Factory,
        description:
          "Module / cell / wafer capacity, ALMM & DCR, PLI awards, and trade flows.",
      },
      {
        href: "/policy",
        label: "Policy & Pricing",
        icon: ScrollText,
        description:
          "Schemes, regulations, ALMM/DCR, and module & cell price trends.",
      },
      {
        href: "/summary",
        label: "Summary",
        icon: LayoutDashboard,
        description:
          "The tenders-led, single-screen cross-sector synthesis — pipeline, capacity, demand, tariffs, the mix, and top developers.",
      },
    ],
  },
  {
    label: "Reference",
    items: [
      {
        href: "/whats-new",
        label: "What's New",
        icon: Sparkles,
        description:
          "Recent activity — auction awards, PPA signings, results, and records.",
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

export interface PrimaryTab {
  href: string;
  label: string;
}

/**
 * Flat primary tabs. The Industry Map is the consolidated, scrollable landing
 * (value chain + companies / profit-pool / trends summaries, each clickable to
 * its detail tab); every section sits as its own flat tab (the "Deep Dive"
 * dropdown is gone — sections are back in their original flat positions).
 */
export const PRIMARY_TABS: PrimaryTab[] = [
  { href: "/", label: "Industry Map" },
  { href: "/tenders", label: "Tenders" },
  { href: "/developers", label: "IPPs" },
  { href: "/manufacturing", label: "Manufacturing" },
  { href: "/companies", label: "Companies" },
  { href: "/policy", label: "Policy" },
  { href: "/profit-pools", label: "Profit Pools" },
  { href: "/trends", label: "Trends" },
];

/**
 * Routes that own the full content WIDTH (self-padded). The Industry Map landing
 * is full-width but scrolls vertically; the section canvases are no-scroll.
 */
export const FULLBLEED_ROUTES = new Set([
  "/",
  "/summary",
  "/tenders",
  "/developers",
  "/manufacturing",
  "/companies",
  "/profit-pools",
  "/trends",
  "/policy",
]);
