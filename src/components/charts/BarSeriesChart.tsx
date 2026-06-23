"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Series } from "@/data/types/core";
import { energyColor } from "@/lib/colors";
import { ChartContainer } from "./ChartContainer";
import { seriesToRows } from "./series";
import { useChartTheme } from "./use-chart-theme";

export interface BarSeriesChartProps {
  series: Series[];
  /** Stack bars (e.g. additions by source) vs. group them side-by-side. */
  stacked?: boolean;
  height?: number;
  /** Unit suffix shown in the tooltip, e.g. `GW`. */
  unit?: string;
}

/** Generic bar chart over our typed Series, coloured via ENERGY_COLORS. */
export function BarSeriesChart({
  series,
  stacked = false,
  height = 288,
  unit,
}: BarSeriesChartProps) {
  const theme = useChartTheme();
  const rows = seriesToRows(series);

  return (
    <ChartContainer height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 3" />
        <XAxis
          dataKey="period"
          stroke={theme.axis}
          tickLine={false}
          tick={{ fill: theme.tick, fontSize: 12 }}
        />
        <YAxis
          stroke={theme.axis}
          tickLine={false}
          axisLine={false}
          width={40}
          tick={{ fill: theme.tick, fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: theme.cursor }}
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
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? "a" : undefined}
            fill={energyColor(s.key)}
            radius={stacked ? [0, 0, 0, 0] : [3, 3, 0, 0]}
            maxBarSize={56}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
