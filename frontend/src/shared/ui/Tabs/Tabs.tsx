// Денис: файл создан или изменён по запросу пользователя.
'use client';

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useId,
  useRef,
} from 'react';
import { getNextTabIndex } from './tabsModel';
import styles from './Tabs.module.scss';

export interface TabOption<T extends string = string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  controls?: string;
}

interface TabsProps<T extends string = string> {
  options: readonly TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  idPrefix?: string;
  className?: string;
}

export function Tabs<T extends string = string>({
  options,
  value,
  onChange,
  label,
  idPrefix,
  className,
}: TabsProps<T>) {
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const resolvedIdPrefix = idPrefix ?? `tabs-${generatedId}`;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusAndActivate = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    const tab = tabRefs.current[index];
    tab?.focus();
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    onChange(option.value);
  };

  const handleKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex = -1;

    if (event.key === 'ArrowRight') {
      nextIndex = getNextTabIndex(options, currentIndex, 1);
    } else if (event.key === 'ArrowLeft') {
      nextIndex = getNextTabIndex(options, currentIndex, -1);
    } else if (event.key === 'Home') {
      nextIndex = getNextTabIndex(options, -1, 1);
    } else if (event.key === 'End') {
      nextIndex = getNextTabIndex(options, 0, -1);
    } else {
      return;
    }

    event.preventDefault();
    focusAndActivate(nextIndex);
  };

  return (
    <div
      className={`${styles.tabs} ${className || ''}`}
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
    >
      {options.map((option, index) => {
        const active = option.value === value;

        return (
          <button
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            key={option.value}
            id={`${resolvedIdPrefix}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={option.controls}
            aria-disabled={option.disabled || undefined}
            tabIndex={active ? 0 : -1}
            disabled={option.disabled}
            className={`${styles.tab} ${active ? styles.active : ''}`}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
