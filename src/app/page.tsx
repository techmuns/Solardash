import {
  getCapacitySnapshot,
  getDevelopersSnapshot,
  getManufacturingSnapshot,
  getTendersSnapshot,
} from "@/data";
import {
  ENABLER_ICONS,
  IndustryMap,
  type ValueChainEnabler,
  type ValueChainNode,
} from "@/components/industry-map/IndustryMap";

export const dynamic = "force-static";
export const metadata = {
  title: "Industry Map",
  description:
    "India's solar value chain at a glance — polysilicon to offtake to grid — with the real trend where we track it and a drill-down into the evidence. Where India plays, what's still imported, and who the key players are.",
};

/** First N player names from a list of objects keyed by `player` / `name`. */
function names<T>(rows: T[], pick: (r: T) => string, n = 3): string[] {
  return rows.slice(0, n).map(pick);
}

export default function IndustryMapPage() {
  const mfg = getManufacturingSnapshot().data;
  const cap = getCapacitySnapshot().data;
  const tenders = getTendersSnapshot().data;
  const developers = getDevelopersSnapshot().data;

  // Real Phase-1 trajectories (no fabrication — straight from the snapshots).
  const cellHist = mfg.capacityHistory.find((s) => s.key === "cell");
  const moduleHist = mfg.capacityHistory.find((s) => s.key === "module");
  const cellTrend = cellHist?.points.map((p) => p.value) ?? [];
  const moduleTrend = moduleHist?.points.map((p) => p.value) ?? [];
  const solarInstalled =
    cap.installedBySource.find((s) => s.key === "solar")?.points.map((p) => p.value) ??
    [];
  // Awarded MW per quarter = the stacked tender series summed by period.
  const quarters = tenders.awardsByQuarter[0]?.points ?? [];
  const awardedMw = quarters.map((_, i) =>
    tenders.awardsByQuarter.reduce((s, ser) => s + (ser.points[i]?.value ?? 0), 0),
  );

  const cellPlayers = names(mfg.cellPlayers, (p) => p.player);
  const modulePlayers = names(mfg.modulePlayers, (p) => p.player);
  const ippPlayers = names(developers.roster, (d) => d.name);

  // The chain, left→right (product flows downstream; ₹ flows upstream/right→left).
  const nodes: ValueChainNode[] = [
    {
      id: "polysilicon",
      name: "Polysilicon",
      presence: "imported",
      players: ["Adani (planned)", "Reliance (planned)"],
      note: "≈100% imported — no domestic poly at scale yet",
      emphasis: "compact",
      economicWeight: 0,
    },
    {
      id: "wafer",
      name: "Wafer / Ingot",
      presence: "imported",
      players: ["Adani (pilot)", "Reliance (planned)"],
      note: "≈100% imported — only pilot ingot lines",
      emphasis: "compact",
      economicWeight: 0,
    },
    {
      id: "cell",
      name: "Cell",
      presence: "emerging",
      href: "/manufacturing",
      players: cellPlayers,
      trend: cellTrend,
      trendColor: "#F59E0B",
      note: "Cell capacity · GW",
      emphasis: "wide",
      economicWeight: 0,
    },
    {
      id: "module",
      name: "Module",
      presence: "present",
      href: "/manufacturing",
      players: modulePlayers,
      trend: moduleTrend,
      trendColor: "#2563EB",
      note: "ALMM-I capacity · GW",
      emphasis: "wide",
      economicWeight: 0,
    },
    {
      id: "bos",
      name: "BoS / Inverters",
      presence: "emerging",
      players: ["Sungrow", "Sineng", "Waaree"],
      note: "Strings & trackers local; inverters partly imported",
      emphasis: "compact",
      economicWeight: 0,
    },
    {
      id: "epc",
      name: "EPC",
      presence: "present",
      players: ["Tata Power", "L&T", "Sterling & Wilson"],
      note: "Mature domestic engineering & construction base",
      emphasis: "compact",
      economicWeight: 0,
    },
    {
      id: "generation",
      name: "IPP / Generation",
      presence: "present",
      href: "/developers",
      players: ippPlayers,
      trend: solarInstalled,
      trendColor: "#0EA5E9",
      note: "Installed solar · GW",
      emphasis: "wide",
      economicWeight: 0,
    },
    {
      id: "offtake",
      name: "Offtake",
      presence: "present",
      href: "/tenders",
      players: ["SECI", "State DISCOMs", "C&I & rooftop"],
      trend: awardedMw,
      trendColor: "#10B981",
      note: "Awarded MW / qtr",
      emphasis: "wide",
      economicWeight: 0,
    },
    {
      id: "grid",
      name: "Grid",
      presence: "present",
      href: "/power-system",
      players: ["Grid-India", "CTU / ISTS", "State STUs"],
      note: "Evacuation, scheduling & the ISTS-charge waiver",
      emphasis: "normal",
      economicWeight: 0,
    },
  ];

  const enablers: ValueChainEnabler[] = [
    {
      id: "financing",
      name: "Financing",
      presence: "present",
      detail: "Project debt, equity & yield vehicles fund the build-out",
      players: ["PE & InvITs", "Green bonds", "NBFCs / banks"],
      icon: ENABLER_ICONS.financing,
    },
    {
      id: "policy",
      name: "Policy",
      presence: "present",
      href: "/policy",
      detail: "Demand-pull + local-content rules shape the chain",
      players: ["ALMM / DCR", "PLI", "ISTS waiver"],
      icon: ENABLER_ICONS.policy,
    },
    {
      id: "storage",
      name: "Storage / BESS",
      presence: "emerging",
      href: "/policy",
      detail: "Firming intermittent solar — cost curve falling fast",
      players: ["Li-ion / VRFB", "Pumped hydro", "Co-located"],
      icon: ENABLER_ICONS.storage,
    },
  ];

  return <IndustryMap nodes={nodes} enablers={enablers} />;
}
