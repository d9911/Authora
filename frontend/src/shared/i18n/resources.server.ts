import 'server-only';
import type { Resource, ResourceLanguage } from 'i18next';
import {
  i18nConfig,
  type I18nNamespace,
  type SupportedLocale,
} from './config';

type JsonModule = { default?: ResourceLanguage } & ResourceLanguage;

async function loadNamespace(
  locale: SupportedLocale,
  namespace: I18nNamespace,
): Promise<ResourceLanguage> {
  const module = (await import(
    `../../locales/${locale}/${namespace}.json`
  )) as JsonModule;

  return module.default ?? module;
}

async function loadLanguage(locale: SupportedLocale): Promise<ResourceLanguage> {
  const namespaceEntries = await Promise.all(
    i18nConfig.namespaces.map(async (namespace) => [
      namespace,
      await loadNamespace(locale, namespace),
    ] as const),
  );

  return Object.fromEntries(namespaceEntries);
}

/**
 * Returns only the requested language and the fallback language. The object is
 * safe to serialize into the client provider without shipping every locale.
 */
export async function loadLocaleResources(
  locale: SupportedLocale,
): Promise<Resource> {
  const locales = Array.from(
    new Set<SupportedLocale>([locale, i18nConfig.defaultLocale]),
  );
  const entries = await Promise.all(
    locales.map(async (resourceLocale) => [
      resourceLocale,
      await loadLanguage(resourceLocale),
    ] as const),
  );

  return Object.fromEntries(entries);
}
