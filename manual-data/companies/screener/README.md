# Screener feeds (generated)

Per-company financials ingested from Screener.in by
[`scripts/ingest/screener.ts`](../../../scripts/ingest/screener.ts), one
`<slug>.json` per company:

```jsonc
{ "slug", "annual": AnnualRow[], "quarterly": QuarterRow[], "rocePct"?, "shareholding"?, "asOf" }
```

The companies pipeline merges these with precedence **manual > screener >
registry** — a hand-authored `manual-data/companies/<slug>.json` overrides the
screener feed (so Vikram Solar keeps its PL-Capital forward estimates and
valuation, which Screener doesn't have), while companies without a manual file
get their financials straight from the feed.

These files are written by the ingest script and **committed** so builds stay
deterministic and fully offline. Live fetching runs from GitHub's runners (a
later prompt) because Screener blocks the build IP; `asOf` is derived from the
latest reported period (never wall-clock), so a file only changes when the data
does.
