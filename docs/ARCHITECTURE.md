# Solardash — Architecture & Conventions

> This file is the source of truth for project decisions. Later phases (data
> ingestion, charts, per-section builds) rely on the contracts described here.
> Keep it up to date when conventions change.

## 1. Project brief

**Solardash** is a buy-side equity-analyst dashboard for **India's solar /
renewable-energy sector** — a "solar research terminal" that tracks the solar
value chain for stock and sector calls.

**Audience:** buy-side analysts who follow the solar / renewables complex
(developers, manufacturers, EPC, and adjacent listed names) and need a
data-dense, legible, numbers-first view.

The product surface, built incrementally across phases:

- **Tenders & Auctions** — the hero module.
- **Developers / IPPs**
- **Manufacturing & Value Chain**
- **Capacity & Generation**
- **Power Demand**
- **Listed-Company financials** — screener + per-stock pages.
- **Policy & Pricing**

## 2. Architecture (decided — keep consistent)

**Static-first, no runtime database.**

- Offline `tsx` scripts (arriving in a later phase) ingest data and write
  **committed JSON snapshots** under the repo.
- Pages are **prerendered** (`export const dynamic = "force-static"`) and read
  those snapshots at build time.
- Deployed to **Cloudflare Workers via OpenNext** (`@opennextjs/cloudflare`).
- The OpenNext **static-assets incremental cache** serves heavy prerendered
  pages from Cloudflare's asset storage, keeping the Worker under its
  resource limits (see `open-next.config.ts`).

### Framework / tooling

| Concern        | Choice                                              |
| -------------- | --------------------------------------------------- |
| Framework      | Next.js (App Router) + TypeScript                   |
| Bundler        | Turbopack (`next dev --turbopack`, default build)   |
| Styling        | Tailwind CSS **v3** (`tailwind.config.ts` + PostCSS)|
| Charts (later) | `recharts`                                          |
| Icons          | `lucide-react`                                      |
| Class utils    | `clsx` + `tailwind-merge` (via `cn()`), `cva`       |
| Dates          | `date-fns`                                          |
| Deploy         | `@opennextjs/cloudflare` + `wrangler`               |
| Import alias   | `@/*` → `src/*`                                     |

## 3. Route map

All routes are static (`force-static`). Layout: collapsible left sidebar +
sticky top bar, grouped for a buy-side reader.

| Route                 | Title                     | Group        | Notes                         |
| --------------------- | ------------------------- | ------------ | ----------------------------- |
| `/`                   | Overview                  | Market       | Module directory + KPI shells |
| `/tenders`            | Tenders & Auctions        | Market       | **Hero** — emphasised in nav  |
| `/developers`         | Developers / IPPs         | Market       |                               |
| `/capacity`           | Capacity & Generation     | Power System |                               |
| `/demand`             | Power Demand              | Power System |                               |
| `/manufacturing`      | Manufacturing             | Supply Chain |                               |
| `/companies`          | Listed Companies          | Companies    | Screener (later)              |
| `/companies/[slug]`   | _Company name_            | Companies    | Per-stock template; `await params` |
| `/policy`             | Policy & Pricing          | Reference    |                               |
| `/data-sources`       | Data & Methodology        | Reference    |                               |

Navigation config lives in `src/components/layout/nav.ts` (`NAV_GROUPS`,
`NAV_ITEMS`). The hero flag (`hero: true`) drives the emphasised Tenders
treatment in the sidebar and the "Primary" badge on the Overview.

## 4. Static-first data contract

Data is **not** built in the foundation phase. When it arrives:

- Each metric / series is ingested by offline `tsx` scripts into **committed
  JSON snapshots** (no runtime DB, no client fetches).
- **Every datapoint carries provenance.** The canonical shape:

  ```ts
  interface DataPoint<T = number> {
    value: T;
    unit: string;        // e.g. "GW", "₹/kWh", "%"
    source: string;      // attribution, e.g. "MNRE", "CEA", "SECI"
    confidence: "high" | "medium" | "modelled";
    asOf: string;        // ISO date, e.g. "2026-06-23"
  }
  ```

  `confidence` maps directly to the `ConfidenceBadge` component
  (high / medium / modelled).

- **`manual-data/` layer:** hard-to-source or analyst-curated metrics live in a
  dedicated, clearly-labelled manual layer so they are auditable and never
  confused with scraped/official sources. These still carry the full
  `{ value, unit, source, confidence, asOf }` contract (with
  `confidence: "modelled"` where appropriate).

- UI surfaces provenance everywhere: `ChartFrame` renders a
  **source · as-of · confidence** footnote row, and the top bar exposes a global
  **as-of / last-updated** slot.

## 5. Design system — "solar research terminal"

Clean, information-rich, Bloomberg-meets-modern-web. **Light theme primary**
with a `class`-strategy **dark mode** toggle. **Tabular figures everywhere**
(`font-variant-numeric: tabular-nums` on `body`).

### Fonts (via `next/font`)

- **Sans:** Inter → CSS var `--font-sans` (Tailwind `font-sans`).
- **Mono:** JetBrains Mono → CSS var `--font-mono` (Tailwind `font-mono`).

### Semantic surface tokens

Defined as HSL channels in `src/app/globals.css` (`:root` + `.dark`), exposed as
Tailwind colours in `tailwind.config.ts`:

`background`, `foreground`, `card`(+`foreground`), `popover`(+`foreground`),
`muted`(+`foreground`), `accent`(+`foreground`), `border`, `input`, `ring`, and
the deep-slate nav chrome `sidebar` (+`foreground`, `muted`, `border`, `accent`).

### Brand & financial colours (fixed hex, theme-independent)

| Token            | Hex        | Use                                  |
| ---------------- | ---------- | ------------------------------------ |
| `brand` (solar)  | `#F59E0B`  | primary accent (amber/gold)          |
| `brand-light`    | `#FBBF24`  | lighter accent                       |
| `brand-dark`     | `#D97706`  | hover/active accent                  |
| structural slate | `#0F172A`  | nav/headers (Tailwind `slate-900`)   |
| `highlight`      | `#F97316`  | warm-orange energy highlight         |
| `positive`       | `#059669`  | financial deltas up (emerald-600)    |
| `negative`       | `#E11D48`  | financial deltas down (rose-600)     |

### Energy-source categorical map

Single source of truth: `ENERGY_COLORS` in `src/lib/colors.ts`, mirrored as the
Tailwind `energy-*` colours. **Every chart must use these** for cross-app
consistency.

| Source       | Key           | Hex       |
| ------------ | ------------- | --------- |
| Solar        | `solar`       | `#F59E0B` |
| Wind         | `wind`        | `#0EA5E9` |
| Hybrid       | `hybrid`      | `#8B5CF6` |
| FDRE         | `fdre`        | `#14B8A6` |
| RTC          | `rtc`         | `#6366F1` |
| Solar + BESS | `solar-bess`  | `#10B981` |
| BESS         | `bess`        | `#059669` |
| Thermal/Coal | `thermal`     | `#475569` |
| Nuclear      | `nuclear`     | `#A855F7` |
| Hydro        | `hydro`       | `#3B82F6` |
| Gas          | `gas`         | `#FB923C` |

Helpers in `colors.ts`: `ENERGY_LABELS`, `ENERGY_ORDER`, `energyColor()`.

### Other tokens (`tailwind.config.ts`)

- **Radius:** `--radius: 0.5rem` → `rounded-sm/md/lg/xl`.
- **Shadow:** `shadow-card`, `shadow-card-hover`, `shadow-panel`, `shadow-focus`.
- **Spacing:** `sidebar` (16rem), `sidebar-collapsed` (4.25rem), `topbar` (3.5rem).
- **Font sizes:** `text-2xs`, `text-stat` (KPI value).
- **Animation:** `animate-shimmer` (skeletons), `animate-fade-in` (tab panels).

### `cn()` helper

`src/lib/utils.ts` exports `cn()` (`clsx` + `tailwind-merge`) plus formatting
helpers (`formatDate`, `formatRelative`, `formatCompact`, `formatNumber`,
`formatDelta`, `humanizeSlug`).

## 6. Component library (`src/components/ui/`)

Presentational, typed, `cva` variants where sensible. Barrel: `ui/index.ts`.

`Card` (+ Header/Title/Description/Content/Footer), `PageHeader`,
`SectionHeader`, `StatCard` / `KpiCard`, `DataTable` (sticky header,
tabular-nums, optional client sorting), `Badge` + `ConfidenceBadge`,
`ChartFrame` (chart wrapper with source/as-of/confidence footnote), `Tabs`,
`EmptyState`, `Skeleton`.

Shell components: `layout/AppShell`, `layout/Sidebar`, `layout/TopBar`,
`theme/ThemeToggle`, `theme/theme-script` (no-flash blocking script).

## 7. Build / deploy commands

| Command             | Action                                                     |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Local dev server (Turbopack) + OpenNext dev bindings       |
| `npm run build`     | Production Next.js build                                    |
| `npm run start`     | Run the production build locally                           |
| `npm run lint`      | ESLint (`eslint .`)                                         |
| `npm run typecheck` | `tsc --noEmit`                                              |
| `npm run preview`   | `opennextjs-cloudflare build && … preview` (local Worker)  |
| `npm run deploy`    | `opennextjs-cloudflare build && … deploy` (Cloudflare)     |
| `npm run cf-typegen`| Generate `cloudflare-env.d.ts` from `wrangler.jsonc`       |

Cloudflare config: `next.config.ts` (`output: "standalone"` +
`initOpenNextCloudflareForDev`), `open-next.config.ts` (static-assets
incremental cache), `wrangler.jsonc` (Worker name `solardash`,
`nodejs_compat`, `ASSETS` binding).
