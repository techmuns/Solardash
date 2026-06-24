import { definePipeline } from "../lib/pipeline";
import { maxAsOf, readManualCsv, writeSnapshot } from "../lib/io";
import type { Confidence, Kpi, SourceRef } from "../../src/data/types/core";
import type { DemandData, DemandDriver, GrowthRow } from "../../src/data/types/power";

const round1 = (n: number) => Math.round(n * 10) / 10;

// Deterministic month label (avoid locale/ICU variance in committed snapshots).
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}
/** Same month, one year earlier: `2026-01` -> `2025-01`. */
function priorYearMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${Number(y) - 1}-${m}`;
}

export const demandPipeline = definePipeline({
  name: "demand",
  section: "demand",
  cadence: "monthly",
  run() {
    // Merge the auto-refreshed CEA feed (authoritative) with the manual monthly
    // anchors → one series deduped by month, CEA wins, chronological.
    const manualRows = readManualCsv("demand/monthly.csv");
    const ceaRows = readManualCsv("demand/cea-monthly.csv");
    const byMonth = new Map<string, Record<string, string>>();
    for (const r of manualRows) byMonth.set(r.month, r);
    for (const r of ceaRows) byMonth.set(r.month, r); // CEA overrides the anchor
    const rows = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
    const months = rows.map((r) => r.month);
    const peakGw = rows.map((r) => Number(r.peak_gw));
    // Energy is sparse — null where not published.
    const energyBu = rows.map((r) => (r.energy_bu?.trim() ? Number(r.energy_bu) : null));

    // The series is sparse, so match each month to the same month a year earlier
    // by label (not by a fixed 12-row offset).
    const idxByMonth = new Map(months.map((m, i) => [m, i]));
    const peakGrowthYoy = months.map((m, i) => {
      const j = idxByMonth.get(priorYearMonth(m));
      return j != null && peakGw[j] ? round1((peakGw[i] / peakGw[j] - 1) * 100) : null;
    });
    const energyGrowthYoy = months.map((m, i) => {
      const j = idxByMonth.get(priorYearMonth(m));
      const cur = energyBu[i];
      const prev = j != null ? energyBu[j] : null;
      return cur != null && prev ? round1((cur / prev - 1) * 100) : null;
    });

    // YoY growth table from whatever same-month pairs exist (need both metrics).
    const growth: GrowthRow[] = months
      .map((m, i) => ({ m, i }))
      .filter(({ i }) => peakGrowthYoy[i] != null && energyGrowthYoy[i] != null)
      .map(({ m, i }) => ({
        period: monthLabel(m),
        peakYoyPct: peakGrowthYoy[i] as number,
        energyYoyPct: energyGrowthYoy[i] as number,
      }));

    // KPI row from the curated headline figures (real values; the monthly series
    // is too sparse to derive a meaningful "latest" from).
    const headlineRows = readManualCsv("demand/headline.csv");
    const kpis: Kpi[] = headlineRows.map((r) => {
      const positiveGrowth = /growth/i.test(r.metric) && Number(r.value) > 0;
      return {
        key: r.metric.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        label: r.metric,
        // String preserves source precision (e.g. 0.03) and the +sign on growth.
        value: positiveGrowth ? `+${r.value}` : r.value,
        unit: r.unit,
        confidence: r.confidence as Confidence,
      };
    });

    // Drivers (forward-looking context).
    const driverRows = readManualCsv("demand/drivers.csv");
    const drivers: DemandDriver[] = driverRows.map((r) => ({
      driver: r.driver,
      valueGw: Number(r.value_gw),
      horizon: r.horizon,
      confidence: r.confidence as Confidence,
      ...(r.note ? { note: r.note } : {}),
    }));

    // --- Provenance (distinct source+url+confidence) ---
    const DEMAND_AS_OF = `${months[months.length - 1]}-01`;
    const srcMap = new Map<string, SourceRef>();
    const addSrc = (name?: string, conf?: string, url?: string) => {
      if (!name || !conf) return;
      const u = url?.trim() || undefined;
      const key = `${name}|${u ?? ""}|${conf}`;
      if (!srcMap.has(key)) {
        srcMap.set(key, { name, ...(u ? { url: u } : {}), asOf: DEMAND_AS_OF, confidence: conf as Confidence });
      }
    };
    for (const r of rows) addSrc(r.source, r.confidence, r.source_url);
    for (const r of headlineRows) addSrc(r.source, r.confidence, r.source_url);
    for (const r of driverRows) addSrc(r.source, r.confidence, r.source_url);
    const sources = [...srcMap.values()].sort(
      (a, b) =>
        a.name.localeCompare(b.name) ||
        (a.url ?? "").localeCompare(b.url ?? "") ||
        a.confidence.localeCompare(b.confidence),
    );

    const data: DemandData = {
      kpis,
      months,
      peakGw,
      energyBu,
      peakGrowthYoy,
      energyGrowthYoy,
      growth,
      drivers,
    };

    writeSnapshot<DemandData>("demand", "power-demand", {
      asOf: maxAsOf(sources),
      cadence: "monthly",
      coverage: "India · all-India peak demand & energy met",
      sources,
      notes: [
        "Monthly peak demand (GW) and energy met (BU) merge the auto-refreshed CEA Executive Summary feed (authoritative) with manual anchors, deduped by month — a real series that densifies as the CEA Action runs.",
        "KPIs are curated headline figures (CEA / PIB); YoY growth is computed from same-month pairs (e.g. Jan 2025 → Jan 2026). Demand drivers are forward-looking context.",
      ],
      data,
    });
  },
});
