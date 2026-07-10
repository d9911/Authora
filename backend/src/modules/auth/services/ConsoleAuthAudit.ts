import {
  AuthAuditEvent,
  AuthAuditGateway,
} from '../domain/AuthAuditGateway';

const SAFE_DETAIL_KEYS = new Set(['channel', 'outcome', 'reason', 'provider', 'userId']);

export class ConsoleAuthAudit implements AuthAuditGateway {
  record(
    event: AuthAuditEvent,
    details: Record<string, string | number | boolean | undefined> = {},
  ): void {
    const safeDetails = Object.fromEntries(
      Object.entries(details).filter(
        ([key, value]) => SAFE_DETAIL_KEYS.has(key) && value !== undefined,
      ),
    );
    console.info(
      '[auth-audit]',
      JSON.stringify({ event, at: new Date().toISOString(), ...safeDetails }),
    );
  }
}
