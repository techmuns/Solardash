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

const COMM_SOURCES = ["solar", "wind", "hybrid", "thermal", "nuclear", "hydro", "bess"];
const COMM_LABELS: Record<string, string> = {
  solar: "Solar",
  wind: "Wind",
  hybrid: "Hybrid",
  thermal: "Thermal",
  nuclear: "Nuclear",
  hydro: "Hydro",
  bess: "BESS",
};
const SEGMENTS = ["utility", "open_access", "rooftop", "kusum"];
const SEG_LABELS: Record<string, string> = {
  utility: "Utility",
  open_access: "Open access",
  rooftop: "Rooftop",
  kusum: "KUSUM",
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export const capacityPipeline = definePipeline({
  name: "capacity",
  section: "capacity",
  cadence: "quarterly",
  run() {
    const commRows = readManualCsv("capacity/commissioning-quarterly.csv");
    const mixRows = readManualCsv("capacity/installed-mix.csv");
    const segRows = readManualCsv("capacity/solar-segments.csv");
    const stRows = readManualCsv("capacity/state-solar.csv");
    const rsRows = readManualCsv("capacity/re-share.csv");
    const metRows = readManualCsv("capacity/metrics.csv");

    // --- Commissioning (source-wise GW per quarter; ENERGY_COLORS) ---
    const categories = commRows.map((r) => r.period);
    const commSeries = COMM_SOURCES.map((src) => ({
      key: src,
      label: COMM_LABELS[src],
      color: energyColor(src),
      values: commRows.map((r) => Number(r[src])),
    }));
    const commissioningQuarterly = { categories, series: commSeries };
    const quarterTotals = categories.map((_, i) =>
      round1(commSeries.reduce((s, ser) => s + ser.values[i], 0)),
    );

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

    // --- Metrics (pass-through) ---
    const metrics: CapacityMetric[] = metRows.map((r) => ({
      metric: r.metric,
      value: Number(r.value),
      unit: r.unit,
      confidence: r.confidence as Confidence,
      ...(r.note ? { note: r.note } : {}),
    }));

    // --- KPIs ---
    const latestIdx = categories.length - 1;
    const latestTotal = quarterTotals[latestIdx];
    const latestSolar = commSeries.find((s) => s.key === "solar")?.values[latestIdx] ?? 0;
    const solarShareAdds = latestTotal ? round1((latestSolar / latestTotal) * 100) : 0;
    const solarInstalled = Number(mixRows.find((r) => r.source === "solar")?.capacity_gw ?? 0);
    const reShareLatest = Number(rsRows[rsRows.length - 1]?.re_share_pct ?? 0);
    const cuf = Number(metRows.find((r) => /CUF/i.test(r.metric))?.value ?? 0);
    const latestConf = (commRows[latestIdx]?.confidence as Confidence) ?? "medium";

    const kpis: Kpi[] = [
      { key: "total_installed", label: "Total installed capacity", value: round1(totalInstalled), unit: "GW", confidence: "medium", hint: "all sources" },
      { key: "solar_installed", label: "Solar installed", value: solarInstalled, unit: "GW", confidence: "medium", hint: "cumulative" },
      { key: "re_share", label: "RE share of generation", value: reShareLatest, unit: "%", confidence: "medium", hint: "FY26" },
      { key: "latest_adds", label: "Latest-quarter additions", value: latestTotal, unit: "GW", confidence: latestConf, hint: categories[latestIdx] },
      { key: "solar_share_adds", label: "Solar share of additions", value: solarShareAdds, unit: "%", confidence: latestConf, hint: categories[latestIdx] },
      { key: "solar_cuf", label: "Solar CUF", value: cuf, unit: "%", confidence: "medium", hint: "national avg" },
    ];

    // --- Sanity (warn) ---
    const shareSum = installedMix.reduce((s, m) => s + m.share, 0);
    if (Math.abs(shareSum - 1) > 0.02) {
      console.warn(`[capacity] installed-mix shares sum to ${round2(shareSum)} (≠ ~1.0)`);
    }

    // --- Provenance (distinct source+confidence; feeds share the vintage) ---
    const srcMap = new Map<string, SourceRef>();
    const addSrc = (name?: string, conf?: string) => {
      if (!name || !conf) return;
      const key = `${name}|${conf}`;
      if (!srcMap.has(key)) srcMap.set(key, { name, asOf: CAP_AS_OF, confidence: conf as Confidence });
    };
    for (const r of commRows) addSrc(r.source, r.confidence);
    for (const r of mixRows) addSrc(r.source_ref, r.confidence);
    for (const r of segRows) addSrc(r.source, r.confidence);
    for (const r of stRows) addSrc(r.source, r.confidence);
    for (const r of rsRows) addSrc(r.source, r.confidence);
    for (const r of metRows) addSrc(r.source, r.confidence);
    const sources = [...srcMap.values()].sort(
      (a, b) => a.name.localeCompare(b.name) || a.confidence.localeCompare(b.confidence),
    );

    const data: CapacityData = {
      kpis,
      commissioningQuarterly,
      installedMix,
      solarSegments,
      stateSolar,
      reShareTrend,
      metrics,
    };

    writeSnapshot<CapacityData>("capacity", "grid", {
      asOf: maxAsOf(sources),
      cadence: "quarterly",
      coverage: "India · all-India installed capacity, commissioning & generation mix",
      sources,
      notes: [
        "Quarterly commissioning is source-wise GW added; the latest quarter is modelled. Installed mix is the latest cumulative snapshot.",
        "Solar segment splits are JMK Research estimates; state-wise solar tails are bucketed as Others.",
      ],
      data,
    });
  },
});
