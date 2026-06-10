import { PasswordResetForm } from '@/features/PasswordResetForm/PasswordResetForm';

export const metadata = { title: 'Reset password' };

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return <PasswordResetForm token={searchParams.token} />;
}
