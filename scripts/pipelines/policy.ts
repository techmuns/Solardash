import { definePipeline } from "../lib/pipeline";
import { maxAsOf, readManualCsv, writeSnapshot } from "../lib/io";
import { categoricalColor, energyColor } from "../../src/lib/colors";
import type { Confidence, Kpi, Series, SourceRef } from "../../src/data/types/core";
import type {
  KusumComponent,
  LocalisationWave,
  PmSuryaGharMetric,
  PolicyData,
  PriceItem,
  Scheme,
} from "../../src/data/types/policy";

const POLICY_AS_OF = "2026-03-31";

const TAM_SEGMENTS = [
  { col: "modules", key: "modules", label: "Modules" },
  { col: "cells", key: "cells", label: "Cells" },
  { col: "bess", key: "bess", label: "BESS" },
  { col: "wafer_ingot_glass", key: "wafer-ingot-glass", label: "Wafer / Ingot / Glass" },
  { col: "transformers_inverters", key: "transformers-inverters", label: "Transformers / Inverters" },
];
const TAM_EXPECTED: Record<string, number> = { FY25: 51, FY27: 100, FY30: 220, FY35: 450 };

function num(v: string | undefined): number | undefined {
  if (v == null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export const policyPipeline = definePipeline({
  name: "policy",
  section: "policy",
  cadence: "quarterly",
  run() {
    const schemeRows = readManualCsv("policy/schemes.csv");
    const sgRows = readManualCsv("policy/pm-surya-ghar.csv");
    const kusumRows = readManualCsv("policy/kusum.csv");
    const waveRows = readManualCsv("policy/localisation-waves.csv");
    const bessRows = readManualCsv("policy/bess-cost-curve.csv");
    const priceRows = readManualCsv("policy/prices.csv");
    const tamRows = readManualCsv("policy/tam.csv");

    // --- Typed pass-throughs ---
    const schemes: Scheme[] = schemeRows.map((r) => {
      const allocationCr = num(r.allocation_cr);
      return {
        scheme: r.scheme,
        category: r.category,
        target: r.target,
        status: r.status,
        ...(allocationCr != null ? { allocationCr } : {}),
        keyMetric: r.key_metric,
        confidence: r.confidence as Confidence,
        ...(r.note ? { note: r.note } : {}),
      };
    });
    const pmSuryaGhar: PmSuryaGharMetric[] = sgRows.map((r) => ({
      metric: r.metric,
      value: Number(r.value),
      unit: r.unit,
      confidence: r.confidence as Confidence,
    }));
    const kusum: KusumComponent[] = kusumRows.map((r) => ({
      component: r.component,
      scope: r.scope,
      targetGw: Number(r.target_gw),
      executedGw: Number(r.executed_gw),
      confidence: r.confidence as Confidence,
    }));
    const localisationWaves: LocalisationWave[] = waveRows.map((r) => ({
      wave: r.wave,
      period: r.period,
      scope: r.scope,
      confidence: r.confidence as Confidence,
    }));
    const prices: PriceItem[] = priceRows.map((r) => ({
      item: r.item,
      value: Number(r.value),
      unit: r.unit,
      confidence: r.confidence as Confidence,
      ...(r.note ? { note: r.note } : {}),
    }));

    // --- BESS cost curve ($/kWh by year) ---
    const bessCostCurve: Series[] = [
      {
        key: "bess-cost",
        label: "BESS pack cost",
        unit: "USD/kWh",
        color: energyColor("bess"),
        points: bessRows.map((r) => ({
          period: r.year,
          value: Number(r.usd_per_kwh),
          ...(r.confidence === "modelled" ? { modelled: true } : {}),
        })),
      },
    ];

    // --- Manufacturing TAM (one Series per segment) ---
    const tam: Series[] = TAM_SEGMENTS.map((seg, i) => ({
      key: seg.key,
      label: seg.label,
      color: categoricalColor(i),
      points: tamRows.map((r) => ({ period: r.period, value: Number(r[seg.col]) })),
    }));

    // --- KPIs ---
    const activeCount = schemes.filter((s) => /active|effective/i.test(s.status)).length;
    const sgInstall = pmSuryaGhar.find((m) => /install/i.test(m.metric))?.value ?? 0;
    const sgTarget = pmSuryaGhar.find((m) => /target/i.test(m.metric))?.value ?? 0;
    const sgProgress = sgTarget ? Math.round((sgInstall / sgTarget) * 100) : 0;
    const tamFy35 = tam.reduce(
      (s, seg) => s + (seg.points.find((p) => p.period === "FY35")?.value ?? 0),
      0,
    );

    const kpis: Kpi[] = [
      { key: "active_schemes", label: "Active schemes", value: activeCount, confidence: "medium", hint: "policy toolkit" },
      { key: "surya_progress", label: "PM Surya Ghar progress", value: sgProgress, unit: "%", confidence: "medium", hint: "installed ÷ target" },
      { key: "pli_capacity", label: "PLI capacity supported", value: 48.3, unit: "GW", confidence: "medium", hint: "₹24,000 cr outlay" },
      { key: "bcd_modules", label: "BCD on modules", value: 40, unit: "%", confidence: "high", hint: "cells 27.5%" },
      { key: "green_h2", label: "Green-H₂ target", value: 5, unit: "MT/yr", confidence: "medium", hint: "by 2030" },
      { key: "tam_fy35", label: "Manufacturing TAM (FY35)", value: `₹${tamFy35 / 100}L cr`, confidence: "medium", hint: "all segments" },
    ];

    // --- Sanity (warn, never throw) ---
    for (const k of kusum) {
      if (k.executedGw > k.targetGw) {
        console.warn(`[policy] KUSUM ${k.component}: executed ${k.executedGw} > target ${k.targetGw} GW`);
      }
    }
    for (const [period, expected] of Object.entries(TAM_EXPECTED)) {
      const sum = tam.reduce(
        (s, seg) => s + (seg.points.find((p) => p.period === period)?.value ?? 0),
        0,
      );
      if (Math.abs(sum - expected) > 1) {
        console.warn(`[policy] TAM ${period} sum ${sum} ≠ expected ${expected}`);
      }
    }

    // --- Provenance (distinct source+confidence; feeds share the vintage) ---
    const srcMap = new Map<string, SourceRef>();
    const addSrc = (name?: string, conf?: string) => {
      if (!name || !conf) return;
      const key = `${name}|${conf}`;
      if (!srcMap.has(key)) srcMap.set(key, { name, asOf: POLICY_AS_OF, confidence: conf as Confidence });
    };
    for (const r of [...schemeRows, ...sgRows, ...kusumRows, ...waveRows, ...bessRows, ...priceRows, ...tamRows]) {
      addSrc(r.source, r.confidence);
    }
    const sources = [...srcMap.values()].sort(
      (a, b) => a.name.localeCompare(b.name) || a.confidence.localeCompare(b.confidence),
    );

    const data: PolicyData = {
      kpis,
      schemes,
      pmSuryaGhar,
      kusum,
      localisationWaves,
      bessCostCurve,
      prices,
      tam,
    };

    writeSnapshot<PolicyData>("policy", "policy", {
      asOf: maxAsOf(sources),
      cadence: "quarterly",
      coverage: "India · solar / renewable policy, incentives & value-chain pricing",
      sources,
      notes: [
        "Scheme tracker spans manufacturing (ALMM/PLI/BCD), demand (DCR/CPSU/RPO/ISTS/Green-H2) and consumer (PM Surya Ghar/KUSUM) policy.",
        "BESS cost curve, value-chain prices and manufacturing TAM are VQ Research / BNEF / PVInsights estimates; later years are modelled.",
        "ALMM I/II/III milestones are sourced from the manufacturing snapshot (not duplicated here).",
      ],
      data,
    });
  },
});
