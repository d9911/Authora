> Денис: файл создан или изменён по запросу пользователя.

# Authora UI-kit expansion design

## Objective

Close confirmed accessibility, theme-state, overlay, menu and repeated data-display gaps in the existing Authora UI-kit without replacing the current architecture or changing application business behavior.

## Evidence and boundaries

The full evidence table is `docs/ui-kit-inventory.md`; execution decisions are `docs/ui-kit-roadmap.md`. The active design source is the Identity Aura token system in `frontend/src/shared/styles/globals.scss`. MongoDB-like green/teal guidance in `DESIGN.md` is not an implementation source.

No new dependency is needed: React 19, native DOM semantics, Next Link and Sass Modules cover the confirmed contracts. Auth, Redux, GraphQL, upload validation, route generation and localized redirect behavior remain feature/process owners.

## Component boundaries

- Existing owners are extended instead of duplicated: `ButtonMain`, `InputMain`, `PasswordInput`, `FeedbackText`, `ModalMain`, `Tabs`, and `Toast`.
- New shared primitives are limited to confirmed repeated behavior:
  - `DropdownMenu`: generic controlled menu-button keyboard/focus/placement behavior; Header retains route/account content.
  - `AlertDialog`: generic confirmation composition over remediated `ModalMain`; ProfilePhotoManager retains delete orchestration.
  - `Avatar`: generic image/fallback display shared by Header and ProfileCard.
- SelectMain remains the only listbox/select owner. It is not repurposed as an action menu.
- UI-kit catalog remains the existing `/[locale]/ui` entity/widget/route chain.

## Accessibility model

- Modal follows the W3C APG modal-dialog pattern: labelled `dialog`/`alertdialog`, modal state, initial focus, contained tab sequence, Escape, focus restoration, body scroll lock and inert background.
- Dropdown follows APG menu-button/menu behavior: Enter/Space and optional Arrow open, roving focus with Arrow/Home/End, Escape close and focus return.
- Tabs use one roving tab stop, automatic activation and explicit control/panel relationships.
- Native input/button/link semantics remain primary; ARIA is added only for relationships or composite widgets.
- Motion is disabled under `prefers-reduced-motion`.

## Theme model

Components consume `data-theme` semantic variables; no component receives a theme prop. Brand palette tokens remain unchanged. New semantic action/status tokens may map the brand hues to contrast-safe UI roles in light and dark themes. A source-level WCAG luminance test guards declared small-text pairs.

## State and error handling

- Controlled state remains in feature/entity consumers.
- Shared components do not dispatch Redux actions or call APIs.
- AlertDialog cancellation has no side effect; confirm invokes the pre-existing feature callback once and can expose its existing busy state.
- Focus/body/inert cleanup runs on every modal close/unmount path.
- A missing portal document during SSR renders no overlay; normal open state is client-controlled.

## Migration safety

- Header migration preserves localized route values and current mobile/auth behavior.
- Profile deletion preserves the same thunk, payload, translated error mapping and image-kind selection.
- Avatar/Badge migrations preserve image URLs, alt intent, email/verification values and layout dimensions.
- JSON translation changes are recorded in `DENIS_FILE_MANIFEST.md`; no marker is inserted into JSON.

## Rejected alternatives

- Radix, Headless UI, shadcn or a positioning package: rejected because current scope is small and no dependency is needed.
- A second Modal, Select, Switch, Tag or Loader: rejected as duplicate.
- Generic polymorphic mega-component: rejected; ButtonMain only distinguishes the two confirmed action hosts, button and Next Link.
- Enterprise grid/calendar and unconsumed primitives: deferred with evidence in the roadmap.
