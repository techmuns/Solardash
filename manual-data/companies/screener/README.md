# Screener feeds (generated)

Per-company financials ingested from Screener.in by
[`scripts/ingest/screener.ts`](../../../scripts/ingest/screener.ts), one
`<slug>.json` per company:

```jsonc
{ "slug", "annual": AnnualRow[], "quarterly": QuarterRow[],
  "valuation"?: { "peX"?, "pbX"?, "cmp"?, "marketCapCr"? }, "rocePct"?, "roePct"?,
  "shareholding"?, "asOf" }
```

The companies pipeline merges these with precedence **manual > screener >
registry** — a hand-authored `manual-data/companies/<slug>.json` overrides the
screener feed (so Vikram Solar keeps its PL-Capital forward estimates and
valuation), while companies without a manual file get their financials straight
from the feed. The screener table's financial columns — **market cap, revenue,
EBITDA margin, P/E** — come from this feed (registry values are only the
offline seed used until the first scrape). Operational columns the screener
does not carry — **module / cell GW and order book** — stay curated in
`registry.csv`.

These files are written by the ingest script (which scrapes each company's
public Screener page — no login required) and **committed** so builds stay
deterministic and fully offline. `asOf` is derived from the latest reported
period (never wall-clock), so a file only changes when the data does. The
[`Refresh financials`](../../../.github/workflows/refresh-financials.yml) Action
re-scrapes every company in
[`screener-codes.csv`](../screener-codes.csv) on the **1st of each month** and
commits only what changed.
