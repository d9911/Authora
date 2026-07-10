const assert = require('node:assert/strict');
const {
  TelegramTicketStore,
} = require('../dist/modules/auth/oauth/TelegramTicketStore.js');

const store = new TelegramTicketStore();
const recovery = store.create({
  purpose: 'recovery',
  confirmationCode: '194205',
});

assert.equal(recovery.purpose, 'recovery');
assert.equal(recovery.confirmationCode, '194205');
assert.equal(recovery.status, 'pending');
assert.equal(store.cancel(recovery.token), true);
assert.equal(store.get(recovery.token)?.status, 'cancelled');
assert.equal(
  store.resolve(recovery.token, { telegramId: 'telegram-1' }),
  false,
  'cancelled recovery tickets cannot be resolved',
);

const login = store.create({ purpose: 'login' });
assert.equal(login.purpose, 'login');
assert.equal(store.resolve(login.token, { telegramId: 'telegram-1' }), true);
assert.equal(store.get(login.token)?.status, 'done');

console.log('telegram-recovery-ticket tests passed');
