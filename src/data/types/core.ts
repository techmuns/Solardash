/**
 * Solardash data contract — shared, build-time, static-safe types.
 *
 * Provenance granularity (read this):
 *  - Provenance lives at the **snapshot** level by default (`Snapshot.sources`).
 *  - It may be **overridden per series** (`Series.source`) when a chart mixes
 *    feeds (e.g. one modelled series alongside public ones).
 *  - Confidence may be **overridden per point** (`SeriesPoint.confidence` /
 *    `SeriesPoint.modelled`) for modelled values mixed with public ones
 *    (e.g. DCR production estimates inside an otherwise-public series).
 *
 * `ChartFrame` reads source · asOf · confidence from the snapshot or series.
 */

/** Confidence level — must match `ConfidenceBadge` (src/components/ui/Badge). */
export type Confidence = "high" | "medium" | "modelled";

/**
 * Units used across the dashboard. The `(string & {})` tail keeps the union as
 * editor-autocomplete hints while still allowing an arbitrary string fallback.
 */
export type Unit =
  | "GW"
  | "MW"
  | "GWh"
  | "BU"
  | "MU"
  | "%"
  | "Rs/kWh"
  | "Rs/Wp"
  | "Rs_cr"
  | "USD/Wp"
  | "USD/kWh"
  | "x"
  // `string & Record<never, never>` ≡ `string & {}` — keeps the union's
  // autocomplete hints while allowing any string, without the empty-object-type
  // lint rule firing.
  | (string & Record<never, never>);

/** A single attributable source with its effective date and confidence. */
export interface SourceRef {
  name: string;
  url?: string;
  /** Effective date of the data, ISO `YYYY-MM-DD`. */
  asOf: string;
  confidence: Confidence;
  note?: string;
}

/** One observation in a series. */
export interface SeriesPoint {
  /** Period label, e.g. `Q1FY26`, `2026-03`, `FY25`. */
  period: string;
  value: number;
  /** Point-level confidence override (otherwise inherits series/snapshot). */
  confidence?: Confidence;
  /** Marks a modelled / estimated value mixed in with public ones. */
  modelled?: boolean;
}

/** A named, typed series — one line/bar/category on a chart. */
export interface Series {
  key: string;
  label: string;
  unit?: Unit;
  /** Series-level provenance override (otherwise inherits the snapshot). */
  source?: SourceRef;
  points: SeriesPoint[];
}

/** How often a dataset is refreshed — drives the cadence build model. */
export type Cadence = "monthly" | "quarterly" | "annual" | "adhoc";

/**
 * The envelope every committed snapshot is wrapped in. `T` is the dataset's
 * payload shape (e.g. `OverviewSummary`).
 */
export interface Snapshot<T> {
  /** Dataset id, e.g. `summary`. */
  dataset: string;
  /** Section id, e.g. `overview`. */
  section: string;
  /** Nominal as-of date for the snapshot, ISO `YYYY-MM-DD`. */
  asOf: string;
  /**
   * Build-stable last-updated stamp = the max `asOf` across `sources` (the
   * data's effective date — NOT wall-clock), so rebuilds are diff-free.
   */
  updatedAt: string;
  cadence: Cadence;
  /** Optional human note on geographic / scope coverage. */
  coverage?: string;
  /** Snapshot-level provenance (non-empty). */
  sources: SourceRef[];
  notes?: string[];
  data: T;
}
