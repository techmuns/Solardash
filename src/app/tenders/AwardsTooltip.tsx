"use client";

import { energyColor } from "@/lib/colors";
import { formatDate, formatNumber } from "@/lib/utils";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import type { AwardRecord } from "@/data/types/tenders";

/**
 * Rich hover card for an "Awards by quarter" bar: the quarter total plus every
 * atomic award in that quarter (date · agency · type · MW · storage · ₹/unit ·
 * winners · state) — the detail that used to live in the removed Award-log tab.
 * Recharts injects `active` / `label`; the period→awards map is passed in.
 */
export function AwardsTooltip({
  active,
  label,
  awardsByPeriod,
}: {
  active?: boolean;
  label?: string | number;
  awardsByPeriod: Record<string, AwardRecord[]>;
}) {
  if (!active || label == null) return null;
  const period = String(label);
  const awards = awardsByPeriod[period] ?? [];
  const total = awards.reduce((s, a) => s + a.capacityMw, 0);
  const MAX = 6;

  return (
    <div className="max-w-[20rem] rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-card">
      <p className="text-xs font-semibold">
        {period}
        {awards.length > 0 && (
          <span className="font-normal text-muted-foreground">
            {" · "}
            {formatNumber(total)} MW awarded
          </span>
        )}
      </p>
      {awards.length === 0 ? (
        <p className="mt-1 text-2xs text-muted-foreground">
          No atomic records for this quarter.
        </p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {awards.slice(0, MAX).map((a) => (
            <li key={a.id} className="text-2xs leading-snug">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <span
                    className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{ background: energyColor(a.tenderType) }}
                    aria-hidden
                  />
                  {TENDER_TYPE_LABELS[a.tenderType]} · {formatNumber(a.capacityMw)} MW
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {a.tariffRs != null ? `₹${a.tariffRs.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="text-muted-foreground">
                {formatDate(a.date, "d MMM")} · {a.agency}
                {a.storageMwh != null ? ` · ${formatNumber(a.storageMwh)} MWh` : ""}
                {` · ${a.state ?? "Central"}`}
              </div>
              {a.winners && a.winners.length > 0 && (
                <div
                  className="truncate text-muted-foreground/80"
                  title={a.winners.map((w) => w.developer).join(", ")}
                >
                  {a.winners.map((w) => w.developer).join(", ")}
                </div>
              )}
            </li>
          ))}
          {awards.length > MAX && (
            <li className="text-2xs text-muted-foreground/70">
              +{awards.length - MAX} more…
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
