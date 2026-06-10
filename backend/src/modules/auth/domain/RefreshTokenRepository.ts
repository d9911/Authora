export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string; // sha256 hash of the raw refresh token
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

/**
 * Refresh tokens are stored hashed so a DB leak does not expose live tokens.
 * Rotation: on refresh we revoke the old record and create a new one.
 * On logout / password change we revoke all of the user's tokens.
 */
export interface RefreshTokenRepository {
  save(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshTokenRecord>;
  findValidByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeByHash(tokenHash: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
