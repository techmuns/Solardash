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
import { ChartContainer } from "./ChartContainer";
import { useChartTheme } from "./use-chart-theme";

export interface StackedCategorySeries {
  key: string;
  label: string;
  /** Segment colour; falls back to a neutral palette by index. */
  color?: string;
  /** One value per category (aligned to `categories`). */
  values: number[];
}

export interface StackedCategoryBarChartProps {
  categories: string[];
  series: StackedCategorySeries[];
  /** Unit suffix shown in the tooltip, e.g. `GW`. */
  unit?: string;
  height?: number;
  /** Width reserved for the category (y-axis) labels. */
  categoryWidth?: number;
  showLegend?: boolean;
}

const FALLBACK = ["#F59E0B", "#0EA5E9", "#8B5CF6", "#14B8A6", "#6366F1"];

/**
 * Horizontal, stacked categorical bar chart — category axis (e.g. developer or
 * stage) with segments stacked by key. Generic: reused for capacity funnels,
 * PPA funnels, and player-wise capacity stacks.
 */
export function StackedCategoryBarChart({
  categories,
  series,
  unit,
  height = 320,
  categoryWidth = 96,
  showLegend = true,
}: StackedCategoryBarChartProps) {
  const theme = useChartTheme();

  const rows = categories.map((category, i) => {
    const row: Record<string, string | number> = { category };
    for (const s of series) row[s.key] = s.values[i] ?? 0;
    return row;
  });

  return (
    <ChartContainer height={height}>
      <BarChart
        layout="vertical"
        data={rows}
        margin={{ top: 4, right: 16, bottom: 0, left: 4 }}
      >
        <CartesianGrid
          horizontal={false}
          stroke={theme.grid}
          strokeDasharray="3 3"
        />
        <XAxis
          type="number"
          stroke={theme.axis}
          tickLine={false}
          axisLine={false}
          tick={{ fill: theme.tick, fontSize: 12 }}
        />
        <YAxis
          type="category"
          dataKey="category"
          stroke={theme.axis}
          tickLine={false}
          axisLine={false}
          width={categoryWidth}
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
        {showLegend && (
          <Legend wrapperStyle={{ fontSize: 12, color: theme.tick, paddingTop: 8 }} />
        )}
        {series.map((s, idx) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="a"
            fill={s.color ?? FALLBACK[idx % FALLBACK.length]}
            radius={idx === series.length - 1 ? [0, 3, 3, 0] : [0, 0, 0, 0]}
            maxBarSize={30}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
