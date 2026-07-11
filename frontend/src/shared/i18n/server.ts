import 'server-only';
import { cache } from 'react';
import {
  createInstance,
  type i18n,
  type Namespace,
  type TFunction,
} from 'i18next';
import type { I18nNamespace, SupportedLocale } from './config';
import { getI18nOptions } from './options';
import { loadLocaleResources } from './resources.server';

export type ServerTranslation = {
  i18n: i18n;
  t: TFunction<Namespace>;
};

export async function createServerI18n(locale: SupportedLocale): Promise<i18n> {
  const instance = createInstance();
  const resources = await loadLocaleResources(locale);
  await instance.init(getI18nOptions(locale, resources));
  return instance;
}

const getCachedServerI18n = cache(createServerI18n);

export async function getServerTranslation(
  locale: SupportedLocale,
  namespace: I18nNamespace | readonly I18nNamespace[] = 'common',
): Promise<ServerTranslation> {
  const instance = await getCachedServerI18n(locale);
  return {
    i18n: instance,
    t: instance.getFixedT(locale, namespace as Namespace),
  };
}

export { loadLocaleResources } from './resources.server';
