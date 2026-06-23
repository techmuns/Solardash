# Solardash

A buy-side equity-analyst dashboard for **India's solar / renewable-energy
sector** — a data-dense "solar research terminal" tracking the solar value
chain for stock and sector calls.

> **Status:** foundation phase — a deployable shell with the design system,
> app shell, base UI component library, and placeholder routes. No real data or
> charts yet (those arrive in later phases).

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

## Project layout

```
src/
  app/            # App Router routes (all static)
  components/
    ui/           # Base UI component library (presentational)
    layout/       # AppShell, Sidebar, TopBar, nav config
    theme/        # Dark-mode toggle + no-flash theme script
  lib/            # cn() + formatting helpers, ENERGY_COLORS
docs/             # ARCHITECTURE.md
```
