'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { config } from '@/shared/config'
import { useAppDispatch, useAppSelector } from '@/processes/store/hooks'
import { logoutThunk, selectAuthUser } from '@/processes/store/slices/authSlice'
import { LanguageSwitcher } from '@/features/LanguageSwitcher/LanguageSwitcher'
import { ButtonMain } from '@/shared/ui'
import { getLocalizedRoutes } from '@/shared/lib/routes'
import { i18nConfig, normalizeLocale } from '@/shared/i18n/config'
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
  const { t } = useTranslation('common')
  const dispatch = useAppDispatch()
  const router = useRouter()
  const params = useParams<{ locale?: string }>()
  const locale = normalizeLocale(params.locale) ?? i18nConfig.defaultLocale
  const routes = getLocalizedRoutes(locale)
  const user = useAppSelector(selectAuthUser)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const userLabel = user?.nickname || user?.name || user?.email
  const userInitial = (userLabel || '?').charAt(0).toUpperCase()

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
    router.push(routes.home)
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
        <Link href={routes.home} className={styles['header-logo']}>
          <AuraMark />
          <span>{config.appName}</span>
        </Link>

        <button
          className={styles['header-mobile-toggle']}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={t('accessibility.toggleMenu')}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>

        <nav className={`${styles['header-nav']} ${mobileOpen ? styles['mobile-open'] : ''}`}>
          <div className={styles['header-links']}>
            <Link href={routes.countries} className={styles['header-link']} onClick={() => setMobileOpen(false)}>
              {t('navigation.countries')}
            </Link>
            <Link href={routes.about} className={styles['header-link']} onClick={() => setMobileOpen(false)}>
              {t('navigation.about')}
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
                    <Link href={routes.profileEdit} className={styles['account-menu-item']} role="menuitem" onClick={closeMenus}>
                      {t('navigation.profile')}
                    </Link>
                  </div>
                )}
              </div>
            )}
            <div className={styles['header-mobile-auth']}>
              {user ? (
                <button type="button" className={styles['header-link']} onClick={onLogout}>
                  {t('actions.logout')}
                </button>
              ) : (
                <>
                  <Link href={routes.signIn} className={styles['header-link']} onClick={closeMenus}>
                    {t('actions.signIn')}
                  </Link>
                  <Link href={routes.signUp} className={styles['header-link']} onClick={closeMenus}>
                    {t('actions.getStarted')}
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className={styles['header-actions']}>
            <LanguageSwitcher />
            {afterActions}
            <div className={styles['header-desktop-auth']}>
              {user ? (
                <ButtonMain variant="secondary" onClick={onLogout}>
                  {t('actions.logout')}
                </ButtonMain>
              ) : (
                <>
                  <Link href={routes.signIn} onClick={() => setMobileOpen(false)}>
                    <ButtonMain variant="ghost">{t('actions.signIn')}</ButtonMain>
                  </Link>
                  <ButtonMain
                    onClick={() => {
                      router.push(routes.signUp)
                      setMobileOpen(false)
                    }}
                  >
                    {t('actions.getStarted')}
                  </ButtonMain>
                </>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  )
}
