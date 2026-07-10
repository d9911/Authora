export interface MailGateway {
  sendEmailVerificationCode(to: string, code: string): Promise<void>;
  sendPasswordReset(to: string, token: string, nextPath?: string): Promise<void>;
  sendPasswordChanged(to: string): Promise<void>;
}
