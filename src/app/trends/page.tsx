import {
  getManufacturingSnapshot,
  getPriceHistorySnapshot,
  getTendersSnapshot,
} from "@/data";
import { getProfitPools } from "@/data/profit-pools";
import { formatDate } from "@/lib/utils";
import {
  SectionCanvas,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import { INSIGHT_GROUPS, INSIGHTS } from "./insights";
import { InsightGrid, type EvidenceData } from "./InsightViews";

export const dynamic = "force-static";
export const metadata = {
  title: "Trends & Insights",
  description:
    "The buy-side synthesis of India's solar sector — structural trends, anomalies, and what most people miss. Each insight is Munshot analysis, evidenced by a live chart or a cited stat.",
};

/** Firm-power & storage contract types (vs pure solar / wind). */
const FIRM_KEYS = new Set(["solar-bess", "bess", "fdre", "hybrid", "rtc"]);

const GROUP_SUBTITLE: Record<string, string> = {
  structural: "The durable shifts reshaping where solar value sits.",
  anomalies: "Where the data breaks the obvious narrative.",
  missed: "The under-priced risks and dependencies.",
};

export default function TrendsPage() {
  const tenders = getTendersSnapshot().data;
  const mfg = getManufacturingSnapshot().data;
  const price = getPriceHistorySnapshot().data;
  const pools = getProfitPools();

  // ── Resolve the live evidence series the cards reuse ───────────────────
  const quarters = tenders.awardsByQuarter[0]?.points.map((p) => p.period) ?? [];
  const firmAll = quarters.map((_, i) => {
    let tot = 0,
      firm = 0;
    for (const s of tenders.awardsByQuarter) {
      const v = s.points[i]?.value ?? 0;
      tot += v;
      if (FIRM_KEYS.has(s.key)) firm += v;
    }
    return tot ? Math.round((firm / tot) * 100) : 0;
  });
  const firmShare = quarters
    .map((p, i) => (p.includes("FY26") ? firmAll[i] : null))
    .filter((v): v is number => v != null);

  const data: EvidenceData = {
    sparks: {
      firmShare: { values: firmShare },
      mfgMargin: {
        values:
          pools.marginByStage.find((s) => s.key === "manufacturing")?.points.map((p) => p.value) ??
          [],
      },
      polyPrice: {
        values: price.series.find((s) => s.key === "poly")?.points.map((p) => p.value) ?? [],
      },
      tariff: {
        values: tenders.tariffHistory[0]?.points.map((p) => p.value) ?? [],
      },
    },
    lines: {
      cellModule: {
        series: mfg.capacityHistory,
        periods: mfg.capacityHistory[0]?.points.map((p) => p.period) ?? [],
      },
    },
  };

  const tabs: CanvasTab[] = INSIGHT_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    title: g.label,
    subtitle: GROUP_SUBTITLE[g.id],
    source: "Munshot synthesis · evidence cited per card",
    body: <InsightGrid insights={INSIGHTS.filter((i) => i.group === g.id)} data={data} />,
  }));

  return (
    <SectionCanvas
      tabs={tabs}
      asOf={formatDate(pools.asOf)}
      defaultSource="Munshot synthesis"
    />
  );
}
