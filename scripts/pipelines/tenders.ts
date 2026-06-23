import { definePipeline } from "../lib/pipeline";
import { maxAsOf, readManualCsv, writeSnapshot } from "../lib/io";
import type {
  Confidence,
  Series,
  SeriesPoint,
  SourceRef,
} from "../../src/data/types/core";
import type {
  AgencySplit,
  AwardRecord,
  AwardWinner,
  DeveloperStanding,
  TenderKpi,
  TenderType,
  TendersData,
  TypeMixEntry,
} from "../../src/data/types/tenders";

// Stack / display order for tender types (mirrors ENERGY_ORDER subset).
const TYPE_ORDER: TenderType[] = [
  "solar",
  "solar-bess",
  "bess",
  "wind",
  "hybrid",
  "fdre",
  "rtc",
  "peak",
];
const TYPE_LABELS: Record<TenderType, string> = {
  solar: "Solar",
  "solar-bess": "Solar + BESS",
  bess: "BESS",
  wind: "Wind",
  hybrid: "Hybrid",
  fdre: "FDRE",
  rtc: "RTC",
  peak: "Peak Power",
};

// FY26 window = Apr 2025 – Mar 2026.
const FY26_START = "2025-04-01";
const FY26_END = "2026-03-31";

const round2 = (n: number) => Math.round(n * 100) / 100;

function num(value: string | undefined): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

/** Parse `Developer:MW;Developer:MW` (MW optional). */
function parseWinners(raw: string): AwardWinner[] {
  if (!raw.trim()) return [];
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.lastIndexOf(":");
      if (idx === -1) return { developer: pair };
      const developer = pair.slice(0, idx).trim();
      const mw = num(pair.slice(idx + 1));
      return mw != null ? { developer, mw } : { developer };
    });
}

export const tendersPipeline = definePipeline({
  name: "tenders",
  section: "tenders",
  cadence: "quarterly",
  run() {
    const rows = readManualCsv("tenders/auctions.csv");

    // --- Atomic award records ---
    const records: AwardRecord[] = rows.map((r) => {
      const storageMwh = num(r.storage_mwh);
      const tariffRs = num(r.tariff_rs);
      const ceilingRs = num(r.ceiling_rs);
      const winners = parseWinners(r.winners ?? "");
      return {
        id: r.id,
        period: r.period,
        date: r.date,
        agency: r.agency,
        tenderType: r.tender_type as TenderType,
        capacityMw: Number(r.capacity_mw),
        ...(storageMwh != null ? { storageMwh } : {}),
        ...(tariffRs != null ? { tariffRs } : {}),
        ...(ceilingRs != null ? { ceilingRs } : {}),
        ...(winners.length ? { winners } : {}),
        ...(r.state ? { state: r.state } : {}),
        status: r.status,
        confidence: r.confidence as Confidence,
        ...(r.note ? { sourceNote: r.note } : {}),
      };
    });

    // --- Chronological quarter order (by earliest date in each quarter) ---
    const minDate = new Map<string, string>();
    for (const r of records) {
      const cur = minDate.get(r.period);
      if (!cur || r.date < cur) minDate.set(r.period, r.date);
    }
    const quarters = [...minDate.keys()].sort((a, b) =>
      (minDate.get(a) ?? "").localeCompare(minDate.get(b) ?? ""),
    );

    const presentTypes = TYPE_ORDER.filter((t) =>
      records.some((r) => r.tenderType === t),
    );

    // --- awardsByQuarter: MW per type per quarter (0-filled for alignment) ---
    const awardsByQuarter: Series[] = presentTypes.map((type) => ({
      key: type,
      label: TYPE_LABELS[type],
      unit: "MW",
      points: quarters.map((q) => ({
        period: q,
        value: records
          .filter((r) => r.tenderType === type && r.period === q)
          .reduce((s, r) => s + r.capacityMw, 0),
      })),
    }));

    // --- tariffByType: capacity-weighted avg ₹/unit per quarter (excl. BESS) ---
    const tariffByType: Series[] = presentTypes
      .filter((t) => t !== "bess")
      .map((type) => {
        const points: SeriesPoint[] = [];
        for (const q of quarters) {
          const recs = records.filter(
            (r) => r.tenderType === type && r.period === q && r.tariffRs != null,
          );
          const mw = recs.reduce((s, r) => s + r.capacityMw, 0);
          if (mw > 0) {
            const wavg =
              recs.reduce((s, r) => s + (r.tariffRs ?? 0) * r.capacityMw, 0) / mw;
            points.push({ period: q, value: round2(wavg) });
          }
        }
        return { key: type, label: TYPE_LABELS[type], unit: "Rs/kWh", points };
      })
      .filter((s) => s.points.length > 0);

    // --- agencySplit: total MW per agency (whole feed) ---
    const agencyMap = new Map<string, number>();
    for (const r of records) {
      agencyMap.set(r.agency, (agencyMap.get(r.agency) ?? 0) + r.capacityMw);
    }
    const agencySplit: AgencySplit[] = [...agencyMap.entries()]
      .map(([agency, mw]) => ({ agency, mw }))
      .sort((a, b) => b.mw - a.mw || a.agency.localeCompare(b.agency));

    // --- FY26-to-date window for mix / leaderboard / KPIs ---
    const fy26 = records.filter(
      (r) => r.date >= FY26_START && r.date <= FY26_END,
    );
    const fy26Total = fy26.reduce((s, r) => s + r.capacityMw, 0);

    // --- typeMix (FY26-to-date) ---
    const typeMixMap = new Map<TenderType, number>();
    for (const r of fy26) {
      typeMixMap.set(r.tenderType, (typeMixMap.get(r.tenderType) ?? 0) + r.capacityMw);
    }
    const typeMix: TypeMixEntry[] = [...typeMixMap.entries()]
      .map(([type, mw]) => ({
        type,
        mw,
        share: fy26Total ? round2(mw / fy26Total) : 0,
      }))
      .sort((a, b) => b.mw - a.mw || a.type.localeCompare(b.type));

    // --- developerLeaderboard (FY26-to-date) ---
    interface DevAgg {
      mw: number;
      auctions: number;
      twTariff: number;
      twMw: number;
    }
    const devMap = new Map<string, DevAgg>();
    for (const r of fy26) {
      for (const w of r.winners ?? []) {
        const agg =
          devMap.get(w.developer) ?? { mw: 0, auctions: 0, twTariff: 0, twMw: 0 };
        const wmw = w.mw ?? 0;
        agg.mw += wmw;
        agg.auctions += 1;
        if (r.tariffRs != null && wmw > 0) {
          agg.twTariff += r.tariffRs * wmw;
          agg.twMw += wmw;
        }
        devMap.set(w.developer, agg);
      }
    }
    const developerLeaderboard: DeveloperStanding[] = [...devMap.entries()]
      .map(([developer, a]) => ({
        developer,
        mw: a.mw,
        auctions: a.auctions,
        ...(a.twMw > 0 ? { avgTariffRs: round2(a.twTariff / a.twMw) } : {}),
      }))
      .sort((a, b) => b.mw - a.mw || a.developer.localeCompare(b.developer));

    // --- KPIs (FY26-to-date) ---
    const fy26Tariffed = fy26.filter(
      (r) => r.tariffRs != null && r.tenderType !== "bess",
    );
    const lowestRec = fy26Tariffed.reduce<AwardRecord | undefined>(
      (min, r) =>
        min == null || (r.tariffRs ?? Infinity) < (min.tariffRs ?? Infinity)
          ? r
          : min,
      undefined,
    );
    const wMw = fy26Tariffed.reduce((s, r) => s + r.capacityMw, 0);
    const wAvg = wMw
      ? fy26Tariffed.reduce((s, r) => s + (r.tariffRs ?? 0) * r.capacityMw, 0) / wMw
      : 0;
    const leadingType = typeMix[0];
    const topDev = developerLeaderboard[0];

    const kpis: TenderKpi[] = [
      {
        key: "awarded_fy26",
        label: "Awarded (FY26-to-date)",
        value: round2(fy26Total / 1000),
        unit: "GW",
        confidence: "medium",
        hint: "Apr 2025 – Mar 2026",
      },
      {
        key: "auctions_fy26",
        label: "Auctions concluded",
        value: fy26.length,
        confidence: "high",
        hint: "FY26-to-date",
      },
      {
        key: "lowest_tariff",
        label: "Lowest tariff",
        value: lowestRec?.tariffRs ?? 0,
        unit: "Rs/kWh",
        confidence: lowestRec?.confidence ?? "medium",
        hint: lowestRec
          ? `${lowestRec.agency} · ${TYPE_LABELS[lowestRec.tenderType]}`
          : undefined,
      },
      {
        key: "avg_tariff",
        label: "Avg tariff (cap-wtd)",
        value: round2(wAvg),
        unit: "Rs/kWh",
        confidence: "medium",
        hint: "excl. standalone BESS",
      },
      {
        key: "leading_type",
        label: "Leading type by MW",
        value: leadingType ? TYPE_LABELS[leadingType.type] : "—",
        confidence: "high",
        hint: leadingType
          ? `${Math.round(leadingType.share * 100)}% of FY26 MW`
          : undefined,
      },
      {
        key: "top_developer",
        label: "Top developer by MW",
        value: topDev ? topDev.developer : "—",
        confidence: "high",
        hint: topDev ? `${topDev.mw} MW` : undefined,
      },
    ];

    // --- recentAwards: most-recent first ---
    const recentAwards = [...records].sort(
      (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
    );

    // --- Provenance: distinct (source, url, confidence) triples ---
    const srcMap = new Map<
      string,
      { name: string; url?: string; confidence: Confidence; asOf: string }
    >();
    for (const r of rows) {
      const conf = r.confidence as Confidence;
      const url = r.source_url?.trim() || undefined;
      const key = `${r.source}|${url ?? ""}|${conf}`;
      const ex = srcMap.get(key);
      if (!ex) {
        srcMap.set(key, {
          name: r.source,
          ...(url ? { url } : {}),
          confidence: conf,
          asOf: r.date,
        });
      } else if (r.date > ex.asOf) {
        ex.asOf = r.date;
      }
    }
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

    // --- Reconciliation: Σ(quarter × type MW) must equal Σ(records MW) ---
    const totalRecordsMw = records.reduce((s, r) => s + r.capacityMw, 0);
    const totalGridMw = awardsByQuarter.reduce(
      (s, ser) => s + ser.points.reduce((ss, p) => ss + p.value, 0),
      0,
    );
    if (Math.round(totalRecordsMw) !== Math.round(totalGridMw)) {
      throw new Error(
        `[tenders] reconciliation failed: Σrecords=${totalRecordsMw} MW vs Σ(quarter×type)=${totalGridMw} MW`,
      );
    }

    const data: TendersData = {
      asOfPeriod: quarters[quarters.length - 1] ?? "",
      kpis,
      awardsByQuarter,
      tariffByType,
      agencySplit,
      typeMix,
      developerLeaderboard,
      recentAwards,
    };

    writeSnapshot<TendersData>("tenders", "awards", {
      asOf: maxAsOf(sources),
      cadence: "quarterly",
      coverage: "India · central & state RE auctions (maintained feed)",
      sources,
      notes: [
        "Curated set of major Indian RE auctions (SECI/NTPC/SJVN); not every auction in the market — figures sourced from SECI results and trade press. Capacities are awarded MW.",
        "Winners are listed where publicly disclosed (some auctions' winner splits are not yet public); per-row confidence is honoured.",
        "Standalone BESS (capacity charge, ₹/MW/month) is excluded from ₹/unit tariff aggregations.",
        "KPIs, type-mix and leaderboard cover FY26-to-date (Apr 2025 – Mar 2026); awardsByQuarter & agencySplit cover the whole feed.",
      ],
      data,
    });
  },
});
