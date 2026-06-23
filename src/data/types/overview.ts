import type { Confidence } from "./core";

/** A landing-page editorial insight, linked to its section. */
export interface Insight {
  text: string;
  /** Section route id (e.g. `tenders`) the insight links to. */
  section: string;
  confidence: Confidence;
}

/**
 * Payload of the Overview `summary` snapshot — an editorial digest only.
 * Real cross-section metrics are read live from each section's snapshot at
 * render time, not stored here.
 */
export interface OverviewData {
  insights: Insight[];
  asOf: string;
}
