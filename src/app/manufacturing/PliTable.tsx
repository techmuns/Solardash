import type { ManufacturingData } from "@/data/types/manufacturing";

/**
 * PLI awardees as a plain numbers table: GW awarded in each tranche plus the
 * cumulative total, largest first. Derives the per-round award from the
 * cumulative pliHistory (Tranche II = cumulative − Tranche I).
 */
export function PliTable({ series }: { series: ManufacturingData["pliHistory"] }) {
  const tranches = series[0]?.points.map((p) => p.period) ?? [];
  const rows = series.map((s) => {
    const t1 = s.points[0]?.value ?? 0;
    const cum2 = s.points[1]?.value ?? t1;
    return {
      key: s.key,
      label: s.label,
      awards: [t1, Math.round((cum2 - t1) * 100) / 100],
      total: cum2,
    };
  });
  const totals = [
    rows.reduce((s, r) => s + r.awards[0], 0),
    rows.reduce((s, r) => s + r.awards[1], 0),
    rows.reduce((s, r) => s + r.total, 0),
  ].map((n) => Math.round(n * 100) / 100);

  const fmt = (n: number) => (n > 0 ? n : "—");

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border text-left text-2xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-semibold">PLI awardee</th>
            {tranches.map((t) => (
              <th key={t} className="px-3 py-2 text-right font-semibold">
                {t}
              </th>
            ))}
            <th className="px-3 py-2 text-right font-semibold">Total GW</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-border/60">
              <td className="px-3 py-2 font-medium text-foreground">{r.label}</td>
              {r.awards.map((gw, i) => (
                <td
                  key={i}
                  className="px-3 py-2 text-right tabular-nums text-foreground/90"
                >
                  {fmt(gw)}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">
                {r.total}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-border">
            <td className="px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total
            </td>
            <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">
              {totals[0]}
            </td>
            <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">
              {totals[1]}
            </td>
            <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">
              {totals[2]}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
