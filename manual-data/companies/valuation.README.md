# Daily valuation feed

`valuation.csv` holds the **price-driven** ratios that move every trading day —
the ones a monthly financials refresh would leave stale:

```
slug, cmp, market_cap_cr, pe_x, pb_x, ev_ebitda_x, as_of
```

- **cmp** — current share price (₹)
- **market_cap_cr** — market capitalisation (₹ crore)
- **pe_x** — trailing P/E (×)
- **pb_x** — price / book (×)
- **ev_ebitda_x** — EV / EBITDA (×), computed as `(market_cap + gross borrowings) ÷ EBITDA(TTM)`; market cap is the daily-moving input, borrowings & TTM EBITDA come off the same Screener page and only really change quarterly
- **as_of** — the market date the row was captured (`YYYY-MM-DD`)

## Cadence & precedence

This table refreshes **daily** via
[`scripts/ingest/valuation.ts`](../../scripts/ingest/valuation.ts) (the
[`Refresh valuation`](../../.github/workflows/refresh-valuation.yml) Action,
Mon–Fri after market close). The heavy, filings-based financials — revenue, PAT,
margins, the annual/quarterly tables — stay on the **monthly**
`screener.ts` / `refresh-financials` cadence.

The companies pipeline merges these with precedence:

```
manual <slug>.json  >  valuation.csv (daily)  >  screener/<slug>.json (monthly)  >  registry.csv
```

so the four price-driven ratios always reflect the latest close, while the
financials keep their quarterly vintage. A blocked or partial scrape keeps the
previous rows (keep-last-good), so a bad day never wipes the table.

The parser is offline-verifiable:
`npx tsx scripts/ingest/valuation.verify.ts`. Dry-run the scraper with
`npx tsx scripts/ingest/valuation.ts --dry-run`, or against a saved page with
`--file page.html --slug <slug>`.

> `ev_ebitda_x` is blank in the seeded table (Screener doesn't publish it as a
> top-ratio and the registry never carried it); the first daily run computes and
> fills it for every company.
