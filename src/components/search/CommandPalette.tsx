"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Compass,
  CornerDownLeft,
  Gavel,
  LineChart,
  Search,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchEntry, SearchEntryType } from "@/data/search";

const TYPE_META: Record<SearchEntryType, { label: string; icon: LucideIcon }> = {
  section: { label: "Sections", icon: Compass },
  company: { label: "Companies", icon: LineChart },
  developer: { label: "Developers", icon: Building2 },
  tender: { label: "Tenders", icon: Gavel },
};

// Group order + score tiebreak order.
const TYPE_ORDER: SearchEntryType[] = ["section", "company", "developer", "tender"];

const MAX_RESULTS = 20;

// Score ladder: exact label > label prefix > label substring > keyword > sublabel.
const SCORE = { exact: 100, prefix: 60, includes: 40, keyword: 20, sublabel: 10 };

/** Score one entry against the (lowercased) query tokens. 0 ⇒ drop. */
function scoreEntry(entry: SearchEntry, tokens: string[]): number {
  const label = entry.label.toLowerCase();
  const sub = entry.sublabel?.toLowerCase() ?? "";
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    if (label === t) best = SCORE.exact;
    else if (label.startsWith(t)) best = SCORE.prefix;
    else if (label.includes(t)) best = SCORE.includes;
    else if (entry.keywords.some((k) => k.includes(t))) best = SCORE.keyword;
    else if (sub.includes(t)) best = SCORE.sublabel;
    else return 0; // every token must match somewhere (AND semantics)
    total += best;
  }
  return total;
}

export interface CommandPaletteProps {
  entries: SearchEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ entries, open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);

  // Global ⌘K / Ctrl+K toggles the palette from anywhere.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // On open: remember focus, focus the input, lock body scroll.
  // On close (cleanup): restore the previously-focused element + scroll.
  // (Fresh query/highlight per open comes from a `key` remount in AppShell, so
  // no setState is needed here.)
  React.useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  // Filtered + scored results (empty query ⇒ Sections group as quick-nav).
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries.filter((e) => e.type === "section");
    const tokens = q.split(/\s+/).filter(Boolean);
    const scored: { e: SearchEntry; s: number }[] = [];
    for (const e of entries) {
      const s = scoreEntry(e, tokens);
      if (s > 0) scored.push({ e, s });
    }
    scored.sort(
      (a, b) =>
        b.s - a.s ||
        TYPE_ORDER.indexOf(a.e.type) - TYPE_ORDER.indexOf(b.e.type) ||
        a.e.label.localeCompare(b.e.label),
    );
    return scored.slice(0, MAX_RESULTS).map((x) => x.e);
  }, [entries, query]);

  // Group in fixed order for display; flatten in the same order for keyboard nav.
  const groups = React.useMemo(
    () =>
      TYPE_ORDER.map((type) => ({
        type,
        items: results.filter((r) => r.type === type),
      })).filter((g) => g.items.length > 0),
    [results],
  );
  const flat = React.useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Highlight, clamped to range at render time (results shrink as you type, so
  // `active` may briefly point past the end — derive instead of storing).
  const activeIndex = flat.length === 0 ? 0 : Math.min(active, flat.length - 1);

  // Scroll the active row into view.
  React.useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-idx="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const go = React.useCallback(
    (entry?: SearchEntry) => {
      if (!entry) return;
      onOpenChange(false);
      router.push(entry.href);
    },
    [onOpenChange, router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive(flat.length ? (activeIndex + 1) % flat.length : 0);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive(flat.length ? (activeIndex - 1 + flat.length) % flat.length : 0);
        break;
      case "Enter":
        e.preventDefault();
        go(flat[activeIndex]);
        break;
      case "Escape":
        e.preventDefault();
        onOpenChange(false);
        break;
      case "Tab":
        // Focus trap: only the input is tabbable — keep focus on it.
        e.preventDefault();
        inputRef.current?.focus();
        break;
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Search the Solar Sector Dashboard"
    >
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        className="relative mt-[10vh] w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
        onKeyDown={onKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2.5 border-b border-border px-3.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-listbox"
            aria-activedescendant={
              flat.length ? `command-option-${activeIndex}` : undefined
            }
            aria-label="Search companies, developers, tenders and sections"
            placeholder="Search companies, developers, tenders…"
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-2xs text-muted-foreground sm:inline-block">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-listbox"
          role="listbox"
          aria-label="Search results"
          className="max-h-[min(60vh,24rem)] overflow-y-auto py-2"
        >
          {flat.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for{" "}
              <span className="font-medium text-foreground">“{query}”</span>
            </p>
          ) : (
            groups.map((group) => {
              const Icon = TYPE_META[group.type].icon;
              return (
                <div key={group.type} className="px-2 pb-1.5">
                  <div className="px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {TYPE_META[group.type].label}
                  </div>
                  {group.items.map((item) => {
                    const idx = flat.indexOf(item);
                    const isActive = idx === activeIndex;
                    return (
                      <div
                        key={item.id}
                        id={`command-option-${idx}`}
                        data-idx={idx}
                        role="option"
                        aria-selected={isActive}
                        onMouseMove={() => setActive(idx)}
                        onClick={() => go(item)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-accent-foreground" : "text-muted-foreground",
                          )}
                          aria-hidden
                        />
                        <span className="truncate font-medium">{item.label}</span>
                        {item.sublabel ? (
                          <span
                            className={cn(
                              "ml-auto truncate pl-3 text-xs",
                              isActive
                                ? "text-accent-foreground/80"
                                : "text-muted-foreground",
                            )}
                          >
                            {item.sublabel}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}

          {!query && (
            <p className="border-t border-border px-4 pt-2.5 text-xs text-muted-foreground">
              Type to search companies, developers, tenders…
            </p>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 border-t border-border bg-muted/40 px-3.5 py-2 text-2xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-sans">↑</kbd>
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-sans">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center rounded border border-border bg-background px-1 py-0.5 font-sans">
              <CornerDownLeft className="h-3 w-3" aria-hidden />
            </kbd>
            to open
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-sans">Esc</kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  );
}
