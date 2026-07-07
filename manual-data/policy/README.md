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

**Why maintained, not scraped:** policy announcements are PIB/MNRE press
releases and gazette PDFs with no clean machine-readable feed — like the
concalls feed, this is curated as new schemes are notified. Add a row to
`schemes.csv` (with its `announced` date, `source_url` and `highlights`) and
the [`Refresh policy schemes`](../../.github/workflows/refresh-policy.yml)
Action rebuilds the snapshot on the 1st of each month (and on demand) and
commits only what changed.

`pm-surya-ghar.csv` and `kusum.csv` still feed the policy KPIs (installed-vs-
target progress etc.); their standalone tabs were removed from the page.
