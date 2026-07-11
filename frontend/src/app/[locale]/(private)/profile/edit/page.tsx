import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EditProfileForm } from '@/features/EditProfileForm/EditProfileForm';
import { TwoFactorSetup } from '@/features/TwoFactorSetup/TwoFactorSetup';
import { ConnectedAccounts } from '@/features/ConnectedAccounts/ConnectedAccounts';
import { LoaderMain } from '@/shared/ui';
import { getServerTranslation } from '@/shared/i18n/server';
import { isSupportedLocale } from '@/shared/i18n/config';

type ProfileEditPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: ProfileEditPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return {};
  const { t } = await getServerTranslation(locale, 'profile');
  return { title: t('edit.metadataTitle') };
}

export default function ProfileEditPage() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <EditProfileForm />
      <Suspense fallback={<LoaderMain />}>
        <ConnectedAccounts />
      </Suspense>
      <TwoFactorSetup />
    </div>
  );
}
