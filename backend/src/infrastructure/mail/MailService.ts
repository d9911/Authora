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

  async send(params: SendMailParams): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      // eslint-disable-next-line no-console
      console.log(
        `\n[mail:DEV] (SMTP not configured) ->\n  to: ${params.to}\n  subject: ${params.subject}\n  text: ${
          params.text ?? '(html only)'
        }\n`,
      );
      return;
    }
    await transporter.sendMail({
      from: env.mail.smtpUser || env.mail.ownerEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const link = `${env.app.frontendUrl}/confirm-email?token=${token}`;
    await this.send({
      to,
      subject: 'Confirm your email',
      text: `Confirm your email: ${link}`,
      html: `<p>Welcome! Please confirm your email by clicking the link below:</p><p><a href="${link}">${link}</a></p>`,
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
