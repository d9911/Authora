# UI Kit Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dependency-free interactive UI kit page for Authora, arranged by Feature-Sliced Design layers.

**Architecture:** Base reusable primitives live in `frontend/src/shared/ui`. UI-kit-specific composed examples live in `frontend/src/entities/ui-kit`. The public route stays thin and renders a page-block from `frontend/src/widgets/page-blocks/UiKitPage`.

**Tech Stack:** Next.js, React, TypeScript, Sass modules, CSS variables, CSS/SVG pseudo-3D, no new npm dependencies.

## Global Constraints

- Do not add `three`, `gsap`, or other dependencies.
- Follow FSD dependency order: `app -> processes -> widgets -> features -> entities -> shared`.
- New slice components use `ui` segment and public `index.ts`.
- `shared/ui` components must not contain project-specific business words.
- The route file `frontend/src/app/(public)/ui/page.tsx` must stay thin.
- Verify with `yarn run typecheck` and `yarn run build` from `frontend`.

---

### Task 1: Shared UI Primitives

**Files:**
- Create shared primitives under `frontend/src/shared/ui/*`.
- Modify `frontend/src/shared/ui/index.ts`.

**Produces:** Generic components for cards, badges, icon buttons, section headers, tabs, toggles, ranges, progress, toast, and CSS/SVG pseudo-3D preview.

- [ ] Add typed React components with no imports from upper FSD layers.
- [ ] Add Sass modules for interaction, focus, responsive sizing, and reduced-motion behavior.
- [ ] Export all public components from `frontend/src/shared/ui/index.ts`.

### Task 2: UI Kit Entity Compositions

**Files:**
- Create `frontend/src/entities/ui-kit/ui/UiKitShowcase.tsx`.
- Create `frontend/src/entities/ui-kit/ui/UiKitShowcase.module.scss`.
- Create `frontend/src/entities/ui-kit/index.ts`.

**Produces:** Client-side composition with filters, selected cards, toggle/range state, modal/toast state, and sample UI sections.

- [ ] Use only `shared/ui` imports.
- [ ] Keep UI-kit-specific data local to the entity slice.
- [ ] Implement at least three interactive mechanics: tabs/filtering, selected cards, controls, modal/toast.

### Task 3: Page Block And Route

**Files:**
- Create `frontend/src/widgets/page-blocks/UiKitPage/ui/UiKitPage.tsx`.
- Create `frontend/src/widgets/page-blocks/UiKitPage/ui/UiKitPage.module.scss`.
- Create `frontend/src/widgets/page-blocks/UiKitPage/index.ts`.
- Modify `frontend/src/app/(public)/ui/page.tsx`.

**Produces:** Full UI kit page assembly and thin public route.

- [ ] Compose hero, layer map, and entity showcase.
- [ ] Keep the route limited to importing and returning `<UiKitPage />`.

### Task 4: Verification

**Commands:**
- `cd frontend && yarn run typecheck`
- `cd frontend && yarn run build`

**Expected:** Both commands complete without TypeScript or Next build errors.
