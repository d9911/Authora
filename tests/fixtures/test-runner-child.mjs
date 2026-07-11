import { spawn } from 'node:child_process';
import { appendFile, writeFile } from 'node:fs/promises';
import { setTimeout as wait } from 'node:timers/promises';

const [mode, ...args] = process.argv.slice(2);

switch (mode) {
  case 'record': {
    const [id, orderPath, delayMs = '0'] = args;
    await appendFile(orderPath, `start:${id}\n`);
    await wait(Number(delayMs));
    await appendFile(orderPath, `end:${id}\n`);
    break;
  }
  case 'pass':
    console.log(args.join(' ') || 'fixture passed');
    break;
  case 'fail':
    console.error(args.slice(1).join(' ') || 'fixture failed');
    process.exitCode = Number(args[0] ?? 1);
    break;
  case 'words':
    console.log('warning warn deprecated are ordinary successful output');
    break;
  case 'secret':
    console.log(`secret=${process.env.FIXTURE_SECRET ?? ''}`);
    break;
  case 'signal-self':
    process.kill(process.pid, 'SIGTERM');
    break;
  case 'hang': {
    const [pidPath, cleanupPath] = args;
    await writeFile(pidPath, String(process.pid));
    const stop = async () => {
      await appendFile(cleanupPath, `terminated:${process.pid}\n`);
      process.exit(0);
    };
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
    setInterval(() => {}, 1_000);
    break;
  }
  case 'spawn-grandchild': {
    const [pidPath] = args;
    spawn(process.execPath, [process.argv[1], 'ignore-term', pidPath], {
      detached: false,
      stdio: 'ignore',
    });
    process.once('SIGTERM', () => process.exit(0));
    setInterval(() => {}, 1_000);
    break;
  }
  case 'ignore-term': {
    const [pidPath] = args;
    await writeFile(pidPath, String(process.pid));
    process.on('SIGTERM', () => {});
    setInterval(() => {}, 1_000);
    break;
  }
  default:
    console.error(`unknown fixture mode: ${mode ?? '<missing>'}`);
    process.exitCode = 64;
}
