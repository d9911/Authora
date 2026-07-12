# Theme-aware loader design

## Context

Authora already has `LoaderMain`, a localized `/:locale/loading.tsx`, an inline
`ThemeInitScript`, and light/dark CSS tokens in `globals.scss`. The current loader is a
small inline spinner and does not provide the requested full-screen visual treatment.

## Decision

`LoaderMain` remains the single loader component and gains an optional
`fullscreen?: boolean` prop. Its default compact mode continues to serve form and
Suspense fallbacks. `/:locale/loading.tsx` opts into full-screen mode.

The visual uses two counter-rotating SVG rings, a pulsing core, a soft radial aura and a
localized label. Styling lives in `LoaderMain.module.scss`. Colors come from existing
`--paper`, `--ink`, `--iris`, `--halo`, and theme-scoped glow variables, so the loader
switches immediately when `data-theme` changes and does not need a second theme read in
React.

## Accessibility and runtime behavior

- The wrapper exposes `role="status"`, `aria-live="polite"`, and `aria-busy="true"`.
- The decorative SVG is hidden from assistive technology; the visible label is the
  accessible status text.
- `prefers-reduced-motion` disables ring rotation and core pulsing.
- `ThemeInitScript` applies `data-theme` before hydration, avoiding a light-to-dark flash.
- No Tailwind classes or new dependencies are introduced.

## Verification

Extend `tests/theme-hydration.mjs` to verify the two variants, existing theme tokens,
dark-theme selector, accessibility attributes and reduced-motion handling. Then run
frontend typecheck, the focused test, production build, and the full project suite.
