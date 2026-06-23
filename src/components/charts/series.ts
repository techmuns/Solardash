import type { Series } from "@/data/types/core";

export interface ChartRow {
  period: string;
  [key: string]: string | number;
}

/**
 * Pivot our typed `Series[]` into Recharts' row format, keyed by `period` with
 * one field per series key. Period order follows `periodOrder` when given
 * (handy for sparse series that would otherwise sort by first appearance),
 * else first appearance across series.
 */
export function seriesToRows(
  series: Series[],
  periodOrder?: string[],
): ChartRow[] {
  const order: string[] = [];
  const byPeriod = new Map<string, ChartRow>();
  for (const s of series) {
    for (const point of s.points) {
      let row = byPeriod.get(point.period);
      if (!row) {
        row = { period: point.period };
        byPeriod.set(point.period, row);
        order.push(point.period);
      }
      row[s.key] = point.value;
    }
  }
  const periods = periodOrder
    ? periodOrder.filter((p) => byPeriod.has(p))
    : order;
  return periods.map((period) => byPeriod.get(period) as ChartRow);
}
