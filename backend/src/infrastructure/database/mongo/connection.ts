import mongoose from 'mongoose';
import { env } from '../../../config/env';

let connected = false;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Connect to MongoDB with bounded retries. In Docker the mongo container may
 * accept connections a few seconds after the backend starts, so we retry
 * instead of crashing on the first ECONNREFUSED.
 */
export async function connectMongo(retries = 10, delayMs = 3000): Promise<void> {
  if (connected) return;
  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.mongo.uri, { serverSelectionTimeoutMS: 5000 });
      connected = true;
      // eslint-disable-next-line no-console
      console.log(`[mongo] connected: ${env.mongo.uri}`);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.warn(`[mongo] connect attempt ${attempt}/${retries} failed: ${msg}`);
      if (attempt === retries) throw err;
      await sleep(delayMs);
    }
  }
}

export async function disconnectMongo(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}
