import { env } from '../config/env';
import { createApp } from './express';
import { connectMongo, disconnectMongo } from '../infrastructure/database/mongo/connection';
import { connectSqlite, disconnectSqlite } from '../infrastructure/database/sqlite/connection';

async function bootstrap(): Promise<void> {
  // Connect the selected database (chosen via DB_TYPE).
  if (env.dbType === 'mongo') {
    await connectMongo();
  } else if (env.dbType === 'sqlite') {
    await connectSqlite();
  } else {
    throw new Error(
      `DB_TYPE="${env.dbType}" not supported. Use DB_TYPE=mongo or DB_TYPE=sqlite.`,
    );
  }

  const app = createApp();
  // Bind to 0.0.0.0 so the server is reachable from outside the container.
  const server = app.listen(env.backendPort, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`[backend] listening on http://0.0.0.0:${env.backendPort} (db=${env.dbType})`);
    // eslint-disable-next-line no-console
    console.log(`[backend] GraphQL:   http://localhost:${env.backendPort}/graphql`);
    // eslint-disable-next-line no-console
    console.log(`[backend] Playground http://localhost:${env.backendPort}/playground`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n[backend] ${signal} received, shutting down...`);
    server.close();
    await disconnectMongo();
    await disconnectSqlite();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

// Surface unexpected runtime errors instead of silently dying.
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[backend] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[backend] uncaughtException:', err);
});

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[backend] failed to start:', err);
  process.exit(1);
});
