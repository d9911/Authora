import type { SupportedLocale } from './config';

export type DateInput = Date | number | string;

function toDate(value: DateInput): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  value: DateInput,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(locale, options).format(date) : '';
}

export function formatTime(
  value: DateInput,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = { timeStyle: 'short' },
): string {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(locale, options).format(date) : '';
}

export function formatDateTime(
  value: DateInput,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
): string {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(locale, options).format(date) : '';
}

export function formatNumber(
  value: number,
  locale: SupportedLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatPercent(
  value: number,
  locale: SupportedLocale,
  options?: Omit<Intl.NumberFormatOptions, 'style'>,
): string {
  return formatNumber(value, locale, { ...options, style: 'percent' });
}

export function formatCurrency(
  value: number,
  currency: string,
  locale: SupportedLocale,
  options?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>,
): string {
  return formatNumber(value, locale, {
    ...options,
    style: 'currency',
    currency,
  });
}

export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: SupportedLocale,
  options: Intl.RelativeTimeFormatOptions = { numeric: 'auto' },
): string {
  return new Intl.RelativeTimeFormat(locale, options).format(value, unit);
}
