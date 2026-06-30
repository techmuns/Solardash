"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";
import { PRIMARY_TABS } from "./nav";

export interface TopBarProps {
  onOpenSearch: () => void;
  /** Pre-formatted data-as-of date (e.g. `1 Apr 2026`), from the server layout. */
  dataAsOf?: string;
  /** Real counts for the as-of subline (never "no data yet"). */
  companyCount?: number;
  sectionCount?: number;
}

function isActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(href + "/");
}

const TAB_BASE =
  "whitespace-nowrap rounded-[10px] px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand";
const TAB_ON =
  "bg-[#FEF3E2] font-[650] text-[#B45309] dark:bg-brand/15 dark:text-brand-200";
const TAB_OFF =
  "font-medium text-muted-foreground hover:bg-muted hover:text-foreground";

/**
 * Top-bar shell: brand · flat primary tabs (Industry Map landing + every section
 * in its own flat position) · search + as-of + theme. ~58px, card surface.
 */
export function TopBar({
  onOpenSearch,
  dataAsOf,
  companyCount,
  sectionCount,
}: TopBarProps) {
  const pathname = usePathname();

  return (
    <header className="flex h-[58px] shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-4">
      {/* Brand → Industry Map */}
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand"
        aria-label="Solar Sector Dashboard — Industry Map"
      >
        <BrandMark size="sm" />
        <span className="hidden flex-col leading-none md:flex">
          <span className="text-[13px] font-bold tracking-tight text-foreground">
            Solar Sector Dashboard
          </span>
          <span className="mt-0.5 text-[11px] text-muted-foreground">
            India · by Munshot
          </span>
        </span>
      </Link>

      {/* Primary tabs — flat (horizontally scrollable when crowded) */}
      <nav
        aria-label="Primary"
        className="scrollbar-thin flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1"
      >
        {PRIMARY_TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(TAB_BASE, active ? TAB_ON : TAB_OFF)}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-border bg-background px-2.5 text-sm text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="hidden lg:inline">Search…</span>
          <kbd className="hidden items-center rounded border border-border bg-card px-1.5 py-0.5 font-sans text-2xs text-muted-foreground lg:inline-flex">
            ⌘K
          </kbd>
        </button>

        {/* Data-as-of stamp; subline links to methodology. */}
        <div className="hidden flex-col items-end leading-tight xl:flex">
          <span className="text-[11px] text-muted-foreground">
            Data as of{" "}
            <span className="font-semibold text-foreground/80">
              {dataAsOf ?? "—"}
            </span>
          </span>
          {companyCount != null && sectionCount != null && (
            <Link
              href="/data-sources"
              className="text-[11px] tabular-nums text-muted-foreground transition-colors hover:text-brand"
            >
              {companyCount} companies · {sectionCount} sections
            </Link>
          )}
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}
