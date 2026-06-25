"use client";

import { Area, AreaChart } from "recharts";
import { ChartContainer } from "./ChartContainer";
import { useChartTheme } from "./use-chart-theme";

export interface SparklineProps {
  /** Raw y-values, plotted at equal x-intervals (oldest → newest). */
  values: number[];
  /** Stroke + area colour (fixed hex; chosen to read in both themes). */
  color?: string;
  height?: number;
  /** Subtle gradient area fill under the line. */
  area?: boolean;
}

/**
 * Bare sparkline — just the trend line, an optional area fill, and an endpoint
 * dot. No axes, gridlines, legend or tooltip. Built to fill the lower band of a
 * metric card; pair with `FillSparkline` to flex to the available height.
 */
export function Sparkline({
  values,
  color = "#F59E0B",
  height = 64,
  area = true,
}: SparklineProps) {
  const theme = useChartTheme();
  const data = values.map((v, i) => ({ i, v }));
  const lastIndex = data.length - 1;
  const gradId = `spark-grad-${color.replace(/[^a-zA-Z0-9]/g, "")}`;

  const renderDot = (p: { cx?: number; cy?: number; index?: number }) => {
    if (p.index !== lastIndex || p.cx == null || p.cy == null) {
      return <g key={`d${p.index}`} />;
    }
    return (
      <circle
        key="end"
        cx={p.cx}
        cy={p.cy}
        r={3}
        fill={color}
        stroke={theme.tooltipBg}
        strokeWidth={1.5}
      />
    );
  };

  return (
    <ChartContainer height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 6, bottom: 2, left: 6 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.26} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={area ? `url(#${gradId})` : "none"}
          isAnimationActive={false}
          dot={renderDot}
          activeDot={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
