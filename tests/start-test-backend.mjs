import { once } from 'node:events';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HOST = '127.0.0.1';
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const backendDist = path.join(projectRoot, 'backend', 'dist');
const port = Number(process.env.BACKEND_PORT);
const dbType = process.env.DB_TYPE;

function fromDist(relativePath) {
  return pathToFileURL(path.join(backendDist, relativePath)).href;
}

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error(`BACKEND_PORT must be an integer from 1 to 65535; received ${process.env.BACKEND_PORT}`);
}
if (dbType !== 'sqlite' && dbType !== 'mongo') {
  throw new Error(`DB_TYPE must be sqlite or mongo; received ${dbType}`);
}

let disconnectDatabase;
let server;
let requestedSignal;

async function closeServer() {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function main() {
  const { validateRecoveryEnvironment } = await import(fromDist('config/env.js'));
  validateRecoveryEnvironment();

  if (dbType === 'sqlite') {
    const connection = await import(fromDist('infrastructure/database/sqlite/connection.js'));
    await connection.connectSqlite();
    disconnectDatabase = connection.disconnectSqlite;
  } else {
    const connection = await import(fromDist('infrastructure/database/mongo/connection.js'));
    await connection.connectMongo();
    disconnectDatabase = connection.disconnectMongo;
  }

  const { createApp } = await import(fromDist('app/express.js'));
  const app = createApp();
  server = app.listen(port, HOST);
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string' || address.address !== HOST) {
    throw new Error(`Test backend did not bind exclusively to ${HOST}`);
  }
  console.log(`[test-backend] listening on http://${HOST}:${port} (db=${dbType})`);

  await new Promise((resolve) => {
    const requestShutdown = (signal) => {
      if (requestedSignal) return;
      requestedSignal = signal;
      resolve();
    };
    process.once('SIGINT', () => requestShutdown('SIGINT'));
    process.once('SIGTERM', () => requestShutdown('SIGTERM'));
  });
}

try {
  await main();
} catch (error) {
  console.error('[test-backend] failed:', error);
  process.exitCode = 1;
} finally {
  await closeServer();
  await disconnectDatabase?.();
}
