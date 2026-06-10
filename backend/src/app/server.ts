import { env } from '../config/env';
import { createApp } from './express';
import { connectMongo, disconnectMongo } from '../infrastructure/database/mongo/connection';

async function bootstrap(): Promise<void> {
  // Connect the selected database.
  if (env.dbType === 'mongo') {
    await connectMongo();
  } else {
    throw new Error(`DB_TYPE="${env.dbType}" not supported in MVP. Use DB_TYPE=mongo.`);
  }

  const app = createApp();
  const server = app.listen(env.backendPort, () => {
    // eslint-disable-next-line no-console
    console.log(`[backend] listening on http://localhost:${env.backendPort}`);
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
