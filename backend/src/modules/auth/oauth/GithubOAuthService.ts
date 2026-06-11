import { env } from '../../../config/env';

export interface GithubProfile {
  githubId: string;
  email: string | null;
  name?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
}

/**
 * Minimal GitHub OAuth web-flow client (no external SDK).
 *   1. buildAuthorizeUrl() -> redirect the user to GitHub
 *   2. GitHub redirects back with ?code=...
 *   3. exchangeCode() -> access_token -> user profile (+ primary email)
 */
export class GithubOAuthService {
  isConfigured(): boolean {
    return Boolean(env.github.clientId && env.github.clientSecret);
  }

  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.github.clientId,
      redirect_uri: env.github.callbackUrl,
      scope: 'read:user user:email',
      state,
      allow_signup: 'true',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GithubProfile> {
    // 1) code -> access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        client_id: env.github.clientId,
        client_secret: env.github.clientSecret,
        code,
        redirect_uri: env.github.callbackUrl,
      }),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenJson.access_token) {
      throw new Error(`GitHub token exchange failed: ${tokenJson.error ?? 'no access_token'}`);
    }
    const auth = { authorization: `Bearer ${tokenJson.access_token}`, 'user-agent': 'authora' };

    // 2) profile
    const userRes = await fetch('https://api.github.com/user', { headers: auth });
    const ghUser = (await userRes.json()) as {
      id: number;
      name?: string;
      login?: string;
      email?: string | null;
      avatar_url?: string;
    };

    // 3) primary verified email (the profile email is often null)
    let email = ghUser.email ?? null;
    let emailVerified = false;
    try {
      const emailRes = await fetch('https://api.github.com/user/emails', { headers: auth });
      const emails = (await emailRes.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primary = Array.isArray(emails)
        ? emails.find((e) => e.primary) ?? emails[0]
        : undefined;
      if (primary) {
        email = primary.email;
        emailVerified = primary.verified;
      }
    } catch {
      /* emails endpoint optional */
    }

    return {
      githubId: String(ghUser.id),
      email,
      name: ghUser.name ?? ghUser.login,
      avatarUrl: ghUser.avatar_url,
      emailVerified,
    };
  }
}
