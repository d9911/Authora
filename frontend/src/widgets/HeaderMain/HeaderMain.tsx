'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { config } from '@/shared/config';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import { loadMeThunk, logoutThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain } from '@/shared/ui';
import styles from './HeaderMain.module.scss';

function AuraMark() {
  // Mini version of the hero sigil: concentric rings + core.
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--iris)" strokeOpacity="0.3" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="var(--iris)" strokeOpacity="0.55" />
      <circle cx="12" cy="12" r="3.4" fill="var(--iris)" />
    </svg>
  );
}

export function HeaderMain() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, status } = useAppSelector((s) => s.auth);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (status === 'idle') void dispatch(loadMeThunk());
  }, [dispatch, status]);

  const onLogout = async () => {
    await dispatch(logoutThunk());
    router.push('/');
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles['header-container']}`}>
        <Link href="/" className={styles['header-logo']}>
          <AuraMark />
          <span>{config.appName}</span>
        </Link>

        <button
          className={styles['header-mobile-toggle']}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>

        <nav className={`${styles['header-nav']} ${mobileOpen ? styles['mobile-open'] : ''}`}>
          <div className={styles['header-links']}>
            <Link href="/country" className={styles['header-link']} onClick={() => setMobileOpen(false)}>
              Countries
            </Link>
            <Link href="/about" className={styles['header-link']} onClick={() => setMobileOpen(false)}>
              About
            </Link>
            {user && (
              <Link href="/profile/edit" className={styles['header-link']} onClick={() => setMobileOpen(false)}>
                {user.name || user.email}
              </Link>
            )}
          </div>

          <div className={styles['header-actions']}>
            {user ? (
              <ButtonMain variant="secondary" onClick={onLogout}>
                Logout
              </ButtonMain>
            ) : (
              <>
                <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
                  <ButtonMain variant="ghost">Sign In</ButtonMain>
                </Link>
                <ButtonMain onClick={() => { router.push('/sign-up'); setMobileOpen(false); }}>
                  Get started
                </ButtonMain>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
