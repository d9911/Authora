'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { config } from '@/shared/config';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import { loadMeThunk, logoutThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain } from '@/shared/ui';

export function HeaderMain() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, status } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (status === 'idle') void dispatch(loadMeThunk());
  }, [dispatch, status]);

  const onLogout = async () => {
    await dispatch(logoutThunk());
    router.push('/');
  };

  return (
    <header
      style={{
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 60,
        }}
      >
        <Link href="/" style={{ fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>
          {config.appName}
        </Link>
        <nav style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <Link href="/country">Countries</Link>
          <Link href="/about">About</Link>
          {user ? (
            <>
              <Link href="/profile/edit">{user.name || user.email}</Link>
              <ButtonMain variant="ghost" onClick={onLogout} style={{ padding: '6px 12px' }}>
                Logout
              </ButtonMain>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/sign-up">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
