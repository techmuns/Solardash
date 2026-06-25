import { definePipeline } from "../lib/pipeline";
import { maxAsOf, readManualCsv, writeSnapshot } from "../lib/io";
import type { Confidence, Kpi, SourceRef } from "../../src/data/types/core";
import type {
  KusumComponent,
  PmSuryaGharMetric,
  PolicyData,
  PriceItem,
  Scheme,
} from "../../src/data/types/policy";

const POLICY_AS_OF = "2026-03-31";

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
    const priceRows = readManualCsv("policy/prices.csv");

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
    const prices: PriceItem[] = priceRows.map((r) => ({
      item: r.item,
      value: Number(r.value),
      unit: r.unit,
      confidence: r.confidence as Confidence,
      ...(r.note ? { note: r.note } : {}),
    }));

    // --- KPIs ---
    const activeCount = schemes.filter((s) => /active|effective/i.test(s.status)).length;
    const sgInstall = pmSuryaGhar.find((m) => /install/i.test(m.metric))?.value ?? 0;
    const sgTarget = pmSuryaGhar.find((m) => /target/i.test(m.metric))?.value ?? 0;
    const sgProgress = sgTarget ? Math.round((sgInstall / sgTarget) * 100) : 0;

    const kpis: Kpi[] = [
      { key: "active_schemes", label: "Active schemes", value: activeCount, confidence: "medium", hint: "policy toolkit" },
      { key: "surya_progress", label: "PM Surya Ghar progress", value: sgProgress, unit: "%", confidence: "medium", hint: "installed ÷ target" },
      { key: "pli_capacity", label: "PLI capacity supported", value: 48.3, unit: "GW", confidence: "medium", hint: "₹24,000 cr outlay" },
      { key: "bcd_modules", label: "BCD on modules", value: 40, unit: "%", confidence: "high", hint: "cells 27.5%" },
      { key: "green_h2", label: "Green-H₂ target", value: 5, unit: "MT/yr", confidence: "medium", hint: "by 2030" },
    ];

    // --- Sanity (warn, never throw) ---
    for (const k of kusum) {
      if (k.executedGw > k.targetGw) {
        console.warn(`[policy] KUSUM ${k.component}: executed ${k.executedGw} > target ${k.targetGw} GW`);
      }
    }

    // --- Provenance (distinct source+confidence; feeds share the vintage) ---
    const srcMap = new Map<string, SourceRef>();
    const addSrc = (name?: string, conf?: string) => {
      if (!name || !conf) return;
      const key = `${name}|${conf}`;
      if (!srcMap.has(key)) srcMap.set(key, { name, asOf: POLICY_AS_OF, confidence: conf as Confidence });
    };
    for (const r of [...schemeRows, ...sgRows, ...kusumRows, ...priceRows]) {
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
      prices,
    };

    writeSnapshot<PolicyData>("policy", "policy", {
      asOf: maxAsOf(sources),
      cadence: "quarterly",
      coverage: "India · solar / renewable policy, incentives & levelised cost",
      sources,
      notes: [
        "Scheme tracker spans manufacturing (ALMM/PLI/BCD), demand (DCR/CPSU/RPO/ISTS/Green-H2) and consumer (PM Surya Ghar/KUSUM) policy.",
        "Solar + BESS LCOE is benchmarked from Ember's levelised-cost estimates.",
        "ALMM I/II/III milestones are sourced from the manufacturing snapshot (not duplicated here).",
      ],
      data,
    });
  },
});
