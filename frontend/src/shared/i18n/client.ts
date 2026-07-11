'use client';

import { useTranslation } from 'react-i18next';
import {
  i18nConfig,
  normalizeLocale,
  type SupportedLocale,
} from './config';

export function useCurrentLocale(): SupportedLocale {
  const { i18n } = useTranslation();
  return (
    normalizeLocale(i18n.resolvedLanguage ?? i18n.language) ??
    i18nConfig.defaultLocale
  );
}
