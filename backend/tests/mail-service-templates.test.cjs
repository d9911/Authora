const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'https://app.authora.test';

const { MailService } = require('../dist/infrastructure/mail/MailService.js');

async function capture(method, ...args) {
  const service = new MailService();
  let message;
  service.send = async (params) => {
    message = params;
  };
  await service[method](...args);
  assert.ok(message, `${method} must send a message`);
  return message;
}

function assertCommonTemplate(message) {
  assert.match(message.html, /^\s*<!doctype html>/i);
  assert.match(message.html, /<meta name="viewport" content="width=device-width, initial-scale=1\.0">/i);
  assert.match(message.html, /max-width:\s*600px/i);
  assert.match(message.html, /role="presentation"/i);
  assert.match(message.html, />Authora</i);
  assert.match(message.html, /Authora account security/i);
  assert.match(message.html, /style="[^"]+"/i);
  assert.doesNotMatch(message.html, /<(?:script|style)\b/i);
  assert.doesNotMatch(message.html, /\sclass=/i);
}

async function main() {
  const reset = await capture(
    'sendPasswordReset',
    'user@example.com',
    'token<&"\'',
    '/profile/edit?tab=security&mode=full',
  );
  assertCommonTemplate(reset);
  assert.equal(reset.subject, 'Reset your password');
  assert.match(reset.html, /We received a request to reset the password for your Authora account\./);
  assert.match(reset.html, />\s*Reset password\s*</);
  assert.match(reset.html, /This link expires in 1 hour\./);
  assert.match(reset.html, /If you didn&#39;t request a password reset, you can safely ignore this email\./);
  assert.match(reset.html, /word-break:\s*break-all/i);
  assert.match(reset.html, /token%3C%26%22%27/);
  assert.match(reset.html, /&amp;next=/);
  assert.doesNotMatch(reset.html, /<script/i);
  assert.match(reset.text, /Click the button below to create a new password\./);
  assert.match(reset.text, /This link expires in 1 hour\./);
  assert.match(reset.text, /Your password will remain unchanged\./);

  const changed = await capture('sendPasswordChanged', 'user@example.com');
  assertCommonTemplate(changed);
  assert.equal(changed.subject, 'Password changed successfully');
  assert.match(changed.html, /Your Authora password has been changed successfully\./);
  assert.match(changed.html, /all existing sessions have been signed out/i);
  assert.match(changed.html, /your account may be compromised/i);
  assert.match(changed.html, />\s*Recover account\s*</);
  assert.match(changed.html, /https:\/\/app\.authora\.test\/forgot-password/);
  assert.match(changed.html, /background-color:\s*#c92a2a/i);
  assert.match(changed.html, /Security tip:/);
  assert.match(changed.html, /Authora will never ask for your password by email\./);
  assert.match(changed.text, /Recover account: https:\/\/app\.authora\.test\/forgot-password/);

  const verification = await capture(
    'sendEmailVerificationCode',
    'user@example.com',
    '12<script>alert(1)</script>',
  );
  assertCommonTemplate(verification);
  assert.match(verification.html, /12&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(verification.html, /<script/i);
  assert.match(verification.html, /Open verification page/);

  console.log('Mail service template tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
