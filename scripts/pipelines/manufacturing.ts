import { definePipeline } from "../lib/pipeline";
import { maxAsOf, readManualCsv, writeSnapshot } from "../lib/io";
import {
  CATEGORICAL_COLORS,
  OTHERS_COLOR,
  categoricalColor,
} from "../../src/lib/colors";
import type { Confidence, Kpi, Series, SourceRef } from "../../src/data/types/core";
import type {
  AlmmPhase,
  CellPlayer,
  EconomicsMetric,
  ManufacturingData,
  ModulePlayer,
  QuarterlySeries,
  SupplyDemandSegment,
  WaferPoint,
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
    const mdRows = readManualCsv("manufacturing/module-demand.csv");
    const ctRows = readManualCsv("manufacturing/cell-trajectory.csv");
    const sdRows = readManualCsv("manufacturing/supply-demand.csv");
    const wfRows = readManualCsv("manufacturing/wafer.csv");
    const almmRows = readManualCsv("manufacturing/almm-timeline.csv");
    const ecoRows = readManualCsv("manufacturing/economics.csv");
    const overrideRows = readManualCsv(
      "manufacturing/cell-production-quarterly-override.csv",
    );

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

    // --- Demand / trajectory series (explicit colours) ---
    const moduleDemand: Series[] = [
      {
        key: "non-dcr",
        label: "Non-DCR",
        unit: "GW",
        color: "#64748B",
        points: mdRows.map((r) => ({ period: r.period, value: Number(r.non_dcr_gw) })),
      },
      {
        key: "dcr",
        label: "DCR",
        unit: "GW",
        color: "#F59E0B",
        points: mdRows.map((r) => ({ period: r.period, value: Number(r.dcr_gw) })),
      },
    ];
    const cellTrajectory: Series[] = [
      {
        key: "existing",
        label: "Existing",
        unit: "GW",
        color: "#64748B",
        points: ctRows.map((r) => ({ period: r.period, value: Number(r.existing_gw) })),
      },
      {
        key: "new",
        label: "New",
        unit: "GW",
        color: "#F59E0B",
        points: ctRows.map((r) => ({ period: r.period, value: Number(r.new_gw) })),
      },
    ];

    // --- Pass-throughs ---
    const supplyDemand: SupplyDemandSegment[] = sdRows.map((r) => ({
      segment: r.segment,
      capacityFy26: Number(r.capacity_fy26_gw),
      capacityFy28: Number(r.capacity_fy28_gw),
      demandFy26: Number(r.demand_fy26_gw),
      demandFy28: Number(r.demand_fy28_gw),
    }));
    const wafer: WaferPoint[] = wfRows.map((r) => ({
      period: r.period,
      demandGw: Number(r.demand_gw),
      supplyGw: Number(r.supply_gw),
    }));
    const almmTimeline: AlmmPhase[] = almmRows.map((r) => ({
      phase: r.phase,
      scope: r.scope,
      effectiveDate: r.effective_date,
      status: r.status,
      confidence: r.confidence as Confidence,
    }));
    const economics: EconomicsMetric[] = ecoRows.map((r) => ({
      metric: r.metric,
      value: Number(r.value),
      unit: r.unit,
      confidence: r.confidence as Confidence,
      ...(r.note ? { note: r.note } : {}),
    }));

    // --- KPIs ---
    const totalModuleGw = round1(modulePlayers.reduce((s, m) => s + m.almm1Gw, 0));
    const totalCellGw = round1(cellPlayers.reduce((s, c) => s + c.almm2Gw, 0));
    const prodPlayers = cellPlayers.filter((c) => c.productionGw != null);
    const sumProd = prodPlayers.reduce((s, c) => s + (c.productionGw ?? 0), 0);
    const sumAlmm2 = prodPlayers.reduce((s, c) => s + c.almm2Gw, 0);
    const avgUtil = sumAlmm2 ? round1((sumProd / sumAlmm2) * 100) : 0;
    const dcrFy26 = Number(mdRows.find((r) => r.period === "FY26E")?.dcr_gw ?? 0);
    const moduleSeg = supplyDemand.find((s) => s.segment === "module");
    const overcap =
      moduleSeg && moduleSeg.demandFy26
        ? round1(moduleSeg.capacityFy26 / moduleSeg.demandFy26)
        : 0;

    const kpis: Kpi[] = [
      { key: "module_capacity", label: "Module capacity (ALMM-I)", value: totalModuleGw, unit: "GW", confidence: "medium", hint: "Σ across manufacturers" },
      { key: "cell_capacity", label: "Cell capacity (ALMM-II)", value: totalCellGw, unit: "GW", confidence: "high", hint: "Σ across manufacturers" },
      { key: "cell_production", label: "Cell production FY26E", value: round1(sumProd), unit: "GW", confidence: "high", hint: "modelled quarterly split" },
      { key: "utilization", label: "Avg cell utilisation", value: avgUtil, unit: "%", confidence: "high", hint: "production ÷ ALMM-II" },
      { key: "dcr_demand", label: "DCR module demand FY26E", value: dcrFy26, unit: "GW", confidence: "medium", hint: "domestic-content" },
      { key: "overcapacity", label: "Module overcapacity", value: overcap, unit: "x", confidence: "medium", hint: "capacity ÷ FY26 demand" },
    ];

    // --- Sanity checks (warn, never throw) ---
    const trajFy26 = ctRows.find((r) => r.period === "FY26E");
    const trajFy26Total = trajFy26
      ? Number(trajFy26.existing_gw) + Number(trajFy26.new_gw)
      : 0;
    if (Math.abs(sumProd - trajFy26Total) > 1) {
      console.warn(
        `[manufacturing] Σ cell production ${round1(sumProd)} ≉ trajectory FY26 ${trajFy26Total} GW`,
      );
    }
    for (const s of cellQuarterlySeries) {
      const sum = s.values.reduce((a, v) => a + v, 0);
      if (Math.abs(sum - s.annual) > 0.05) {
        console.warn(
          `[manufacturing] quarterly Σ for ${s.label} ${round3(sum)} ≉ annual ${round3(s.annual)} GW`,
        );
      }
    }

    // --- Provenance (distinct source+confidence; all feeds share the vintage) ---
    const srcMap = new Map<string, SourceRef>();
    const addSrc = (name?: string, conf?: string) => {
      if (!name || !conf) return;
      const key = `${name}|${conf}`;
      if (!srcMap.has(key)) {
        srcMap.set(key, { name, asOf: MFG_AS_OF, confidence: conf as Confidence });
      }
    };
    for (const r of [
      ...cellRows,
      ...moduleRows,
      ...mdRows,
      ...ctRows,
      ...sdRows,
      ...wfRows,
      ...almmRows,
      ...ecoRows,
    ]) {
      addSrc(r.source, r.confidence);
    }
    const sources = [...srcMap.values()].sort(
      (a, b) => a.name.localeCompare(b.name) || a.confidence.localeCompare(b.confidence),
    );

    const data: ManufacturingData = {
      kpis,
      cellPlayers,
      modulePlayers,
      cellQuarterly,
      moduleDemand,
      cellTrajectory,
      supplyDemand,
      wafer,
      almmTimeline,
      economics,
    };

    writeSnapshot<ManufacturingData>("manufacturing", "value-chain", {
      asOf: maxAsOf(sources),
      cadence: "quarterly",
      coverage: "India · solar PV manufacturing value chain (cells, modules, wafers)",
      sources,
      notes: [
        `Quarterly cell production is MODELLED: each producer's FY26E annual output is split across ${QUARTERS.join("/")} with a ramp [${RAMP.join(", ")}]; drop real (player, quarter) actuals into manufacturing/cell-production-quarterly-override.csv to override a cell.`,
        "Cell capacity & production are MNRE / DCR-portal actuals; the ALMM-I module tail is bucketed as Others to reconcile to ~145 GW; demand, trajectory, wafer and economics are VQ Research estimates.",
        "Basic Customs Duty (BCD): modules 40% / cells 27.5%.",
        `Player palette: ${CATEGORICAL_COLORS.length}-colour qualitative set (CATEGORICAL_COLORS); "Others" is neutral grey.`,
      ],
      data,
    });
  },
});
