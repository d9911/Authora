import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { GraphQLError } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createHandler } from 'graphql-http/lib/use/express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ruruHTML } = require('ruru/server') as { ruruHTML: (cfg: { endpoint: string }) => string };

import swaggerUi from 'swagger-ui-express';

import { env } from '../config/env';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { buildContext } from './graphql/context';
import { AppError, ErrorCodes } from '../core/errors/AppError';
import { buildOpenApiSpec } from '../shared/swagger';

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

  // Swagger / OpenAPI documentation
  const openApiSpec = buildOpenApiSpec();
  app.get('/swagger.json', (_req: Request, res: Response) => {
    res.json(openApiSpec);
  });
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'Fullstack App API Docs',
      swaggerOptions: { persistAuthorization: true },
    }),
  );

  const schema = makeExecutableSchema({ typeDefs, resolvers });

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

  // GraphiQL-like IDE (Ruru) for manual exploration in dev
  app.get('/playground', (_req: Request, res: Response) => {
    res.type('html').end(ruruHTML({ endpoint: '/graphql' }));
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
