'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createInstance, type i18n, type Resource } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import type { SupportedLocale } from './config';
import { getI18nOptions } from './options';

export type I18nProviderProps = {
  children: ReactNode;
  locale: SupportedLocale;
  resources: Resource;
};

function createClientInstance(
  locale: SupportedLocale,
  resources: Resource,
): i18n {
  const instance = createInstance();
  void instance.init(getI18nOptions(locale, resources));
  return instance;
}

export function I18nProvider({
  children,
  locale,
  resources,
}: I18nProviderProps) {
  const [instance] = useState(() => createClientInstance(locale, resources));

  useEffect(() => {
    for (const [resourceLocale, namespaces] of Object.entries(resources)) {
      for (const [namespace, bundle] of Object.entries(namespaces)) {
        instance.addResourceBundle(
          resourceLocale,
          namespace,
          bundle,
          true,
          true,
        );
      }
    }

    if (instance.resolvedLanguage !== locale) {
      void instance.changeLanguage(locale);
    }
  }, [instance, locale, resources]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
