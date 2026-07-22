"use client";

import Link from "next/link";
import { ArrowUpRight, ExternalLink, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { formatDate, formatNumber } from "@/lib/utils";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import type { AwardRecord } from "@/data/types/tenders";
import { listedInfo } from "./listed-developers";

/** One auction a developer won, with the MW attributed to them. */
interface WonAuction {
  award: AwardRecord;
  mw: number | undefined;
  tariffRs: number | undefined;
}

/**
 * Detail popup for a leaderboard developer: the listed parent (if any) and the
 * individual auctions the developer won over the window — date, agency, tender
 * type, its MW share and the winning tariff, each linked to its source.
 */
export function DeveloperDetailDialog({
  developer,
  awards,
  onClose,
}: {
  developer: string | null;
  awards: AwardRecord[];
  onClose: () => void;
}) {
  const listing = developer ? listedInfo(developer) : undefined;

  const won: WonAuction[] = developer
    ? awards
        .filter((a) => a.winners?.some((w) => w.developer === developer))
        .map((a) => {
          const w = a.winners?.find((x) => x.developer === developer);
          return { award: a, mw: w?.mw, tariffRs: a.tariffRs };
        })
        .sort((x, y) => y.award.date.localeCompare(x.award.date))
    : [];

  const totalMw = won.reduce((s, w) => s + (w.mw ?? 0), 0);

  return (
    <Dialog
      open={Boolean(developer)}
      onClose={onClose}
      ariaLabel={developer ? `${developer} — auctions won` : undefined}
      className="max-w-2xl"
    >
      {developer && (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-foreground">{developer}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted-foreground">
                {listing ? (
                  <span className="inline-flex items-center gap-1.5">
                    {listing.subsidiary ? (
                      <>
                        <span>Subsidiary of listed</span>
                        <span className="font-medium text-foreground/80">{listing.parent}</span>
                      </>
                    ) : (
                      <span className="font-medium text-foreground/80">Listed</span>
                    )}
                    <span className="rounded bg-positive/10 px-1.5 py-0.5 font-semibold text-positive">
                      NSE: {listing.ticker}
                    </span>
                  </span>
                ) : (
                  <span>Unlisted / private</span>
                )}
                <span>· {won.length} auction{won.length === 1 ? "" : "s"} won · {formatNumber(totalMw)} MW</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto px-5 py-4">
            {won.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No disclosed winning allocations in the current window.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead className="text-left text-2xs uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-2 font-semibold">Date</th>
                    <th className="px-2 py-2 font-semibold">Agency</th>
                    <th className="px-2 py-2 font-semibold">Type</th>
                    <th className="px-2 py-2 text-right font-semibold">MW</th>
                    <th className="px-2 py-2 text-right font-semibold">₹/kWh</th>
                    <th className="py-2 pl-2 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {won.map(({ award, mw, tariffRs }) => (
                    <tr key={award.id} className="border-b border-border/60 align-top">
                      <td className="whitespace-nowrap py-2 pr-2 tabular-nums text-muted-foreground">
                        {formatDate(award.date)}
                      </td>
                      <td className="px-2 py-2">
                        {award.agency}
                        <div className="text-2xs text-muted-foreground">{award.period}</div>
                      </td>
                      <td className="px-2 py-2">{TENDER_TYPE_LABELS[award.tenderType]}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-foreground">
                        {mw != null ? formatNumber(mw) : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                        {tariffRs != null ? tariffRs.toFixed(2) : "—"}
                      </td>
                      <td className="py-2 pl-2">
                        {award.sourceUrl ? (
                          <a
                            href={award.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-2xs text-brand hover:underline"
                          >
                            source
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                        ) : (
                          <span className="text-2xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {listing && (
            <div className="flex justify-end border-t border-border px-5 py-3">
              <Link
                href={`/companies`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand"
              >
                Open {listing.parent}
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </Link>
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
