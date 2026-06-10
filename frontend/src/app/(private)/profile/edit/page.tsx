import { EditProfileForm } from '@/features/EditProfileForm/EditProfileForm';
import { TwoFactorSetup } from '@/features/TwoFactorSetup/TwoFactorSetup';

export const metadata = { title: 'Edit profile' };

export default function ProfileEditPage() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <EditProfileForm />
      <TwoFactorSetup />
    </div>
  );
}
