import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { getContainer } from './container';
import { verifyOAuthToken } from '../infrastructure/jwt/jwt';
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

/**
 * GitHub `state` carries CSRF protection AND (optionally) a link token so the
 * callback can attach the provider to an already-authenticated user. We encode
 * it as "<csrf>.<linkToken?>".
 */
function packState(csrf: string, linkToken?: string): string {
  return linkToken ? `${csrf}.${linkToken}` : csrf;
}
function unpackState(state: string): { csrf: string; linkToken?: string } {
  const idx = state.indexOf('.');
  if (idx === -1) return { csrf: state };
  return { csrf: state.slice(0, idx), linkToken: state.slice(idx + 1) };
}

export function createOAuthRouter(): Router {
  const router = Router();
  const base = env.app.frontendUrl.replace(/\/$/, '');

  // Resolve the authenticated user id from a link token (?link=<oauth_link JWT>).
  const resolveLinkUser = (linkToken?: string): string | null => {
    if (!linkToken) return null;
    try {
      return verifyOAuthToken(linkToken, 'oauth_link').sub;
    } catch {
      return null;
    }
  };

  /* ------------------------------ GitHub ------------------------------ */
  router.get('/api/auth/github', (req: Request, res: Response) => {
    const { github } = getContainer();
    if (!github.isConfigured()) {
      res.redirect(`${base}/sign-in?error=github_not_configured`);
      return;
    }
    const csrf = crypto.randomBytes(16).toString('hex');
    const linkToken = typeof req.query.link === 'string' ? req.query.link : undefined;
    res.cookie('gh_state', csrf, { ...COOKIE_BASE, maxAge: 10 * 60 * 1000 });
    res.redirect(github.buildAuthorizeUrl(packState(csrf, linkToken)));
  });

  router.get('/api/auth/github/callback', async (req: Request, res: Response) => {
    const { github, auth } = getContainer();
    try {
      const code = String(req.query.code ?? '');
      const { csrf, linkToken } = unpackState(String(req.query.state ?? ''));
      const expected = readCookie(req, 'gh_state');
      if (!code || !csrf || !expected || csrf !== expected) {
        res.redirect(`${base}/sign-in?error=github_state`);
        return;
      }
      res.clearCookie('gh_state', COOKIE_BASE);

      const profile = await github.exchangeCode(code);
      const linkUserId = resolveLinkUser(linkToken);

      if (linkUserId) {
        // Authenticated user linking GitHub to their existing account.
        await auth.linkGithub(linkUserId, profile);
        res.redirect(`${base}/profile/edit?linked=github`);
        return;
      }

      // Login / signup flow → hand off to the frontend to set same-origin cookies.
      const payload = await auth.loginWithGithub(profile);
      const handoff = await auth.issueOAuthHandoff(payload.user.id);
      res.redirect(`${base}/oauth/complete?handoff=${encodeURIComponent(handoff)}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[github oauth] failed:', err instanceof Error ? err.message : err);
      res.redirect(`${base}/sign-in?error=github_failed`);
    }
  });

  /* ----------------------------- Telegram ----------------------------- */
  // The Telegram Login Widget redirects here with signed query params. A link
  // token may be carried via the widget's data-auth-url (?link=...).
  router.get('/api/auth/telegram/callback', async (req: Request, res: Response) => {
    const { telegram, auth } = getContainer();
    try {
      if (!telegram.isConfigured()) {
        res.redirect(`${base}/sign-in?error=telegram_not_configured`);
        return;
      }
      const linkToken = typeof req.query.link === 'string' ? req.query.link : undefined;
      // Telegram signs only its own fields; exclude our extra `link` param.
      const { link: _ignored, ...rest } = req.query as Record<string, string>;
      void _ignored;
      const data = rest as unknown as TelegramLoginData;
      if (!telegram.verify(data)) {
        res.redirect(`${base}/sign-in?error=telegram_signature`);
        return;
      }

      const profile = {
        telegramId: String(data.id),
        name: [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined,
        username: data.username,
        avatarUrl: data.photo_url,
      };
      const linkUserId = resolveLinkUser(linkToken);

      if (linkUserId) {
        await auth.linkTelegram(linkUserId, profile);
        res.redirect(`${base}/profile/edit?linked=telegram`);
        return;
      }

      const payload = await auth.loginWithTelegram(profile);
      const handoff = await auth.issueOAuthHandoff(payload.user.id);
      res.redirect(`${base}/oauth/complete?handoff=${encodeURIComponent(handoff)}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[telegram auth] failed:', err instanceof Error ? err.message : err);
      res.redirect(`${base}/sign-in?error=telegram_failed`);
    }
  });

  return router;
}
