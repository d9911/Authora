import { Profile, User } from '@/shared/types'
import styles from './ProfileCard.module.scss'

export function ProfileCard({ user, profile }: { user: User; profile: Profile | null }) {
  const displayName = user.name || user.nickname || user.email || 'Authora user'
  const avatarLabel = displayName.charAt(0).toUpperCase()

  return (
    <div className={styles['profile-card']}>
      {profile?.coverSrc && (
        <div className={styles['profile-cover']}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.coverSrc} alt="Profile cover" />
        </div>
      )}
      <div className={styles['profile-header']}>
        <div className={styles['profile-avatar']}>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="avatar" />
          ) : (
            avatarLabel
          )}
        </div>
        <div className={styles['profile-info']}>
          <h4>{displayName}</h4>
          <div className={styles['profile-email']}>
            <span>{user.email ?? 'No recovery email'}</span>
            {user.email ? (
              user.emailVerified ? <span className="tag tag-verified">✓ verified</span> : <span>· unverified</span>
            ) : null}
          </div>
        </div>
      </div>
      {profile?.bio && <p className={styles['profile-bio']}>{profile.bio}</p>}
    </div>
  )
}
