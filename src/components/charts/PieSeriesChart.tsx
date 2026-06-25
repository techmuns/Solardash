"use client";

import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import { ChartContainer } from "./ChartContainer";
import { useChartTheme } from "./use-chart-theme";

export interface PieDatum {
  key: string;
  label: string;
  value: number;
  /** Slice colour (e.g. from ENERGY_COLORS). */
  color: string;
}

export interface PieSeriesChartProps {
  data: PieDatum[];
  height?: number;
  /** Unit suffix shown in the tooltip, e.g. `MW`. */
  unit?: string;
  /** Render as a donut (default) vs. a full pie. */
  donut?: boolean;
  /** Render the built-in legend (default true). Off when a compact custom
   *  legend is rendered alongside (e.g. the Overview bento cell). */
  showLegend?: boolean;
}

/** Donut / pie over pre-coloured categorical data (e.g. tender-type mix). */
export function PieSeriesChart({
  data,
  height = 288,
  unit,
  donut = true,
  showLegend = true,
}: PieSeriesChartProps) {
  const theme = useChartTheme();
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartContainer height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={donut ? "58%" : 0}
          outerRadius="82%"
          paddingAngle={1.5}
          stroke={theme.tooltipBg}
          strokeWidth={2}
        >
          {data.map((d) => (
            <Cell key={d.key} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: theme.tooltipBg,
            border: `1px solid ${theme.tooltipBorder}`,
            borderRadius: 8,
            fontSize: 12,
            color: theme.tooltipText,
            boxShadow: "0 4px 12px -2px rgb(15 23 42 / 0.12)",
          }}
          labelStyle={{ color: theme.tooltipText, fontWeight: 600 }}
          itemStyle={{ color: theme.tooltipText, padding: "1px 0" }}
          formatter={(value, name) => {
            const v = Number(value);
            const pct = total ? ` · ${Math.round((v / total) * 100)}%` : "";
            return [`${v.toLocaleString("en-IN")}${unit ? ` ${unit}` : ""}${pct}`, name];
          }}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: 12, color: theme.tick, paddingTop: 8 }}
          />
        )}
      </PieChart>
    </ChartContainer>
  );
}
