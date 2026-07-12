# SelectMain UI-Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one controlled single/multi SelectMain and migrate every current value selector to it.

**Architecture:** Keep selection and placement math in a pure model, render the interactive client component in `shared/ui`, and preserve feature-specific side effects at existing feature boundaries. Use a body portal and viewport measurements without adding dependencies.

**Tech Stack:** React 19, Next.js 16 App Router, TypeScript 6, Sass modules, i18next, Node.js test runner.

## Global Constraints

- Preserve existing language and cascading location business behavior.
- Do not convert account/mobile navigation menus into value selectors.
- Add no dependency and do not introduce Tailwind.
- Use the current theme tokens and ru/en locale parity.
- Keep the existing loader diff and git index untouched.

---

### Task 1: Pure selection and placement model

**Files:**
- Create: `frontend/src/shared/ui/SelectMain/selectMainModel.ts`
- Create: `tests/select-main-model.test.mjs`
- Modify: `tests/source-checks.mjs`

**Interfaces:**
- Produces `resolveSelectLayout`, `getNextEnabledIndex`, `findTypeaheadIndex` and `toggleSelectedValue`.

- [x] **Step 1: Write failing Node tests**

Cover auto top/bottom, forced placement, horizontal clamp, available max height, disabled
option skipping, wraparound navigation, typeahead and immutable multi-value toggling.

- [x] **Step 2: Run RED**

Run: `node --test tests/select-main-model.test.mjs`

Expected: non-zero because `selectMainModel.ts` does not exist.

- [x] **Step 3: Implement the pure functions**

```ts
export function resolveSelectLayout(input: SelectLayoutInput): SelectLayout;
export function getNextEnabledIndex<T extends SelectModelOption>(
  options: readonly T[], currentIndex: number, direction: 1 | -1,
): number;
export function findTypeaheadIndex<T extends SelectModelOption>(
  options: readonly T[], query: string, startIndex: number,
): number;
export function toggleSelectedValue<T extends string>(
  values: readonly T[], value: T,
): T[];
```

- [x] **Step 4: Run GREEN**

Run: `node --test tests/select-main-model.test.mjs`

Expected: all model tests pass.

### Task 2: SelectMain component and contract

**Files:**
- Create: `frontend/src/shared/ui/SelectMain/SelectMain.tsx`
- Create: `frontend/src/shared/ui/SelectMain/SelectMain.module.scss`
- Create: `tests/select-main-contract.mjs`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `tests/source-checks.mjs`

**Interfaces:**
- Consumes the Task 1 model.
- Produces `SelectMain<T extends string>` and `SelectOption<T>`.

- [x] **Step 1: Write the failing source contract**

Assert the discriminated single/multi API, `createPortal`, `role="combobox"`,
`role="listbox"`, `aria-multiselectable`, `aria-activedescendant`, outside-pointer and
resize/scroll cleanup, theme tokens and public barrel export.

- [x] **Step 2: Run RED**

Run: `node tests/select-main-contract.mjs`

Expected: non-zero because `SelectMain.tsx` and its module do not exist.

- [x] **Step 3: Implement SelectMain**

Render a labelled input-like control, sibling selected chips and clear action, a portal
listbox, option active/selected states, keyboard navigation and typeahead. Single selection
closes; multiple selection stays open. Recalculate fixed placement for scroll/resize and
observer updates, with complete cleanup.

- [x] **Step 4: Run GREEN and typecheck**

Run:

```bash
node tests/select-main-contract.mjs
cd frontend && yarn --ignore-engines run typecheck
```

Expected: both commands exit 0.

### Task 3: UI-kit demonstration and translations

**Files:**
- Modify: `frontend/src/entities/ui-kit/ui/UiKitShowcase.tsx`
- Modify: `frontend/src/entities/ui-kit/ui/UiKitShowcase.module.scss`
- Modify: `frontend/src/locales/ru/ui.json`
- Modify: `frontend/src/locales/en/ui.json`
- Modify: `frontend/src/locales/ru/common.json`
- Modify: `frontend/src/locales/en/common.json`

**Interfaces:**
- Consumes `SelectMain` in controlled single and multiple modes.

- [x] **Step 1: Extend the failing contract**

Require one single demo and one `multiple` demo with controlled state and matching ru/en keys.

- [x] **Step 2: Run RED**

Run: `node tests/select-main-contract.mjs`

Expected: fail because the showcase has no SelectMain examples.

- [x] **Step 3: Add both demos and translations**

Use local state only. Demonstrate selected label, removable chips, clear-all behavior and
localized option/action labels without adding domain logic to `shared/ui`.

- [x] **Step 4: Run GREEN and locale parity**

Run:

```bash
node tests/select-main-contract.mjs
node tests/i18n-locales-parity.mjs
```

Expected: both commands exit 0.

### Task 4: Project-wide value-select migration

**Files:**
- Modify: `frontend/src/features/EditProfileForm/LocationSelectGroup.tsx`
- Modify: `frontend/src/features/EditProfileForm/EditProfileForm.module.scss`
- Modify: `frontend/src/features/LanguageSwitcher/LanguageSwitcher.tsx`
- Modify: `frontend/src/features/LanguageSwitcher/LanguageSwitcher.module.scss`

**Interfaces:**
- Preserves current feature callback signatures and side effects.

- [x] **Step 1: Extend the failing contract**

Require `SelectMain` in both feature owners and assert there is no native `<select>` left in
`frontend/src` while the account `role="menu"` remains unchanged.

- [x] **Step 2: Run RED**

Run: `node tests/select-main-contract.mjs`

Expected: fail on the two native owners.

- [x] **Step 3: Migrate locations**

Map `{ id, name }` to `{ value, label }`, map `''` to/from `null`, preserve disabled state and
call existing country/region/city handlers only after explicit SelectMain selection.

- [x] **Step 4: Migrate language**

Keep the configured locale options, pending state, cookie write and locale-preserving
`router.replace` unchanged; adapt only the selected value callback and compact styles.

- [x] **Step 5: Run GREEN and integration checks**

Run:

```bash
node tests/select-main-contract.mjs
node tests/i18n-mobile-header.mjs
node tests/frontend-fsd-boundaries.mjs
cd frontend && yarn --ignore-engines run typecheck
```

Expected: all commands exit 0.

### Task 5: Runtime and full verification

**Files:**
- Modify: `docs/superpowers/plans/2026-07-12-select-main.md` (checkboxes only)

- [x] **Step 1: Run focused and production checks**

```bash
node --test tests/select-main-model.test.mjs
node tests/select-main-contract.mjs
cd frontend && yarn --ignore-engines run build
```

- [x] **Step 2: Browser smoke**

Verify `/ru/ui`, `/ru/profile/edit` and header language switching in light/dark themes;
exercise pointer and keyboard selection, multi remove/clear, bottom-to-top placement and a
mobile viewport. Confirm there are no app console/hydration errors.

- [x] **Step 3: Run the complete suite**

```bash
make test NO_COLOR=1
git diff --check
git diff --cached --check
```

Expected: all required checks pass and the git index still contains the pre-existing loader changes only.
