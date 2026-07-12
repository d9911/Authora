'use client'

// Денис: файл создан или изменён по запросу пользователя.

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { config } from '@/shared/config'
import { useAppDispatch, useAppSelector } from '@/processes/store/hooks'
import { logoutThunk, selectAuthUser } from '@/processes/store/slices/authSlice'
import { LanguageSwitcher } from '@/features/LanguageSwitcher/LanguageSwitcher'
import { Avatar, ButtonMain, DropdownMenu } from '@/shared/ui'
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
  const navigationId = `primary-navigation-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const mobileToggleRef = useRef<HTMLButtonElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const userLabel = user?.nickname || user?.name || user?.email
  const userInitial = (userLabel || '?').charAt(0).toUpperCase()

  useEffect(() => {
    if (!user) setAccountMenuOpen(false)
  }, [user])

  useEffect(() => {
    if (!mobileOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Escape') return
      event.preventDefault()
      setMobileOpen(false)
      window.requestAnimationFrame(() => mobileToggleRef.current?.focus())
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

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

  return (
    <header className={styles.header}>
      <div className={`container ${styles['header-container']}`}>
        <Link href={routes.home} className={styles['header-logo']} aria-label={config.appName}>
          <AuraMark />
          <span>{config.appName}</span>
        </Link>

        <button
          ref={mobileToggleRef}
          type="button"
          className={styles['header-mobile-toggle']}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={t('accessibility.toggleMenu')}
          aria-expanded={mobileOpen}
          aria-controls={navigationId}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>

        <nav id={navigationId} className={`${styles['header-nav']} ${mobileOpen ? styles['mobile-open'] : ''}`}>
          <div className={styles['header-links']}>
            <Link href={routes.countries} className={styles['header-link']} onClick={() => setMobileOpen(false)}>
              {t('navigation.countries')}
            </Link>
            <Link href={routes.about} className={styles['header-link']} onClick={() => setMobileOpen(false)}>
              {t('navigation.about')}
            </Link>
            {user && userLabel && (
              <DropdownMenu
                className={styles['account-menu-wrap']}
                open={accountMenuOpen}
                onOpenChange={setAccountMenuOpen}
                align="end"
                menuClassName={styles['account-menu']}
                renderTrigger={(triggerProps) => (
                  <button
                    {...triggerProps}
                    className={`${styles['header-link']} ${styles['account-trigger']}`}
                  >
                    <Avatar
                      size="small"
                      src={user.avatarUrl}
                      alt=""
                      fallback={userInitial}
                      decorative
                    />
                    <span className={styles['account-label']}>{userLabel}</span>
                  </button>
                )}
              >
                <Link href={routes.profileEdit} role="menuitem" tabIndex={-1} onClick={closeMenus}>
                  {t('navigation.profile')}
                </Link>
              </DropdownMenu>
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
                  <ButtonMain
                    href={routes.signIn}
                    variant="ghost"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('actions.signIn')}
                  </ButtonMain>
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
