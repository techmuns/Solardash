import { definePipeline } from "../lib/pipeline";
import { maxAsOf, readManualCsv, writeSnapshot } from "../lib/io";
import { buildCommissioningTranches } from "../lib/commissioning";
import { OTHERS_COLOR, categoricalColor } from "../../src/lib/colors";
import type { Confidence, Kpi, Series, SourceRef } from "../../src/data/types/core";
import type {
  AlmmPhase,
  CellPlayer,
  ManufacturingData,
  ModulePlayer,
  PliAwardee,
  QuarterlySeries,
  SupplyDemandSegment,
} from "../../src/data/types/manufacturing";

// Vintage for the manufacturing feeds (no per-row dates in these CSVs).
const MFG_AS_OF = "2026-03-31";
const QUARTERS = ["Q1FY26", "Q2FY26", "Q3FY26", "Q4FY26"];
const RAMP = [0.22, 0.24, 0.26, 0.28]; // sums to 1.0

const round1 = (n: number) => Math.round(n * 10) / 10;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

function num(v: string | undefined): number | undefined {
  if (v == null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const manufacturingPipeline = definePipeline({
  name: "manufacturing",
  section: "manufacturing",
  cadence: "quarterly",
  run() {
    const cellRows = readManualCsv("manufacturing/cell-capacity.csv");
    const moduleRows = readManualCsv("manufacturing/module-capacity.csv");
    const sdRows = readManualCsv("manufacturing/supply-demand.csv");
    const almmRows = readManualCsv("manufacturing/almm-timeline.csv");
    const pliRows = readManualCsv("manufacturing/pli-awardees.csv");
    const overrideRows = readManualCsv(
      "manufacturing/cell-production-quarterly-override.csv",
    );
    const chRows = readManualCsv("manufacturing/capacity-history.csv");
    const cellCommRows = readManualCsv("manufacturing/cell-commissioning.csv");

    // --- Cell players (sorted by nameplate desc) ---
    const cellPlayers: CellPlayer[] = cellRows
      .map((r) => {
        const productionGw = num(r.production_fy26e_gw);
        const utilizationPct = num(r.utilization_pct);
        return {
          player: r.player,
          nameplateGw: Number(r.nameplate_gw),
          almm2Gw: Number(r.almm2_gw),
          ...(productionGw != null ? { productionGw } : {}),
          ...(utilizationPct != null ? { utilizationPct } : {}),
          confidence: r.confidence as Confidence,
          ...(r.note ? { note: r.note } : {}),
        };
      })
      .sort((a, b) => b.nameplateGw - a.nameplateGw || a.player.localeCompare(b.player));

    // --- Modelled quarterly cell production (top-5 producers + Others) ---
    const producers = cellPlayers
      .filter((p) => p.productionGw != null)
      .sort((a, b) => (b.productionGw ?? 0) - (a.productionGw ?? 0) || a.player.localeCompare(b.player));
    const top5 = producers.slice(0, 5);
    const othersAnnual = producers
      .slice(5)
      .reduce((s, p) => s + (p.productionGw ?? 0), 0);

    const overrides = new Map<string, number>();
    for (const o of overrideRows) {
      const v = num(o.production_gw);
      if (o.player && o.period && v != null) {
        overrides.set(`${o.period}|${o.player}`, v);
      }
    }

    const quarterlyPlayers = [
      ...top5.map((p) => ({ name: p.player, annual: p.productionGw ?? 0 })),
      { name: "Others", annual: othersAnnual },
    ];
    const cellQuarterlySeries: (QuarterlySeries & { annual: number })[] =
      quarterlyPlayers.map((qp, idx) => {
        const values = QUARTERS.map((q, i) => {
          const ov = overrides.get(`${q}|${qp.name}`);
          return round3(ov != null ? ov : qp.annual * RAMP[i]);
        });
        return {
          key: slug(qp.name),
          label: qp.name,
          color: qp.name === "Others" ? OTHERS_COLOR : categoricalColor(idx),
          values,
          annual: qp.annual,
        };
      });
    const cellQuarterly = {
      categories: QUARTERS,
      series: cellQuarterlySeries.map(({ key, label, color, values }) => ({
        key,
        label,
        color,
        values,
      })),
    };

    // --- Module players (named desc, Others bucket last) ---
    const isOthers = (p: string) => /^others/i.test(p);
    const toModule = (r: Record<string, string>): ModulePlayer => ({
      player: r.player,
      almm1Gw: Number(r.almm1_gw),
      confidence: r.confidence as Confidence,
      ...(r.note ? { note: r.note } : {}),
    });
    const modulePlayers: ModulePlayer[] = [
      ...moduleRows
        .filter((r) => !isOthers(r.player))
        .map(toModule)
        .sort((a, b) => b.almm1Gw - a.almm1Gw || a.player.localeCompare(b.player)),
      ...moduleRows.filter((r) => isOthers(r.player)).map(toModule),
    ];

    // --- Pass-throughs ---
    const supplyDemand: SupplyDemandSegment[] = sdRows.map((r) => ({
      segment: r.segment,
      capacityFy26: Number(r.capacity_fy26_gw),
      capacityFy28: Number(r.capacity_fy28_gw),
      demandFy26: Number(r.demand_fy26_gw),
      demandFy28: Number(r.demand_fy28_gw),
    }));
    const almmTimeline: AlmmPhase[] = almmRows.map((r) => ({
      phase: r.phase,
      scope: r.scope,
      effectiveDate: r.effective_date,
      status: r.status,
      confidence: r.confidence as Confidence,
    }));
    // --- PLI awardees: cumulative capacity awarded by tranche (a time series
    // that surfaces who keeps winning across rounds — the "consistency" read) ---
    const PLI_TRANCHES = [
      { key: "Tranche I", label: "Tranche I · 2021" },
      { key: "Tranche II", label: "Tranche II · 2023" },
    ];
    const PLI_NAMED = 8; // named lines; the long tail is bucketed into "Others"

    // awarded: company → (tranche → GW awarded in that tranche)
    const awarded = new Map<string, Map<string, number>>();
    for (const r of pliRows) {
      const company = r.company?.trim();
      const tranche = r.tranche?.trim();
      const gw = num(r.capacity_gw);
      if (!company || !tranche || gw == null) continue;
      const byTranche = awarded.get(company) ?? new Map<string, number>();
      byTranche.set(tranche, (byTranche.get(tranche) ?? 0) + gw);
      awarded.set(company, byTranche);
    }

    // Per company: cumulative GW aligned to the tranche order, plus totals.
    const pliByCompany = [...awarded.entries()]
      .map(([company, byTranche]) => {
        let running = 0;
        const cumulative = PLI_TRANCHES.map((t) => {
          running = round3(running + (byTranche.get(t.key) ?? 0));
          return running;
        });
        return {
          company,
          cumulative,
          total: cumulative[cumulative.length - 1],
          tranchesWon: [...byTranche.values()].filter((v) => v > 0).length,
        };
      })
      .sort((a, b) => b.total - a.total || a.company.localeCompare(b.company));

    const pliAwardees: PliAwardee[] = pliByCompany.map((p) => ({
      company: p.company,
      capacityGw: p.total,
      tranchesWon: p.tranchesWon,
      confidence: "high",
    }));

    // Time series: top-N named as their own line, the rest folded into Others.
    const pliHistory: Series[] = pliByCompany.slice(0, PLI_NAMED).map((p, i) => ({
      key: slug(p.company),
      label: p.company,
      unit: "GW",
      color: categoricalColor(i),
      points: PLI_TRANCHES.map((t, ti) => ({ period: t.label, value: p.cumulative[ti] })),
    }));
    const pliTail = pliByCompany.slice(PLI_NAMED);
    if (pliTail.length > 0) {
      pliHistory.push({
        key: "others",
        label: `Others (${pliTail.length})`,
        unit: "GW",
        color: OTHERS_COLOR,
        points: PLI_TRANCHES.map((t, ti) => ({
          period: t.label,
          value: round3(pliTail.reduce((s, p) => s + p.cumulative[ti], 0)),
        })),
      });
    }

    // --- Cell & module nameplate capacity, annual (~5yr build-out trend) ---
    const capacityHistory: Series[] = [
      {
        key: "module",
        label: "Module",
        unit: "GW",
        color: "#2563EB",
        points: chRows.map((r) => ({ period: r.period, value: Number(r.module_gw) })),
      },
      {
        key: "cell",
        label: "Cell",
        unit: "GW",
        color: "#F59E0B",
        points: chRows.map((r) => ({ period: r.period, value: Number(r.cell_gw) })),
      },
    ];

    // --- Cell-fab commissioning guidance → revision history → slippage ---
    const cellCommissioning = buildCommissioningTranches(cellCommRows);

    // --- KPIs (current MNRE / Mercom / CareEdge headline + VQ production) ---
    const totalModuleGw = round1(modulePlayers.reduce((s, m) => s + m.almm1Gw, 0));
    const moduleSeg = supplyDemand.find((s) => s.segment === "module");
    const cellSeg = supplyDemand.find((s) => s.segment === "cell");
    // Cell-capacity headline is the ALMM-II enlisted figure (MNRE), not the VQ
    // player-table sum (which is a slightly higher early-2026 estimate).
    const totalCellGw =
      cellSeg?.capacityFy26 ?? round1(cellPlayers.reduce((s, c) => s + c.almm2Gw, 0));
    const prodPlayers = cellPlayers.filter((c) => c.productionGw != null);
    const sumProd = prodPlayers.reduce((s, c) => s + (c.productionGw ?? 0), 0);
    const sumAlmm2 = prodPlayers.reduce((s, c) => s + c.almm2Gw, 0);
    const avgUtil = sumAlmm2 ? round1((sumProd / sumAlmm2) * 100) : 0;
    const overcap =
      moduleSeg && moduleSeg.demandFy26
        ? round1(moduleSeg.capacityFy26 / moduleSeg.demandFy26)
        : 0;

    const kpis: Kpi[] = [
      { key: "module_capacity", label: "Module capacity (ALMM-I)", value: totalModuleGw, unit: "GW", confidence: "high", hint: "MNRE Mar 2026" },
      { key: "cell_capacity", label: "Cell capacity (ALMM-II)", value: totalCellGw, unit: "GW", confidence: "high", hint: "~27 GW enlisted" },
      { key: "cell_production", label: "Cell production FY26E", value: round1(sumProd), unit: "GW", confidence: "high", hint: "modelled quarterly split" },
      { key: "utilization", label: "Avg cell utilisation", value: avgUtil, unit: "%", confidence: "high", hint: "production ÷ ALMM-II" },
      { key: "overcapacity", label: "Module overcapacity", value: overcap, unit: "x", confidence: "high", hint: "173 ÷ 58 GW (FY26)" },
    ];

    // --- Sanity checks (warn, never throw) ---
    for (const s of cellQuarterlySeries) {
      const sum = s.values.reduce((a, v) => a + v, 0);
      if (Math.abs(sum - s.annual) > 0.05) {
        console.warn(
          `[manufacturing] quarterly Σ for ${s.label} ${round3(sum)} ≉ annual ${round3(s.annual)} GW`,
        );
      }
    }

    // --- Provenance (distinct source+url+confidence; feeds share the vintage) ---
    const srcMap = new Map<string, SourceRef>();
    const addSrc = (name?: string, conf?: string, url?: string) => {
      if (!name || !conf) return;
      const u = url?.trim() || undefined;
      const key = `${name}|${u ?? ""}|${conf}`;
      if (!srcMap.has(key)) {
        srcMap.set(key, { name, ...(u ? { url: u } : {}), asOf: MFG_AS_OF, confidence: conf as Confidence });
      }
    };
    for (const r of [
      ...cellRows,
      ...moduleRows,
      ...sdRows,
      ...almmRows,
      ...pliRows,
      ...chRows,
      ...cellCommRows,
    ]) {
      addSrc(r.source, r.confidence, r.source_url);
    }
    const sources = [...srcMap.values()].sort(
      (a, b) =>
        a.name.localeCompare(b.name) ||
        (a.url ?? "").localeCompare(b.url ?? "") ||
        a.confidence.localeCompare(b.confidence),
    );

    const data: ManufacturingData = {
      kpis,
      cellPlayers,
      modulePlayers,
      cellQuarterly,
      supplyDemand,
      almmTimeline,
      pliAwardees,
      pliHistory,
      capacityHistory,
      cellCommissioning,
    };

    writeSnapshot<ManufacturingData>("manufacturing", "value-chain", {
      asOf: maxAsOf(sources),
      cadence: "quarterly",
      coverage: "India · solar PV manufacturing value chain (cells, modules, wafers)",
      sources,
      notes: [
        `Quarterly cell production is MODELLED: each producer's FY26E annual output is split across ${QUARTERS.join("/")} with a ramp [${RAMP.join(", ")}]; drop real (player, quarter) actuals into manufacturing/cell-production-quarterly-override.csv to override a cell.`,
        "Module capacity is 173 GW enlisted under ALMM-I (MNRE Mar 2026; long tail bucketed as Others); the cell headline is ~27 GW ALMM-II (MNRE Feb 2026).",
        "Player-wise cell-capacity is MNRE / DCR Portal. PLI awardees are shown cumulatively by tranche (Tranche I: IREDA LoAs Nov–Dec 2021, 8.7 GW to 3 firms; Tranche II: SECI LoAs Apr 2023, 39.6 GW to 11 firms) — ~48 GW total. Reliance and Shirdi Sai/Indosol are the only firms selected in both tranches (each 4 → 10 GW cumulative).",
        "Basic Customs Duty (BCD): modules 40% / cells 27.5%.",
        "Cell & module nameplate capacity history is a curated ~5-year annual series (FY21–FY26) from JMK Research / Mercom; module crossed 74 GW at Mar 2025 (sourced) — this is nameplate, distinct from the ALMM-enlisted headline KPIs.",
      ],
      data,
    });
  },
});
