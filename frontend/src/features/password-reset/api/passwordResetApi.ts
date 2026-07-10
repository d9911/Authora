import { gqlRequest } from '@/shared/api/graphqlClient';

export type RecoveryChannel = 'email' | 'telegram';

export interface RecoveryGrantPayload {
  recoveryToken?: string;
  channel: RecoveryChannel;
  expiresAt: string;
}

export async function requestPasswordReset(email: string, next?: string): Promise<boolean> {
  const data = await gqlRequest<{ requestPasswordReset: boolean }>(
    `mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
      requestPasswordReset(input: $input)
    }`,
    { input: { email, next } },
    { retry: false },
  );
  return data.requestPasswordReset;
}

export async function exchangePasswordResetToken(
  token: string,
): Promise<RecoveryGrantPayload> {
  const data = await gqlRequest<{ exchangePasswordResetToken: RecoveryGrantPayload }>(
    `mutation ExchangePasswordResetToken($token: String!) {
      exchangePasswordResetToken(token: $token) {
        recoveryToken
        channel
        expiresAt
      }
    }`,
    { token },
    { retry: false },
  );
  return data.exchangePasswordResetToken;
}

export async function completePasswordReset(newPassword: string): Promise<boolean> {
  const data = await gqlRequest<{ completePasswordReset: boolean }>(
    `mutation CompletePasswordReset($input: CompletePasswordResetInput!) {
      completePasswordReset(input: $input)
    }`,
    { input: { recoveryToken: '', newPassword } },
    { retry: false },
  );
  return data.completePasswordReset;
}

export interface TelegramRecoveryStart {
  token: string;
  botUrl: string;
  confirmationCode: string;
}

export async function telegramRecoveryStart(): Promise<TelegramRecoveryStart> {
  const data = await gqlRequest<{ telegramRecoveryStart: TelegramRecoveryStart }>(
    `mutation TelegramRecoveryStart {
      telegramRecoveryStart { token botUrl confirmationCode }
    }`,
    {},
    { retry: false },
  );
  return data.telegramRecoveryStart;
}

export type TelegramRecoveryStatus =
  | 'pending'
  | 'verified'
  | 'cancelled'
  | 'expired'
  | 'not_linked';

export interface TelegramRecoveryPoll {
  status: TelegramRecoveryStatus;
  recovery: RecoveryGrantPayload | null;
}

export async function telegramRecoveryPoll(token: string): Promise<TelegramRecoveryPoll> {
  const data = await gqlRequest<{ telegramRecoveryPoll: TelegramRecoveryPoll }>(
    `mutation TelegramRecoveryPoll($token: String!) {
      telegramRecoveryPoll(token: $token) {
        status
        recovery { recoveryToken channel expiresAt }
      }
    }`,
    { token },
    { retry: false },
  );
  return data.telegramRecoveryPoll;
}
