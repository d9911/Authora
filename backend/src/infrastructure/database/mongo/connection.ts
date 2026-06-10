import mongoose from 'mongoose';
import { env } from '../../../config/env';

let connected = false;

export async function connectMongo(): Promise<void> {
  if (connected) return;
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongo.uri);
  connected = true;
  // eslint-disable-next-line no-console
  console.log(`[mongo] connected: ${env.mongo.uri}`);
}

export async function disconnectMongo(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}
