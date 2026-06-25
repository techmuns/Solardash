"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { TopBar } from "./TopBar";
import { FULLBLEED_ROUTES } from "./nav";
import { CommandPalette } from "@/components/search/CommandPalette";
import type { SearchEntry } from "@/data/search";

/**
 * App shell (redesign): a full-height flex column whose page never scrolls.
 * The top bar carries the brand + primary tabs + search/as-of/theme; the
 * content area is the only scroll region. Redesigned, no-scroll routes
 * (Overview, Tenders) own the full content area and pad themselves; every other
 * section renders inside a centred, padded wrapper that scrolls internally.
 */
export function AppShell({
  children,
  searchIndex = [],
  dataAsOf,
  companyCount,
  sectionCount,
}: {
  children: React.ReactNode;
  searchIndex?: SearchEntry[];
  /** Pre-formatted "data as of" date (e.g. `1 Apr 2026`) for the TopBar slot. */
  dataAsOf?: string;
  companyCount?: number;
  sectionCount?: number;
}) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const pathname = usePathname();
  const fullBleed = FULLBLEED_ROUTES.has(pathname);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <TopBar
        onOpenSearch={() => setSearchOpen(true)}
        dataAsOf={dataAsOf}
        companyCount={companyCount}
        sectionCount={sectionCount}
      />

      <main className="min-h-0 flex-1 overflow-y-auto">
        {fullBleed ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6">
            {children}
          </div>
        )}
      </main>

      {/* Global ⌘K command palette (index built server-side, passed in). The
          `key` gives each open a fresh query/highlight without setState-in-effect. */}
      <CommandPalette
        key={searchOpen ? "search-open" : "search-closed"}
        entries={searchIndex}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />
    </div>
  );
}
