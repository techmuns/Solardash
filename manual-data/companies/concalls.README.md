# Company concall insights (maintained feed)

`concalls.json` holds the latest earnings-call takeaways for each company,
keyed by slug and merged into every company's detail snapshot by
[`scripts/pipelines/companies.ts`](../../scripts/pipelines/companies.ts). It
renders as the **Latest concall** card on `/companies/<slug>`.

```jsonc
{
  "<slug>": {
    "quarter": "Q4 FY26",          // fiscal quarter of the call
    "date": "2026-05-16",          // ISO, optional
    "insights": ["…", "…"],        // key takeaways
    "guidance": ["…", "…"],        // forward management guidance (optional)
    "orderExecution": "…",         // timeline to execute the order book (optional)
    "source": "Q4 FY26 earnings call"
  }
}
```

**Why maintained, not scraped:** concalls are audio + PDF transcripts with no
clean machine-readable feed, so this is curated each earnings season (roughly
quarterly, once Q results and calls land) rather than auto-scraped. Precedence
is **manual `<slug>.json` > this feed** — a hand-authored per-company file can
override the concall block. Companies with no recent/​findable call simply omit
the entry and the card does not render. Keep keys sorted (the pipeline reads it
as a map; a sorted file keeps diffs clean).
