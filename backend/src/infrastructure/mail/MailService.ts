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
    const confirmUrl = `${env.app.frontendUrl}/confirm-email?email=${encodeURIComponent(to)}`;
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
      html: `
        <!doctype html>
        <html lang="en">
          <body style="margin:0;padding:0;background:#f5f4f8;font-family:Inter,Arial,sans-serif;color:#17141f">
            <div style="display:none;max-height:0;overflow:hidden;opacity:0">
              Your Authora confirmation code expires in 24 hours.
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f8;padding:32px 16px">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #ded9ea;border-radius:20px;overflow:hidden">
                    <tr>
                      <td style="height:4px;background:#5b4bff"></td>
                    </tr>
                    <tr>
                      <td style="padding:32px 32px 24px">
                        <p style="margin:0 0 10px;color:#5b4bff;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase">
                          Authora
                        </p>
                        <h1 style="margin:0;color:#17141f;font-size:28px;line-height:1.2;font-weight:700">
                          Verify your email
                        </h1>
                        <p style="margin:14px 0 0;color:#5c6c75;font-size:15px;line-height:1.55">
                          Use this code to confirm that this email address belongs to you.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 32px 26px">
                        <div style="background:#f2f0ff;border:1px solid #d8d2ff;border-radius:18px;padding:24px;text-align:center">
                          <p style="margin:0 0 12px;color:#5c6c75;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">
                            Confirmation code
                          </p>
                          <div style="font-family:'IBM Plex Mono','SFMono-Regular',Consolas,monospace;font-size:36px;line-height:1;font-weight:700;letter-spacing:8px;color:#17141f">
                            ${code}
                          </div>
                          <p style="margin:14px 0 0;color:#5c6c75;font-size:14px">
                            This code expires in 24 hours.
                          </p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 32px 32px">
                        <a href="${confirmUrl}" style="display:inline-block;background:#5b4bff;color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 22px;font-weight:700;font-size:14px">
                          Open verification page
                        </a>
                        <p style="margin:20px 0 0;color:#7a7289;font-size:13px;line-height:1.55">
                          If you did not request this code, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>`,
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
