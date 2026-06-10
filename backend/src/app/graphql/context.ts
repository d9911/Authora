import { IncomingMessage } from 'http';
import { getContainer, Container } from '../container';
import { verifyAccessToken } from '../../infrastructure/jwt/jwt';

export interface GraphQLContext {
  container: Container;
  userId: string | null;
  rawRequest: IncomingMessage;
}

/**
 * Builds the per-request context. Authentication is optional here:
 * resolvers that require auth call requireAuth(ctx). The bearer token,
 * if present and valid, populates ctx.userId.
 */
export function buildContext(req: IncomingMessage): GraphQLContext {
  const container = getContainer();
  let userId: string | null = null;

  const header = req.headers['authorization'] || req.headers['Authorization' as never];
  const auth = Array.isArray(header) ? header[0] : header;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim();
    try {
      const payload = verifyAccessToken(token);
      userId = payload.sub;
    } catch {
      userId = null; // invalid token => treated as anonymous
    }
  }

  return { container, userId, rawRequest: req };
}
