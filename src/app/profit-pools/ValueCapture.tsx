"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Calculator, ChevronRight, FlaskConical, X } from "lucide-react";
import { AnalysisTag } from "@/components/ui/AnalysisTag";
import { Dialog } from "@/components/ui/Dialog";
import { cn, formatDate } from "@/lib/utils";
import type { CompanyValueCapture, StageIrr as StageIrrType } from "@/data/profit-pools";

/** As-of dates of the live-derived metric sources. */
export interface IrrFreshness {
  price: string;
  tariff: string;
  margin: string;
}

/** IRR heat: emerald (high) → blue → amber → red (thin/none). */
function irrColor(pct: number | null): string {
  if (pct == null) return "#94A3B8";
  if (pct >= 20) return "#10B981";
  if (pct >= 12) return "#3B82F6";
  if (pct >= 6) return "#F59E0B";
  return "#EF4444";
}

const fmtPct = (v: number | null, off?: boolean) =>
  off ? "off-chart" : v == null ? "—" : `${v}%`;

// ─────────────────────── Expandable per-stage company rows ──────────────────

function CompanyRows({
  companies,
  onShowCalc,
}: {
  companies: CompanyValueCapture[];
  onShowCalc: (c: CompanyValueCapture) => void;
}) {
  if (companies.length === 0) {
    return (
      <tr className="bg-muted/20">
        <td colSpan={9} className="px-2 py-2 pl-8 text-2xs text-muted-foreground">
          No tracked India players at this stage.
        </td>
      </tr>
    );
  }
  return (
    <>
      {companies.map((c) => (
        <tr key={c.slug} className="bg-muted/20 text-xs">
          <td className="py-1.5 pl-8 pr-2">
            <span className="flex items-center gap-1.5">
              <Link
                href={`/companies/${c.slug}`}
                className="min-w-0 truncate text-foreground/90 outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
              >
                {c.name}
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowCalc(c);
                }}
                title={`Show how ${c.name}'s IRR is calculated`}
                aria-label={`Show how ${c.name}'s IRR is calculated`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Calculator className="h-3 w-3" aria-hidden />
                IRR calc
              </button>
            </span>
          </td>
          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground/50">
            {c.capexPerW}
          </td>
          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground/50">
            {c.aspPerW}
          </td>
          <td className="px-2 py-1.5 text-right font-medium tabular-nums text-foreground/90">
            {c.ebitdaMarginPct}%
          </td>
          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground/50">
            {c.utilizationPct}%
          </td>
          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground/50">
            {c.lifeYears}y
          </td>
          <td className="px-2 py-1.5 text-right tabular-nums text-foreground/80">
            {c.ebitdaPerWYr > 0 ? c.ebitdaPerWYr : "—"}
          </td>
          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
            {c.paybackYears != null ? `${c.paybackYears}y` : "—"}
          </td>
          <td
            className="px-2 py-1.5 text-right font-semibold tabular-nums"
            style={{ color: c.irrPct != null ? irrColor(c.irrPct) : undefined }}
          >
            {fmtPct(c.irrPct, c.offChart)}
          </td>
        </tr>
      ))}
    </>
  );
}

function StageRow({
  row,
  companies,
  open,
  onToggle,
  onShowCalc,
  onShowCompanyCalc,
}: {
  row: StageIrrType;
  companies: CompanyValueCapture[];
  open: boolean;
  onToggle: () => void;
  onShowCalc: () => void;
  onShowCompanyCalc: (c: CompanyValueCapture) => void;
}) {
  const expandable = companies.length > 0;
  return (
    <>
      <tr
        className={cn(
          "border-b border-border/60 align-middle",
          expandable && "cursor-pointer hover:bg-muted/30",
          open && "bg-muted/20",
        )}
        onClick={expandable ? onToggle : undefined}
      >
        <td className="px-2 py-2">
          <div className="flex items-center gap-1.5">
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-90",
                !expandable && "opacity-0",
              )}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">
                  {row.stage}
                  {expandable && (
                    <span className="ml-1.5 text-2xs font-normal text-muted-foreground">
                      {companies.length}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowCalc();
                  }}
                  title={`Show how ${row.stage} IRR is calculated`}
                  aria-label={`Show how ${row.stage} IRR is calculated`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <Calculator className="h-3 w-3" aria-hidden />
                  IRR calc
                </button>
              </div>
              <div className="pl-0 text-2xs text-muted-foreground">{row.region}</div>
            </div>
          </div>
        </td>
        <td className="px-2 py-2 text-right tabular-nums text-foreground/90">{row.capexPerW}</td>
        <td className="px-2 py-2 text-right tabular-nums text-foreground/90">{row.aspPerW}</td>
        <td className="px-2 py-2 text-right tabular-nums text-foreground/90">
          {row.ebitdaMarginPct}%
        </td>
        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
          {row.utilizationPct}%
        </td>
        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{row.lifeYears}y</td>
        <td className="px-2 py-2 text-right tabular-nums text-foreground/90">
          {row.ebitdaPerWYr > 0 ? row.ebitdaPerWYr : "—"}
        </td>
        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
          {row.paybackYears != null ? `${row.paybackYears}y` : "—"}
        </td>
        <td
          className="px-2 py-2 text-right font-semibold tabular-nums"
          style={{ color: row.irrPct != null ? irrColor(row.irrPct) : undefined }}
        >
          {fmtPct(row.irrPct, row.offChart)}
        </td>
      </tr>
      {open && <CompanyRows companies={companies} onShowCalc={onShowCompanyCalc} />}
    </>
  );
}

// ──────────────────── Per-stage IRR calculation dialog ─────────────────────

/** One line of the worked calculation: label, the substituted maths, result. */
function CalcStep({
  n,
  label,
  formula,
  result,
  note,
}: {
  n: number;
  label: string;
  formula: string;
  result: string;
  note?: string;
}) {
  return (
    <div className="flex gap-3 border-b border-border/60 py-2.5 last:border-b-0">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="text-xs font-semibold text-foreground">{label}</span>
          <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-brand">
            {result}
          </span>
        </div>
        <div className="mt-0.5 break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
          {formula}
        </div>
        {note && (
          <p className="mt-1 text-2xs leading-snug text-muted-foreground/80">{note}</p>
        )}
      </div>
    </div>
  );
}

/**
 * What the calculation dialog renders — either a value-chain stage (the
 * benchmark model) or one company at its own disclosed EBITDA margin.
 */
export interface IrrCalcSubject {
  title: string;
  subtitle: string;
  capexPerW: number;
  aspPerW: number;
  ebitdaMarginPct: number;
  utilizationPct: number;
  lifeYears: number;
  ebitdaPerWYr: number;
  paybackYears: number | null;
  irrPct: number | null;
  offChart?: boolean;
  /** Where the margin figure comes from (differs for a stage vs a company). */
  marginNote: string;
  source?: string;
  confidence?: string;
  note?: string;
  /** Closing provenance line. */
  footer: string;
}

/** Normalise a stage row into the dialog's subject shape. */
function stageSubject(row: StageIrrType): IrrCalcSubject {
  return {
    title: row.stage,
    subtitle: `${row.region} · greenfield 1 W of capacity · every input shown`,
    capexPerW: row.capexPerW,
    aspPerW: row.aspPerW,
    ebitdaMarginPct: row.ebitdaMarginPct,
    utilizationPct: row.utilizationPct,
    lifeYears: row.lifeYears,
    ebitdaPerWYr: row.ebitdaPerWYr,
    paybackYears: row.paybackYears,
    irrPct: row.irrPct,
    offChart: row.offChart,
    marginNote:
      "The margin is FACT — from filings for India stages, agency benchmarks elsewhere.",
    source: row.source,
    confidence: row.confidence,
    note: row.note,
    footer:
      "CapEx, utilisation and life are the stage's sourced model inputs; the price is derived from the freshest price / tariff feed. The IRR itself is Munshot analysis, not a reported figure.",
  };
}

/** Normalise a company row into the dialog's subject shape. */
function companySubject(c: CompanyValueCapture): IrrCalcSubject {
  return {
    title: c.name,
    subtitle: `${c.stageLabel} · at its own EBITDA margin · greenfield 1 W of capacity`,
    capexPerW: c.capexPerW,
    aspPerW: c.aspPerW,
    ebitdaMarginPct: c.ebitdaMarginPct,
    utilizationPct: c.utilizationPct,
    lifeYears: c.lifeYears,
    ebitdaPerWYr: c.ebitdaPerWYr,
    paybackYears: c.paybackYears,
    irrPct: c.irrPct,
    offChart: c.offChart,
    marginNote: `${c.ebitdaMarginPct}% is ${c.name}'s own disclosed EBITDA margin (FACT, from its filings) — the only input that differs from the ${c.stageLabel} benchmark.`,
    source: "Company filings",
    confidence: "high",
    footer: `Margin is the company's own reported figure; CapEx, price, utilisation and life are held at the ${c.stageLabel} stage model, so this isolates what that margin alone is worth. The IRR is Munshot analysis, not a reported figure.`,
  };
}

/** The worked, step-by-step IRR calculation for a stage or a company. */
function IrrCalcDialog({
  subject,
  onClose,
}: {
  subject: IrrCalcSubject | null;
  onClose: () => void;
}) {
  if (!subject) return null;
  const row = subject;
  const marginFrac = row.ebitdaMarginPct / 100;
  const grossPerW = row.aspPerW * marginFrac;
  const lifetime = row.ebitdaPerWYr * row.lifeYears;
  const recovers = lifetime > row.capexPerW;

  return (
    <Dialog
      open={Boolean(subject)}
      onClose={onClose}
      ariaLabel={`${row.title} — IRR calculation`}
      className="max-w-xl"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            {row.title} — IRR calculation
          </h2>
          <p className="mt-0.5 text-2xs text-muted-foreground">{row.subtitle}</p>
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
        {/* Inputs */}
        <h3 className="text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Inputs
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { k: "CapEx", v: `₹${row.capexPerW}/W` },
            { k: "Price (revenue)", v: `₹${row.aspPerW}/W` },
            { k: "EBITDA margin", v: `${row.ebitdaMarginPct}%` },
            { k: "Utilisation", v: `${row.utilizationPct}%` },
            { k: "Asset life", v: `${row.lifeYears} years` },
            { k: "Salvage value", v: "₹0 (assumed)" },
          ].map((i) => (
            <div key={i.k} className="rounded-lg border border-border bg-card px-2.5 py-1.5">
              <div className="text-sm font-semibold tabular-nums text-foreground">{i.v}</div>
              <div className="text-2xs text-muted-foreground">{i.k}</div>
            </div>
          ))}
        </div>

        {/* Worked steps */}
        <h3 className="mt-4 text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Step by step
        </h3>
        <div className="mt-1">
          <CalcStep
            n={1}
            label="EBITDA per W at full output"
            formula={`₹${row.aspPerW}/W price × ${row.ebitdaMarginPct}% margin = ₹${grossPerW.toFixed(2)}/W`}
            result={`₹${grossPerW.toFixed(2)}/W`}
            note={row.marginNote}
          />
          <CalcStep
            n={2}
            label="Annual EBITDA per W (de-rated for utilisation)"
            formula={`₹${grossPerW.toFixed(2)}/W × ${row.utilizationPct}% utilisation = ₹${row.ebitdaPerWYr}/W/yr`}
            result={`₹${row.ebitdaPerWYr}/W/yr`}
            note="A plant only runs part of the year; utilisation converts nameplate to real annual output."
          />
          <CalcStep
            n={3}
            label="Payback (undiscounted)"
            formula={`₹${row.capexPerW}/W CapEx ÷ ₹${row.ebitdaPerWYr}/W/yr = ${
              row.paybackYears != null ? `${row.paybackYears} years` : "never recovers"
            }`}
            result={row.paybackYears != null ? `${row.paybackYears}y` : "—"}
            note="How long the cash flow takes to return the capital, ignoring the time value of money."
          />
          <CalcStep
            n={4}
            label="Lifetime cash vs capital"
            formula={`₹${row.ebitdaPerWYr}/W/yr × ${row.lifeYears}y = ₹${lifetime.toFixed(2)}/W ${
              recovers ? ">" : "≤"
            } ₹${row.capexPerW}/W CapEx`}
            result={recovers ? "Recovers" : "Never recovers"}
            note={
              recovers
                ? "Total cash over the asset's life exceeds the capital, so a positive IRR exists."
                : "Total cash over the asset's life never repays the capital — the IRR is undefined, shown as “—”."
            }
          />
          <CalcStep
            n={5}
            label="IRR — the discount rate where NPV = 0"
            formula={`solve r in:  −₹${row.capexPerW} + Σ(t=1…${row.lifeYears}) ₹${row.ebitdaPerWYr} ÷ (1+r)^t = 0`}
            result={row.offChart ? "off-chart" : row.irrPct != null ? `${row.irrPct}%` : "—"}
            note="Solved numerically by bisection on a level annual cash flow. “off-chart” means the IRR exceeds the 300% search ceiling (near-zero CapEx relative to cash)."
          />
        </div>

        {/* Source */}
        <div className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Source &amp; confidence
          </div>
          <p className="mt-1 text-xs leading-snug text-foreground/90">
            {row.source} · <span className="text-muted-foreground">{row.confidence}</span>
          </p>
          {row.note && (
            <p className="mt-1 text-2xs leading-snug text-muted-foreground">{row.note}</p>
          )}
          <p className="mt-1.5 text-2xs leading-snug text-muted-foreground">
            {row.footer}
          </p>
        </div>
      </div>
    </Dialog>
  );
}

// ───────────────────────────── Methodology dialog ──────────────────────────

function MethodSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h3>
      <div className="mt-1.5 text-sm leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}

/** "How the IRRs are calculated" — plain-language method + metric sources. */
function MethodologyDialog({
  open,
  onClose,
  assumptions,
  sources,
  freshness,
}: {
  open: boolean;
  onClose: () => void;
  assumptions: string[];
  sources: string[];
  freshness: IrrFreshness;
}) {
  return (
    <Dialog open={open} onClose={onClose} ariaLabel="How the IRRs are calculated" className="max-w-xl">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <FlaskConical className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">
              How the IRRs are calculated
            </h2>
            <p className="text-2xs text-muted-foreground">Munshot analysis · method &amp; sources</p>
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

      <div className="space-y-4 overflow-y-auto px-5 py-4">
        <MethodSection title="What this shows">
          For each stage of the chain — and each listed player — the{" "}
          <span className="font-medium text-foreground">greenfield project IRR</span>: the annual
          return of building that plant today and running it over its life. It answers who captures
          the most value across the chain.
        </MethodSection>

        <MethodSection title="The formula">
          The IRR is the rate <span className="font-medium">r</span> at which the plant just breaks
          even — its up-front CapEx equals the present value of the EBITDA it earns each year:
          <div className="my-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-center text-sm font-medium tabular-nums text-foreground">
            CapEx = Σ EBITDA / (1 + r)ᵗ &nbsp;<span className="text-muted-foreground">(t = 1 … asset life)</span>
          </div>
          Spend the CapEx once, earn EBITDA every year; the IRR is the yield that equates them. A
          quick sense-check is the <span className="font-medium">payback</span> (CapEx ÷ annual
          EBITDA) — shown alongside.
        </MethodSection>

        <MethodSection title="How the annual EBITDA is built">
          Everything is measured <span className="font-medium">per Watt of annual capacity</span>:
          <div className="my-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-center text-sm font-medium text-foreground">
            EBITDA/W = price/W × EBITDA margin × utilisation
          </div>
          Generation is the exception — its annual revenue/W = tariff × CUF × 8,760 hours.
        </MethodSection>

        <MethodSection title="Company IRRs">
          Each company keeps its stage&apos;s CapEx, price, utilisation and life, but we swap in{" "}
          <span className="font-medium">its own disclosed EBITDA margin</span> (a fact from filings).
          Margin is then the only thing that varies, isolating how much value each player captures.
        </MethodSection>

        <MethodSection title="Key assumptions">
          <ul className="space-y-1">
            {assumptions.map((a) => (
              <li key={a} className="flex gap-2 text-sm text-foreground/90">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand" aria-hidden />
                {a}
              </li>
            ))}
          </ul>
        </MethodSection>

        <MethodSection title="Where the metrics come from">
          <ul className="space-y-1.5 text-sm text-foreground/90">
            <li>
              <span className="font-medium">Prices per Watt</span> — derived live from the latest
              month of the PV price stack (India ASP = China spot × the DCR premium).
            </li>
            <li>
              <span className="font-medium">Generation tariff</span> — the latest awarded solar
              tariff from the tenders feed (× CUF × 8,760 h).
            </li>
            <li>
              <span className="font-medium">EBITDA margins</span> — the current company registry
              (per company) and the maintained pure-stage benchmark (per stage).
            </li>
            <li>
              <span className="font-medium">CapEx intensity, life &amp; DCR premium</span> —
              maintained structural inputs (CEEW, CareEdge, CRISIL, ICRA, Mercom): cell ~₹595 cr/GW,
              integrated module ~₹700 cr/GW, IPP ~₹4.2 cr/MW.
            </li>
          </ul>
          <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
            Full source list: {sources.join(" · ")}. CapEx &amp; prices are sourced FACT; the IRR
            itself is Munshot analysis.
          </p>
        </MethodSection>

        <MethodSection title="Kept up to date automatically">
          The volatile inputs are re-derived from the freshest committed data every time the site
          rebuilds, so the IRRs stay current without hand-editing. As of now:
          <ul className="mt-1.5 space-y-1 text-sm text-foreground/90">
            <li className="flex justify-between gap-3">
              <span>Prices — monthly price stack</span>
              <span className="tabular-nums text-muted-foreground">{formatDate(freshness.price)}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Solar tariff — tenders feed</span>
              <span className="tabular-nums text-muted-foreground">{formatDate(freshness.tariff)}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Company margins — registry</span>
              <span className="tabular-nums text-muted-foreground">{formatDate(freshness.margin)}</span>
            </li>
          </ul>
        </MethodSection>
      </div>
    </Dialog>
  );
}

export function StageIrr({
  rows,
  companies,
  assumptions,
  sources,
  freshness,
}: {
  rows: StageIrrType[];
  companies: CompanyValueCapture[];
  assumptions: string[];
  sources: string[];
  freshness: IrrFreshness;
}) {
  const [methodOpen, setMethodOpen] = React.useState(false);
  // The stage or company whose worked IRR calculation is open (null = closed).
  const [calcSubject, setCalcSubject] = React.useState<IrrCalcSubject | null>(null);
  // Group companies under their stage (matched on the stage name).
  const byStage = React.useMemo(() => {
    const m = new Map<string, CompanyValueCapture[]>();
    for (const c of companies) {
      const arr = m.get(c.stageName) ?? [];
      arr.push(c);
      m.set(c.stageName, arr);
    }
    return m;
  }, [companies]);

  // Collapsed by default — each stage is a summary row; click to reveal its
  // companies' IRRs.
  const [open, setOpen] = React.useState<Set<string>>(() => new Set());
  const toggle = (stage: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <AnalysisTag />
        <button
          type="button"
          onClick={() => setMethodOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <FlaskConical className="h-3.5 w-3.5" aria-hidden />
          Methodology
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border text-left text-2xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2 font-semibold">Stage · company</th>
              <th className="px-2 py-2 text-right font-semibold">CapEx ₹/W</th>
              <th className="px-2 py-2 text-right font-semibold">Price ₹/W</th>
              <th className="px-2 py-2 text-right font-semibold">Margin</th>
              <th className="px-2 py-2 text-right font-semibold">Util</th>
              <th className="px-2 py-2 text-right font-semibold">Life</th>
              <th className="px-2 py-2 text-right font-semibold">EBITDA ₹/W/yr</th>
              <th className="px-2 py-2 text-right font-semibold">Payback</th>
              <th className="px-2 py-2 text-right font-semibold">
                IRR <span className="font-normal normal-case">· Munshot</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <StageRow
                key={`${r.stage}-${r.region}`}
                row={r}
                companies={byStage.get(r.stage) ?? []}
                open={open.has(r.stage)}
                onToggle={() => toggle(r.stage)}
                onShowCalc={() => setCalcSubject(stageSubject(r))}
                onShowCompanyCalc={(c) => setCalcSubject(companySubject(c))}
              />
            ))}
          </tbody>
        </table>
      </div>
      <MethodologyDialog
        open={methodOpen}
        onClose={() => setMethodOpen(false)}
        assumptions={assumptions}
        sources={sources}
        freshness={freshness}
      />
      <IrrCalcDialog subject={calcSubject} onClose={() => setCalcSubject(null)} />
    </div>
  );
}

// ─────────────────────── Company value-capture (side panel) ─────────────────

/** Ranked cross-stage "who captures value" leaderboard (top players). */
export function CompanyValueCaptureList({
  rows,
  limit = 12,
}: {
  rows: CompanyValueCapture[];
  limit?: number;
}) {
  const shown = rows.slice(0, limit);
  const maxIrr = Math.max(1, ...shown.map((r) => r.irrPct ?? 0));
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-2xs leading-snug text-muted-foreground">
        Greenfield IRR at each player&apos;s <span className="font-medium text-foreground/80">own EBITDA margin</span>{" "}
        (FACT), on that stage&apos;s CapEx model — ranked across the chain.
      </p>
      <ul className="flex flex-col gap-2">
        {shown.map((r) => {
          const color = irrColor(r.irrPct);
          const w = r.offChart ? 100 : Math.max(4, ((r.irrPct ?? 0) / maxIrr) * 100);
          return (
            <li key={r.slug} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  href={`/companies/${r.slug}`}
                  className="min-w-0 flex-1 truncate text-xs font-medium text-foreground outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {r.name}
                </Link>
                <span className="shrink-0 text-2xs tabular-nums text-muted-foreground">
                  {r.stageLabel} · {r.ebitdaMarginPct}%
                </span>
                <span
                  className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums"
                  style={{ color }}
                >
                  {fmtPct(r.irrPct, r.offChart)}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${w}%`, background: color }} />
              </div>
            </li>
          );
        })}
      </ul>
      <Link
        href="/companies"
        className="inline-flex shrink-0 items-center gap-1 self-start rounded-md text-2xs font-medium text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand"
      >
        All companies
        <ArrowUpRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  );
}
