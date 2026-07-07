# Policy schemes (maintained feed)

`schemes.csv` powers the **Scheme tracker** on `/policy`. Columns:

```
scheme, category, target, status, allocation_cr, key_metric,
announced, source_url, highlights, confidence, source, note
```

- **announced** — month & year the scheme was notified/announced, `Mon YYYY`
  (e.g. `Feb 2024`). The pipeline sorts the table by this, latest first, so
  newly-added schemes surface at the top.
- **source_url** — official link (MNRE / PIB / CBIC / scheme portal); rendered
  as the clickable source on the scheme name.
- **highlights** — one-sentence summary of the scheme's main lever, shown in
  its own column.
- **category** — `Manufacturing | Trade | Demand | Rooftop | Agri | Storage`.

**Two ways rows land here:**

1. **Auto-scraped** — [`scripts/ingest/policy-schemes.ts`](../../scripts/ingest/policy-schemes.ts)
   fetches MNRE's [What's New](https://mnre.gov.in/en/whats-new/) documents
   feed each month, keeps only genuine new **solar / RE schemes** (a title must
   carry a scheme signal — *scheme / yojana / mission / VGF / PLI / ALMM / BCD /
   waiver / guidelines…* — **and** a renewable-energy context — *solar / wind /
   hydrogen / storage / rooftop…* — while amendments, SOPs, circulars, fees and
   notices are filtered out), infers a `category` + `announced` month, and
   **appends** anything not already present (deduped by URL and normalised name,
   capped at 8/run). Auto-added rows are tagged `note = auto-ingested`,
   `source = MNRE`, `confidence = medium`.
2. **Hand-curated** — add a row directly (with its `announced` date,
   `source_url`, `highlights` and a fuller `key_metric`). Curated rows are
   **never** overwritten by the scraper.

The parser is offline-verifiable against a fixture:
`npx tsx scripts/ingest/policy-schemes.verify.ts` (run in CI before the scrape).
Dry-run the scraper locally with
`npx tsx scripts/ingest/policy-schemes.ts --dry-run`
(or `--file some-page.html --dry-run` against a saved page).

The [`Refresh policy schemes`](../../.github/workflows/refresh-policy.yml)
Action verifies the parser, runs the scraper, rebuilds the snapshot on the 1st
of each month (and on demand), and commits only what changed — so both a
scraped scheme and a manual CSV edit propagate without a hand rebuild. A blocked
MNRE fetch (occasional datacenter 403) leaves the curated feed untouched.

`pm-surya-ghar.csv` and `kusum.csv` still feed the policy KPIs (installed-vs-
target progress etc.); their standalone tabs were removed from the page.
