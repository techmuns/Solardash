/**
 * Energy-source categorical colour map.
 *
 * This is the single source of truth for how each generation / contract type is
 * coloured across the whole app. Every chart built in later phases MUST read
 * from `ENERGY_COLORS` (or the Tailwind `energy-*` utilities, which mirror
 * these exact hex values) so colours stay consistent everywhere.
 */
export const ENERGY_COLORS = {
  solar: "#F59E0B",
  wind: "#0EA5E9",
  hybrid: "#8B5CF6",
  fdre: "#14B8A6",
  rtc: "#6366F1",
  "solar-bess": "#10B981",
  bess: "#059669",
  thermal: "#475569",
  nuclear: "#A855F7",
  hydro: "#3B82F6",
  gas: "#FB923C",
  peak: "#EC4899",
} as const;

export type EnergySource = keyof typeof ENERGY_COLORS;

/** Human-readable labels for each energy source (for legends, tooltips). */
export const ENERGY_LABELS: Record<EnergySource, string> = {
  solar: "Solar",
  wind: "Wind",
  hybrid: "Hybrid",
  fdre: "FDRE",
  rtc: "Round-the-Clock (RTC)",
  "solar-bess": "Solar + BESS",
  bess: "BESS",
  thermal: "Thermal / Coal",
  nuclear: "Nuclear",
  hydro: "Hydro",
  gas: "Gas",
  peak: "Peak Power",
};

/** Stable display order for stacked charts / legends. */
export const ENERGY_ORDER: EnergySource[] = [
  "solar",
  "solar-bess",
  "bess",
  "wind",
  "hybrid",
  "fdre",
  "rtc",
  "peak",
  "hydro",
  "nuclear",
  "gas",
  "thermal",
];

/** Resolve the colour for an energy source, with a neutral fallback. */
export function energyColor(source: string): string {
  return (ENERGY_COLORS as Record<string, string>)[source] ?? "#94A3B8";
}
