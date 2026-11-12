import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SECRET = 'SECRET-TOKEN-abc123';

async function send(env, tag) {
  const saved = { NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL };
  Object.assign(process.env, env);
  if (env.VERCEL === undefined) delete process.env.VERCEL;
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  try {
    const { sendMail, passwordResetEmail } = await import('../mailer.js');
    const { DATA_PATH } = await import('../db.js');
    const mail = passwordResetEmail({ name: 'A', url: `https://x.test/reset?token=${SECRET}`, token: SECRET });
    const res = await sendMail({ to: 'a@x.test', ...mail, tag });
    const file = fs.readFileSync(path.join(DATA_PATH, 'outbox', `${res.id}.json`), 'utf8');
    return { logs: logs.join('\n'), file };
  } finally {
    console.log = orig;
    for (const k of Object.keys(saved)) saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]);
  }
}

test('production: reset mail token is never logged or written to the outbox', async () => {
  const { logs, file } = await send({ NODE_ENV: 'production' }, 'reset-password');
  assert.ok(!logs.includes(SECRET));
  assert.ok(!file.includes(SECRET));
  assert.match(logs, /tag=reset-password/);
});

test('every environment: logs carry metadata only', async () => {
  const { logs } = await send({ NODE_ENV: 'test' }, 'reset-password');
  assert.ok(!logs.includes(SECRET));
});

test('development keeps the full outbox file so the local flow stays testable', async () => {
  const { file } = await send({ NODE_ENV: 'test' }, 'reset-password');
  assert.ok(file.includes(SECRET));
});

test('non-sensitive mail is not redacted in production', async () => {
  const { file } = await send({ NODE_ENV: 'production' }, 'review-outcome');
  assert.ok(file.includes(SECRET));
});
