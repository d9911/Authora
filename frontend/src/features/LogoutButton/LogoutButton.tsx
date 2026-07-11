'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/processes/store/hooks';
import { logoutThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain } from '@/shared/ui';
import { getLocalizedRoutes } from '@/shared/lib/routes';
import { useCurrentLocale } from '@/shared/i18n';

export function LogoutButton() {
  const { t } = useTranslation('auth');
  const locale = useCurrentLocale();
  const routes = getLocalizedRoutes(locale);
  const dispatch = useAppDispatch();
  const router = useRouter();
  return (
    <ButtonMain
      variant="ghost"
      onClick={async () => {
        await dispatch(logoutThunk());
        router.push(routes.home);
      }}
    >
      {t('logout')}
    </ButtonMain>
  );
}
