'use client';

import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  findTypeaheadIndex,
  getNextEnabledIndex,
  resolveSelectLayout,
  toggleSelectedValue,
  type SelectLayout,
  type SelectPlacement,
} from './selectMainModel';
import styles from './SelectMain.module.scss';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SelectMainBaseProps<T extends string> {
  id?: string;
  placeholder?: string;
  options: readonly SelectOption<T>[];
  disabled?: boolean;
  clearable?: boolean;
  placement?: SelectPlacement;
  maxMenuHeight?: number;
  className?: string;
  variant?: 'default' | 'compact';
  emptyMessage?: string;
  clearLabel?: string;
  removeLabel?: (optionLabel: string) => string;
}

type SelectMainAccessibleName =
  | { label: string; ariaLabel?: string }
  | { label?: undefined; ariaLabel: string };

interface SelectMainSingleProps<T extends string> {
  multiple?: false;
  value: T | null;
  onChange: (value: T | null) => void;
}

interface SelectMainMultipleProps<T extends string> {
  multiple: true;
  value: readonly T[];
  onChange: (value: T[]) => void;
}

export type SelectMainProps<T extends string = string> = SelectMainBaseProps<T> &
  SelectMainAccessibleName &
  (SelectMainSingleProps<T> | SelectMainMultipleProps<T>);

const TYPEAHEAD_RESET_MS = 600;
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const isPrintableKey = (event: ReactKeyboardEvent<HTMLElement>) =>
  event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey;

export function SelectMain<T extends string = string>(props: SelectMainProps<T>) {
  const {
    id,
    label,
    ariaLabel,
    placeholder,
    options,
    disabled = false,
    clearable = false,
    placement = 'auto',
    maxMenuHeight = 320,
    className,
    variant = 'default',
    emptyMessage,
    clearLabel,
    removeLabel,
  } = props;
  const { t } = useTranslation('common');
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const controlId = id ?? `select-main-${generatedId}`;
  const labelId = `${controlId}-label`;
  const valueId = `${controlId}-value`;
  const listboxId = `${controlId}-listbox`;
  const multiple = props.multiple === true;
  const selectedValues: readonly T[] = multiple
    ? props.value
    : props.value === null
      ? []
      : [props.value];
  const optionByValue = new Map(options.map((option) => [option.value, option]));
  const selectedOptions = selectedValues.flatMap((value) => {
    const option = optionByValue.get(value);
    return option ? [option] : [];
  });
  const optionsStateKey = JSON.stringify(
    options.map((option) => [option.value, Boolean(option.disabled)]),
  );
  const selectedStateKey = JSON.stringify(selectedValues);
  const hasSelection = selectedValues.length > 0;
  const resolvedPlaceholder = placeholder ?? t('select.placeholder');
  const resolvedEmptyMessage = emptyMessage ?? t('select.empty');
  const resolvedClearLabel = clearLabel ?? t('select.clear');

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [layout, setLayout] = useState<SelectLayout | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef({ query: '', timeoutId: 0 });

  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const calculateLayout = useCallback(() => {
    const control = controlRef.current;
    if (!control) return null;
    const rect = control.getBoundingClientRect();
    return resolveSelectLayout({
      trigger: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
      },
      viewport: {
        width: window.visualViewport?.width ?? window.innerWidth,
        height: window.visualViewport?.height ?? window.innerHeight,
      },
      placement,
      maxMenuHeight,
    });
  }, [maxMenuHeight, placement]);

  const updateLayout = useCallback(() => {
    const nextLayout = calculateLayout();
    if (nextLayout) setLayout(nextLayout);
  }, [calculateLayout]);

  const initialActiveIndex = () => {
    const selectedIndex = selectedValues.length
      ? options.findIndex(
          (option) => option.value === selectedValues[0] && !option.disabled,
        )
      : -1;
    return selectedIndex >= 0 ? selectedIndex : getNextEnabledIndex(options, -1, 1);
  };

  const openMenu = (preferredIndex?: number) => {
    if (disabled) return;
    const nextLayout = calculateLayout();
    if (nextLayout) setLayout(nextLayout);
    setActiveIndex(preferredIndex ?? initialActiveIndex());
    setOpen(true);
  };

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    setActiveIndex(-1);
    typeaheadRef.current.query = '';
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
    }
  };

  const focusOutsideControl = (backward: boolean) => {
    const root = rootRef.current;
    if (!root) return;
    const focusable = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter((element) => element.getClientRects().length > 0);
    const rootIndexes = focusable.flatMap((element, index) =>
      root.contains(element) ? [index] : [],
    );
    if (rootIndexes.length === 0) return;
    const targetIndex = backward
      ? Math.min(...rootIndexes) - 1
      : Math.max(...rootIndexes) + 1;
    focusable[targetIndex]?.focus();
  };

  const selectOption = (option: SelectOption<T>, index: number) => {
    if (option.disabled) return;
    if (multiple) {
      props.onChange(toggleSelectedValue(props.value, option.value));
      setActiveIndex(index);
      window.requestAnimationFrame(() => listboxRef.current?.focus({ preventScroll: true }));
      return;
    }

    props.onChange(option.value);
    closeMenu(true);
  };

  const clearSelection = () => {
    if (multiple) {
      props.onChange([]);
      window.requestAnimationFrame(() => {
        if (open) listboxRef.current?.focus({ preventScroll: true });
        else triggerRef.current?.focus({ preventScroll: true });
      });
      return;
    }

    props.onChange(null);
    closeMenu(true);
  };

  const removeSelectedValue = (value: T) => {
    if (!multiple) return;
    props.onChange(props.value.filter((selectedValue) => selectedValue !== value));
    window.requestAnimationFrame(() => {
      if (open) listboxRef.current?.focus({ preventScroll: true });
      else triggerRef.current?.focus({ preventScroll: true });
    });
  };

  const moveActive = (direction: 1 | -1) => {
    setActiveIndex((currentIndex) =>
      getNextEnabledIndex(options, currentIndex, direction),
    );
  };

  const handleTypeahead = (key: string) => {
    const previousQuery = typeaheadRef.current.query;
    const repeatedCharacter =
      previousQuery.length > 0 &&
      previousQuery.split('').every((character) => character === key.toLocaleLowerCase());
    const query = repeatedCharacter
      ? key.toLocaleLowerCase()
      : `${previousQuery}${key}`.toLocaleLowerCase();
    const nextIndex = findTypeaheadIndex(options, query, activeIndex);
    if (!open) openMenu(nextIndex >= 0 ? nextIndex : undefined);
    else if (nextIndex >= 0) setActiveIndex(nextIndex);

    window.clearTimeout(typeaheadRef.current.timeoutId);
    typeaheadRef.current.query = query;
    typeaheadRef.current.timeoutId = window.setTimeout(() => {
      typeaheadRef.current.query = '';
    }, TYPEAHEAD_RESET_MS);
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (!open) openMenu(getNextEnabledIndex(options, -1, direction));
      else moveActive(direction);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const index = getNextEnabledIndex(options, -1, event.key === 'Home' ? 1 : -1);
      if (!open) openMenu(index);
      else setActiveIndex(index);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open && activeIndex >= 0 && options[activeIndex]) {
        selectOption(options[activeIndex], activeIndex);
      } else {
        openMenu();
      }
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeMenu(true);
      return;
    }

    if (event.key === 'Tab' && open) {
      closeMenu(false);
      return;
    }

    if (isPrintableKey(event)) {
      event.preventDefault();
      handleTypeahead(event.key);
    }
  };

  const handleListboxKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!multiple) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActiveIndex(
        getNextEnabledIndex(options, -1, event.key === 'Home' ? 1 : -1),
      );
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && activeIndex >= 0) {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) selectOption(option, activeIndex);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      closeMenu(false);
      focusOutsideControl(event.shiftKey);
      return;
    }

    if (isPrintableKey(event)) {
      event.preventDefault();
      handleTypeahead(event.key);
    }
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateLayout();

    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateLayout);
    if (controlRef.current) observer?.observe(controlRef.current);
    if (listboxRef.current) observer?.observe(listboxRef.current);

    window.addEventListener('scroll', updateLayout, true);
    window.addEventListener('resize', updateLayout);
    window.visualViewport?.addEventListener('scroll', updateLayout);
    window.visualViewport?.addEventListener('resize', updateLayout);

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', updateLayout, true);
      window.removeEventListener('resize', updateLayout);
      window.visualViewport?.removeEventListener('scroll', updateLayout);
      window.visualViewport?.removeEventListener('resize', updateLayout);
    };
  }, [open, updateLayout]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listboxRef.current?.contains(target)) {
        closeMenu(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (!open || !multiple) return;
    const frameId = window.requestAnimationFrame(() =>
      listboxRef.current?.focus({ preventScroll: true }),
    );
    return () => window.cancelAnimationFrame(frameId);
  }, [multiple, open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex((currentIndex) => {
      if (
        currentIndex >= 0 &&
        currentIndex < options.length &&
        !options[currentIndex]?.disabled
      ) {
        return currentIndex;
      }

      const selectedIndex = selectedValues.length
        ? options.findIndex(
            (option) => option.value === selectedValues[0] && !option.disabled,
          )
        : -1;
      return selectedIndex >= 0
        ? selectedIndex
        : getNextEnabledIndex(options, -1, 1);
    });
  }, [open, optionsStateKey, selectedStateKey]);

  useEffect(
    () => () => window.clearTimeout(typeaheadRef.current.timeoutId),
    [],
  );

  useEffect(() => {
    if (disabled && open) closeMenu(false);
  }, [disabled, open]);

  const triggerValue = multiple
    ? selectedOptions.length > 0
      ? t('select.selectedCount', { count: selectedOptions.length })
      : resolvedPlaceholder
    : selectedOptions[0]?.label ?? resolvedPlaceholder;
  const activeDescendant = open && activeIndex >= 0 ? optionId(activeIndex) : undefined;
  const menuStyle: CSSProperties | undefined = layout
    ? {
        top: layout.top,
        left: layout.left,
        width: layout.width,
        maxHeight: layout.maxHeight,
        transform: layout.transform,
      }
    : undefined;

  const menu = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={listboxRef}
          id={listboxId}
          className={styles.menu}
          role="listbox"
          tabIndex={multiple ? 0 : -1}
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : ariaLabel}
          aria-multiselectable={multiple || undefined}
          aria-activedescendant={multiple ? activeDescendant : undefined}
          data-placement={layout?.placement ?? 'bottom'}
          style={menuStyle}
          onKeyDown={handleListboxKeyDown}
        >
          {options.length === 0 ? (
            <div className={styles.empty}>{resolvedEmptyMessage}</div>
          ) : (
            options.map((option, index) => {
              const selected = selectedValues.includes(option.value);
              const active = index === activeIndex;
              return (
                <div
                  key={option.value}
                  id={optionId(index)}
                  className={styles.option}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={option.disabled || undefined}
                  data-active={active ? 'true' : undefined}
                  data-selected={selected ? 'true' : undefined}
                  onPointerDown={(event) => event.preventDefault()}
                  onPointerMove={() => {
                    if (!option.disabled) setActiveIndex(index);
                  }}
                  onClick={() => selectOption(option, index)}
                >
                  <span>{option.label}</span>
                  {selected && <span className={styles.check} aria-hidden="true">✓</span>}
                </div>
              );
            })
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${styles[variant]} ${className ?? ''}`}
      data-disabled={disabled ? 'true' : undefined}
    >
      {label && (
        <span id={labelId} className={styles.label}>
          {label}
        </span>
      )}
      <div
        ref={controlRef}
        className={styles.control}
        data-open={open ? 'true' : undefined}
        data-multiple={multiple ? 'true' : undefined}
      >
        {multiple && selectedOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={styles.chip}
            disabled={disabled}
            aria-label={
              removeLabel?.(option.label) ??
              t('select.removeOption', { option: option.label })
            }
            onClick={() => removeSelectedValue(option.value)}
          >
            <span>{option.label}</span>
            <span aria-hidden="true">×</span>
          </button>
        ))}
        <button
          ref={triggerRef}
          id={controlId}
          type="button"
          className={styles.trigger}
          disabled={disabled}
          role={multiple ? undefined : 'combobox'}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={multiple ? undefined : activeDescendant}
          aria-labelledby={label ? `${labelId} ${valueId}` : undefined}
          aria-label={label ? undefined : ariaLabel}
          onClick={() => {
            if (open) closeMenu(false);
            else openMenu();
          }}
          onKeyDown={handleTriggerKeyDown}
        >
          <span id={valueId} className={hasSelection ? styles.value : styles.placeholder}>
            {triggerValue}
          </span>
          <svg className={styles.chevron} viewBox="0 0 20 20" aria-hidden="true">
            <path d="m5.5 7.5 4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {clearable && hasSelection && (
          <button
            type="button"
            className={styles.clear}
            disabled={disabled}
            aria-label={resolvedClearLabel}
            onClick={clearSelection}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      {menu}
    </div>
  );
}
