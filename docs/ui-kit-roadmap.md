> Денис: файл создан или изменён по запросу пользователя.

# Authora UI-kit remediation roadmap

**Visual contract:** Authora Identity Aura is the active visual source of truth. `DESIGN.md` is reference-only.

Roadmap is derived from `docs/ui-kit-inventory.md`, current consumers, runtime checks on `/ru/ui`, and official WAI-ARIA APG patterns. It intentionally avoids backend, auth-flow, route, payload, OTP, upload-validation, and GraphQL changes.

## Execution result — 2026-07-12

- **P0 completed:** semantic contrast roles and confirmed action/form/feedback states.
- **P1 completed:** ModalMain remediation, AlertDialog, DropdownMenu, Tabs and Toast safety.
- **P2 completed for confirmed consumers:** Avatar plus Badge migrations and a 23-item RU/EN catalog on the existing route.
- **P3 deferred:** only the evidence-based rows below; no speculative dependency or enterprise component was added.
- **Independent review:** two read-only passes returned `0 Critical`; confirmed code/a11y findings were fixed before the final checks. The closure map is in `docs/ui-kit-inventory.md`.
- **Regression result:** targeted remediation `8/8`, `make check-source`, `make check-types`, frontend lint and production build passed. The fresh full runner passed `55/55` with `0 WARN` and `0 FAIL` in `96.98s`, including i18n HTTP, security, Mongo, k6 and Autocannon checks.
- **Runtime result:** `/ru/ui` and `/en/ui`, light/dark, `1200×900` and `390×844`, keyboard menu/dialog/tabs, search/empty state, console/hydration and overflow were checked. Fresh portal geometry and mobile min-content checks passed; application-origin browser errors: `0`.
- **Artifacts:** `/private/tmp/authora-ui-kit-final-verified-dark-mobile.png`, `/private/tmp/authora-ui-kit-final-verified-light-mobile-settled.png`, `/private/tmp/authora-ui-kit-final-verified-light-desktop-settled.png`, `/private/tmp/authora-ui-kit-final-verified-dark-desktop-fresh.png`.

## P0 — form states, action semantics, contrast

### P0.1 Semantic action/status colors

- **Root cause:** `--iris`, `--halo`, `--alert`, and `--signal` are brand/status palette values, but several components use them directly as small text/background pairs. The light iris action pair passes at 5.39:1; confirmed failures are theme/state-specific, including white on dark iris at 3.27:1, white on light alert at 3.11:1, and light signal text on white at 2.55:1.
- **Consumers:** ButtonMain, IconButton, Tabs, FeedbackText, PasswordInput error, Badge solid variants.
- **Target API:** no theme prop. Add a small repeated-use semantic layer for action background/foreground, readable status text, 3:1 control boundaries and selected-state edges in both themes.
- **Files:** `shared/styles/globals.scss`; affected component modules; source contrast test.
- **Migration scope:** CSS only; keep Identity Aura hue and component props.
- **Tests:** actual-token text/non-text contrast math, composited accent-card regression, semantic usage assertions, `theme-hydration`, source checks and browser light/dark inspection.
- **Showcase:** primary/danger/status examples in both runtime themes.
- **Done:** every asserted small-text pair is at least 4.5:1; focus indication remains visible.
- **Dependencies:** none.
- **Diff risk:** medium because globals affect many screens; verify auth, header, UI-kit in both themes.

### P0.2 ButtonMain and InputMain public state contracts

- **Root cause:** Button loading has no `aria-busy`; Header nests a ButtonMain button inside a Next Link; InputMain does not associate hint/error text or expose invalid styling.
- **Consumers:** all auth forms, HeaderMain, profile/security features, UI-kit.
- **Target API:** ButtonMain retains native button API and adds an explicit `href` link branch rather than a generic polymorphic system; loading remains disabled and announced. InputMain adds optional `hint`, `error`, generated id relationships, required/optional indicator text supplied by consumer, and preserves `forwardRef`.
- **Files:** `shared/ui/ButtonMain/*`, `shared/ui/InputMain/*`, `widgets/HeaderMain/HeaderMain.tsx`, showcase.
- **Migration scope:** replace only the invalid Header sign-in nesting; existing button/input call sites stay source-compatible.
- **Tests:** source contract for no nested interactive link/button, link/button branches, `aria-busy`, `aria-invalid` and `aria-describedby`.
- **Showcase:** loading/disabled/error/hint examples.
- **Done:** no nested button inside link; accessible relationships are deterministic; business routes unchanged.
- **Dependencies:** current Next Link only; no package added.
- **Diff risk:** low/medium in Header; preserve localized route and mobile behavior.

### P0.3 FeedbackText and PasswordInput states

- **Root cause:** success feedback has no default status announcement; warning tone is absent; PasswordInput toggle stays usable while its input is disabled and focus cannot be forwarded.
- **Consumers:** nine feedback consumers and three password flows.
- **Target API:** FeedbackText maps error to assertive alert, success/warning to polite status unless explicitly overridden. PasswordInput forwards input ref and disables its visibility action with the field.
- **Files:** `shared/ui/FeedbackText/*`, `shared/ui/PasswordInput/*`.
- **Migration scope:** none required; existing props remain compatible.
- **Tests:** source contract for roles/live regions, ref/disabled propagation; auth regression suite.
- **Showcase:** success/warning/error and disabled password examples.
- **Done:** announcements are predictable and disabled controls have no active secondary action.
- **Dependencies:** none.
- **Diff risk:** low; role defaults could change assistive output, so explicit consumer overrides must remain authoritative.

## P1 — menus, dialogs, feedback

### P1.1 ModalMain APG remediation

- **Root cause:** existing component ignores its SCSS module and lacks dialog semantics, Escape, initial focus, trap, restoration, scroll lock, and background inertness.
- **Consumers:** UI-kit now; AlertDialog after P1.2.
- **Target API:** controlled `open/onClose`, required visible `title`, localized `closeLabel`, optional `descriptionId`, `initialFocusRef`, `closeOnBackdrop`, role `dialog|alertdialog`, className, children/footer. Portal to `document.body`; one shared topmost stack owns key handling, inert/scroll locking and cleanup.
- **Files:** `shared/ui/ModalMain/ModalMain.tsx`, `.module.scss`.
- **Migration scope:** existing showcase call adds close label; no second modal primitive.
- **Tests:** source/behavior contract for role, aria-modal/label, Escape, Tab wrap, initial focus, restoration, scroll lock and reduced motion.
- **Showcase:** interactive modal with multiple focusable controls.
- **Done:** runtime DOM and keyboard checks match APG; body/background restored after every close path.
- **Dependencies:** official W3C APG Dialog pattern; no package.
- **Diff risk:** medium due portal/focus lifecycle; SSR guard and cleanup required.

### P1.2 AlertDialog and profile deletion migration

- **Root cause:** `ProfilePhotoManager` calls `window.confirm`, bypassing theme, busy state and a testable accessible dialog contract.
- **Consumers:** avatar and cover deletion in one feature.
- **Target API:** controlled AlertDialog composed from ModalMain; title, description, cancel/confirm labels, `busy`, `confirmTone`, callbacks.
- **Files:** new `shared/ui/AlertDialog/*`, public export, `ProfilePhotoManager.tsx`, profile locale JSON.
- **Migration scope:** store pending image kind; invoke the exact existing delete thunk only after confirm; cancellation performs no mutation.
- **Tests:** negative cancellation; confirm invokes existing method once; busy disables actions; auth/profile source regressions.
- **Showcase:** danger confirmation demo.
- **Done:** no `window.confirm`; upload/delete contracts, payloads and error mapping unchanged.
- **Dependencies:** P1.1.
- **Diff risk:** medium in profile UI; do not alter thunk or image validation.

### P1.3 DropdownMenu and Header migration

- **Root cause:** Header account menu is a local click/outside/Escape implementation without Arrow/Home/End navigation or focus restoration.
- **Consumers:** Header account profile action; showcase.
- **Target API:** controlled open/onOpenChange; render-trigger props; menu children with native/link `role=menuitem`; start/end alignment; fixed body portal; automatic top/bottom placement using the visual viewport origin and size; outside close; focus return on Escape.
- **Files:** new `shared/ui/DropdownMenu/*`, export, `HeaderMain.tsx/.module.scss`.
- **Migration scope:** move only generic open/focus/keyboard behavior; retain account label, routes, logout, mobile menu and classes needed by existing source tests.
- **Tests:** sequential keyboard contract, focus first/last including `aria-disabled`, activation guard, wrap, Escape, outside close, shifted-viewport placement helper, portal source contract and Header route regression.
- **Showcase:** controlled action menu near normal flow and lower viewport container.
- **Done:** APG menu-button attributes and keyboard interactions verified in browser; portal escapes the showcase Card and remains inside viewport; locale route stays unchanged.
- **Dependencies:** official W3C APG Menu Button and Menu patterns.
- **Diff risk:** medium/high because Header has mobile/i18n source contracts; re-run targeted tests before full suite.

### P1.4 Tabs APG remediation

- **Root cause:** all tab buttons are page tab-stops and there is no Arrow/Home/End, disabled handling, or tab-panel relationship.
- **Consumers:** UI-kit category catalog only.
- **Target API:** controlled options including optional disabled/control id, `idPrefix`, automatic activation, horizontal orientation, roving tabindex, ArrowLeft/Right/Home/End.
- **Files:** `shared/ui/Tabs/*`, `UiKitShowcase.tsx`.
- **Migration scope:** the showcase catalog becomes the associated tabpanel; filtering behavior remains identical.
- **Tests:** pure next-enabled-index helper; source keyboard/ARIA contract; runtime keyboard flow.
- **Showcase:** self-demonstrating.
- **Done:** one tab stop, selected/focus sync, active tab labels the panel.
- **Dependencies:** official W3C APG Tabs pattern.
- **Diff risk:** low; only current consumer is showcase.

### P1.5 Toast safety and variants

- **Root cause:** a closed toast remains rendered with `aria-hidden`; a future focusable action could remain tabbable. Danger is announced politely and there is no accessible dismiss affordance.
- **Consumers:** UI-kit only.
- **Target API:** render nothing when closed; error/danger uses alert/assertive, other tones status/polite; optional localized close label/onClose; warning tone.
- **Files:** `shared/ui/Toast/*`, showcase, UI locale JSON.
- **Migration scope:** current timer remains entity-owned.
- **Tests:** closed markup absent, tone role mapping, dismiss API.
- **Showcase:** success/warning/danger examples.
- **Done:** no hidden focusable descendants; no raw translation strings.
- **Dependencies:** none.
- **Diff risk:** low. Queue manager is deferred because only one toast producer exists.

## P2 — data display and catalog

### P2.1 Avatar plus existing Badge migrations

- **Root cause:** HeaderMain and ProfileCard duplicate image/fallback structures; ProfileCard and ConnectedAccounts duplicate verified tags despite exported Badge.
- **Consumers:** HeaderMain, ProfileCard, ConnectedAccounts.
- **Target API:** Avatar supports `src`, required `alt`, `fallback`, size, decorative mode, native div attrs. Existing Badge API is retained.
- **Files:** new `shared/ui/Avatar/*`, export, three consumers and their SCSS.
- **Migration scope:** markup/style-only; user names, email, image URLs and verified state unchanged.
- **Tests:** image/fallback/alt source contract; existing auth/header/profile tests.
- **Showcase:** image and fallback states plus Badge status tones.
- **Done:** duplicated markup/classes removed where parity is proven; no image contract change.
- **Dependencies:** P0 semantic status tokens.
- **Diff risk:** medium visual risk; compare Header/Profile light/dark and mobile.

### P2.2 Showcase as a component catalog

- **Root cause:** current catalog lists eight conceptual cards, omits six existing primitives, lacks import/API/a11y notes, has a dangling `aria-labelledby`, invalid rich content inside buttons, non-functional decorative actions, and does not synchronize selection after filtering.
- **Consumers:** public `/[locale]/ui` route.
- **Target API:** data-driven entries with category, exact import path, public API summary, status/a11y notes and interactive demos. Search is added only if final catalog size makes filtering useful.
- **Files:** `entities/ui-kit/ui/UiKitShowcase.tsx/.module.scss`, `locales/{ru,en}/ui.json`, UI-kit docs.
- **Migration scope:** retain existing SelectMain/LoaderMain demos and route; fix selection semantics and remove fake actions.
- **Tests:** ru/en key parity, used keys, source coverage, catalog count, no dangling id; browser both locales/themes/mobile.
- **Done:** every created/extended component has a real controlled demo; all visible strings localized; no invalid button content model; RU hero content is not clipped at the mobile breakpoint.
- **Dependencies:** P0/P1/P2.1.
- **Diff risk:** medium due parallel historical work; merge around existing SelectMain/LoaderMain sections, never replace them wholesale.

## P3 — evidence-based deferred work

| Item                                           | Decision and evidence                                                                                       | Re-open condition                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| FormField/FormControl                          | Existing controls own labels/errors; no repeated independent wrapper contract.                              | Two controls require the same prefix/suffix/required/error composition. |
| TextareaMain                                   | No `<textarea>` consumer; profile bio/description multiline UX is not confirmed by API or product contract. | Product confirms multiline fields or a second form needs textarea.      |
| Checkbox/CheckboxGroup                         | No checkbox consumer; settings already use ToggleSwitch.                                                    | A multi-selection form with checkbox semantics appears.                 |
| RadioGroup/SegmentedControl                    | One PasswordReset pressed-button group is functional; migration could affect recovery UX.                   | Second consumer or explicit radio/segmented UX approval.                |
| Combobox/Autocomplete                          | Would overlap SelectMain; no async search endpoint/consumer.                                                | Confirmed query/filter consumer not served by SelectMain.               |
| FileDropzone                                   | Profile image uploader is already feature-owned and carries domain validation.                              | A second non-image upload domain with shared contract.                  |
| Popover/Tooltip                                | No consumer or positioning requirement.                                                                     | Concrete anchored-help/action consumer.                                 |
| Drawer/Sheet                                   | ModalMain becomes sheet-like on small screens; no independent drawer navigation.                            | Non-modal drawer/mobile navigation requirement.                         |
| Skeleton                                       | LoaderMain covers actual loading flows; no shape contract.                                                  | Confirmed progressive content layout.                                   |
| Empty/ErrorState                               | LocationList already centralizes its three domain levels; no second domain consumer.                        | A second domain duplicates title/description/action empty markup.       |
| Breadcrumbs/Pagination/Stepper/Accordion/Table | No route/data consumer found; City detail correctly uses native `dl`.                                       | Concrete information architecture or paginated/tabular dataset.         |
| Enterprise DataGrid/calendar                   | Explicitly out of scope and no consumer.                                                                    | Separate product specification and performance/accessibility budget.    |
| Toast queue                                    | One producer; a global queue owner would be speculative.                                                    | Concurrent independent toast producers need ordering/deduplication.     |

## Validation gates

1. Targeted RED/GREEN source/model tests for new contracts.
2. `make check-source`.
3. `make check-types`.
4. `cd frontend && yarn lint` under Node 24 required by root engines.
5. `cd frontend && yarn build`.
6. `make test NO_COLOR=1` when local service prerequisites are available.
7. Browser: `/ru/ui`, `/en/ui`, light/dark, project breakpoints 480/640/768/1024/1200/1440, keyboard-only menu/dialog/tabs, console/hydration/overflow checks.
8. `git diff --check` and final `git status --short`.

No push or PR is part of this roadmap.
