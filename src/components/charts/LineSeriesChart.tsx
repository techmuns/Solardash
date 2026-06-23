"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Series } from "@/data/types/core";
import { energyColor } from "@/lib/colors";
import { ChartContainer } from "./ChartContainer";
import { seriesToRows } from "./series";
import { useChartTheme } from "./use-chart-theme";

export interface LineSeriesChartProps {
  series: Series[];
  height?: number;
  /** Unit suffix shown in the tooltip, e.g. `Rs/kWh`. */
  unit?: string;
  /** Explicit x-axis order; otherwise first-appearance order. */
  periodOrder?: string[];
}

/** Generic line chart over our typed Series, coloured via ENERGY_COLORS. */
export function LineSeriesChart({
  series,
  height = 288,
  unit,
  periodOrder,
}: LineSeriesChartProps) {
  const theme = useChartTheme();
  const rows = seriesToRows(series, periodOrder);

  return (
    <ChartContainer height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
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
          cursor={{ stroke: theme.axis, strokeWidth: 1 }}
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
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={energyColor(s.key)}
            strokeWidth={2}
            dot={{ r: 2.5, strokeWidth: 0, fill: energyColor(s.key) }}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
