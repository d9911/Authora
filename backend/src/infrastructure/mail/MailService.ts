import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Mail service with a safe dev fallback: if SMTP credentials are not
 * configured, emails are logged to the console instead of being sent,
 * so the auth flows remain testable locally.
 */
export class MailService {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (!env.mail.enabled) return null;
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.mail.smtpHost,
        port: env.mail.smtpPort,
        secure: env.mail.smtpPort === 465,
        auth: { user: env.mail.smtpUser, pass: env.mail.smtpPass },
      });
    }
    return this.transporter;
  }

  private logToConsole(params: SendMailParams, note: string): void {
    // eslint-disable-next-line no-console
    console.log(
      `\n[mail:${note}] ->\n  to: ${params.to}\n  subject: ${params.subject}\n  text: ${
        params.text ?? '(html only)'
      }\n`,
    );
  }

  async send(params: SendMailParams): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logToConsole(params, 'DEV (SMTP not configured)');
      return;
    }
    try {
      await transporter.sendMail({
        from: env.mail.smtpUser || env.mail.ownerEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
    } catch (err) {
      // Never let a mail failure break the auth flow — log and fall back so the
      // user can still read the code in the server logs.
      // eslint-disable-next-line no-console
      console.error('[mail] send failed, falling back to console:', err instanceof Error ? err.message : err);
      this.logToConsole(params, 'FALLBACK (send failed)');
    }
  }

  async sendEmailVerificationCode(to: string, code: string): Promise<void> {
    await this.send({
      to,
      subject: `Your Authora confirmation code: ${code}`,
      text: `Your email confirmation code is ${code}. It expires in 15 minutes.`,
      html: `
        <p>Welcome to Authora!</p>
        <p>Your email confirmation code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0">${code}</p>
        <p style="color:#5c6c75">This code expires in 15 minutes.</p>`,
    });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${env.app.frontendUrl}/reset-password?token=${token}`;
    await this.send({
      to,
      subject: 'Reset your password',
      text: `Reset your password: ${link}`,
      html: `<p>You requested a password reset. Click the link below (valid for 1 hour):</p><p><a href="${link}">${link}</a></p>`,
    });
  }
}
