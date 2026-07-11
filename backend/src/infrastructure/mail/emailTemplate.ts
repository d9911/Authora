interface EmailAction {
  label: string;
  url: string;
  color: string;
}

interface EmailNotice {
  icon: string;
  iconLabel: string;
  title: string;
  text: string;
  backgroundColor?: string;
  borderColor?: string;
}

interface EmailTemplateOptions {
  preheader: string;
  eyebrow: string;
  title: string;
  contentHtml: string;
  accentColor: string;
  action?: EmailAction;
  notice: EmailNotice;
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  );
}

export function renderEmailTemplate(options: EmailTemplateOptions): string {
  const preheader = escapeHtml(options.preheader);
  const eyebrow = escapeHtml(options.eyebrow);
  const title = escapeHtml(options.title);
  const accentColor = escapeHtml(options.accentColor);
  const noticeIcon = escapeHtml(options.notice.icon);
  const noticeIconLabel = escapeHtml(options.notice.iconLabel);
  const noticeTitle = escapeHtml(options.notice.title);
  const noticeText = escapeHtml(options.notice.text);
  const noticeBackground = escapeHtml(options.notice.backgroundColor ?? '#f7f9fc');
  const noticeBorder = escapeHtml(options.notice.borderColor ?? '#dce3ed');
  const action = options.action
    ? {
        label: escapeHtml(options.action.label),
        url: escapeHtml(options.action.url),
        color: escapeHtml(options.action.color),
      }
    : null;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f6fa;color:#172033;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
      ${preheader}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#f3f6fa;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;background-color:#ffffff;border:1px solid #e2e7ef;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(23,32,51,0.08);">
            <tr>
              <td style="height:4px;font-size:0;line-height:0;background-color:${accentColor};">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 28px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td width="40" height="40" align="center" valign="middle" style="width:40px;height:40px;background-color:#172033;border-radius:10px;color:#ffffff;font-size:20px;line-height:40px;font-weight:700;">A</td>
                    <td style="padding-left:12px;color:#172033;font-size:19px;line-height:24px;font-weight:700;">Authora</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 10px;">
                <p style="margin:0 0 10px;color:${accentColor};font-size:12px;line-height:18px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${eyebrow}</p>
                <h1 style="margin:0;color:#172033;font-size:30px;line-height:38px;font-weight:700;letter-spacing:0;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;color:#4c586d;font-size:16px;line-height:25px;">
                ${options.contentHtml}
              </td>
            </tr>
            ${
              action
                ? `<tr>
              <td style="padding:22px 28px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;">
                  <tr>
                    <td align="center" bgcolor="${action.color}" style="background-color:${action.color};border-radius:10px;mso-padding-alt:15px 24px;">
                      <a href="${action.url}" target="_blank" style="display:block;padding:15px 24px;color:#ffffff;font-size:16px;line-height:20px;font-weight:700;text-align:center;text-decoration:none;border-radius:10px;">${action.label}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 0;">
                <p style="margin:0 0 7px;color:#69758a;font-size:12px;line-height:18px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin:0;font-size:12px;line-height:18px;word-break:break-all;overflow-wrap:anywhere;">
                  <a href="${action.url}" target="_blank" style="color:#3157d5;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;">${action.url}</a>
                </p>
              </td>
            </tr>`
                : ''
            }
            <tr>
              <td style="padding:24px 28px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;background-color:${noticeBackground};border:1px solid ${noticeBorder};border-radius:12px;">
                  <tr>
                    <td width="44" valign="top" style="width:44px;padding:18px 0 18px 18px;">
                      <div role="img" aria-label="${noticeIconLabel}" style="width:32px;height:32px;border-radius:8px;background-color:#ffffff;color:#172033;font-size:17px;line-height:32px;text-align:center;">${noticeIcon}</div>
                    </td>
                    <td valign="top" style="padding:18px;color:#4c586d;font-size:13px;line-height:20px;">
                      <p style="margin:0 0 3px;color:#172033;font-size:13px;line-height:20px;font-weight:700;">${noticeTitle}</p>
                      <p style="margin:0;">${noticeText}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border-top:1px solid #e7ebf1;">
                  <tr>
                    <td style="padding-top:20px;color:#7b8799;font-size:12px;line-height:19px;">
                      <strong style="color:#4c586d;font-weight:700;">Authora account security</strong><br>
                      This is an automated message. Please do not reply.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
