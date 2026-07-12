'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/processes/store/hooks';
import { logoutThunk } from '@/processes/store/slices/authSlice';
import { getLocalizedRoutes } from '@/shared/lib/routes';
import { useCurrentLocale } from '@/shared/i18n';
import { LoaderMain } from '@/shared/ui';

export function LogoutAction() {
  const { t } = useTranslation('common');
  const locale = useCurrentLocale();
  const routes = getLocalizedRoutes(locale);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void dispatch(logoutThunk()).finally(() => {
      router.replace(routes.home);
    });
  }, [dispatch, router, routes.home]);

  return <LoaderMain label={t('actions.logout')} />;
}
