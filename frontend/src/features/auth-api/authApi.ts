import { gqlRequest } from '@/shared/api/graphqlClient';
import { AuthPayload, TwoFactorSetupPayload } from '@/shared/types';

// We request accessToken/refreshToken so the backend returns them to the
// SERVER-SIDE proxy, which stores them as httpOnly cookies and STRIPS them
// from the body. The browser therefore only ever sees `user` and the 2FA
// signal — never the raw tokens.
const AUTH_FIELDS = `accessToken refreshToken needTwoFactor twoFactorToken user { id name email emailVerified twoFactorEnabled }`;

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

export async function requestPasswordReset(email: string): Promise<boolean> {
  const data = await gqlRequest<{ requestPasswordReset: boolean }>(
    `mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
      requestPasswordReset(input: $input)
    }`,
    { input: { email } },
    { retry: false },
  );
  return data.requestPasswordReset;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const data = await gqlRequest<{ resetPassword: boolean }>(
    `mutation ResetPassword($input: ResetPasswordInput!) { resetPassword(input: $input) }`,
    { input: { token, newPassword } },
    { retry: false },
  );
  return data.resetPassword;
}

export async function confirmEmail(token: string): Promise<boolean> {
  const data = await gqlRequest<{ confirmEmail: boolean }>(
    `mutation ConfirmEmail($token: String!) { confirmEmail(token: $token) }`,
    { token },
    { retry: false },
  );
  return data.confirmEmail;
}

export async function enableTwoFactor(): Promise<TwoFactorSetupPayload> {
  const data = await gqlRequest<{ enableTwoFactor: TwoFactorSetupPayload }>(
    `mutation EnableTwoFactor { enableTwoFactor { qrDataUrl otpauthUrl } }`,
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
