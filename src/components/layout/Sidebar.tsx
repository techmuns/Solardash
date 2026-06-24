"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/BrandMark";
import { NAV_GROUPS } from "./nav";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export interface SidebarProps {
  collapsed?: boolean;
  /** Called when a nav link is clicked (used to close the mobile drawer). */
  onNavigate?: () => void;
}

export function Sidebar({ collapsed = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div
        className={cn(
          "flex h-topbar shrink-0 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="Solar Sector Dashboard — by Munshot"
          className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent"
        >
          <BrandMark size="sm" />
          {!collapsed && (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                Solar Sector Dashboard
              </span>
              <span className="truncate text-2xs font-medium text-sidebar-muted">
                by Munshot
              </span>
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {collapsed ? (
              <div className="mx-2 my-2 h-px bg-sidebar-border" />
            ) : (
              <p className="px-3 pb-1.5 pt-3 text-2xs font-semibold uppercase tracking-wider text-sidebar-muted">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-md py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-accent",
                        collapsed ? "justify-center px-2" : "px-3",
                        active
                          ? "bg-sidebar-foreground/10 text-sidebar-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-foreground/[0.06] hover:text-sidebar-foreground",
                        item.hero && !active && "bg-brand/10",
                      )}
                    >
                      {/* Left accent bar — solid when active, hinted for hero. */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-brand transition-all",
                          active
                            ? "w-1 opacity-100"
                            : item.hero
                              ? "w-1 opacity-60"
                              : "w-0 opacity-0",
                        )}
                      />
                      <Icon
                        className={cn(
                          "h-[1.1rem] w-[1.1rem] shrink-0 transition-colors",
                          active || item.hero
                            ? "text-brand"
                            : "text-sidebar-muted group-hover:text-sidebar-foreground",
                        )}
                        aria-hidden
                      />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                      {!collapsed && item.hero && (
                        <span
                          className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                          aria-hidden
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-2xs leading-relaxed text-sidebar-muted">
            India solar &amp; renewables
            <br />
            <span className="font-medium text-sidebar-foreground/70">
              Powered by Munshot
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
