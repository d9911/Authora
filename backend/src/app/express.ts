import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { GraphQLError } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createHandler } from 'graphql-http/lib/use/express';

import { env } from '../config/env';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { buildContext } from './graphql/context';
import { AppError, ErrorCodes } from '../core/errors/AppError';

/**
 * Lazily load the optional Ruru playground. It is a dev convenience and must
 * NEVER be able to crash the server at startup, so it is required on demand
 * inside a try/catch rather than at module-load time.
 */
function renderPlayground(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ruruHTML } = require('ruru/server') as {
      ruruHTML: (cfg: { endpoint: string }) => string;
    };
    return ruruHTML({ endpoint: '/graphql' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[backend] playground unavailable:', err instanceof Error ? err.message : err);
    return null;
  }
}

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.app.corsOrigins.length ? env.app.corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', db: env.dbType, time: new Date().toISOString() });
  });

  // Friendly root: this is an API server; the UI lives on the frontend.
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'authora-backend',
      status: 'ok',
      endpoints: {
        graphql: 'POST /graphql',
        playground: 'GET /playground',
        health: 'GET /health',
      },
    });
  });

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // A browser GET to /graphql (no query) is not an error — send it to the IDE.
  app.get('/graphql', (req: Request, res: Response, next: NextFunction) => {
    if (req.query.query) return next(); // real GraphQL GET request
    res.redirect('/playground');
  });

  // GraphQL endpoint
  app.all(
    '/graphql',
    createHandler({
      schema,
      context: (req) => buildContext(req.raw) as unknown as Record<PropertyKey, unknown>,
      formatError: (err): GraphQLError => {
        const gqlErr = err as GraphQLError;
        const original = gqlErr.originalError;
        if (original instanceof AppError) {
          return new GraphQLError(original.message, {
            extensions: {
              code: original.code,
              statusCode: original.statusCode,
              details: original.details,
            },
          });
        }
        // Hide internals in production
        return new GraphQLError(env.isProd ? 'Internal server error' : gqlErr.message, {
          extensions: { code: ErrorCodes.INTERNAL, statusCode: 500 },
        });
      },
    }),
  );

  // GraphiQL-like IDE (Ruru) for manual exploration in dev (optional).
  app.get('/playground', (_req: Request, res: Response) => {
    const html = renderPlayground();
    if (!html) {
      res.status(503).json({ message: 'Playground unavailable', code: 'PLAYGROUND_UNAVAILABLE' });
      return;
    }
    res.type('html').end(html);
  });

  // Fallback 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: 'Not found', code: ErrorCodes.NOT_FOUND });
  });

  // Express-level error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message, code: err.code });
      return;
    }
    // eslint-disable-next-line no-console
    console.error('[unhandled]', err);
    res.status(500).json({ message: 'Internal server error', code: ErrorCodes.INTERNAL });
  });

  return app;
}
