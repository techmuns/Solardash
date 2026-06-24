"use client";

import { ENERGY_COLORS, ENERGY_LABELS } from "@/lib/colors";
import type { Developer } from "@/data/types/developers";

/** Tech segments shown in the portfolio-mix bar (BESS is GWh — excluded). */
export const MIX_SEGMENTS = [
  { key: "solar", color: ENERGY_COLORS.solar, label: ENERGY_LABELS.solar },
  { key: "wind", color: ENERGY_COLORS.wind, label: ENERGY_LABELS.wind },
  { key: "hybrid", color: ENERGY_COLORS.hybrid, label: ENERGY_LABELS.hybrid },
  { key: "fdre", color: ENERGY_COLORS.fdre, label: ENERGY_LABELS.fdre },
] as const;

/** A compact horizontal stacked bar of a developer's operational tech mix. */
export function MixBar({ mix }: { mix: Developer["mix"] }) {
  const total = MIX_SEGMENTS.reduce((s, seg) => s + (mix[seg.key] || 0), 0);
  if (total <= 0) return <span className="text-muted-foreground/50">—</span>;
  const label = MIX_SEGMENTS.filter((s) => (mix[s.key] || 0) > 0)
    .map((s) => `${s.label} ${mix[s.key].toFixed(1)} GW`)
    .join(" · ");
  return (
    <div
      className="flex h-2.5 w-full min-w-[5.5rem] overflow-hidden rounded-full bg-muted"
      role="img"
      aria-label={label}
      title={label}
    >
      {MIX_SEGMENTS.map((seg) => {
        const v = mix[seg.key] || 0;
        if (v <= 0) return null;
        return (
          <div
            key={seg.key}
            style={{ width: `${(v / total) * 100}%`, background: seg.color }}
          />
        );
      })}
    </div>
  );
}
