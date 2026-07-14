import type { Confidence } from "../../src/data/types/core";
import type {
  CommissioningStatus,
  CommissioningTranche,
  GuidanceStatement,
} from "../../src/data/types/developers";
import { fyQuarterIndex, quarterDiff } from "../../src/lib/fiscal";

/**
 * Group dated commissioning-guidance rows by tranche, order each tranche's
 * statements oldest-first into a revision `history`, and derive its original /
 * current target + slippage. Shared by the IPP power pipeline and the cell-
 * manufacturing pipeline — both read the same CSV shape:
 *
 *   tranche_id, developer, project, tech, capacity_gw,
 *   stated_on, concall, target_period, status, confidence, source, source_url, note
 *
 * (`developer` is the IPP for power tranches, the maker for cell tranches.)
 * Rows are returned sorted by current target (earliest first), then capacity,
 * then id — so the timeline reads chronologically by default.
 */
export function buildCommissioningTranches(
  rows: Record<string, string>[],
): CommissioningTranche[] {
  const byTranche = new Map<string, Record<string, string>[]>();
  for (const r of rows) {
    const arr = byTranche.get(r.tranche_id) ?? [];
    arr.push(r);
    byTranche.set(r.tranche_id, arr);
  }
  return [...byTranche.entries()]
    .map(([id, group]) => {
      // Statements oldest-first so history[0] is the original guidance.
      const stmts = [...group].sort(
        (a, b) =>
          a.stated_on.localeCompare(b.stated_on) ||
          a.concall.localeCompare(b.concall),
      );
      const history: GuidanceStatement[] = stmts.map((s) => ({
        statedOn: s.stated_on,
        concall: s.concall,
        targetPeriod: s.target_period,
        status: s.status as CommissioningStatus,
        ...(s.source_url?.trim() ? { sourceUrl: s.source_url.trim() } : {}),
      }));
      const first = stmts[0];
      const last = stmts[stmts.length - 1];
      return {
        id,
        developer: last.developer,
        project: last.project,
        tech: last.tech,
        capacityGw: Number(last.capacity_gw),
        history,
        originalTarget: first.target_period,
        currentTarget: last.target_period,
        status: last.status as CommissioningStatus,
        slipQuarters: quarterDiff(first.target_period, last.target_period),
        confidence: last.confidence as Confidence,
        ...(last.note ? { sourceNote: last.note } : {}),
        ...(last.source_url?.trim() ? { sourceUrl: last.source_url.trim() } : {}),
      };
    })
    // Earliest current target first; then largest; then id for stability.
    .sort(
      (a, b) =>
        fyQuarterIndex(a.currentTarget) - fyQuarterIndex(b.currentTarget) ||
        b.capacityGw - a.capacityGw ||
        a.id.localeCompare(b.id),
    );
}
