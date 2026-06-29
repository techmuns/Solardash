import {
  Building2,
  Database,
  Factory,
  Gavel,
  LayoutDashboard,
  LineChart,
  Network,
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
        href: "/power-system",
        label: "Power System",
        icon: Zap,
        description:
          "Installed capacity & mix, commissioning, the solar build-out, and power demand — supply to demand.",
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

export interface PrimaryGroup {
  label: string;
  items: PrimaryTab[];
}

/**
 * The value-chain reframe (Phase 2). The narrative is four pillars —
 * **Industry Map · Companies · Profit Pools · Trends & Insights** — with today's
 * sections re-tiered behind a **Deep Dive** dropdown as the evidence layer.
 * Profit Pools (Phase 3) and Trends & Insights (Phase 4) are reserved but not
 * shown until they have content, so no empty tabs appear.
 */
export const PRIMARY_TABS: PrimaryTab[] = [
  { href: "/", label: "Industry Map" },
  { href: "/companies", label: "Companies" },
];

/** The "Deep Dive" dropdown — the deep evidence behind the map. */
export const DEEP_DIVE: PrimaryGroup = {
  label: "Deep Dive",
  items: [
    { href: "/tenders", label: "Tenders" },
    { href: "/developers", label: "IPPs" },
    { href: "/power-system", label: "Power System" },
    { href: "/manufacturing", label: "Manufacturing" },
    { href: "/policy", label: "Policy" },
    { href: "/summary", label: "Summary" },
  ],
};

/** Routes that own the full content area (no-scroll, self-padded canvas). */
export const FULLBLEED_ROUTES = new Set([
  "/",
  "/summary",
  "/tenders",
  "/developers",
  "/power-system",
  "/manufacturing",
  "/companies",
  "/policy",
]);
