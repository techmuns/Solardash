import { definePipeline } from "../lib/pipeline";
import { maxAsOf, readManualCsv, writeSnapshot } from "../lib/io";
import { categoricalColor, energyColor } from "../../src/lib/colors";
import type { Confidence, Kpi, Series, SourceRef } from "../../src/data/types/core";
import type {
  CapacityData,
  CapacityMetric,
  InstalledMixEntry,
  StateSolar,
} from "../../src/data/types/power";

const CAP_AS_OF = "2026-03-31";

// Annual additions are a clean 8-year solar + wind history (the installed-mix
// donut still carries the full current source breakdown).
const COMM_SOURCES = ["solar", "wind"];
const COMM_LABELS: Record<string, string> = {
  solar: "Solar",
  wind: "Wind",
};
const SEGMENTS = ["utility", "open_access", "rooftop", "kusum"];
const SEG_LABELS: Record<string, string> = {
  utility: "Utility",
  open_access: "Open access",
  rooftop: "Rooftop",
  kusum: "KUSUM",
};
// Installed capacity by source, annual (~10yr) — stable display order.
const BY_SOURCE = ["solar", "wind", "hydro", "gas", "nuclear", "biomass", "thermal"];
const BY_SOURCE_LABELS: Record<string, string> = {
  solar: "Solar",
  wind: "Wind",
  hydro: "Hydro",
  thermal: "Thermal",
  gas: "Gas",
  nuclear: "Nuclear",
  biomass: "Biomass",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const capacityPipeline = definePipeline({
  name: "capacity",
  section: "capacity",
  cadence: "quarterly",
  run() {
    const commRows = readManualCsv("capacity/commissioning-annual.csv");
    const ihRows = readManualCsv("capacity/installed-history.csv");
    const mixRows = readManualCsv("capacity/installed-mix.csv");
    const segRows = readManualCsv("capacity/solar-segments.csv");
    const stRows = readManualCsv("capacity/state-solar.csv");
    const rsRows = readManualCsv("capacity/re-share.csv");
    const metRows = readManualCsv("capacity/metrics.csv");
    const bsRows = readManualCsv("capacity/installed-by-source.csv");

    // --- Commissioning (source-wise GW per quarter; ENERGY_COLORS) ---
    const categories = commRows.map((r) => r.period);
    const commSeries = COMM_SOURCES.map((src) => ({
      key: src,
      label: COMM_LABELS[src],
      color: energyColor(src),
      values: commRows.map((r) => Number(r[src])),
    }));
    const commissioningQuarterly = { categories, series: commSeries };

    // --- Installed mix (GW + share) ---
    const totalInstalled = mixRows.reduce((s, r) => s + Number(r.capacity_gw), 0);
    const installedMix: InstalledMixEntry[] = mixRows
      .map((r) => ({
        source: r.source,
        capacityGw: Number(r.capacity_gw),
        share: totalInstalled ? round2(Number(r.capacity_gw) / totalInstalled) : 0,
      }))
      .sort((a, b) => b.capacityGw - a.capacityGw || a.source.localeCompare(b.source));

    // --- Solar segments (annual, by segment; categorical colours) ---
    const solarSegments: Series[] = SEGMENTS.map((seg, i) => ({
      key: seg.replace(/_/g, "-"),
      label: SEG_LABELS[seg],
      unit: "GW",
      color: categoricalColor(i),
      points: segRows.map((r) => ({ period: r.period, value: Number(r[seg]) })),
    }));

    // --- State-wise solar (Others appended last) ---
    const isOthers = (s: string) => /^others/i.test(s);
    const stateSolar: StateSolar[] = [
      ...stRows
        .filter((r) => !isOthers(r.state))
        .map((r) => ({ state: r.state, solarGw: Number(r.solar_gw) }))
        .sort((a, b) => b.solarGw - a.solarGw || a.state.localeCompare(b.state)),
      ...stRows
        .filter((r) => isOthers(r.state))
        .map((r) => ({ state: r.state, solarGw: Number(r.solar_gw) })),
    ];

    // --- RE-share trend ---
    const reShareTrend: Series[] = [
      {
        key: "re-share",
        label: "RE share",
        unit: "%",
        color: "#F59E0B",
        points: rsRows.map((r) => ({ period: r.period, value: Number(r.re_share_pct) })),
      },
    ];

    // --- Cumulative installed solar (the long-run S-curve to 150 GW) ---
    const installedHistory: Series[] = [
      {
        key: "solar-installed",
        label: "Cumulative solar",
        unit: "GW",
        color: energyColor("solar"),
        points: ihRows.map((r) => ({ period: r.period, value: Number(r.solar_gw) })),
      },
    ];

    // --- Installed capacity by source, annual (~10yr energy-mix transition) ---
    // FY26 matches the installed-mix snapshot; historical splits are CEA-derived.
    const installedBySource: Series[] = BY_SOURCE.map((src) => ({
      key: src,
      label: BY_SOURCE_LABELS[src],
      unit: "GW",
      color: energyColor(src),
      points: bsRows.map((r) => ({ period: r.period, value: Number(r[src]) })),
    }));

    // --- Metrics (pass-through) ---
    const metrics: CapacityMetric[] = metRows.map((r) => ({
      metric: r.metric,
      value: Number(r.value),
      unit: r.unit,
      confidence: r.confidence as Confidence,
      ...(r.note ? { note: r.note } : {}),
    }));

    // --- KPIs (real CEA / MNRE values · 31 Mar 2026 / FY26) ---
    const metricVal = (re: RegExp) =>
      Number(metRows.find((r) => re.test(r.metric))?.value ?? 0);
    const solarInstalled = Number(mixRows.find((r) => r.source === "solar")?.capacity_gw ?? 0);
    const fy26SolarAdds = Number(commRows[commRows.length - 1]?.solar ?? 0);
    const reGenShare = Number(rsRows[rsRows.length - 1]?.re_share_pct ?? 0);

    const kpis: Kpi[] = [
      { key: "total_installed", label: "Total installed capacity", value: round2(totalInstalled), unit: "GW", confidence: "high", hint: "31 Mar 2026" },
      { key: "solar_installed", label: "Solar installed", value: solarInstalled, unit: "GW", confidence: "high", hint: "cumulative" },
      { key: "non_fossil_share", label: "Non-fossil share of capacity", value: metricVal(/non-fossil share/i), unit: "%", confidence: "high", hint: "31 Mar 2026" },
      { key: "fy26_solar_adds", label: "FY26 solar additions", value: fy26SolarAdds, unit: "GW", confidence: "high", hint: "record" },
      { key: "fy26_nonfossil_adds", label: "FY26 non-fossil additions", value: metricVal(/non-fossil additions/i), unit: "GW", confidence: "high", hint: "record" },
      { key: "re_gen_share", label: "RE share of generation", value: reGenShare, unit: "%", confidence: "medium", hint: "FY26" },
    ];

    // --- Sanity (warn) ---
    const shareSum = installedMix.reduce((s, m) => s + m.share, 0);
    if (Math.abs(shareSum - 1) > 0.02) {
      console.warn(`[capacity] installed-mix shares sum to ${round2(shareSum)} (≠ ~1.0)`);
    }

    // --- Provenance (distinct source+url+confidence; feeds share the vintage) ---
    const srcMap = new Map<string, SourceRef>();
    const addSrc = (name?: string, conf?: string, url?: string) => {
      if (!name || !conf) return;
      const u = url?.trim() || undefined;
      const key = `${name}|${u ?? ""}|${conf}`;
      if (!srcMap.has(key)) {
        srcMap.set(key, { name, ...(u ? { url: u } : {}), asOf: CAP_AS_OF, confidence: conf as Confidence });
      }
    };
    for (const r of commRows) addSrc(r.source, r.confidence, r.source_url);
    for (const r of ihRows) addSrc(r.source, r.confidence, r.source_url);
    for (const r of mixRows) addSrc(r.source_ref, r.confidence, r.source_url);
    for (const r of segRows) addSrc(r.source, r.confidence, r.source_url);
    for (const r of stRows) addSrc(r.source, r.confidence, r.source_url);
    for (const r of rsRows) addSrc(r.source, r.confidence, r.source_url);
    for (const r of metRows) addSrc(r.source, r.confidence, r.source_url);
    for (const r of bsRows) addSrc(r.source, r.confidence, r.source_url);
    const sources = [...srcMap.values()].sort(
      (a, b) =>
        a.name.localeCompare(b.name) ||
        (a.url ?? "").localeCompare(b.url ?? "") ||
        a.confidence.localeCompare(b.confidence),
    );

    const data: CapacityData = {
      kpis,
      commissioningQuarterly,
      installedMix,
      solarSegments,
      stateSolar,
      reShareTrend,
      installedHistory,
      installedBySource,
      metrics,
    };

    writeSnapshot<CapacityData>("capacity", "grid", {
      asOf: maxAsOf(sources),
      cadence: "quarterly",
      coverage: "India · all-India installed capacity, commissioning & generation mix",
      sources,
      notes: [
        "Installed mix is the CEA all-India snapshot at 31 Mar 2026 (532.74 GW total).",
        "Annual additions are an 8-year solar + wind history (FY19–FY26, GW); FY26 solar 44.6 GW and wind 6.05 GW are official CEA/MNRE records.",
        "Cumulative installed solar follows the long-run S-curve — ~30 GW (FY19) → 150.26 GW (FY26), crossing 100 GW in FY25.",
        "Solar segment splits are MNRE / JMK Research estimates; state-wise solar tails are bucketed as Others.",
        "Installed capacity BY SOURCE is a curated 10-year annual series (FY17–FY26) from CEA All India Installed Capacity / IRENA; FY26 matches the installed-mix snapshot (532.74 GW) and historical year splits are CEA-derived (medium confidence).",
      ],
      data,
    });
  },
});
