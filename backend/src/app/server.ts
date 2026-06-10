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
  const server = app.listen(env.backendPort, () => {
    // eslint-disable-next-line no-console
    console.log(`[backend] listening on http://localhost:${env.backendPort}`);
    // eslint-disable-next-line no-console
    console.log(`[backend] GraphQL:   http://localhost:${env.backendPort}/graphql`);
    // eslint-disable-next-line no-console
    console.log(`[backend] Playground http://localhost:${env.backendPort}/playground`);
    // eslint-disable-next-line no-console
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

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[backend] failed to start:', err);
  process.exit(1);
});
