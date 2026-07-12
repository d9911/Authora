# Theme-Aware Loader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the basic spinner with one reusable SVG aura loader whose full-screen and compact variants follow the active Authora theme.

**Architecture:** Keep `LoaderMain` as the shared owner and add an SCSS module driven by the existing root theme tokens. The localized Next loading boundary opts into full-screen mode while existing call sites keep compact mode.

**Tech Stack:** React 19, Next.js 16 App Router, TypeScript, Sass modules, Node.js source tests.

## Global Constraints

- Preserve every existing `LoaderMain` call without requiring new props.
- Use the existing `data-theme` and CSS token system; do not introduce a second theme store.
- Add no dependency and no Tailwind requirement.
- Respect `prefers-reduced-motion` and expose a readable loading status.
- Preserve the current staged and unstaged auth changes.

---

### Task 1: Theme-aware compact and full-screen loader

**Files:**
- Create: `frontend/src/shared/ui/LoaderMain/LoaderMain.module.scss`
- Modify: `frontend/src/shared/ui/LoaderMain/LoaderMain.tsx`
- Modify: `frontend/src/app/[locale]/loading.tsx`
- Modify: `tests/theme-hydration.mjs`

**Interfaces:**
- Consumes: existing `common.status.loading` translation and root theme variables.
- Produces: `LoaderMain({ label?: string, fullscreen?: boolean }): JSX.Element`.

- [x] **Step 1: Add the failing contract test**

Extend `tests/theme-hydration.mjs` to read the loader component, its SCSS module and the
Next loading boundary, then assert `fullscreen?: boolean`, `role="status"`,
`aria-busy="true"`, `data-theme='dark'`, `prefers-reduced-motion`, and
`<LoaderMain fullscreen />`.

- [x] **Step 2: Verify the test fails**

Run: `node tests/theme-hydration.mjs`

Expected: FAIL because the current component has no `fullscreen` prop or SCSS module.

- [x] **Step 3: Implement the shared loader**

Add the optional prop without changing the existing label contract. Render one wrapper,
a decorative `viewBox="0 0 200 200"` SVG with outer/inner rings and core, and the label.
Use unique gradient/filter IDs from `useId()`. Apply compact styles by default and add
the module's full-screen class only when `fullscreen` is true.

- [x] **Step 4: Implement theme and motion styles**

Use existing palette variables for foreground/background/rings. Define only the radial
glow opacity locally for light and `:root[data-theme='dark']`. Animate rings in opposite
directions and stop all loader animation under `prefers-reduced-motion: reduce`.

- [x] **Step 5: Connect the route boundary**

Change the localized boundary to:

```tsx
export default function Loading() {
  return <LoaderMain fullscreen />;
}
```

- [x] **Step 6: Verify implementation**

Run:

```bash
node tests/theme-hydration.mjs
cd frontend && yarn --ignore-engines run typecheck
cd frontend && yarn --ignore-engines run build
make test NO_COLOR=1
git diff --check
```

Expected: focused test, typecheck, production build and complete suite all pass.
