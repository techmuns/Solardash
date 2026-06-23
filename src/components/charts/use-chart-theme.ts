"use client";

import * as React from "react";

/**
 * Recharts draws SVG, where CSS `var()` does not resolve in presentation
 * attributes — so we feed it explicit colours that track the `.dark` class.
 * Values mirror the slate/border tokens in globals.css. (The HTML tooltip uses
 * Tailwind classes instead and themes automatically.)
 */
export interface ChartTheme {
  grid: string;
  axis: string;
  tick: string;
  cursor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

const LIGHT: ChartTheme = {
  grid: "#E2E8F0", // slate-200
  axis: "#CBD5E1", // slate-300
  tick: "#64748B", // slate-500
  cursor: "rgba(148, 163, 184, 0.15)",
  tooltipBg: "#FFFFFF",
  tooltipBorder: "#E2E8F0",
  tooltipText: "#0F172A",
};

const DARK: ChartTheme = {
  grid: "#1E293B", // slate-800
  axis: "#334155", // slate-700
  tick: "#94A3B8", // slate-400
  cursor: "rgba(148, 163, 184, 0.12)",
  tooltipBg: "#0F172A", // slate-900
  tooltipBorder: "#334155",
  tooltipText: "#F1F5F9",
};

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

export function useChartTheme(): ChartTheme {
  const isDark = React.useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
  return isDark ? DARK : LIGHT;
}
