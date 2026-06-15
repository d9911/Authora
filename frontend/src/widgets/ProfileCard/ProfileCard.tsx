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
            background: 'rgba(91,75,255,0.08)',
            color: 'var(--iris)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 600,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt="avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            (user.name || user.email).charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h4 style={{ margin: 0 }}>{user.name || user.email}</h4>
          <span className="muted" style={{ fontSize: 14 }}>
            {user.email}{' '}
            {user.emailVerified ? (
              <span className="tag tag-verified" style={{ marginLeft: 4 }}>
                ✓ verified
              </span>
            ) : (
              '· unverified'
            )}
          </span>
        </div>
      </div>
      {profile?.bio && <p style={{ marginTop: 16, color: 'var(--mist)' }}>{profile.bio}</p>}
    </div>
  );
}
