import { getManufacturingSnapshot } from "@/data";
import { formatDate } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { FillBarSeries, FillLineSeries } from "@/components/charts/FillCharts";
import {
  SectionCanvas,
  RankList,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import type { Series } from "@/data/types/core";

export const dynamic = "force-static";
export const metadata = {
  title: "Manufacturing",
  description:
    "India's solar manufacturing value chain — cell & module capacity, the production ramp, and PLI awardees tracked across tranches.",
};

export default function ManufacturingPage() {
  const snap = getManufacturingSnapshot();
  const m = snap.data;
  const source = "MNRE / DCR Portal (maintained)";
  const asOf = formatDate(snap.updatedAt);
  const meta = (dataset: string) => snapshotMeta(snap, { dataset });

  const prodYears = m.cellQuarterly.categories;
  const prodSeries: Series[] = m.cellQuarterly.series.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    points: prodYears.map((c, i) => ({ period: c, value: s.values[i] })),
  }));

  const cellMakerRows = m.cellPlayers
    .slice(0, 5)
    .map((p) => ({ label: p.player, value: `${p.nameplateGw}` }));

  const chYears = m.capacityHistory[0]?.points.map((p) => p.period) ?? [];

  // PLI: cumulative capacity by tranche (time series) + a cumulative leaderboard.
  const pliPeriods = m.pliHistory[0]?.points.map((p) => p.period) ?? [];
  const pliRankRows = m.pliAwardees
    .slice(0, 6)
    .map((p) => ({
      label: p.company,
      value: `${p.capacityGw}${p.tranchesWon > 1 ? " ×2" : ""}`,
    }));

  const tabs: CanvasTab[] = [
    {
      id: "buildout",
      label: "Capacity build-out",
      title: "Cell vs module capacity over time",
      subtitle: "Nameplate GW · FY21 → FY26 — cell catching up to module",
      source: "JMK Research / Mercom",
      body: (
        <FillLineSeries
          series={m.capacityHistory}
          unit="GW"
          periodOrder={chYears}
        />
      ),
      exportData: {
        ...seriesToExport(m.capacityHistory, chYears, "Year"),
        meta: meta("capacity-history"),
      },
    },
    {
      id: "production",
      label: "Cell production",
      title: "Cell production ramp",
      subtitle: "GW by player · quarterly, stacked",
      source,
      body: (
        <FillBarSeries
          series={prodSeries}
          stacked
          unit="GW"
          periodOrder={prodYears}
        />
      ),
      side: {
        title: "Top cell makers · nameplate GW",
        node: <RankList rows={cellMakerRows} />,
      },
      exportData: {
        ...seriesToExport(prodSeries, prodYears, "Quarter"),
        meta: meta("cell-production"),
      },
    },
    {
      id: "pli",
      label: "PLI awardees",
      title: "PLI capacity awarded, by tranche",
      subtitle:
        "Cumulative GW · Tranche I (2021) → Tranche II (2023) — Reliance & Shirdi Sai/Indosol are the only firms to win both",
      source: "PIB / SECI / IREDA",
      body: (
        <FillLineSeries
          series={m.pliHistory}
          unit="GW"
          periodOrder={pliPeriods}
        />
      ),
      side: {
        title: "Cumulative PLI · GW (×2 = both tranches)",
        node: <RankList rows={pliRankRows} />,
      },
      exportData: {
        ...seriesToExport(m.pliHistory, pliPeriods, "Tranche"),
        meta: meta("pli-awardees"),
      },
    },
  ];

  return (
    <SectionCanvas tabs={tabs} asOf={asOf} defaultSource={source} />
  );
}
