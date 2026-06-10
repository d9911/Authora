'use client';

import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/shared/hooks/redux';
import { logoutThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain } from '@/shared/ui';

export function LogoutButton() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  return (
    <ButtonMain
      variant="ghost"
      onClick={async () => {
        await dispatch(logoutThunk());
        router.push('/');
      }}
    >
      Logout
    </ButtonMain>
  );
}
