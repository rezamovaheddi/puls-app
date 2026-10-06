# Pulse

**Pulse is a project-management and issue-tracking platform for software teams — a single place to plan projects, triage issues, and track the pulse of ongoing work.** It is built as a dark-first, keyboard-friendly dashboard on Next.js 16 with React Server Components, and is being developed phase by phase (see the [roadmap](#roadmap)).

> **Current status:** Phase 1 (Foundation & Design System) is shipped. The landing page and dashboard shell are real, styled, and type-safe — but the app is intentionally UI-only at this stage: all data is typed mock data, and authentication, a database, realtime, and the AI assistant are planned for later phases, not implemented yet.

## Stack

| Layer         | Choice                                                        |
| ------------- | ------------------------------------------------------------- |
| Framework     | [Next.js](https://nextjs.org) 16 — App Router, Turbopack      |
| UI            | [React](https://react.dev) 19                                 |
| Language      | [TypeScript](https://www.typescriptlang.org) 5, `strict` mode |
| Styling       | [Tailwind CSS](https://tailwindcss.com) v4 — CSS-first config |
| Components    | [shadcn/ui](https://ui.shadcn.com) primitives on Radix UI     |
| Theming       | [next-themes](https://github.com/pacocoursey/next-themes) — class strategy, dark-first |
| Typefaces     | [Geist](https://vercel.com/font) Sans & Mono via `next/font`  |
| Notifications | [Sonner](https://sonner.emilkowal.ski) toasts                 |
| Linting       | ESLint 9 with `eslint-config-next`                            |

## Getting started

Prerequisites: **Node.js** and **npm**.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the landing page. The product dashboard lives at `/overview`, with `/projects`, `/issues`, `/analytics`, `/assistant`, `/docs`, and `/settings` under the same shell.

Tip: the issues and projects screens support a URL-driven empty state — append `?demo=empty` to preview the "no results" layout.

## Scripts

| Command           | What it does                                                        |
| ----------------- | ------------------------------------------------------------------- |
| `npm run dev`     | Start the development server (Turbopack) at `http://localhost:3000` |
| `npm run build`   | Production build — compiles, typechecks, and prerenders routes      |
| `npm run start`   | Serve the production build                                          |
| `npm run lint`    | Run ESLint                                                          |

## Project structure

The codebase follows **[Feature-Sliced Design](https://feature-sliced.design)** — six layers with one-way imports (`app → views → widgets → features → entities → shared`) and an `index.ts` public API per slice. The FSD *pages* layer is named `views/` because Next.js reserves `src/pages/` for the Pages Router. See [ADR-003](docs/architecture/adr-003-fsd-migration.md).

```
src/
├── app/                    # FSD app layer — Next.js wiring only
│   ├── (dashboard)/        # Thin re-exports of views (page/loading per route)
│   ├── layout.tsx          # Root layout: Geist fonts, ThemeProvider, Toaster
│   ├── theme-provider.tsx
│   ├── page.tsx            # re-export of the landing view
│   ├── error.tsx           # Error boundary (the only client page)
│   ├── not-found.tsx
│   └── globals.css         # Design tokens — Tailwind v4 CSS-first, OKLCH (+ .hero-* effects)
├── views/                  # FSD pages layer — one slice per route
│   ├── landing/            # Marketing page (header/footer + Hero widget)
│   ├── overview/           # Dashboard summary (+ skeleton)
│   ├── projects/           # Project list (+ skeleton)
│   ├── issues/             # Issue list + toolbar (filters wire up in Phase 4)
│   └── ...                 # analytics, assistant, docs, settings (placeholders)
├── widgets/
│   ├── shell/              # AppShell: sidebar, header, mobile nav, nav config
│   └── hero/               # Animated landing stage (aurora / grid / beam)
├── features/
│   └── theme-switcher/     # ModeToggle (first interaction slice)
├── entities/
│   ├── project/            # model: types + mock data · ui: ProjectCard
│   ├── issue/              # model: types + mock data · ui: IssueRow, Status/PriorityBadge
│   └── activity/           # model: types + mock data · ui: ActivityItem
└── shared/
    ├── ui/                 # 19 shadcn primitives + PageHeader/EmptyState/ErrorState
    ├── lib/                # cn()
    ├── config/             # site metadata
    └── types/              # kernel value objects (Person)
```

## Architecture notes

Pulse is deliberately server-first and layered (Feature-Sliced Design). The full reasoning lives in the architecture decision records:

- **Server Components by default.** Views stay on the server (today they render mock data with zero browser JS); `'use client'` is reserved for leaves that genuinely need browser APIs — the error boundary, the shell's interactive nav, and the theme switcher. — [ADR-001](docs/architecture/adr-001-feature-architecture.md)
- **Feature-Sliced Design layering.** Six layers with one-way imports and slice-level public APIs: domain UI lives in `entities/<domain>/ui`, composed blocks in `widgets/`, interactions in `features/`, and full pages in `views/` (named `views`, not `pages`, because Next.js owns `src/pages/`). — [ADR-003](docs/architecture/adr-003-fsd-migration.md)
- **Route groups for shell separation.** The landing page keeps its own chrome; product views render inside the `widgets/shell` AppShell via `src/app/(dashboard)/layout.tsx`, so public URLs stay decoupled from the product layout. — [ADR-001](docs/architecture/adr-001-feature-architecture.md)
- **Mock data is a seam, not a shortcut.** Each entity's `model/mock-data.ts` exports typed arrays against its `model/types.ts`, so the data phase swaps the model segment without touching the component tree. — [ADR-001](docs/architecture/adr-001-feature-architecture.md)
- **URL state comes later, by design.** Empty states are already expressed as query params (`?demo=empty`); Phase 4 turns the issues toolbar (search, status, priority) into real URL-driven filters. — [ADR-001](docs/architecture/adr-001-feature-architecture.md)
- **CSS-first design tokens, dark-first.** All tokens are plain CSS custom properties in `globals.css` (OKLCH on one cool-gray hue axis), mapped to Tailwind v4 via `@theme inline`; `next-themes` drives the class strategy with dark as the brand default. — [ADR-002](docs/architecture/adr-002-design-tokens-dark-first.md)

## Roadmap

| Phase | Focus                                                              | Status        |
| ----- | ------------------------------------------------------------------ | ------------- |
| 1     | **Foundation & Design System** — dark-first tokens, dashboard shell, shadcn/ui primitives, landing + mock dashboard pages | ✅ Shipped |
| 2     | Authentication & onboarding                                        | Planned       |
| 3     | Issue experience — detail pages for issues                         | Planned       |
| 4     | URL state & filtering — search/status/priority wired to the URL    | Planned       |
| 5     | Data layer — API routes and a database, replacing the mock seam    | Planned       |
| 6     | Testing & QA — unit tests (Vitest) and end-to-end (Playwright)     | Planned       |
| 7     | Command palette, AI assistant, and realtime collaboration          | Planned       |

Nothing beyond Phase 1 exists today: there is no auth, no database, no realtime layer, and no working AI assistant — the Assistant page is a placeholder, as the roadmap reflects.

## Quality

- **Green build.** `npm run build` compiles with zero TypeScript errors and prerenders all routes — verified on Next.js 16.3.8 (9 routes: 7 static, 2 dynamic).
- **Evidence-anchored audit.** The codebase has been run through **arena-audit**, an evidence-anchored audit engine (run `run_muuzho1w_uu1u2n6a`, engine v3.2.0, completed 2026-10-05). The run recorded **zero verified findings**. One honest caveat: that archived run detected none of the repo's tooling (its typecheck/lint/test gates report "not detected", coverage 0%), so its "no findings" verdict reflects the run's visibility rather than a passing score — the authoritative gates are the green `next build` typecheck and ESLint above. Unit/E2E test coverage is intentionally N/A until Phase 6.
