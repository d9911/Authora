import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { getContainer } from './container';
import { AuthPayload } from '../modules/auth/use-cases/AuthUseCases';
import { TelegramLoginData } from '../modules/auth/oauth/TelegramAuthService';

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: env.isProd,
};

/** Read a single cookie value from the raw Cookie header (no cookie-parser dep). */
function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

/** Set the JWT pair as httpOnly cookies, then redirect to the frontend. */
function completeAndRedirect(res: Response, payload: AuthPayload, redirectTo: string): void {
  res.cookie('access_token', payload.accessToken, { ...COOKIE_BASE, maxAge: 60 * 60 * 1000 });
  res.cookie('refresh_token', payload.refreshToken, {
    ...COOKIE_BASE,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  res.redirect(redirectTo);
}

export function createOAuthRouter(): Router {
  const router = Router();
  const base = env.app.frontendUrl.replace(/\/$/, '');

  /* ------------------------------ GitHub ------------------------------ */
  router.get('/api/auth/github', (_req: Request, res: Response) => {
    const { github } = getContainer();
    if (!github.isConfigured()) {
      res.redirect(`${base}/sign-in?error=github_not_configured`);
      return;
    }
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie('gh_state', state, { ...COOKIE_BASE, maxAge: 10 * 60 * 1000 });
    res.redirect(github.buildAuthorizeUrl(state));
  });

  router.get('/api/auth/github/callback', async (req: Request, res: Response) => {
    const { github, auth } = getContainer();
    try {
      const code = String(req.query.code ?? '');
      const state = String(req.query.state ?? '');
      const expected = readCookie(req, 'gh_state');
      if (!code || !state || !expected || state !== expected) {
        res.redirect(`${base}/sign-in?error=github_state`);
        return;
      }
      res.clearCookie('gh_state', COOKIE_BASE);
      const profile = await github.exchangeCode(code);
      const payload = await auth.loginWithGithub(profile);
      completeAndRedirect(res, payload, `${base}/profile/edit`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[github oauth] failed:', err instanceof Error ? err.message : err);
      res.redirect(`${base}/sign-in?error=github_failed`);
    }
  });

  /* ----------------------------- Telegram ----------------------------- */
  // The Telegram Login Widget redirects here with signed query params.
  router.get('/api/auth/telegram/callback', async (req: Request, res: Response) => {
    const { telegram, auth } = getContainer();
    try {
      if (!telegram.isConfigured()) {
        res.redirect(`${base}/sign-in?error=telegram_not_configured`);
        return;
      }
      const data = req.query as unknown as TelegramLoginData;
      if (!telegram.verify(data)) {
        res.redirect(`${base}/sign-in?error=telegram_signature`);
        return;
      }
      const payload = await auth.loginWithTelegram({
        telegramId: String(data.id),
        name: [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined,
        username: data.username,
        avatarUrl: data.photo_url,
      });
      completeAndRedirect(res, payload, `${base}/profile/edit`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[telegram auth] failed:', err instanceof Error ? err.message : err);
      res.redirect(`${base}/sign-in?error=telegram_failed`);
    }
  });

  return router;
}
