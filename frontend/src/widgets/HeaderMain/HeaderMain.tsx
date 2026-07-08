'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { config } from '@/shared/config'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { loadMeThunk, logoutThunk } from '@/processes/store/slices/authSlice'
import { ButtonMain } from '@/shared/ui'
import styles from './HeaderMain.module.scss'

function AuraMark() {
  // Mini version of the hero sigil: concentric rings + core.
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--iris)" strokeOpacity="0.3" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="var(--iris)" strokeOpacity="0.55" />
      <circle cx="12" cy="12" r="3.4" fill="var(--iris)" />
    </svg>
  )
}

interface HeaderMainProps {
  afterActions?: ReactNode
}

export function HeaderMain({ afterActions }: HeaderMainProps) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { user, status } = useAppSelector((s) => s.auth)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const userLabel = user?.nickname || user?.name || user?.email
  const userInitial = (userLabel || '?').charAt(0).toUpperCase()

  useEffect(() => {
    if (status === 'idle') void dispatch(loadMeThunk())
  }, [dispatch, status])

  useEffect(() => {
    if (!accountMenuOpen) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountMenuOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [accountMenuOpen])

  useEffect(() => {
    if (!user) setAccountMenuOpen(false)
  }, [user])

  const onLogout = async () => {
    await dispatch(logoutThunk())
    setAccountMenuOpen(false)
    setMobileOpen(false)
    router.push('/')
  }

  const closeMenus = () => {
    setAccountMenuOpen(false)
    setMobileOpen(false)
  }

  const toggleAccountMenu = () => {
    setAccountMenuOpen((open) => !open)
  }

  return (
    <header className={styles.header}>
      <div className={`container ${styles['header-container']}`}>
        <Link href="/" className={styles['header-logo']}>
          <AuraMark />
          <span>{config.appName}</span>
        </Link>

        <button className={styles['header-mobile-toggle']} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
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
            {user && userLabel && (
              <div className={styles['account-menu-wrap']} ref={accountMenuRef}>
                <button
                  type="button"
                  className={`${styles['header-link']} ${styles['account-trigger']}`}
                  onClick={toggleAccountMenu}
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  aria-controls="header-account-menu"
                >
                  <span className={styles['account-avatar']} aria-hidden="true">
                    {user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt="" />
                    ) : (
                      userInitial
                    )}
                  </span>
                  <span>{userLabel}</span>
                </button>
                {accountMenuOpen && (
                  <div id="header-account-menu" className={styles['account-menu']} role="menu">
                    <Link href="/profile/edit" className={styles['account-menu-item']} role="menuitem" onClick={closeMenus}>
                      Profile
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles['header-actions']}>
            {afterActions}
            {user ? (
              <ButtonMain variant="secondary" onClick={onLogout}>
                Logout
              </ButtonMain>
            ) : (
              <>
                <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
                  <ButtonMain variant="ghost">Sign In</ButtonMain>
                </Link>
                <ButtonMain
                  onClick={() => {
                    router.push('/sign-up')
                    setMobileOpen(false)
                  }}
                >
                  Get started
                </ButtonMain>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
