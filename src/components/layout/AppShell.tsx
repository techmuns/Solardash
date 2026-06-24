"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "@/components/search/CommandPalette";
import type { SearchEntry } from "@/data/search";

// Persisted sidebar-collapse preference, modelled as an external store so the
// component reads it without setState-in-effect.
const COLLAPSE_KEY = "sidebar-collapsed";
const collapseListeners = new Set<() => void>();

function subscribeCollapse(callback: () => void) {
  collapseListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    collapseListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getCollapse() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "true";
  } catch {
    return false;
  }
}

function setCollapse(next: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, String(next));
  } catch {
    /* ignore */
  }
  collapseListeners.forEach((l) => l());
}

export function AppShell({
  children,
  footer,
  searchIndex = [],
  dataAsOf,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  searchIndex?: SearchEntry[];
  /** Pre-formatted "data as of" date (e.g. `1 Apr 2026`) for the TopBar slot. */
  dataAsOf?: string;
}) {
  const collapsed = React.useSyncExternalStore(
    subscribeCollapse,
    getCollapse,
    () => false,
  );
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  const toggleCollapsed = React.useCallback(
    () => setCollapse(!getCollapse()),
    [],
  );

  // Close the mobile drawer on Escape and lock body scroll while open.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border transition-[width] duration-200 ease-in-out lg:block",
          collapsed ? "w-sidebar-collapsed" : "w-sidebar",
        )}
      >
        <Sidebar collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[82%] border-r border-sidebar-border shadow-xl transition-transform duration-200 ease-in-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          collapsed={collapsed}
          onToggleSidebar={toggleCollapsed}
          onOpenMobile={() => setMobileOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          dataAsOf={dataAsOf}
        />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        {footer}
      </div>

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
