"use client";

import { useAutoHeight } from "./use-auto-height";
import { BarSeriesChart, type BarSeriesChartProps } from "./BarSeriesChart";
import { LineSeriesChart, type LineSeriesChartProps } from "./LineSeriesChart";
import { PieSeriesChart, type PieSeriesChartProps } from "./PieSeriesChart";
import {
  StackedCategoryBarChart,
  type StackedCategoryBarChartProps,
} from "./StackedCategoryBarChart";
import {
  CategoryBarChart,
  type CategoryBarChartProps,
} from "./CategoryBarChart";
import { Sparkline, type SparklineProps } from "./Sparkline";

/**
 * Flex-fill wrappers around the existing fixed-height charts: each measures its
 * own flex/grid cell and feeds that pixel height to the chart, so the chart
 * fills a no-scroll canvas exactly without rewriting the chart components.
 * Drop one into a `flex flex-col` parent as the `flex-1` child.
 */

export function FillBarSeries(props: Omit<BarSeriesChartProps, "height">) {
  const [ref, h] = useAutoHeight();
  return (
    <div ref={ref} className="min-h-0 flex-1">
      {h > 0 && <BarSeriesChart {...props} height={h} />}
    </div>
  );
}

export function FillLineSeries(props: Omit<LineSeriesChartProps, "height">) {
  const [ref, h] = useAutoHeight();
  return (
    <div ref={ref} className="min-h-0 flex-1">
      {h > 0 && <LineSeriesChart {...props} height={h} />}
    </div>
  );
}

export function FillDonut(props: Omit<PieSeriesChartProps, "height">) {
  const [ref, h] = useAutoHeight();
  return (
    <div ref={ref} className="min-h-0 flex-1">
      {h > 0 && <PieSeriesChart {...props} height={h} />}
    </div>
  );
}

export function FillStackedCategory(
  props: Omit<StackedCategoryBarChartProps, "height">,
) {
  const [ref, h] = useAutoHeight();
  return (
    <div ref={ref} className="min-h-0 flex-1">
      {h > 0 && <StackedCategoryBarChart {...props} height={h} />}
    </div>
  );
}

export function FillCategoryBar(props: Omit<CategoryBarChartProps, "height">) {
  const [ref, h] = useAutoHeight();
  return (
    <div ref={ref} className="min-h-0 flex-1">
      {h > 0 && <CategoryBarChart {...props} height={h} />}
    </div>
  );
}

export function FillSparkline(props: Omit<SparklineProps, "height">) {
  const [ref, h] = useAutoHeight();
  return (
    <div ref={ref} className="min-h-0 flex-1">
      {h > 0 && <Sparkline {...props} height={h} />}
    </div>
  );
}
