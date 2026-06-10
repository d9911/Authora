import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export type DbType = 'mongo' | 'postgres' | 'sqlite';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',

  backendPort: Number(process.env.BACKEND_PORT ?? 3010),

  // Which database implementation to use. MVP supports "mongo".
  dbType: (process.env.DB_TYPE ?? 'sqlite') as DbType,

  mongo: {
    uri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/app_db',
  },

  sqlite: {
    // File path for the SQLite database (use ":memory:" for ephemeral/testing).
    file: process.env.SQLITE_FILE ?? './data/app.sqlite',
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '30d',
  },

  mail: {
    ownerEmail: process.env.OWNER_EMAIL ?? 'test@d9911.org',
    smtpHost: process.env.SMTP_HOST ?? 'smtp.mail.ru',
    smtpPort: Number(process.env.SMTP_PORT ?? 465),
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPass: process.env.SMTP_PASS ?? '',
    // When SMTP creds are not configured, emails are logged to console instead.
    enabled: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
  },

  app: {
    // Base URL of the frontend, used to build confirmation/reset links.
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5178',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5178')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },

  github: {
    clientId: process.env.GITHUB_CLIENT_ID ?? '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    callbackUrl: process.env.GITHUB_CALLBACK_URL ?? '',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  },
};
