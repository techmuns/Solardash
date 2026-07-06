# Solar Sector Dashboard (Munshot)

The **Solar Sector Dashboard** — a Munshot buy-side equity-analyst dashboard
for **India's solar / renewable-energy sector** — a data-dense "solar research
terminal" tracking the solar value chain for stock and sector calls.

> **Status:** feature-complete. All sections build from committed JSON
> snapshots, every route is prerendered (`force-static`), and the production
> bundle has been validated end-to-end on Cloudflare's `workerd` runtime
> (`npm run preview`). Deploy is a one-command step once Cloudflare credentials
> are present — see [**Deploy**](#deploy).

## Tech stack

- **Next.js** (App Router) + **TypeScript**, static-first (`force-static`)
- **Tailwind CSS v3** design system (light + dark, tabular figures)
- `recharts` · `lucide-react` · `cva` · `clsx` + `tailwind-merge` · `date-fns`
- Deployed to **Cloudflare Workers** via **OpenNext** (`@opennextjs/cloudflare`)

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full brief, route
map, data contract, and design tokens.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

## Scripts

| Command             | Action                                            |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Dev server (Turbopack)                            |
| `npm run build`     | Production build                                  |
| `npm run start`     | Serve the production build                        |
| `npm run lint`      | ESLint                                            |
| `npm run typecheck` | `tsc --noEmit`                                    |
| `npm run preview`   | Build + preview on a local Cloudflare Worker      |
| `npm run deploy`    | Build + deploy to Cloudflare                      |
| `npm run cf-typegen`| Generate `cloudflare-env.d.ts`                    |
| `npm run data:build`| Rebuild **all** data snapshots (`tsx scripts/run.ts --all`) |
| `npm run data -- <name>` | Run one pipeline by name                     |

Data snapshots are deterministic — rebuilding produces byte-identical output —
so the generated JSON is committed and read at build time (no runtime DB). See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §8 for the data contract.

## Project layout

```
src/
  app/            # App Router routes (all static, force-static)
  components/
    ui/           # Base UI component library (presentational)
    layout/       # AppShell, Sidebar, TopBar, Footer, nav config
    charts/       # Recharts wrappers (client-only render)
    theme/        # Dark-mode toggle + no-flash theme script
  data/
    snapshots/    # Generated, committed JSON read at build time
    types/        # Snapshot envelope + per-section payload contracts
    index.ts      # Typed loaders (getTendersSnapshot(), …)
  lib/            # cn() + formatting helpers, colour palettes
manual-data/      # Human-curated CSV/JSON inputs to the pipelines
scripts/          # Offline tsx data pipelines + run.ts CLI
docs/             # ARCHITECTURE.md
```

## Deploy

The Solar Sector Dashboard (Munshot) deploys to **Cloudflare Workers** via
[OpenNext](https://opennext.js.org/cloudflare). Because every route is
prerendered (`force-static`) and heavy pages are served from Cloudflare's
asset storage through the OpenNext **static-assets incremental cache**, the
Worker itself stays small and there are **no runtime secrets or database** to
configure — the app is fully static.

**Validated:** `npm run preview` builds the Worker and boots it on the local
`workerd` runtime. The current build was smoke-tested there — all routes return
200 with content + charts, unknown company slugs 404 (`dynamicParams = false`),
and static assets (fonts, favicon) serve correctly. Worker upload size is
**≈1.73 MB gzipped** (8.1 MB raw) — well under Cloudflare's 3 MB
(free) / 10 MB (paid) script limit.

### One-time setup (requires a Cloudflare account)

1. **Authenticate** — either is sufficient:
   - **Interactive:** `npx wrangler login` (OAuth in the browser), or
   - **CI / token:** set `CLOUDFLARE_API_TOKEN` to a token with the
     **Workers Scripts: Edit** permission (plus **Workers KV Storage: Edit**
     and **Account: Read** if you later add bindings). Verify with
     `npx wrangler whoami`.
2. **Account ID** — if your token/login resolves to more than one account, set
   `CLOUDFLARE_ACCOUNT_ID`, or add `"account_id": "<id>"` to `wrangler.jsonc`.
   A single-account login resolves automatically.

### Deploy

```bash
npm run deploy          # opennextjs-cloudflare build && … deploy
```

This builds the Worker and uploads it. On success Wrangler prints the live URL,
`https://solardash.<your-subdomain>.workers.dev`. Smoke-test the live URL the
same way as the preview (every route + an unknown company slug → 404).

- **Custom domain (optional):** add a `routes` entry to `wrangler.jsonc`
  (e.g. `"routes": [{ "pattern": "solardash.example.com", "custom_domain": true }]`)
  with the zone on the same Cloudflare account, then redeploy.
- **Worker name / observability** are already set in `wrangler.jsonc`
  (`name: "solardash"`, `nodejs_compat`, `observability` on).

### Refresh data, then redeploy

Data is static and committed, so a refresh is just a rebuild-commit-deploy loop:

```bash
# 1. Edit the curated inputs under manual-data/<section>/…
npm run data:build      # regenerate every snapshot (deterministic)
git add src/data/snapshots && git commit -m "data: refresh snapshots"
npm run deploy          # ship the new build
```

Run `npm run data:build:monthly` / `:quarterly` to rebuild only one cadence.

> **CI option:** the same `npm ci && npm run deploy` works in a GitHub Action
> (e.g. on push to `main`) with `CLOUDFLARE_API_TOKEN` (and, if needed,
> `CLOUDFLARE_ACCOUNT_ID`) stored as repository secrets — no other config
> required.

## Automated financials refresh

Company financials refresh weekly via
[`.github/workflows/refresh-financials.yml`](.github/workflows/refresh-financials.yml).
It scrapes each company's **public** Screener page (no login) → rebuilds
snapshots → commits to `main` → Cloudflare Pages redeploys. **No secret is
required** — the job runs anonymously by default, and you can trigger it any
time from the **Actions** tab → "Refresh financials" → **Run workflow**.

If a run fails with **"All Screener fetches failed"** (Screener blocking
GitHub's IP range), either:

- add a free-account `sessionid` as the optional **`SCREENER_SESSIONID`**
  repository secret (Settings → Secrets and variables → Actions → New
  repository secret) — the workflow picks it up automatically, no edit needed;
  or
- download the public company pages and parse them locally, then commit the
  feeds: `tsx scripts/ingest/screener.ts --file <page.html> --slug <slug>`.

## Commissioning-guidance feed

The **IPPs → Commissioning** timeline is driven by
`manual-data/developers/commissioning.csv` — one row per dated guidance
statement (a company concall / investor disclosure saying *when* a capacity
tranche will be commissioned). Keeping **every** revision is what lets the
dashboard show slippage: "was Q2 FY26, now Q4 FY26 (+2Q)". Columns:
`tranche_id, developer, project, tech, capacity_gw, stated_on, concall,
target_period, status, confidence, source, source_url, note`.

Concalls are audio + PDF, so there is no scraper — this is a **maintained**
feed. To update it, append the new statements (a new `stated_on` row for the
same `tranche_id` records a revision), then let
[`.github/workflows/refresh-concalls.yml`](.github/workflows/refresh-concalls.yml)
normalize + rebuild + commit (monthly cron, or **Actions** →
"Refresh commissioning guidance" → **Run workflow**). Locally:

```bash
tsx scripts/ingest/concalls.ts --file new-statements.csv  # merge a batch (upsert)
tsx scripts/ingest/concalls.ts --dry-run                  # validate + normalize, no write
tsx scripts/ingest/concalls.verify.ts                     # offline test of the normalizer
npm run data:build                                        # regenerate the snapshot
```

The normalizer validates enums (tech/status/confidence), FY-quarter targets and
ISO dates, upserts by `tranche_id | stated_on` (keep-last-good), and canonically
sorts for byte-stable diffs. The pipeline groups statements per tranche, derives
`originalTarget` / `currentTarget` / `slipQuarters` from the history, and sorts
by current target. Lower-confidence rows are flagged as Munshot estimates.

## CEA demand refresh (disabled)

The demand series ships from the **manual monthly anchors** in
`manual-data/demand/`. An automated CEA refresh was prototyped but is currently
**disabled**: `cea.nic.in` serves its TLS leaf **without the intermediate CA**
*and* resets programmatic TLS probes from CI runners, so its Executive-Summary
PDFs can't be fetched from GitHub Actions without weakening verification (which
we don't do). Nothing is broken in the meantime — the demand section simply
isn't auto-densified.

The offline-verified parser remains for a future revisit or local use — parse a
downloaded **Executive Summary on Power Sector** PDF and commit the feed:
`tsx scripts/ingest/cea.ts --file <report.pdf>` (verify the parser against its
text fixture with `tsx scripts/ingest/cea.verify.ts`).

The deployed site uses **no runtime secrets**.
