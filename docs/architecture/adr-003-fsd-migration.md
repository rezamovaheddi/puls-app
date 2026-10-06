# ADR-003: Feature-Sliced Design (FSD) architecture

## Context

Phase 1 shipped with a lightweight feature-oriented layout (`components/`, `features/<domain>/components`, `lib/mock`, `types/pulse.ts`). It was clean at five pages and two domains, but every upcoming phase (auth, interactive issues, realtime, AI assistant) adds cross-cutting slices. Before those land, the codebase needs a layering rule that answers "where does this go?" mechanically instead of by taste, and that keeps business entities from leaking into widgets.

The team also standardizes on [Feature-Sliced Design](https://feature-sliced.design) conventions for the portfolio's senior-engineering signal: explicit layers, one-way dependencies, and slice-level public APIs.

## Decision

Adopt FSD v2 layers under `src/`, mapped to Next.js App Router as follows:

| FSD layer     | Location           | Contents                                                                 |
| ------------- | ------------------ | ------------------------------------------------------------------------ |
| `app`         | `src/app/**`       | Next.js routes (thin re-exports), root layout, `theme-provider`, `globals.css`, route-level `error.tsx` / `not-found.tsx` |
| `pages`       | `src/views/**`     | Full-page compositions, one slice per route (`landing`, `overview`, `projects`, `issues`, …), each with an `index.ts` public API |
| `widgets`     | `src/widgets/**`   | Composed blocks: `shell` (AppShell: sidebar + header + mobile nav + nav config), `hero` (animated landing stage) |
| `features`    | `src/features/**`  | User interactions: `theme-switcher` (the first real feature slice)       |
| `entities`    | `src/entities/**`  | Business entities `project`, `issue`, `activity` — each with `model/` (types + mock data) and `ui/` (StatusBadge, IssueRow, ProjectCard, ActivityItem) |
| `shared`      | `src/shared/**`    | `ui/` (19 shadcn primitives + PageHeader/EmptyState/ErrorState), `lib/` (cn), `config/` (site), `types/` (kernel `Person` value object) |

Rules enforced:

1. **One-way imports only**: `app → views → widgets → features → entities → shared`. Same-layer imports are forbidden.
2. **Public API per slice**: each `entities/*`, `features/*`, `widgets/*`, `views/*` slice exposes an `index.ts`; consumers never reach into slice internals.
3. **Next.js routes are wiring**: `src/app/**` files only re-export from the views layer (`export { OverviewPage as default } from "@/views/overview"`), so routing stays mechanical and the real UI stays testable without Next.
4. **Domain type split**: `types/pulse.ts` dissolved into per-entity `model/types.ts` (`Project`, `Issue`, `Activity` — the `Mock*` prefix is gone since these are the domain names); the cross-entity `Person` value object lives in `shared/types` so entities never import each other.
5. **shadcn `ui/` is generated, read-only `shared/ui`**: `components.json` aliases now point at `@/shared/ui`, so future `shadcn add` writes land in the shared layer.

Naming deviation — deliberately documented: the FSD *pages* layer lives at **`src/views/`**, not `src/pages/`, because Next.js reserves `src/pages/` for the Pages Router; keeping the FSD name there breaks the build with "App Router and Pages Router both match path" errors. `views` is the common escape hatch for FSD-on-Next projects.

Also accepted: the landing hero's animation keyframes stay in `src/app/globals.css` (`.hero-*` classes) — they are global-effect styling (masks, keyframes, reduced-motion), which FSD places in the app layer's global styles rather than inside the widget.

## Alternatives considered

- **Keep the phase-1 feature-oriented layout.** Lower churn, but placement decisions stay judgment calls and entities would keep bleeding into pages as Phase 3–5 land.
- **FSD with `src/pages` + `pageExtensions` tricks.** None exist that disable the Pages Router while keeping the folder; rejected as fragile.
- **Nested route-group components (colocation inside `app/`).** Keeps Next happy but entangles routing with UI and makes cross-route reuse awkward; rejected.
- **`screens/` instead of `views/`.** Equivalent fix; `views` matches the existing FSD-for-Next community usage.

## Trade-offs

- Deep-looking tree: six layers for a small app. The cost is bounded by the `index.ts` re-export one-liners, and it does not grow with phases.
- The `views` rename deviates from vanilla FSD vocabulary (documented here; every other name is canonical).
- `src/app` keeps three small non-route concerns (layout, theme-provider, globals.css) — Next-native files, wired per App Router convention.
- Moving files changes history granularity (rename detection handles it, but old review links rot).

## Consequences

- Every new module has one legal home; placement debates end at the layer table.
- Phase 2 (auth) slices go to `features/auth` + `entities/user` without touching widgets; Phase 5 (data) swaps entity `model/mock-data.ts` for `model/api` implementations behind the same public API.
- Route files stay one line, so adding a page never edits more than `views/<name>` plus a re-export.
- Build + tests verified green immediately after the migration (9 routes, 11 unit tests).
