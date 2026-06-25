"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAxisTick } from "@/lib/utils";
import { ChartContainer } from "./ChartContainer";
import { useChartTheme } from "./use-chart-theme";

const valueLabel = (v: string | number | boolean | null | undefined) =>
  typeof v === "number" || typeof v === "string"
    ? Number(v).toLocaleString("en-IN", { maximumFractionDigits: 1 })
    : "";

export interface CategoryDatum {
  key: string;
  label: string;
  value: number;
  /** Optional per-bar colour; falls back to `color` prop. */
  color?: string;
}

export interface CategoryBarChartProps {
  data: CategoryDatum[];
  height?: number;
  /** Unit suffix shown in the tooltip, e.g. `MW`. */
  unit?: string;
  /** Default bar colour (brand amber). */
  color?: string;
  /** Width reserved for the category (y-axis) labels. */
  categoryWidth?: number;
  /** Render the numeric value at the end of each bar. */
  showValues?: boolean;
}

/** Horizontal bar chart over categorical data (e.g. agency split, rankings). */
export function CategoryBarChart({
  data,
  height = 288,
  unit,
  color = "#F59E0B",
  categoryWidth = 84,
  showValues = false,
}: CategoryBarChartProps) {
  const theme = useChartTheme();

  return (
    <ChartContainer height={height}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: showValues ? 48 : 16, bottom: 0, left: 4 }}
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
          tickFormatter={formatAxisTick}
          tick={{ fill: theme.tick, fontSize: 12 }}
        />
        <YAxis
          type="category"
          dataKey="label"
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
          formatter={(value, name) => [Number(value).toLocaleString("en-IN"), name]}
        />
        <Bar dataKey="value" name={unit ?? "Value"} radius={[0, 3, 3, 0]} maxBarSize={26}>
          {data.map((d) => (
            <Cell key={d.key} fill={d.color ?? color} />
          ))}
          {showValues && (
            <LabelList
              dataKey="value"
              position="right"
              formatter={valueLabel}
              fill={theme.tick}
              fontSize={11}
            />
          )}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
