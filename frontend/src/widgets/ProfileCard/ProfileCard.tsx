import { Profile, User } from '@/shared/types';

export function ProfileCard({ user, profile }: { user: User; profile: Profile | null }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--color-surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 700,
            overflow: 'hidden',
          }}
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (user.name || user.email).charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h3 style={{ margin: 0 }}>{user.name || user.email}</h3>
          <span className="muted">
            {user.email} {user.emailVerified ? '✓ verified' : '· unverified'}
          </span>
        </div>
      </div>
      {profile?.bio && <p style={{ marginTop: 16 }}>{profile.bio}</p>}
    </div>
  );
}
