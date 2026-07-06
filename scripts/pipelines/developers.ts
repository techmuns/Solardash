import { definePipeline } from "../lib/pipeline";
import { maxAsOf, readManualCsv, writeSnapshot } from "../lib/io";
import { fyQuarterIndex, quarterDiff } from "../../src/lib/fiscal";
import type { Confidence, Kpi, SourceRef } from "../../src/data/types/core";
import type { TenderType } from "../../src/data/types/tenders";
import type {
  CapacityFunnel,
  CommissioningStatus,
  CommissioningTranche,
  Developer,
  DevelopersData,
  GuidanceStatement,
  PortfolioMixEntry,
  PpaRecord,
} from "../../src/data/types/developers";

// Vintage date for the capacity / funnel feeds (no per-row date in those CSVs).
const ROSTER_AS_OF = "2026-03-31";

const TECH_ORDER: TenderType[] = ["solar", "wind", "hybrid", "fdre"];

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function num(value: string | undefined): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}
const n0 = (v: string | undefined) => num(v) ?? 0;

export const developersPipeline = definePipeline({
  name: "developers",
  section: "developers",
  cadence: "quarterly",
  run() {
    const devRows = readManualCsv("developers/developers.csv");
    const ppaRows = readManualCsv("developers/ppas.csv");
    const commRows = readManualCsv("developers/commissioning.csv");

    // --- PPA tracker (newest first) ---
    const ppaTracker: PpaRecord[] = ppaRows
      .map((r) => {
        const tariffRs = num(r.tariff_rs);
        return {
          id: r.id,
          date: r.date,
          period: r.period,
          developer: r.developer,
          agency: r.agency,
          tenderType: r.tender_type as TenderType,
          capacityMw: Number(r.capacity_mw),
          ...(tariffRs != null ? { tariffRs } : {}),
          confidence: r.confidence as Confidence,
          ...(r.note ? { sourceNote: r.note } : {}),
          ...(r.source_url?.trim() ? { sourceUrl: r.source_url.trim() } : {}),
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

    // PPA-signed GW per developer (matched by name).
    const ppaGwByDev = new Map<string, number>();
    for (const p of ppaTracker) {
      ppaGwByDev.set(p.developer, (ppaGwByDev.get(p.developer) ?? 0) + p.capacityMw / 1000);
    }

    // --- Roster (sorted by operational desc) ---
    const roster: Developer[] = devRows
      .map((r) => {
        const name = r.developer;
        const signed = ppaGwByDev.get(name);
        return {
          name,
          operationalGw: n0(r.operational_gw),
          underConstructionGw: n0(r.under_construction_gw),
          pipelineGw: n0(r.pipeline_gw),
          targetGw: n0(r.target_gw),
          targetYear: r.target_year,
          mix: {
            solar: n0(r.solar_gw),
            wind: n0(r.wind_gw),
            hybrid: n0(r.hybrid_gw),
            fdre: n0(r.fdre_gw),
            bessGwh: n0(r.bess_gwh),
          },
          ...(signed && signed > 0 ? { ppaSignedGw: round1(signed) } : {}),
          confidence: r.confidence as Confidence,
          ...(r.note ? { sourceNote: r.note } : {}),
        };
      })
      .sort((a, b) => b.operationalGw - a.operationalGw || a.name.localeCompare(b.name));

    // --- Capacity funnel (categories sorted by total portfolio desc) ---
    const byTotal = [...roster].sort((a, b) => {
      const ta = a.operationalGw + a.underConstructionGw + a.pipelineGw;
      const tb = b.operationalGw + b.underConstructionGw + b.pipelineGw;
      return tb - ta || a.name.localeCompare(b.name);
    });
    const capacityFunnel: CapacityFunnel = {
      categories: byTotal.map((d) => d.name),
      operational: byTotal.map((d) => d.operationalGw),
      underConstruction: byTotal.map((d) => d.underConstructionGw),
      pipeline: byTotal.map((d) => d.pipelineGw),
    };

    // --- Commissioning guidance (group statements by tranche → revision history → slippage) ---
    const byTranche = new Map<string, Record<string, string>[]>();
    for (const r of commRows) {
      const arr = byTranche.get(r.tranche_id) ?? [];
      arr.push(r);
      byTranche.set(r.tranche_id, arr);
    }
    const commissioning: CommissioningTranche[] = [...byTranche.entries()]
      .map(([id, rows]) => {
        // Statements oldest-first so history[0] is the original guidance.
        const stmts = [...rows].sort(
          (a, b) =>
            a.stated_on.localeCompare(b.stated_on) ||
            a.concall.localeCompare(b.concall),
        );
        const history: GuidanceStatement[] = stmts.map((s) => ({
          statedOn: s.stated_on,
          concall: s.concall,
          targetPeriod: s.target_period,
          status: s.status as CommissioningStatus,
          ...(s.source_url?.trim() ? { sourceUrl: s.source_url.trim() } : {}),
        }));
        const first = stmts[0];
        const last = stmts[stmts.length - 1];
        return {
          id,
          developer: last.developer,
          project: last.project,
          tech: last.tech as TenderType,
          capacityGw: Number(last.capacity_gw),
          history,
          originalTarget: first.target_period,
          currentTarget: last.target_period,
          status: last.status as CommissioningStatus,
          slipQuarters: quarterDiff(first.target_period, last.target_period),
          confidence: last.confidence as Confidence,
          ...(last.note ? { sourceNote: last.note } : {}),
          ...(last.source_url?.trim() ? { sourceUrl: last.source_url.trim() } : {}),
        };
      })
      // Earliest current target first; then largest; then id for stability.
      .sort(
        (a, b) =>
          fyQuarterIndex(a.currentTarget) - fyQuarterIndex(b.currentTarget) ||
          b.capacityGw - a.capacityGw ||
          a.id.localeCompare(b.id),
      );

    // --- Portfolio mix (aggregate tech GW + share; BESS separate as GWh) ---
    const mixGw: Record<string, number> = { solar: 0, wind: 0, hybrid: 0, fdre: 0 };
    let bessGwh = 0;
    for (const d of roster) {
      mixGw.solar += d.mix.solar;
      mixGw.wind += d.mix.wind;
      mixGw.hybrid += d.mix.hybrid;
      mixGw.fdre += d.mix.fdre;
      bessGwh += d.mix.bessGwh;
    }
    const totalMixGw = TECH_ORDER.reduce((s, t) => s + mixGw[t], 0);
    const portfolioMix: PortfolioMixEntry[] = TECH_ORDER.map((t) => ({
      key: t,
      gw: round1(mixGw[t]),
      share: totalMixGw ? round2(mixGw[t] / totalMixGw) : 0,
    }))
      .filter((m) => m.gw > 0)
      .sort((a, b) => b.gw - a.gw || a.key.localeCompare(b.key));
    bessGwh = round1(bessGwh);

    // --- KPIs ---
    const sumOperational = round1(roster.reduce((s, d) => s + d.operationalGw, 0));
    const sumBuildout = round1(
      roster.reduce((s, d) => s + d.underConstructionGw + d.pipelineGw, 0),
    );
    const sumTarget = round1(roster.reduce((s, d) => s + d.targetGw, 0));
    const largest = roster[0];

    const kpis: Kpi[] = [
      {
        key: "operational_gw",
        label: "Operational capacity",
        value: sumOperational,
        unit: "GW",
        confidence: "medium",
        hint: `${roster.length} developers`,
      },
      {
        key: "buildout_gw",
        label: "Under-construction + pipeline",
        value: sumBuildout,
        unit: "GW",
        confidence: "medium",
        hint: "near-term build-out",
      },
      {
        key: "target_gw",
        label: "FY30 target (aggregate)",
        value: sumTarget,
        unit: "GW",
        confidence: "modelled",
        hint: "sum of stated targets",
      },
      {
        key: "developers",
        label: "Developers tracked",
        value: roster.length,
        confidence: "high",
        hint: "listed & large IPPs",
      },
      {
        key: "largest",
        label: "Largest by operational",
        value: largest ? largest.name : "—",
        confidence: "medium",
        hint: largest ? `${largest.operationalGw} GW operational` : undefined,
      },
    ];

    // --- Light sanity checks (warn, never throw — data is partly modelled) ---
    for (const d of roster) {
      if (d.operationalGw > d.targetGw) {
        console.warn(`[developers] ${d.name}: operational ${d.operationalGw} > target ${d.targetGw} GW`);
      }
      const mixSum = d.mix.solar + d.mix.wind + d.mix.hybrid + d.mix.fdre;
      if (Math.abs(mixSum - d.operationalGw) > 0.5) {
        console.warn(
          `[developers] ${d.name}: mix sum ${round1(mixSum)} ≉ operational ${d.operationalGw} GW`,
        );
      }
    }

    // --- Provenance: distinct (source, url, confidence) triples across feeds ---
    const srcMap = new Map<
      string,
      { name: string; url?: string; confidence: Confidence; asOf: string }
    >();
    const addSource = (
      name: string,
      confidence: Confidence,
      asOf: string,
      url?: string,
    ) => {
      const u = url?.trim() || undefined;
      const key = `${name}|${u ?? ""}|${confidence}`;
      const ex = srcMap.get(key);
      if (!ex) srcMap.set(key, { name, ...(u ? { url: u } : {}), confidence, asOf });
      else if (asOf > ex.asOf) ex.asOf = asOf;
    };
    for (const r of devRows) addSource(r.source, r.confidence as Confidence, ROSTER_AS_OF, r.source_url);
    for (const r of ppaRows) addSource(r.source, r.confidence as Confidence, r.date, r.source_url);
    for (const r of commRows) addSource(r.source, r.confidence as Confidence, r.stated_on, r.source_url);
    const sources: SourceRef[] = [...srcMap.values()]
      .map((s) => ({
        name: s.name,
        ...(s.url ? { url: s.url } : {}),
        asOf: s.asOf,
        confidence: s.confidence,
      }))
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name) ||
          (a.url ?? "").localeCompare(b.url ?? "") ||
          a.confidence.localeCompare(b.confidence),
      );

    const data: DevelopersData = {
      kpis,
      roster,
      capacityFunnel,
      portfolioMix,
      bessGwh,
      ppaTracker,
      commissioning,
    };

    writeSnapshot<DevelopersData>("developers", "portfolio", {
      asOf: maxAsOf(sources),
      cadence: "quarterly",
      coverage: "India · large & listed IPPs / developers",
      sources,
      notes: [
        "Roster operational/UC/pipeline capacities are FY26 company disclosures & investor presentations; lower-confidence rows are user-maintained estimates.",
        "FY30 targets and tech-mix splits are company disclosures / investor presentations; PPA-signed GW is derived from the PPA tracker.",
        "The PPA tracker lists real SECI / NTPC / SJVN auction signings (awarded MW, ₹/kWh) sourced from SECI results & trade press.",
        "BESS is tracked in GWh and excluded from the GW-share portfolio donut.",
        "Commissioning guidance is captured per capacity tranche from company concalls / investor disclosures, keeping each revision so slippage (a pushed-out COD) is tracked; lower-confidence rows are Munshot estimates.",
      ],
      data,
    });
  },
});
