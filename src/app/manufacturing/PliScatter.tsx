import type { ManufacturingData } from "@/data/types/manufacturing";

/**
 * PLI awardees as a firm × tranche dot scatter: each firm is a row with a
 * circle in each tranche column, sized by the GW it won that round (a small
 * muted dot where it didn't win that tranche). Reads the cumulative pliHistory
 * and derives the per-round award (Tranche II = cumulative − Tranche I).
 */
export function PliScatter({ series }: { series: ManufacturingData["pliHistory"] }) {
  const tranches = series[0]?.points.map((p) => p.period) ?? [];
  const rows = series.map((s) => {
    const t1 = s.points[0]?.value ?? 0;
    const cum2 = s.points[1]?.value ?? t1;
    const awards = [t1, Math.round((cum2 - t1) * 100) / 100];
    return { key: s.key, label: s.label, color: s.color ?? "#F59E0B", awards, total: cum2 };
  });
  const maxGw = Math.max(1, ...rows.flatMap((r) => r.awards));
  // Perceptual (area-ish) size: 14px → 44px across the GW range.
  const dia = (gw: number) => (gw <= 0 ? 0 : 14 + Math.sqrt(gw / maxGw) * 30);

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
      <div className="min-w-[420px]">
        {/* Header */}
        <div className="sticky top-0 z-10 grid grid-cols-[170px_1fr_1fr] items-end gap-2 bg-card pb-2">
          <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            PLI awardee
          </div>
          {tranches.map((t) => (
            <div
              key={t}
              className="text-center text-2xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rows.map((r) => (
          <div
            key={r.key}
            className="grid grid-cols-[170px_1fr_1fr] items-center gap-2 border-t border-border/50 py-1.5"
          >
            <div className="flex items-baseline gap-1.5 pr-2">
              <span className="truncate text-xs font-medium text-foreground">{r.label}</span>
              <span className="shrink-0 text-2xs tabular-nums text-muted-foreground">
                {r.total} GW
              </span>
            </div>
            {r.awards.map((gw, i) => (
              <div key={i} className="flex items-center justify-center">
                {gw > 0 ? (
                  <span
                    className="flex items-center justify-center gap-1"
                    title={`${r.label} · ${tranches[i]} · ${gw} GW`}
                  >
                    <span
                      className="shrink-0 rounded-full ring-2 ring-card"
                      style={{ width: dia(gw), height: dia(gw), background: r.color }}
                    />
                    <span className="text-[10px] font-semibold tabular-nums text-foreground">
                      {gw}
                    </span>
                  </span>
                ) : (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/25"
                    title={`${r.label} · not awarded in ${tranches[i]}`}
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        <p className="mt-3 px-1 text-2xs text-muted-foreground">
          Circle size = GW won that tranche · Tranche II award is the increment
          over Tranche I. Reliance &amp; Shirdi Sai / Indosol are the only firms to
          win both rounds.
        </p>
      </div>
    </div>
  );
}
