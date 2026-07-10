import { gqlRequest } from '@/shared/api/graphqlClient';
import { AuthPayload, TwoFactorSetupPayload, User } from '@/shared/types';

// We request accessToken/refreshToken so the backend returns them to the
// SERVER-SIDE proxy, which stores them as httpOnly cookies and STRIPS them
// from the body. The browser therefore only ever sees `user` and the 2FA
// signal — never the raw tokens.
const AUTH_FIELDS = `accessToken refreshToken needTwoFactor twoFactorToken user {
  id name email nickname phoneNumber telegramId avatarUrl
  emailVerified twoFactorEnabled githubId hasPassword recoveryMethods createdAt updatedAt
}`;

export async function signUp(input: {
  email: string;
  password: string;
  name?: string;
  nickname?: string;
}): Promise<AuthPayload> {
  const data = await gqlRequest<{ signUp: AuthPayload }>(
    `mutation SignUp($input: SignUpInput!) { signUp(input: $input) { ${AUTH_FIELDS} } }`,
    { input },
    { retry: false },
  );
  return data.signUp;
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<AuthPayload> {
  const data = await gqlRequest<{ signIn: AuthPayload }>(
    `mutation SignIn($input: SignInInput!) { signIn(input: $input) { ${AUTH_FIELDS} } }`,
    { input },
    { retry: false },
  );
  return data.signIn;
}

export async function signInTwoFactor(input: {
  twoFactorToken: string;
  code: string;
}): Promise<AuthPayload> {
  const data = await gqlRequest<{ signInTwoFactor: AuthPayload }>(
    `mutation SignInTwoFactor($input: SignInTwoFactorInput!) {
      signInTwoFactor(input: $input) { ${AUTH_FIELDS} }
    }`,
    { input },
    { retry: false },
  );
  return data.signInTwoFactor;
}

export async function logout(): Promise<boolean> {
  const data = await gqlRequest<{ logout: boolean }>(
    `mutation Logout { logout }`,
    {},
    { retry: false },
  );
  return data.logout;
}

export {
  requestPasswordReset,
  resetPassword,
} from '@/features/password-reset/api/passwordResetApi';

export async function confirmEmailCode(email: string, code: string): Promise<boolean> {
  const data = await gqlRequest<{ confirmEmailCode: boolean }>(
    `mutation ConfirmEmailCode($email: String!, $code: String!) {
      confirmEmailCode(email: $email, code: $code)
    }`,
    { email, code },
    { retry: false },
  );
  return data.confirmEmailCode;
}

export async function resendEmailCode(email: string): Promise<boolean> {
  const data = await gqlRequest<{ resendEmailCode: boolean }>(
    `mutation ResendEmailCode($email: String!) { resendEmailCode(email: $email) }`,
    { email },
    { retry: false },
  );
  return data.resendEmailCode;
}

export async function enableTwoFactor(): Promise<TwoFactorSetupPayload> {
  const data = await gqlRequest<{ enableTwoFactor: TwoFactorSetupPayload }>(
    `mutation EnableTwoFactor {
      enableTwoFactor { qrDataUrl otpauthUrl recoveryCodes }
    }`,
  );
  return data.enableTwoFactor;
}

export async function confirmTwoFactor(code: string): Promise<boolean> {
  const data = await gqlRequest<{ confirmTwoFactor: boolean }>(
    `mutation ConfirmTwoFactor($code: String!) { confirmTwoFactor(code: $code) }`,
    { code },
  );
  return data.confirmTwoFactor;
}

export async function disableTwoFactor(code: string): Promise<boolean> {
  const data = await gqlRequest<{ disableTwoFactor: boolean }>(
    `mutation DisableTwoFactor($code: String!) { disableTwoFactor(code: $code) }`,
    { code },
  );
  return data.disableTwoFactor;
}

/* ------------------------------ OAuth ------------------------------ */

/** Exchange the backend OAuth handoff token for a real (frontend-origin) session. */
export async function oauthExchange(handoff: string): Promise<AuthPayload> {
  const data = await gqlRequest<{ oauthExchange: AuthPayload }>(
    `mutation OauthExchange($handoff: String!) {
      oauthExchange(handoff: $handoff) {
        accessToken
        refreshToken
        needTwoFactor
        user { id name email emailVerified twoFactorEnabled githubId telegramId hasPassword recoveryMethods }
      }
    }`,
    { handoff },
    { retry: false },
  );
  return data.oauthExchange;
}

/** Authenticated user: get a short-lived token to start a provider LINK flow. */
export async function getOAuthLinkToken(): Promise<string> {
  const data = await gqlRequest<{ oauthLinkToken: string }>(
    `mutation OauthLinkToken { oauthLinkToken }`,
  );
  return data.oauthLinkToken;
}

/** Unlink a connected provider from the current account. */
export async function unlinkProvider(provider: 'github' | 'telegram'): Promise<User> {
  const data = await gqlRequest<{ unlinkProvider: User }>(
    `mutation UnlinkProvider($provider: String!) {
      unlinkProvider(provider: $provider) {
        id name email githubId telegramId
      }
    }`,
    { provider },
  );
  return data.unlinkProvider;
}

/* --------------------------- Telegram bot flow --------------------------- */

export interface TelegramBotStart {
  token: string;
  botUrl: string;
}

/** Start a Telegram bot login (link=true links to the current authed user). */
export async function telegramBotStart(link = false): Promise<TelegramBotStart> {
  const data = await gqlRequest<{ telegramBotStart: TelegramBotStart }>(
    `mutation TelegramBotStart($link: Boolean) {
      telegramBotStart(link: $link) { token botUrl }
    }`,
    { link },
    { retry: false },
  );
  return data.telegramBotStart;
}

export interface TelegramBotPoll {
  status: 'pending' | 'done' | 'linked' | 'expired';
  auth: AuthPayload | null;
}

/** Poll the Telegram bot login ticket. */
export async function telegramBotPoll(token: string): Promise<TelegramBotPoll> {
  const data = await gqlRequest<{ telegramBotPoll: TelegramBotPoll }>(
    `mutation TelegramBotPoll($token: String!) {
      telegramBotPoll(token: $token) {
        status
        auth {
          accessToken
          refreshToken
          needTwoFactor
          user { id name email emailVerified twoFactorEnabled githubId telegramId hasPassword recoveryMethods }
        }
      }
    }`,
    { token },
    { retry: false },
  );
  return data.telegramBotPoll;
}
