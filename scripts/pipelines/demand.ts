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

/** FY-quarter label for a `YYYY-MM` month (FY = Apr–Mar). */
function fyQuarter(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const fy = m >= 4 ? y + 1 : y;
  const q = m >= 4 ? Math.ceil((m - 3) / 3) : Math.ceil((m + 9) / 3);
  return `Q${q}FY${String(fy).slice(2)}`;
}
function financialYear(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `FY${String(m >= 4 ? y + 1 : y).slice(2)}`;
}
const priorPeriod = (p: string) =>
  p.replace(/FY(\d+)$/, (_, yy) => `FY${Number(yy) - 1}`);

const signed = (v: number | null | undefined) =>
  v == null ? "—" : v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);

interface Agg {
  peak: number;
  energy: number;
  count: number;
}

/** Aggregate months into period buckets (peak = max, energy = sum). */
function bucket(
  months: string[],
  peak: number[],
  energy: number[],
  label: (m: string) => string,
): Map<string, Agg> {
  const map = new Map<string, Agg>();
  months.forEach((mo, i) => {
    const key = label(mo);
    const cur = map.get(key) ?? { peak: -Infinity, energy: 0, count: 0 };
    cur.peak = Math.max(cur.peak, peak[i]);
    cur.energy += energy[i];
    cur.count += 1;
    map.set(key, cur);
  });
  return map;
}

/** YoY rows for full periods that have a full prior-year counterpart. */
function yoyRows(map: Map<string, Agg>, fullCount: number): GrowthRow[] {
  const rows: GrowthRow[] = [];
  for (const [period, a] of map) {
    if (a.count !== fullCount) continue;
    const prior = map.get(priorPeriod(period));
    if (!prior || prior.count !== fullCount) continue;
    rows.push({
      period,
      peakYoyPct: round1((a.peak / prior.peak - 1) * 100),
      energyYoyPct: round1((a.energy / prior.energy - 1) * 100),
    });
  }
  return rows;
}

export const demandPipeline = definePipeline({
  name: "demand",
  section: "demand",
  cadence: "monthly",
  run() {
    const rows = readManualCsv("demand/monthly.csv");
    const months = rows.map((r) => r.month);
    const peakGw = rows.map((r) => Number(r.peak_gw));
    const energyBu = rows.map((r) => Number(r.energy_bu));

    // Per-month YoY (vs the same month a year earlier); null for the first 12.
    const yoy = (arr: number[], i: number) =>
      i >= 12 && arr[i - 12] ? round1((arr[i] / arr[i - 12] - 1) * 100) : null;
    const peakGrowthYoy = peakGw.map((_, i) => yoy(peakGw, i));
    const energyGrowthYoy = energyBu.map((_, i) => yoy(energyBu, i));

    // Quarterly & yearly YoY (full periods with a full prior-year counterpart).
    const quarterlyGrowth = yoyRows(bucket(months, peakGw, energyBu, fyQuarter), 3);
    const yearlyGrowth = yoyRows(bucket(months, peakGw, energyBu, financialYear), 12);

    // --- KPIs ---
    const li = months.length - 1;
    const fy26 = yearlyGrowth.find((y) => y.period === "FY26");
    const lastMonthLabel = monthLabel(months[li]);
    const prevYearLabel = monthLabel(months[li - 12]);

    const kpis: Kpi[] = [
      { key: "latest_peak", label: "Latest peak demand", value: peakGw[li], unit: "GW", confidence: "high", hint: lastMonthLabel },
      { key: "peak_yoy", label: "Peak demand YoY", value: signed(peakGrowthYoy[li]), unit: "%", confidence: "high", hint: `vs ${prevYearLabel}` },
      { key: "latest_energy", label: "Latest energy met", value: energyBu[li], unit: "BU", confidence: "high", hint: lastMonthLabel },
      { key: "energy_yoy", label: "Energy met YoY", value: signed(energyGrowthYoy[li]), unit: "%", confidence: "high", hint: `vs ${prevYearLabel}` },
      { key: "fy26_peak_growth", label: "FY26 peak growth", value: signed(fy26?.peakYoyPct), unit: "%", confidence: "high", hint: "vs FY25" },
      { key: "fy26_energy_growth", label: "FY26 energy growth", value: signed(fy26?.energyYoyPct), unit: "%", confidence: "high", hint: "vs FY25" },
    ];

    // --- Drivers ---
    const drivers: DemandDriver[] = readManualCsv("demand/drivers.csv").map((r) => ({
      driver: r.driver,
      valueGw: Number(r.value_gw),
      horizon: r.horizon,
      confidence: r.confidence as Confidence,
      ...(r.note ? { note: r.note } : {}),
    }));

    // --- Sanity (warn) ---
    if (
      peakGrowthYoy.length !== months.length ||
      energyGrowthYoy.length !== months.length
    ) {
      console.warn("[demand] growth arrays misaligned with months");
    }

    // --- Provenance ---
    const DEMAND_AS_OF = `${months[li]}-01`;
    const srcMap = new Map<string, SourceRef>();
    const addSrc = (name?: string, conf?: string) => {
      if (!name || !conf) return;
      const key = `${name}|${conf}`;
      if (!srcMap.has(key)) srcMap.set(key, { name, asOf: DEMAND_AS_OF, confidence: conf as Confidence });
    };
    for (const r of rows) addSrc(r.source, r.confidence);
    for (const r of readManualCsv("demand/drivers.csv")) addSrc(r.source, r.confidence);
    const sources = [...srcMap.values()].sort(
      (a, b) => a.name.localeCompare(b.name) || a.confidence.localeCompare(b.confidence),
    );

    const data: DemandData = {
      kpis,
      months,
      peakGw,
      energyBu,
      peakGrowthYoy,
      energyGrowthYoy,
      quarterlyGrowth,
      yearlyGrowth,
      drivers,
    };

    writeSnapshot<DemandData>("demand", "power-demand", {
      asOf: maxAsOf(sources),
      cadence: "monthly",
      coverage: "India · all-India peak demand & energy met",
      sources,
      notes: [
        "Monthly all-India peak demand (GW) and energy met (BU) from CEA; YoY is each month vs the same month a year earlier (first 12 months have no YoY).",
        "Quarterly & yearly growth aggregate full FY periods only (peak = max, energy = sum); demand drivers are forward-looking context.",
      ],
      data,
    });
  },
});
