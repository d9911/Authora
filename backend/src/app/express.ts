import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { GraphQLError } from 'graphql'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { createHandler } from 'graphql-http/lib/use/express'

import { env } from '../config/env'
import { typeDefs } from './graphql/schema'
import { resolvers } from './graphql/resolvers'
import { buildContext } from './graphql/context'
import { AppError, ErrorCodes } from '../core/errors/AppError'
import { createOAuthRouter } from './oauthRoutes'
import { createProfileImageRouter } from './profileImageRoutes'
import { authRateLimit, rateLimit, securityHeaders } from '../shared/middlewares/security'

/**
 * Lazily load the optional Ruru playground. It is a dev convenience and must
 * NEVER be able to crash the server at startup, so it is required on demand
 * inside a try/catch rather than at module-load time.
 */
function renderPlayground(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ruruHTML } = require('ruru/server') as {
      ruruHTML: (cfg: { endpoint: string }) => string
    }
    return ruruHTML({ endpoint: '/graphql' })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[backend] playground unavailable:', err instanceof Error ? err.message : err)
    return null
  }
}

export function createApp(): Express {
  const app = express()

  // Trust the first proxy hop so rate-limiting sees the real client IP.
  app.set('trust proxy', 1)

  app.use(securityHeaders())
  app.use(
    cors({
      origin: env.app.corsOrigins.length ? env.app.corsOrigins : true,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '16mb' }))
  // General + auth-specific rate limiting (auth limiter reads the parsed body).
  app.use(rateLimit())
  app.use(authRateLimit())

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', db: env.dbType, time: new Date().toISOString() })
  })

  // OAuth redirect routes (GitHub / Telegram) — REST, not GraphQL.
  app.use(createOAuthRouter())

  // Public read route for processed profile images. Upload/delete stay behind GraphQL auth.
  app.use(createProfileImageRouter())

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
    })
  })

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  // A browser GET to /graphql (no query) is not an error — send it to the IDE.
  app.get('/graphql', (req: Request, res: Response, next: NextFunction) => {
    if (req.query.query) return next() // real GraphQL GET request
    res.redirect('/playground')
  })

  // GraphQL endpoint
  app.all(
    '/graphql',
    createHandler({
      schema,
      context: (req) => buildContext(req.raw) as unknown as Record<PropertyKey, unknown>,
      formatError: (err): GraphQLError => {
        const gqlErr = err as GraphQLError
        const original = gqlErr.originalError
        if (original instanceof AppError) {
          return new GraphQLError(original.message, {
            extensions: {
              code: original.code,
              statusCode: original.statusCode,
              details: original.details,
            },
          })
        }
        // Hide internals in production
        return new GraphQLError(env.isProd ? 'Internal server error' : gqlErr.message, {
          extensions: { code: ErrorCodes.INTERNAL, statusCode: 500 },
        })
      },
    }),
  )

  // GraphiQL-like IDE (Ruru) for manual exploration in dev (optional).
  app.get('/playground', (_req: Request, res: Response) => {
    const html = renderPlayground()
    if (!html) {
      res.status(503).json({ message: 'Playground unavailable', code: 'PLAYGROUND_UNAVAILABLE' })
      return
    }
    res.type('html').end(html)
  })

  // Fallback 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: 'Not found', code: ErrorCodes.NOT_FOUND })
  })

  // Express-level error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message, code: err.code })
      return
    }
    // body-parser errors (e.g. oversized payload / malformed JSON) carry a status.
    const e = err as { type?: string; status?: number; statusCode?: number }
    if (e?.type === 'entity.too.large') {
      res.status(413).json({ message: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' })
      return
    }
    if (e?.status === 400 || e?.type === 'entity.parse.failed') {
      res.status(400).json({ message: 'Invalid request body', code: ErrorCodes.VALIDATION })
      return
    }
    // eslint-disable-next-line no-console
    console.error('[unhandled]', err)
    res.status(500).json({ message: 'Internal server error', code: ErrorCodes.INTERNAL })
  })

  return app
}
