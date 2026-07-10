const assert = require('node:assert/strict');

process.env.DB_TYPE = 'sqlite';
process.env.SQLITE_FILE = ':memory:';
process.env.JWT_ACCESS_SECRET = 'ticket_test_access';
process.env.JWT_REFRESH_SECRET = 'ticket_test_refresh';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';

const {
  connectSqlite,
  disconnectSqlite,
} = require('../.smoke-dist/src/infrastructure/database/sqlite/connection.js');
const {
  SqliteTelegramTicketRepository,
} = require('../.smoke-dist/src/infrastructure/database/sqlite/SqliteTelegramTicketRepository.js');

async function run() {
  await connectSqlite();
  const tickets = new SqliteTelegramTicketRepository();

  const recovery = await tickets.create({
    purpose: 'recovery',
    confirmationCode: '194205',
  });
  assert.equal(recovery.status, 'pending');
  assert.equal(recovery.purpose, 'recovery');
  assert.equal((await tickets.get(recovery.token))?.confirmationCode, '194205');
  assert.equal(
    await tickets.resolve(recovery.token, { telegramId: 'telegram-1', username: 'authora' }),
    true,
  );
  assert.equal((await tickets.get(recovery.token))?.status, 'done');
  assert.equal((await tickets.get(recovery.token))?.user?.telegramId, 'telegram-1');
  await tickets.consume(recovery.token);
  assert.equal(await tickets.get(recovery.token), undefined);

  const cancelled = await tickets.create({ purpose: 'recovery' });
  assert.equal(await tickets.cancel(cancelled.token), true);
  assert.equal((await tickets.get(cancelled.token))?.status, 'cancelled');
  assert.equal(
    await tickets.resolve(cancelled.token, { telegramId: 'telegram-2' }),
    false,
  );

  await disconnectSqlite();
}

run()
  .then(() => console.log('telegram-ticket-repository tests passed'))
  .catch(async (error) => {
    console.error(error);
    await disconnectSqlite();
    process.exit(1);
  });
