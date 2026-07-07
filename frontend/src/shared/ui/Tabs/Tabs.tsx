'use client';

import { ReactNode } from 'react';
import styles from './Tabs.module.scss';

export interface TabOption<T extends string = string> {
  value: T;
  label: ReactNode;
}

interface TabsProps<T extends string = string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export function Tabs<T extends string = string>({
  options,
  value,
  onChange,
  label,
  className,
}: TabsProps<T>) {
  return (
    <div className={`${styles.tabs} ${className || ''}`} role="tablist" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`${styles.tab} ${active ? styles.active : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
