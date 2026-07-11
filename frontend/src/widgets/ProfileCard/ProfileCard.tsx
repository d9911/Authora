'use client'

import { useTranslation } from 'react-i18next'
import { Profile, User } from '@/shared/types'
import styles from './ProfileCard.module.scss'

export function ProfileCard({ user, profile }: { user: User; profile: Profile | null }) {
  const { t } = useTranslation('profile')
  const displayName = user.name || user.nickname || user.email || t('card.fallbackUser')
  const avatarLabel = displayName.charAt(0).toUpperCase()

  return (
    <div className={styles['profile-card']}>
      {profile?.coverSrc && (
        <div className={styles['profile-cover']}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.coverSrc} alt={t('card.coverAlt')} />
        </div>
      )}
      <div className={styles['profile-header']}>
        <div className={styles['profile-avatar']}>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={t('card.avatarAlt')} />
          ) : (
            avatarLabel
          )}
        </div>
        <div className={styles['profile-info']}>
          <h4>{displayName}</h4>
          <div className={styles['profile-email']}>
            <span>{user.email ?? t('card.noRecoveryEmail')}</span>
            {user.email ? (
              user.emailVerified ? (
                <span className="tag tag-verified">{t('card.verified')}</span>
              ) : (
                <span>{t('card.unverified')}</span>
              )
            ) : null}
          </div>
        </div>
      </div>
      {profile?.bio && <p className={styles['profile-bio']}>{profile.bio}</p>}
    </div>
  )
}
