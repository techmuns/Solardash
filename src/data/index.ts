import type { Snapshot } from "./types/core";
import type { OverviewSummary } from "./types/overview";
import overviewSummary from "./snapshots/overview/summary.json";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a snapshot's envelope and return it typed. Throws on schema drift
 * (e.g. a hand-edited snapshot missing required fields) so a broken dataset
 * fails the build instead of rendering silently-wrong UI.
 */
function assertSnapshot<T>(snapshot: Snapshot<T>, id: string): Snapshot<T> {
  const problems: string[] = [];
  if (!snapshot || typeof snapshot !== "object") {
    problems.push("not an object");
  } else {
    if (!snapshot.dataset) problems.push("missing dataset");
    if (!snapshot.section) problems.push("missing section");
    if (!ISO_DATE.test(snapshot.asOf ?? "")) problems.push("asOf not ISO");
    if (!ISO_DATE.test(snapshot.updatedAt ?? "")) {
      problems.push("updatedAt not ISO");
    }
    if (!Array.isArray(snapshot.sources) || snapshot.sources.length === 0) {
      problems.push("sources must be a non-empty array");
    }
    if (snapshot.data == null) problems.push("missing data");
  }
  if (problems.length > 0) {
    throw new Error(`[data] snapshot "${id}" failed validation: ${problems.join(", ")}`);
  }
  return snapshot;
}

/** Overview headline KPIs + quarterly RE additions. */
export function getOverviewSnapshot(): Snapshot<OverviewSummary> {
  return assertSnapshot(
    overviewSummary as unknown as Snapshot<OverviewSummary>,
    "overview/summary",
  );
}
