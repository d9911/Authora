import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/AppError';
import { MailGateway } from '../../modules/auth/domain/MailGateway';
import { escapeHtml, renderEmailTemplate } from './emailTemplate';

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
export class MailService implements MailGateway {
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
      if (env.isProd) {
        throw AppError.mailSendFailed('Email delivery is not configured');
      }
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
      // eslint-disable-next-line no-console
      console.error('[mail] send failed:', err instanceof Error ? err.message : err);
      throw AppError.mailSendFailed('Email provider rejected the message. Check SMTP credentials and sender settings.');
    }
  }

  async sendEmailVerificationCode(to: string, code: string): Promise<void> {
    const confirmUrl = `${env.app.frontendUrl}/confirm-email?email=${encodeURIComponent(to)}`;
    const safeCode = escapeHtml(code);
    await this.send({
      to,
      subject: `Authora email verification code: ${code}`,
      text: [
        'Verify your email for Authora',
        '',
        `Your confirmation code is ${code}.`,
        'This code expires in 24 hours.',
        '',
        `Open verification page: ${confirmUrl}`,
        '',
        'If you did not request this code, you can safely ignore this email.',
      ].join('\n'),
      html: renderEmailTemplate({
        preheader: 'Your Authora confirmation code expires in 24 hours.',
        eyebrow: 'Email verification',
        title: 'Verify your email',
        accentColor: '#3157d5',
        contentHtml: `
          <p style="margin:0 0 18px;">Use this code to confirm that this email address belongs to you.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;background-color:#f4f7ff;border:1px solid #d9e2ff;border-radius:12px;">
            <tr>
              <td align="center" style="padding:22px 16px;">
                <p style="margin:0 0 10px;color:#69758a;font-size:12px;line-height:18px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Confirmation code</p>
                <p style="margin:0;color:#172033;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:32px;line-height:38px;font-weight:700;letter-spacing:6px;word-break:break-all;">${safeCode}</p>
                <p style="margin:10px 0 0;color:#69758a;font-size:13px;line-height:20px;">This code expires in 24 hours.</p>
              </td>
            </tr>
          </table>`,
        action: {
          label: 'Open verification page',
          url: confirmUrl,
          color: '#3157d5',
        },
        notice: {
          icon: '✓',
          iconLabel: 'Verification',
          title: "Didn't request this code?",
          text: 'You can safely ignore this email. No changes will be made to your account.',
        },
      }),
    });
  }

  async sendPasswordReset(to: string, token: string, nextPath?: string): Promise<void> {
    const resetUrl = new URL('/reset-password', env.app.frontendUrl);
    resetUrl.searchParams.set('token', token);
    if (nextPath) resetUrl.searchParams.set('next', nextPath);
    const link = resetUrl.toString();
    await this.send({
      to,
      subject: 'Reset your password',
      text: [
        'Reset your password',
        '',
        'We received a request to reset the password for your Authora account.',
        'Click the button below to create a new password.',
        '',
        `Reset password: ${link}`,
        '',
        'This link expires in 1 hour.',
        '',
        "If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.",
      ].join('\n'),
      html: renderEmailTemplate({
        preheader: 'Create a new password for your Authora account. This link expires in 1 hour.',
        eyebrow: 'Account recovery',
        title: 'Reset your password',
        accentColor: '#3157d5',
        contentHtml: `
          <p style="margin:0 0 14px;">We received a request to reset the password for your Authora account.</p>
          <p style="margin:0;">Click the button below to create a new password.</p>`,
        action: {
          label: 'Reset password',
          url: link,
          color: '#3157d5',
        },
        notice: {
          icon: '◷',
          iconLabel: 'Clock',
          title: 'This link expires in 1 hour.',
          text: "If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.",
          backgroundColor: '#f4f7ff',
          borderColor: '#d9e2ff',
        },
      }),
    });
  }

  async sendPasswordChanged(to: string): Promise<void> {
    const recoveryUrl = new URL('/forgot-password', env.app.frontendUrl).toString();
    await this.send({
      to,
      subject: 'Password changed successfully',
      text: [
        'Password changed successfully',
        '',
        'Your Authora password has been changed successfully.',
        '',
        "For your security, all existing sessions have been signed out and you'll need to sign in again on your devices.",
        '',
        "If you didn't make this change, your account may be compromised. Recover your account immediately.",
        '',
        `Recover account: ${recoveryUrl}`,
        '',
        'Security tip: Authora will never ask for your password by email.',
      ].join('\n'),
      html: renderEmailTemplate({
        preheader: 'Your Authora password was changed and all existing sessions were signed out.',
        eyebrow: 'Security notification',
        title: 'Password changed successfully',
        accentColor: '#c92a2a',
        contentHtml: `
          <p style="margin:0 0 14px;">Your Authora password has been changed successfully.</p>
          <p style="margin:0 0 14px;">For your security, all existing sessions have been signed out and you'll need to sign in again on your devices.</p>
          <p style="margin:0;color:#8f1d1d;font-weight:700;">If you didn't make this change, your account may be compromised. Recover your account immediately.</p>`,
        action: {
          label: 'Recover account',
          url: recoveryUrl,
          color: '#c92a2a',
        },
        notice: {
          icon: '🔒',
          iconLabel: 'Lock',
          title: 'Security tip:',
          text: 'Authora will never ask for your password by email.',
          backgroundColor: '#fff7f7',
          borderColor: '#f2cccc',
        },
      }),
    });
  }
}
