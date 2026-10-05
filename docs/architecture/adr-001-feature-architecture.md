# ADR-001: Feature-oriented architecture and server/client boundaries

- **Status:** Accepted
- **Date:** 2026-10-05
- **Scope:** Pulse web app (`src/`)

## Context

Pulse is built on the Next.js App Router (React Server Components by default). The
product surface splits into a marketing landing page and a dashboard product area,
and its building blocks are domain concepts — projects, issues, activity — rather
than routes. Two failure modes had to be avoided up front:

1. **Route-first sprawl** — all logic and components piled into `src/app/**`, which
   makes pages untestable and couples UI to URL structure.
2. **Premature client components** — marking whole pages `'use client'` for a single
   button, which ships the page bundle to the browser and breaks RSC streaming.

The UI kit in `src/components/ui` (shadcn primitives) is treated as a generated,
read-only layer; product code must never edit it.

## Decision

- **Feature-oriented modules.** Domain UI lives in `src/features/<domain>/components`
  (`features/projects`, `features/issues`). Pages import feature components; feature
  components never import pages. Shared, domain-agnostic composition pieces
  (`PageHeader`, `EmptyState`, `ErrorState`) live in `src/components/shared`.
- **Route groups for shell separation.** The landing page stays at `src/app/page.tsx`
  with its own standalone chrome. Product pages live under `src/app/(dashboard)/**`
  so the dashboard shell (sidebar/topbar layout) applies to them without affecting
  the public URLs and without nesting the landing page in the product shell.
- **Server Components by default.** Pages stay server components (all current pages
  render mock data with zero browser JS). `'use client'` is reserved for leaves with
  real browser interaction (state, effects, handlers) — currently only
  `src/app/error.tsx`, which must be a client component to own `reset`.
- **Async request data.** Per Next.js 16, `params`/`searchParams` are awaited
  promises (`searchParams: Promise<{ demo?: string }>`); pages never read them
  synchronously.
- **Mock data is a seam.** `src/lib/mock/*` exports typed arrays
  (`src/types/pulse.ts`) so pages read like they will read after the API phase:
  swap the import, keep the component tree.
- **URL-driven empty states.** Demo/empty variants are expressed as query params
  (`?demo=empty`) instead of fake branches, previewing the phase-4 pattern of
  filters living in URL state.

## Alternatives Considered

- **Route-first structure** (everything under `src/app`): fastest to start, but
  spreads domain logic across route folders and makes reuse across routes
  (issue rows appear in overview and issues) awkward.
- **Single `components/` folder** for everything: simple until the count explodes
  and ownership becomes unclear; also blurs the `ui` (primitives) vs product
  boundary.
- **Client-heavy pages** (one `'use client'` page importing everything): simpler
  mental model for interactivity, but defeats streaming/SSR and inflates the
  client bundle for pages that are 100% static mock rendering.

## Trade-offs

- An extra indirection layer (`page → feature component → ui primitive`) costs a
  little navigation time and requires everyone to know the folder contract.
- Parallel work depends on frozen signatures (e.g. `PageHeader`, `StatusBadge`);
  signature drift between contributors shows up only at integration typecheck.
- Mock data duplicates shape definitions with the future API layer; the seam must
  be actively replaced in the data phase or it ossifies.

## Consequences

- Adding a screen means: add/extend a feature component, then a thin server page —
  the app router never holds product logic.
- Phase 3 (issue detail pages) plugs a route into `features/issues` without
  touching the row component; phase 4 wires the issues toolbar (search, status and
  priority selects) to URL state, turning the placeholder selects into a small
  client component that pushes to the router.
- The `src/components/ui` kit stays pristine and regenerable via shadcn CLI;
  product styling happens in feature/page files with Tailwind utilities and theme
  tokens only.
- Loading (`loading.tsx`) and error (`error.tsx`) boundaries are shaped per route,
  so streaming skeletons mirror the real page layout by convention.
