import {
  Activity,
  Building2,
  Database,
  Factory,
  Gavel,
  LayoutDashboard,
  LineChart,
  ScrollText,
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
        href: "/tenders",
        label: "Tenders & Auctions",
        icon: Gavel,
        description:
          "Central & state tenders, auction results, winning tariffs, and the live pipeline.",
        hero: true,
      },
      {
        href: "/developers",
        label: "Developers / IPPs",
        icon: Building2,
        description:
          "Independent power producers, portfolios, win-rates, and pipelines.",
      },
    ],
  },
  {
    label: "Power System",
    items: [
      {
        href: "/capacity",
        label: "Capacity & Generation",
        icon: Zap,
        description:
          "Installed capacity by source & state, additions, PLF/CUF, and generation mix.",
      },
      {
        href: "/demand",
        label: "Power Demand",
        icon: Activity,
        description:
          "Peak & energy demand, requirement vs availability, deficits, and load patterns.",
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
