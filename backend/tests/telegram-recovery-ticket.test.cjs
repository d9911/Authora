const assert = require('node:assert/strict');
const {
  TelegramTicketStore,
} = require('../dist/modules/auth/oauth/TelegramTicketStore.js');

async function run() {
  const store = new TelegramTicketStore();
  const recovery = await store.create({
    purpose: 'recovery',
    confirmationCode: '194205',
  });

  assert.equal(recovery.purpose, 'recovery');
  assert.equal(recovery.confirmationCode, '194205');
  assert.equal(recovery.status, 'pending');
  assert.equal(await store.cancel(recovery.token), true);
  assert.equal((await store.get(recovery.token))?.status, 'cancelled');
  assert.equal(
    await store.resolve(recovery.token, { telegramId: 'telegram-1' }),
    false,
    'cancelled recovery tickets cannot be resolved',
  );

  const login = await store.create({ purpose: 'login' });
  assert.equal(login.purpose, 'login');
  assert.equal(await store.resolve(login.token, { telegramId: 'telegram-1' }), true);
  assert.equal((await store.get(login.token))?.status, 'done');
}

run()
  .then(() => console.log('telegram-recovery-ticket tests passed'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
