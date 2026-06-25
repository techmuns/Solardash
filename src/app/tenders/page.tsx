import { getTendersSnapshot } from "@/data";
import { energyColor } from "@/lib/colors";
import { formatDate } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import { TendersCanvas } from "./TendersCanvas";

export const dynamic = "force-static";
export const metadata = {
  title: "Tenders & Auctions",
  description:
    "Central & state solar / renewable auction results — awarded capacity, winning tariffs, the tender-type mix, and the developer leaderboard, in a single focused canvas.",
};

export default function TendersPage() {
  const snapshot = getTendersSnapshot();
  const d = snapshot.data;
  const quarters = d.awardsByQuarter[0]?.points.map((p) => p.period) ?? [];
  const tariffYears = d.tariffHistory[0]?.points.map((p) => p.period) ?? [];
  const source = "Auction feed · SECI / state DISCOMs (maintained)";
  const asOf = formatDate(snapshot.updatedAt);

  const typeMixData = d.typeMix.map((t) => ({
    key: t.type,
    label: TENDER_TYPE_LABELS[t.type],
    value: t.mw,
    color: energyColor(t.type),
  }));

  return (
    <TendersCanvas
      kpis={d.kpis}
      awardsByQuarter={d.awardsByQuarter}
      quarters={quarters}
      tariffHistory={d.tariffHistory}
      tariffYears={tariffYears}
      typeMixData={typeMixData}
      leaderboard={d.developerLeaderboard}
      recentAwards={d.recentAwards}
      asOfPeriod={d.asOfPeriod}
      source={source}
      asOf={asOf}
      leaderboardMeta={snapshotMeta(snapshot, {
        dataset: "developer-leaderboard",
      })}
      awardsMeta={snapshotMeta(snapshot, { dataset: "recent-awards" })}
    />
  );
}
