import type { TenderType } from "@/data/types/tenders";

/** Short, table/legend-friendly labels for tender types. */
export const TENDER_TYPE_LABELS: Record<TenderType, string> = {
  solar: "Solar",
  "solar-bess": "Solar + BESS",
  bess: "BESS",
  wind: "Wind",
  hybrid: "Hybrid",
  fdre: "FDRE",
  rtc: "RTC",
  peak: "Peak Power",
};

/** Canonical display/stack order (mirrors the ENERGY_ORDER subset). */
export const TENDER_TYPE_ORDER: TenderType[] = [
  "solar",
  "solar-bess",
  "bess",
  "wind",
  "hybrid",
  "fdre",
  "rtc",
  "peak",
];
