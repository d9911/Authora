import { Profile, User } from '@/shared/types';
import styles from './ProfileCard.module.scss';

export function ProfileCard({ user, profile }: { user: User; profile: Profile | null }) {
  return (
    <div className={styles['profile-card']}>
      <div className={styles['profile-header']}>
        <div className={styles['profile-avatar']}>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="avatar" />
          ) : (
            (user.name || user.email).charAt(0).toUpperCase()
          )}
        </div>
        <div className={styles['profile-info']}>
          <h4>{user.name || user.email}</h4>
          <div className={styles['profile-email']}>
            <span>{user.email}</span>
            {user.emailVerified ? (
              <span className="tag tag-verified">✓ verified</span>
            ) : (
              <span>· unverified</span>
            )}
          </div>
        </div>
      </div>
      {profile?.bio && <p className={styles['profile-bio']}>{profile.bio}</p>}
    </div>
  );
}
