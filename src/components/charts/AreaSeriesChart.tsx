"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Series } from "@/data/types/core";
import { energyColor } from "@/lib/colors";
import { formatAxisTick } from "@/lib/utils";
import { ChartContainer } from "./ChartContainer";
import { seriesToRows } from "./series";
import { useChartTheme } from "./use-chart-theme";

export interface AreaSeriesChartProps {
  series: Series[];
  height?: number;
  /** Unit suffix shown in the tooltip, e.g. `GW`. */
  unit?: string;
  /** Explicit category (x-axis) order; otherwise first-appearance order. */
  periodOrder?: string[];
  /** 100%-share view (stackOffset="expand") — best shows a mix transition. */
  share?: boolean;
  xInterval?: number | "preserveStart" | "preserveEnd" | "preserveStartEnd";
}

/** Stacked-area chart over our typed Series — the "mix over time" view. */
export function AreaSeriesChart({
  series,
  height = 288,
  unit,
  periodOrder,
  share = false,
  xInterval,
}: AreaSeriesChartProps) {
  const theme = useChartTheme();
  const rows = seriesToRows(series, periodOrder);
  const pctTick = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <ChartContainer height={height}>
      <AreaChart
        data={rows}
        stackOffset={share ? "expand" : undefined}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 3" />
        <XAxis
          dataKey="period"
          stroke={theme.axis}
          tickLine={false}
          tick={{ fill: theme.tick, fontSize: 12 }}
          interval={xInterval}
        />
        <YAxis
          stroke={theme.axis}
          tickLine={false}
          axisLine={false}
          width={share ? 44 : 64}
          domain={share ? [0, 1] : undefined}
          tickFormatter={share ? pctTick : formatAxisTick}
          tick={{ fill: theme.tick, fontSize: 12 }}
        />
        <Tooltip
          cursor={{ stroke: theme.cursor }}
          contentStyle={{
            background: theme.tooltipBg,
            border: `1px solid ${theme.tooltipBorder}`,
            borderRadius: 8,
            fontSize: 12,
            color: theme.tooltipText,
            boxShadow: "0 4px 12px -2px rgb(15 23 42 / 0.12)",
          }}
          labelStyle={{ color: theme.tooltipText, fontWeight: 600, marginBottom: 4 }}
          itemStyle={{ color: theme.tooltipText, padding: "1px 0" }}
          formatter={(value, name) => [unit ? `${value} ${unit}` : `${value}`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: theme.tick, paddingTop: 8 }} />
        {series.map((s) => {
          const c = s.color ?? energyColor(s.key);
          return (
            <Area
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.label}
              stackId="a"
              stroke={c}
              fill={c}
              fillOpacity={0.55}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          );
        })}
      </AreaChart>
    </ChartContainer>
  );
}
