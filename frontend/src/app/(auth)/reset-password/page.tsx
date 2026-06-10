import { PasswordResetForm } from '@/features/PasswordResetForm/PasswordResetForm';

export const metadata = { title: 'Reset password' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <PasswordResetForm token={token} />;
}
