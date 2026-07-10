export type AuthAuditEvent =
  | 'recovery_requested'
  | 'recovery_delivery_failed'
  | 'recovery_token_exchanged'
  | 'password_reset_completed'
  | 'telegram_recovery_started'
  | 'telegram_recovery_resolved'
  | 'email_change_requested'
  | 'email_change_confirmed'
  | 'two_factor_recovery_code_used';

export interface AuthAuditGateway {
  record(
    event: AuthAuditEvent,
    details?: Record<string, string | number | boolean | undefined>,
  ): void;
}
