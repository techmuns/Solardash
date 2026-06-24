"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Clock, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NAV_ITEMS } from "./nav";

function useCurrentTitle() {
  const pathname = usePathname();
  // Longest matching href wins (so /companies/x maps to "Listed Companies").
  let best: { label: string; len: number } | null = null;
  for (const item of NAV_ITEMS) {
    const match =
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(item.href + "/");
    if (match && (!best || item.href.length > best.len)) {
      best = { label: item.label, len: item.href.length };
    }
  }
  return best?.label ?? "Solardash";
}

export interface TopBarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobile: () => void;
  onOpenSearch: () => void;
}

export function TopBar({
  collapsed,
  onToggleSidebar,
  onOpenMobile,
  onOpenSearch,
}: TopBarProps) {
  const title = useCurrentTitle();

  return (
    <header className="sticky top-0 z-30 flex h-topbar shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
      {/* Mobile: open drawer */}
      <button
        type="button"
        onClick={onOpenMobile}
        aria-label="Open navigation"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {/* Desktop: collapse sidebar */}
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:inline-flex"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-5 w-5" aria-hidden />
        ) : (
          <PanelLeftClose className="h-5 w-5" aria-hidden />
        )}
      </button>

      <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

      <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>

      <div className="ml-auto flex items-center gap-2">
        {/* Command-palette trigger (⌘K). */}
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Search…</span>
          <kbd className="hidden items-center rounded border border-border bg-background px-1.5 py-0.5 font-sans text-2xs text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        </button>

        {/* Global "as-of / last-updated" slot — wired to data in a later phase. */}
        <span
          className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground sm:inline-flex"
          title="Data snapshots arrive in a later phase"
        >
          <Clock className="h-3.5 w-3.5" aria-hidden />
          <span>As of</span>
          <span className="font-medium text-foreground/70">—</span>
          <span className="text-muted-foreground/60">· no data yet</span>
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
