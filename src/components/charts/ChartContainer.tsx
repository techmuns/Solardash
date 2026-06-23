"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export interface ChartContainerProps {
  /** Fixed pixel height; width is always responsive. */
  height?: number;
  className?: string;
  /** A single Recharts chart element (e.g. <BarChart/>). */
  children: React.ReactElement;
}

// Client-only flag (hydration-safe, no effects): false on the server and during
// the first hydration render, true afterwards. Lets us skip rendering Recharts
// on the server, where it can't measure and warns about width/height.
const subscribeNoop = () => () => {};
const getTrue = () => true;
const getFalse = () => false;
function useMounted() {
  return React.useSyncExternalStore(subscribeNoop, getTrue, getFalse);
}

/** Responsive, fixed-height wrapper around a Recharts chart. */
export function ChartContainer({
  height = 288,
  className,
  children,
}: ChartContainerProps) {
  const mounted = useMounted();
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
