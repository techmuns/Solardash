import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatDate, formatNumber } from "@/lib/utils";
import { formatFyQuarter } from "@/lib/fiscal";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import type { CompanyOperating } from "@/data/company-links";

const STATUS_COLOR: Record<string, string> = {
  commissioned: "#059669",
  "on-track": "#2563EB",
  delayed: "#D97706",
  "at-risk": "#DC2626",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-base font-semibold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-2xs leading-tight text-muted-foreground">{label}</div>
      {hint && <div className="text-2xs leading-tight text-muted-foreground/70">{hint}</div>}
    </div>
  );
}

function Block({
  title,
  subtitle,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          {subtitle && <p className="text-2xs text-muted-foreground">{subtitle}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-2xs font-medium text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand"
          >
            {hrefLabel ?? "Open section"}
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </Link>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

/**
 * Every operating metric the rest of the dashboard holds for this company —
 * IPP portfolio, commissioning pipeline, auctions won, PPAs, manufacturing
 * capacity, PLI awards, value-capture IRR and the policy schemes that hit it —
 * so the financials and the operations sit on one page.
 */
export function OperatingMetrics({ op, name }: { op: CompanyOperating; name: string }) {
  if (op.isEmpty) return null;

  const r = op.roster;
  const vc = op.valueCapture;

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Operating metrics"
        subtitle={`What the rest of the dashboard tracks for ${name} — capacity, auctions, offtake, manufacturing and returns.`}
      />

      {/* Headline operating stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {r && <Stat label="Operational" value={`${r.operationalGw} GW`} />}
        {r && <Stat label="Under construction" value={`${r.underConstructionGw} GW`} />}
        {r && <Stat label="Pipeline" value={`${r.pipelineGw} GW`} />}
        {r?.targetGw != null && (
          <Stat label={`Target ${r.targetYear ?? "FY30"}`} value={`${r.targetGw} GW`} />
        )}
        {op.awards.length > 0 && (
          <Stat
            label="Auctions won"
            value={`${formatNumber(op.awardMw)} MW`}
            hint={`${op.awards.length} auction${op.awards.length === 1 ? "" : "s"}`}
          />
        )}
        {op.cell && <Stat label="Cell nameplate" value={`${op.cell.nameplateGw} GW`} hint={op.cell.almm2Gw ? `ALMM-II ${op.cell.almm2Gw} GW` : undefined} />}
        {op.module && <Stat label="Module nameplate" value={`${op.module.almm1Gw} GW`} hint="ALMM List-I" />}
        {op.pli && (
          <Stat
            label="PLI awarded"
            value={`${op.pli.capacityGw} GW`}
            hint={op.pli.tranchesWon > 1 ? "both tranches" : "1 tranche"}
          />
        )}
        {vc?.irrPct != null && (
          <Stat
            label={`Greenfield IRR · ${vc.stageLabel}`}
            value={vc.offChart ? "off-chart" : `${vc.irrPct}%`}
            hint={`at its ${vc.ebitdaMarginPct}% margin`}
          />
        )}
        {op.ppas.length > 0 && (
          <Stat
            label="PPAs signed"
            value={`${formatNumber(op.ppas.reduce((s, p) => s + p.capacityMw, 0))} MW`}
            hint={`${op.ppas.length} agreement${op.ppas.length === 1 ? "" : "s"}`}
          />
        )}
      </div>

      {/* Auctions won */}
      {op.awards.length > 0 && (
        <Block
          title="Auctions won"
          subtitle="From the maintained auction feed"
          href="/tenders"
          hrefLabel="Tenders"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="text-left text-2xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-2 font-semibold">Date</th>
                  <th className="px-2 py-1.5 font-semibold">Agency</th>
                  <th className="px-2 py-1.5 font-semibold">Type</th>
                  <th className="px-2 py-1.5 text-right font-semibold">MW</th>
                  <th className="px-2 py-1.5 text-right font-semibold">₹/kWh</th>
                  <th className="py-1.5 pl-2 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {op.awards.slice(0, 10).map(({ award, mw }) => (
                  <tr key={award.id} className="border-t border-border/60">
                    <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums text-muted-foreground">
                      {formatDate(award.date)}
                    </td>
                    <td className="px-2 py-1.5">{award.agency}</td>
                    <td className="px-2 py-1.5">{TENDER_TYPE_LABELS[award.tenderType]}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                      {mw != null ? formatNumber(mw) : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                      {award.tariffRs != null ? award.tariffRs.toFixed(2) : "—"}
                    </td>
                    <td className="py-1.5 pl-2">
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
          </div>
        </Block>
      )}

      {/* Commissioning pipeline */}
      {op.commissioning.length > 0 && (
        <Block
          title="Commissioning pipeline"
          subtitle="Guided COD tracked from concalls, with slippage vs earlier guidance"
          href="/developers"
          hrefLabel="IPPs"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="text-left text-2xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-2 font-semibold">Project</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Capacity</th>
                  <th className="px-2 py-1.5 font-semibold">Original</th>
                  <th className="px-2 py-1.5 font-semibold">Current</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Slip</th>
                  <th className="py-1.5 pl-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {op.commissioning.map((t) => (
                  <tr key={t.id} className="border-t border-border/60 align-top">
                    <td className="max-w-[16rem] py-1.5 pr-2">
                      <div className="truncate text-foreground">{t.project}</div>
                      {(t.status === "delayed" || t.status === "at-risk") && t.sourceNote && (
                        <div
                          className="mt-0.5 line-clamp-2 text-2xs leading-tight"
                          style={{ color: STATUS_COLOR[t.status] }}
                        >
                          {t.sourceNote}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-foreground">
                      {t.capacityGw} {t.tech === "bess" ? "GWh" : "GW"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                      {formatFyQuarter(t.originalTarget)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-foreground">
                      {formatFyQuarter(t.currentTarget)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                      {t.slipQuarters === 0 ? "—" : `${t.slipQuarters > 0 ? "+" : ""}${t.slipQuarters}Q`}
                    </td>
                    <td className="whitespace-nowrap py-1.5 pl-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-2xs font-medium capitalize"
                        style={{
                          color: STATUS_COLOR[t.status],
                          background: `${STATUS_COLOR[t.status]}1a`,
                        }}
                      >
                        {t.status.replace("-", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      )}

      {/* PPAs */}
      {op.ppas.length > 0 && (
        <Block
          title="PPA / PSA signings"
          subtitle="Power-purchase agreements from the maintained tracker"
          href="/developers"
          hrefLabel="IPPs"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="text-left text-2xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-2 font-semibold">Date</th>
                  <th className="px-2 py-1.5 font-semibold">Agency</th>
                  <th className="px-2 py-1.5 font-semibold">Type</th>
                  <th className="px-2 py-1.5 text-right font-semibold">MW</th>
                  <th className="py-1.5 pl-2 text-right font-semibold">₹/kWh</th>
                </tr>
              </thead>
              <tbody>
                {op.ppas.map((p) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums text-muted-foreground">
                      {formatDate(p.date)}
                    </td>
                    <td className="px-2 py-1.5">{p.agency}</td>
                    <td className="px-2 py-1.5">{TENDER_TYPE_LABELS[p.tenderType]}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                      {formatNumber(p.capacityMw)}
                    </td>
                    <td className="py-1.5 pl-2 text-right tabular-nums text-muted-foreground">
                      {p.tariffRs != null ? p.tariffRs.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      )}

      {/* Policy exposure */}
      {op.schemes.length > 0 && (
        <Block
          title="Policy exposure"
          subtitle="Schemes whose impact note names this company"
          href="/policy"
          hrefLabel="Policy"
        >
          <ul className="flex flex-col gap-2">
            {op.schemes.map((s) => (
              <li key={s.scheme} className="border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-medium text-foreground">{s.scheme}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">
                    {s.category}
                  </span>
                  <span className="text-2xs text-muted-foreground">{s.status}</span>
                </div>
                <p className="mt-0.5 text-2xs leading-snug text-muted-foreground">{s.effect}</p>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </section>
  );
}
