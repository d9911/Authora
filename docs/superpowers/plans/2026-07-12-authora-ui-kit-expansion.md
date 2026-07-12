> Денис: файл создан или изменён по запросу пользователя.

# Authora UI-kit expansion implementation plan

## Phase 0 — lock evidence

- [x] Record clean baseline status/diffs and current commit.
- [x] Audit 20 existing shared components, exports, consumers, local native controls, SCSS, theme, i18n and tests.
- [x] Capture `/ru/ui` runtime baseline for modal and tabs.
- [x] Create `docs/ui-kit-inventory.md` and `docs/ui-kit-roadmap.md`.

## Phase 1 — RED contracts

- [x] Add a unique source/model leaf for UI-kit remediation contracts.
- [x] Assert missing semantic tokens and action/status contrast.
- [x] Assert ModalMain APG contract and cleanup hooks.
- [x] Assert Tabs keyboard/ARIA contract.
- [x] Assert DropdownMenu, AlertDialog and Avatar exports/behavior contracts.
- [x] Assert safe Header/profile migrations and showcase catalog relationships.
- [x] Run the new leaf and retain the expected failing output before production edits.

## Phase 2 — P0 implementation

- [x] Add light/dark semantic action and readable status tokens; wire affected primitives.
- [x] Extend ButtonMain with `aria-busy`, retained loading content and safe link action.
- [x] Extend InputMain with id, hint/error/invalid relationships.
- [x] Extend FeedbackText roles/tones and PasswordInput ref/disabled behavior.
- [x] Add localized showcase states without hardcoded visible strings.
- [x] Run targeted GREEN tests, typecheck and affected auth/header contracts.

## Phase 3 — P1 implementation

- [x] Remediate ModalMain with portal, APG semantics, focus trap/restore, inert background, scroll lock, Escape/backdrop control and reduced motion.
- [x] Create AlertDialog and replace `window.confirm` while preserving delete orchestration.
- [x] Create DropdownMenu with controlled state, APG keyboard behavior and adaptive vertical placement; migrate Header account menu.
- [x] Extend Tabs with roving focus and panel relationships.
- [x] Extend Toast closed-state safety, warning/danger announcements and dismiss action.
- [x] Run targeted tests after each vertical slice.

## Phase 4 — P2 implementation and catalog

- [x] Create Avatar and migrate Header/ProfileCard.
- [x] Replace confirmed local verified tags with Badge.
- [x] Convert the existing showcase into a localized component catalog with exact import/API/a11y/state data.
- [x] Preserve existing SelectMain and LoaderMain work; fix dangling labels, invalid button content and fake controls.
- [x] Update RU/EN translations and JSON manifest; run parity/used-key checks.

## Phase 5 — verification and review

- [x] Run new tests, `make check-source`, `make check-types`, frontend lint/build and full `make test NO_COLOR=1`.
- [x] Review `/ru/ui` and `/en/ui` in light/dark at representative project breakpoints.
- [x] Verify keyboard-only modal/menu/tabs, long RU labels, error/loading/disabled/empty states, focus restoration, console/hydration errors and horizontal overflow.
- [x] Capture final desktop/mobile light/dark screenshots.
- [x] Request independent code review, resolve confirmed findings, rerun affected checks.
- [x] Update inventory/roadmap status, record exact command evidence, run `git diff --check`, and report final `git status --short`.

## Stop conditions

Stop only for a real permission blocker, unavailable required external prerequisite with no safe substitute, or a change that would require modifying auth/API/business contracts. Do not push or create a PR.
