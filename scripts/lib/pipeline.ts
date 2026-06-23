import type { Cadence } from "../../src/data/types/core";

/**
 * A data pipeline: reads curated/manual (and later, fetched) inputs and writes
 * one or more committed snapshots via `writeSnapshot`.
 */
export interface Pipeline {
  /** CLI name, e.g. `overview`. */
  name: string;
  /** Section id the snapshot(s) belong to, e.g. `overview`. */
  section: string;
  /** Refresh cadence — drives `--cadence` filtering. */
  cadence: Cadence;
  run(): void | Promise<void>;
}

/** Identity helper for ergonomic typing of a pipeline definition. */
export function definePipeline(pipeline: Pipeline): Pipeline {
  return pipeline;
}
