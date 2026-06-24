import { definePipeline } from "../lib/pipeline";
import {
  maxAsOf,
  readManualCsv,
  readManualJsonIfExists,
  writeSnapshot,
} from "../lib/io";
import type { Confidence, SourceRef } from "../../src/data/types/core";
import type {
  AnnualRow,
  CompaniesData,
  CompanyDetail,
  CompanyIdentity,
  CompanyType,
  QuarterRow,
} from "../../src/data/types/companies";
import type { ScreenerFeed } from "../ingest/screener";

const FALLBACK_AS_OF = "2026-03-31";
const round1 = (n: number) => Math.round(n * 10) / 10;

function num(v: string | undefined): number | undefined {
  if (v == null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

/** Parse a registry row into a CompanyIdentity (missing numerics stay undefined). */
function parseIdentity(r: Record<string, string>): CompanyIdentity {
  const id: CompanyIdentity = {
    slug: r.slug,
    name: r.name,
    type: r.type as CompanyType,
    confidence: r.confidence as Confidence,
  };
  if (r.ticker_nse) id.tickerNse = r.ticker_nse;
  type NumericKey =
    | "moduleGw"
    | "cellGw"
    | "orderBookCr"
    | "orderBookGw"
    | "revenueFy26Cr"
    | "ebitdaMarginPct"
    | "patFy26Cr"
    | "peX"
    | "evEbitdaX"
    | "targetPrice"
    | "cmp";
  const set = (key: NumericKey, raw: string | undefined) => {
    const v = num(raw);
    if (v != null) id[key] = v;
  };
  set("moduleGw", r.module_gw);
  set("cellGw", r.cell_gw);
  set("orderBookCr", r.order_book_cr);
  set("orderBookGw", r.order_book_gw);
  set("revenueFy26Cr", r.revenue_fy26_cr);
  set("ebitdaMarginPct", r.ebitda_margin_pct);
  set("patFy26Cr", r.pat_fy26_cr);
  set("peX", r.pe_x);
  set("evEbitdaX", r.ev_ebitda_x);
  set("targetPrice", r.target_price);
  set("cmp", r.cmp);
  if (r.rating) id.rating = r.rating;
  if (r.source) id.sourceNote = r.source;
  return id;
}

/** Warn (don't throw) if reported EBITDA ≠ revenue × margin. */
function checkMargins(label: string, rows: (AnnualRow | QuarterRow)[] | undefined) {
  for (const r of rows ?? []) {
    if (r.revenue != null && r.ebitda != null && r.ebitdaMarginPct != null) {
      const implied = (r.revenue * r.ebitdaMarginPct) / 100;
      if (Math.abs(implied - r.ebitda) > Math.max(2, 0.02 * r.ebitda)) {
        console.warn(
          `[companies] ${label} ${r.period}: EBITDA ${r.ebitda} ≠ implied ${round1(implied)} (margin ${r.ebitdaMarginPct}%)`,
        );
      }
    }
  }
}

export const companiesPipeline = definePipeline({
  name: "companies",
  section: "companies",
  cadence: "quarterly",
  run() {
    const rows = readManualCsv("companies/registry.csv");

    // Build each company: registry identity → screener feed → manual override
    // (precedence manual > screener > registry). A screener feed supplies
    // financials and refreshes the identity headline; a hand-authored
    // <slug>.json (forward estimates / valuation Screener lacks) overrides both.
    const built = rows.map((row) => {
      const identity = parseIdentity(row);
      const screener = readManualJsonIfExists<ScreenerFeed>(
        `companies/screener/${identity.slug}.json`,
      );
      const manual = readManualJsonIfExists<Partial<CompanyDetail>>(
        `companies/${identity.slug}.json`,
      );
      const hasDetail = screener != null || manual != null;

      // Headline-from-feed: surface the feed's latest annual period into the
      // screener identity so the /companies comparison table reflects scraped
      // data, not the stale registry seed. Skipped when a manual override
      // exists (manual wins).
      const latest = screener?.annual?.[screener.annual.length - 1];
      const screenerIdentity: CompanyIdentity =
        latest && !manual
          ? {
              ...identity,
              ...(latest.revenue != null ? { revenueFy26Cr: latest.revenue } : {}),
              ...(latest.ebitdaMarginPct != null
                ? { ebitdaMarginPct: latest.ebitdaMarginPct }
                : {}),
              ...(latest.pat != null ? { patFy26Cr: latest.pat } : {}),
            }
          : identity;

      const screenerDetail: Partial<CompanyDetail> = screener
        ? {
            ...(screener.annual?.length ? { annual: screener.annual } : {}),
            ...(screener.quarterly?.length ? { quarterly: screener.quarterly } : {}),
            ...(screener.shareholding ? { shareholding: screener.shareholding } : {}),
          }
        : {};
      const companyDetail = {
        ...screenerIdentity,
        ...screenerDetail,
        ...(manual ?? {}),
        hasDetail,
      } as CompanyDetail;
      const detailAsOf =
        companyDetail.valuation?.asOf ??
        companyDetail.shareholding?.asOf ??
        screener?.asOf;
      checkMargins(companyDetail.slug, companyDetail.annual);
      checkMargins(companyDetail.slug, companyDetail.quarterly);
      return { identity: screenerIdentity, companyDetail, detailAsOf };
    });

    // Identity registry (powers the screener table) — sorted by FY26 revenue
    // desc, then name. Uses the screener-refreshed identities.
    const companies = built
      .map((b) => b.identity)
      .sort(
        (a, b) =>
          (b.revenueFy26Cr ?? -1) - (a.revenueFy26Cr ?? -1) ||
          a.name.localeCompare(b.name),
      );

    // Sanity: unique slugs.
    const slugSet = new Set<string>();
    for (const c of companies) {
      if (slugSet.has(c.slug)) console.warn(`[companies] duplicate slug: ${c.slug}`);
      slugSet.add(c.slug);
    }

    // Sanity: the exemplar merged richly.
    const vikram = built.find((b) => b.companyDetail.slug === "vikram-solar");
    if (!vikram?.companyDetail.hasDetail) {
      console.warn("[companies] vikram-solar did not merge a detail JSON");
    }

    // Snapshot as-of = latest detail valuation/shareholding date, else fallback.
    const detailAsOfs = built
      .map((b) => b.detailAsOf)
      .filter((x): x is string => Boolean(x));
    const companiesAsOf = detailAsOfs.length
      ? detailAsOfs.reduce((m, a) => (a > m ? a : m), detailAsOfs[0])
      : FALLBACK_AS_OF;

    // Write one detail snapshot per company.
    for (const { companyDetail, detailAsOf } of built) {
      const asOf = detailAsOf ?? companiesAsOf;
      const sources: SourceRef[] = [
        {
          name: companyDetail.sourceNote ?? "Company",
          asOf,
          confidence: companyDetail.confidence,
        },
      ];
      writeSnapshot<CompanyDetail>("companies", `detail/${companyDetail.slug}`, {
        asOf,
        cadence: "quarterly",
        coverage: companyDetail.name,
        sources,
        notes: [
          companyDetail.hasDetail
            ? "Rich per-company model — financials, valuation, operating & shareholding."
            : "Registry-level identity only; a detail JSON has not been added yet (model + manual approach).",
        ],
        data: companyDetail,
      });
    }

    // Registry (screener) provenance = distinct source+confidence pairs.
    const srcMap = new Map<string, SourceRef>();
    for (const c of companies) {
      const name = c.sourceNote ?? "Company";
      const key = `${name}|${c.confidence}`;
      if (!srcMap.has(key)) srcMap.set(key, { name, asOf: companiesAsOf, confidence: c.confidence });
    }
    const sources = [...srcMap.values()].sort(
      (a, b) => a.name.localeCompare(b.name) || a.confidence.localeCompare(b.confidence),
    );

    writeSnapshot<CompaniesData>("companies", "registry", {
      asOf: maxAsOf(sources),
      cadence: "quarterly",
      coverage: "India · listed solar & renewable companies",
      sources,
      notes: [
        "Registry of listed solar / renewable names (model + manual). Headline metrics are company filings (aggregated); per-row confidence is honoured.",
        "Rich detail (financials, valuation, operating, shareholding) is added per company as <slug>.json; Vikram Solar is the seeded exemplar.",
      ],
      data: { companies, asOf: companiesAsOf },
    });
  },
});
