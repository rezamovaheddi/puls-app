# ADR-002: CSS-first design tokens with a dark-first theme

- Status: Accepted
- Date: 2026-10-05

## Context

Pulse is a developer-facing product with a dark-first visual identity: near-black cool surfaces, hairline borders, and a single violet-blue brand accent. The app runs on Next.js App Router with Tailwind CSS v4 and the shadcn/ui "radix-vega" component set, which styles exclusively through semantic tokens (`bg-background`, `text-muted-foreground`, `border-border`, …). Tailwind v4 removed the JS config file in favor of CSS-first configuration, and `next-themes` is already a dependency (the Sonner `Toaster` reads `useTheme`). We need one source of truth for color, radius, and typography tokens that works at runtime, keeps server components server-rendered, and avoids a flash of the wrong theme.

## Decision

- All design tokens are plain CSS custom properties in `src/app/globals.css`: a `:root` block holds the light values, a `.dark` block the dark values. The dark palette is the design reference; light is derived to parity, hue for hue.
- Colors are expressed in OKLCH on a single cool-gray hue axis (~275°) with the brand accent at ~278°. This keeps neutrals coherent and makes lightness-only ramps (`border` → `muted` → `accent`) predictable, since equal lightness steps are perceptually equal.
- One `@theme inline { … }` block maps the raw variables onto Tailwind's `--color-*`, `--font-*`, and `--radius-*` namespaces. The `inline` keyword makes generated utilities reference `var(--background)` and friends directly, so utilities resolve against whichever theme block is active at runtime instead of a value copied at build time.
- Dark mode uses the class strategy only: `@custom-variant dark (&:is(.dark *))` in CSS, and `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>` from next-themes in the root layout, with `suppressHydrationWarning` on `<html>`. The `dark:` variant keys off the same class the provider writes, so no theme code ships outside the client wrapper.
- Sidebar and chart tokens are first-class (eight `--sidebar-*` and five `--chart-*` variables per theme) so app-shell and data-visualization surfaces never hard-code colors.
- Base radius is `0.625rem`; the Tailwind radius scale is derived from it with `calc()` multipliers so the corner language stays consistent.
- `--font-sans` / `--font-mono` resolve to the Geist variables applied by `next/font/google` on `<body>`.

## Alternatives

- Tailwind v3-style JS config (`theme.extend.colors`) — rejected: v4 is CSS-first; a JS config would fork the source of truth and lose runtime theming.
- OS preference only, via `prefers-color-scheme` media queries — rejected: cannot guarantee the brand-default dark experience, cannot support an explicit toggle later, and cannot be scoped per subtree.
- `data-theme` attribute instead of a class — viable, but the class strategy matches Tailwind's `dark:` convention and shadcn/ui defaults, minimizing variant plumbing.
- Shipping dark tokens only, without a light theme — rejected: a parity light theme is cheap to maintain in one file and keeps AA contrast decisions honest for both themes.

## Trade-offs

- `enableSystem={false}` overrides the user's OS preference on first visit. This is a deliberate product choice; if a theme toggle is added, the provider already exposes `setTheme` and only the default needs revisiting.
- With `inline`, Tailwind does not emit the `--color-*` variables into the cascade; custom CSS must reference the raw tokens (`var(--background)`), not the mapped namespace.
- Class-based theming relies on the inline script next-themes injects to set `.dark` before first paint; with JavaScript disabled, users get the light `:root` default.
- OKLCH values are less eyeball-familiar than hex for reviewers without color-tooling support.

## Consequences

- New UI must style with semantic utilities only (`bg-card`, `text-muted-foreground`, `ring-ring`); raw palette values inside components are a review blocker.
- Adding a theme (for example high-contrast) means adding one variable block and a provider theme entry — no utility or component changes.
- The Sonner `Toaster` resolves its palette from the same tokens and inherits the active theme via `useTheme`, so toasts always match the shell.
- Contrast targets: neutral foregrounds on their paired surfaces meet WCAG AA (≥ 4.5:1) in both themes. The brand primary (≈ `oklch(0.62 0.19 278)` dark, `oklch(0.56 0.19 278)` light) is reserved for interactive accents, where ≥ 3:1 non-text contrast applies; long-form text never sits on it.
