# Theme Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light/dark theme switcher across the Authora frontend and make the UI kit demonstrate both themes.

**Architecture:** Theme state is a global app process in `frontend/src/processes/theme`, because it controls `document.documentElement.dataset.theme` and local persistence. The visible toggle is a generic shared UI primitive in `frontend/src/shared/ui/ThemeToggle`. The root layout installs the provider and early theme script, then passes a process-level header toggle into `HeaderMain` through a slot prop so the widget does not import `processes`.

**Tech Stack:** Next.js, React, TypeScript, Sass modules, CSS variables, `localStorage`, `matchMedia`, no new dependencies.

## Global Constraints

- Do not add new npm dependencies.
- Keep FSD dependency direction: `app -> processes -> widgets -> features -> entities -> shared`.
- Do not put business-specific copy into `shared/ui`.
- Theme must support explicit `light` and `dark`, persist the choice, and fall back to OS preference when no saved choice exists.
- Verify with `yarn run typecheck`; run `yarn run build` if the environment allows Next production build.

---

### Task 1: Theme Process

**Files:**
- Create `frontend/src/processes/theme/model/theme.ts`.
- Create `frontend/src/processes/theme/ui/ThemeProvider.tsx`.
- Create `frontend/src/processes/theme/ui/ThemeInitScript.tsx`.
- Create `frontend/src/processes/theme/index.ts`.

**Produces:** `ThemeProvider`, `useTheme`, `ThemeInitScript`, `ThemeMode`.

- [ ] Add the `ThemeMode` type and storage key.
- [ ] Add provider logic for saved preference, OS preference fallback, and `data-theme` syncing.
- [ ] Add early inline script to prevent first-paint theme mismatch.

### Task 2: Shared Toggle

**Files:**
- Create `frontend/src/shared/ui/ThemeToggle/ThemeToggle.tsx`.
- Create `frontend/src/shared/ui/ThemeToggle/ThemeToggle.module.scss`.
- Modify `frontend/src/shared/ui/index.ts`.

**Produces:** A generic accessible button that displays light/dark state and calls `onToggle`.

- [ ] Use a real `button`.
- [ ] Include visible compact state text and an `aria-label`.
- [ ] Export it from the shared UI public API.

### Task 3: App Wiring And Theme Tokens

**Files:**
- Modify `frontend/src/app/layout.tsx`.
- Modify `frontend/src/shared/styles/globals.scss`.
- Create `frontend/src/processes/theme/ui/ThemeHeaderToggle.tsx`.
- Modify `frontend/src/widgets/HeaderMain/HeaderMain.tsx`.
- Modify `frontend/src/widgets/HeaderMain/HeaderMain.module.scss`.

**Produces:** App-wide theme switcher in the header and full light/dark CSS variable sets.

- [ ] Wrap the app with `ThemeProvider`.
- [ ] Insert `ThemeInitScript` before interactive content.
- [ ] Let `HeaderMain` receive a slot for process-level controls instead of importing the process directly.
- [ ] Add `data-theme="dark"` CSS variables.
- [ ] Replace hardcoded light header backgrounds with theme-aware variables.

### Task 4: UI Kit Theme Demonstration

**Files:**
- Modify `frontend/src/widgets/page-blocks/UiKitPage/ui/UiKitPage.tsx`.
- Modify `frontend/src/widgets/page-blocks/UiKitPage/ui/UiKitPage.module.scss`.

**Produces:** UI kit copy and token display that explicitly includes light/dark theme support.

- [ ] Add theme-related badge/copy.
- [ ] Display theme token swatches using CSS variables instead of fixed colors where appropriate.

### Task 5: Verification

**Commands:**
- `cd frontend && yarn run typecheck`
- `cd frontend && yarn run build`

**Expected:** TypeScript exits 0. Build exits 0 or reports only known Sass deprecation warnings from existing styles.
