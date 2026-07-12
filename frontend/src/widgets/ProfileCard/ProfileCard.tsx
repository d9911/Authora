'use client'

// Денис: файл создан или изменён по запросу пользователя.

import { useTranslation } from 'react-i18next'
import { Profile, User } from '@/shared/types'
import { Avatar, Badge } from '@/shared/ui'
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
        <Avatar
          className={styles['profile-avatar']}
          size="large"
          src={user.avatarUrl}
          alt={t('card.avatarAlt')}
          fallback={avatarLabel}
        />
        <div className={styles['profile-info']}>
          <h4>{displayName}</h4>
          <div className={styles['profile-email']}>
            <span>{user.email ?? t('card.noRecoveryEmail')}</span>
            {user.email ? (
              user.emailVerified ? (
                <Badge tone="success" variant="outline">{t('card.verified')}</Badge>
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
