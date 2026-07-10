import { IncomingMessage } from 'http';
import { getContainer, Container } from '../container';
import { verifyAccessToken } from '../../infrastructure/jwt/jwt';

export interface GraphQLContext {
  container: Container;
  userId: string | null;
  /** True when a Bearer token was sent but failed verification (expired/invalid). */
  tokenInvalid: boolean;
  rawRequest: IncomingMessage;
}

/**
 * Builds the per-request context. Authentication is optional here:
 * resolvers that require auth call requireAuth(ctx). The bearer token,
 * if present and valid, populates ctx.userId.
 *
 * We track `tokenInvalid` separately so the API can return a TOKEN_EXPIRED
 * signal (instead of silently treating the caller as anonymous), which lets
 * the frontend transparently refresh and retry.
 */
export async function buildContext(req: IncomingMessage): Promise<GraphQLContext> {
  const container = getContainer();
  let userId: string | null = null;
  let tokenInvalid = false;

  const header = req.headers['authorization'] || req.headers['Authorization' as never];
  const auth = Array.isArray(header) ? header[0] : header;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim();
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        const user = await container.repos.users.findById(payload.sub);
        if (!user || user.authVersion !== payload.authVersion) tokenInvalid = true;
        else userId = payload.sub;
      } catch {
        tokenInvalid = true; // present but expired/invalid → signal refresh
      }
    }
  }

  return { container, userId, tokenInvalid, rawRequest: req };
}
