import { createHash } from 'node:crypto';

const COORDINATION_TTL_MS = 60_000;
const inFlightRefreshes = new Map<string, Promise<unknown>>();
const recentRefreshTokens = new Map<string, string>();
const blockedRefreshes = new Set<string>();

function expireEntry(collection: { delete(key: string): unknown }, key: string): void {
  const timer = setTimeout(() => collection.delete(key), COORDINATION_TTL_MS);
  timer.unref?.();
}

export function refreshTokenKey(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

export function runRefreshSingleFlight<T>(
  key: string,
  refresh: () => Promise<T>,
): Promise<T | null> {
  if (blockedRefreshes.has(key)) return Promise.resolve(null);

  let pending = inFlightRefreshes.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = refresh()
      .then((result) => {
        if (result && typeof result === 'object') {
          const refreshToken = (result as { refreshToken?: unknown }).refreshToken;
          if (typeof refreshToken === 'string') {
            recentRefreshTokens.set(key, refreshToken);
            expireEntry(recentRefreshTokens, key);
          }
        }
        return result;
      })
      .finally(() => {
        if (inFlightRefreshes.get(key) === pending) {
          inFlightRefreshes.delete(key);
        }
      });
    inFlightRefreshes.set(key, pending);
  }

  return pending.then((result) => (blockedRefreshes.has(key) ? null : result));
}

export async function blockRefreshForLogout(key: string): Promise<string | null> {
  blockedRefreshes.add(key);
  expireEntry(blockedRefreshes, key);

  try {
    if (!inFlightRefreshes.has(key)) return recentRefreshTokens.get(key) ?? null;

    const result = await inFlightRefreshes.get(key);
    if (!result || typeof result !== 'object') return null;
    const refreshToken = (result as { refreshToken?: unknown }).refreshToken;
    return typeof refreshToken === 'string' ? refreshToken : null;
  } catch {
    return null;
  }
}
