"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "./ChartContainer";
import { useChartTheme } from "./use-chart-theme";

export interface ComboBar {
  key: string;
  label: string;
  color?: string;
  values: number[];
}

export interface ComboLine {
  key: string;
  label: string;
  color?: string;
  values: (number | null)[];
}

export interface ComboBarLineChartProps {
  categories: string[];
  /** Bars on the left axis (e.g. ₹cr). */
  bars: ComboBar[];
  /** A single line on the right axis (e.g. margin %). */
  line: ComboLine;
  barUnit?: string;
  lineUnit?: string;
  height?: number;
}

const FALLBACK = ["#2563EB", "#10B981", "#8B5CF6", "#F97316"];

/** Dual-axis combo: grouped bars (left) + a line (right). For financials. */
export function ComboBarLineChart({
  categories,
  bars,
  line,
  barUnit,
  lineUnit,
  height = 320,
}: ComboBarLineChartProps) {
  const theme = useChartTheme();

  const rows = categories.map((category, i) => {
    const row: Record<string, string | number | null> = { category };
    for (const b of bars) row[b.key] = b.values[i] ?? 0;
    row[line.key] = line.values[i];
    return row;
  });

  return (
    <ChartContainer height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 3" />
        <XAxis
          dataKey="category"
          stroke={theme.axis}
          tickLine={false}
          tick={{ fill: theme.tick, fontSize: 12 }}
        />
        <YAxis
          yAxisId="left"
          stroke={theme.axis}
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: theme.tick, fontSize: 12 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
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
          formatter={(value, name) => {
            const unit = name === line.label ? lineUnit : barUnit;
            return [unit ? `${value} ${unit}` : `${value}`, name];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: theme.tick, paddingTop: 8 }} />
        {bars.map((b, idx) => (
          <Bar
            key={b.key}
            yAxisId="left"
            dataKey={b.key}
            name={b.label}
            fill={b.color ?? FALLBACK[idx % FALLBACK.length]}
            radius={[3, 3, 0, 0]}
            maxBarSize={36}
          />
        ))}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey={line.key}
          name={line.label}
          stroke={line.color ?? "#F59E0B"}
          strokeWidth={2}
          dot={{ r: 2.5, strokeWidth: 0, fill: line.color ?? "#F59E0B" }}
          connectNulls
        />
      </ComposedChart>
    </ChartContainer>
  );
}
