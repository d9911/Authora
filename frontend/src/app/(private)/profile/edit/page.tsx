import { Suspense } from 'react';
import { EditProfileForm } from '@/features/EditProfileForm/EditProfileForm';
import { TwoFactorSetup } from '@/features/TwoFactorSetup/TwoFactorSetup';
import { ConnectedAccounts } from '@/features/ConnectedAccounts/ConnectedAccounts';
import { LoaderMain } from '@/shared/ui';

export const metadata = { title: 'Edit profile' };

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
