# SelectMain UI-Kit Design

## Goal

Add one controlled Authora UI-kit selector that supports a single value by default,
an explicit multiple-value mode, removable selected values, and viewport-aware popup
placement. Replace every value selector in the current frontend without changing its
business callbacks.

## Confirmed scope

The project currently renders four value selectors: language, country, region and city.
The account dropdown and mobile navigation are action/navigation menus, so they keep
their existing semantics and are not converted into a value selector.

## Public API

```ts
export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

type SelectMainProps<T extends string = string> = SelectMainBaseProps<T> & (
  | {
      multiple?: false;
      value: T | null;
      onChange: (value: T | null) => void;
    }
  | {
      multiple: true;
      value: readonly T[];
      onChange: (value: T[]) => void;
    }
);
```

The common props are `id`, `label`, `ariaLabel`, `placeholder`, `options`, `disabled`,
`clearable`, `placement`, `maxMenuHeight`, `className` and `variant`. The component is
controlled only; an uncontrolled second state model is intentionally excluded. Its public
type requires at least one accessible name source: a visible `label` or an `ariaLabel`.

## Behavior

- Single mode is the default. The trigger displays the selected option label. Choosing
  an option calls `onChange(value)` exactly once and closes the popup.
- Multi mode accepts an array. Choosing an option toggles that value and keeps the popup
  open. Selected values render as removable chips inside the input-like control.
- `clearable` adds a separate clear action. Interactive remove/clear controls are siblings
  of the trigger, never nested buttons.
- Disabled options are skipped by pointer and keyboard selection.
- A controlled value that is absent from async options is not silently changed. It is
  omitted from the display until its option becomes available.
- `Escape` closes without changing the value. Outside pointer interaction and `Tab` close
  the popup. Single-mode selection only occurs on explicit pointer, `Enter` or `Space`.
- Arrow keys, `Home`, `End` and typeahead update the active option. Active focus and
  selected state remain distinct.

## Accessibility

Single mode uses a select-only combobox trigger with `aria-expanded`, `aria-controls`
and `aria-activedescendant`, plus a `listbox` popup and `option` children. DOM focus
stays on the trigger while visual focus moves through options.

Multi mode uses a popup `listbox` with `aria-multiselectable="true"`; DOM focus moves to
the listbox while it is open and returns to the trigger on close. Every option exposes
`aria-selected`. The visible label is connected with `aria-labelledby`, while compact
consumers may provide `ariaLabel`.

## Positioning

The popup is rendered through `createPortal` into `document.body` and uses
`position: fixed`, so ancestor overflow and stacking contexts do not clip it. `auto`
compares the available pixels above and below the control and chooses the larger side.
`top` and `bottom` remain explicit overrides. Width is based on the control and clamped
to the viewport; height is capped by `maxMenuHeight` and the available side.

Position is recalculated after opening and on capturing scroll, window resize,
`visualViewport` changes and `ResizeObserver` notifications. All listeners and observers
are removed on close/unmount.

## Styling

The component uses the existing Authora tokens (`--paper`, `--card`, `--ink`, `--mist`,
`--line`, `--iris`, `--halo`, `--shadow-soft`, radii and fonts). `variant="default"`
matches form controls; `variant="compact"` matches the header language selector. The
portal uses a layer above the current modal overlay so selectors also work inside dialogs.

## Migration

1. Export `SelectMain` and `SelectOption` from `shared/ui`.
2. Demonstrate controlled single and multi modes on `/[locale]/ui`.
3. Replace the three private native location selects while preserving `''` at the feature
   boundary and all cascading callbacks.
4. Replace the native language select while preserving cookie, URL, query, hash,
   transition and disabled behavior.

## Tests

- Pure Node tests cover placement, viewport clamping, disabled keyboard navigation,
  typeahead and multi-value toggling.
- Source contract tests cover ARIA roles, portal positioning, cleanup hooks, UI-kit export
  and migration of all native value selects.
- Existing locale parity, FSD boundaries, typecheck, production build and full `make test`
  remain required.
- Browser smoke verifies pointer/keyboard selection, chips, clearing, auto placement,
  light/dark themes and desktop/mobile layouts.
