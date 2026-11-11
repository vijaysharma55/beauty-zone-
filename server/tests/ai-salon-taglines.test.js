/**
 * Live-model contract for POST /api/ai/salon-taglines.
 *
 * Boots the real API with GEMINI_API_KEY set and points the Google GenAI SDK at
 * a local stand-in for the Gemini REST API (GOOGLE_GEMINI_BASE_URL). That
 * exercises the whole path without a real key or network access:
 * request validation → prompt → SDK → HTTP → answer parsing → response.
 *
 * Run with: npm run test:ai
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSalonTaglinePrompt, fallbackSalonTaglines } from '../../src/lib/salonTaglines.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODEL = 'gemini-test-model';
const API_KEY = 'test-only-gemini-key';
const OWNER = { email: 'owner@test.local', password: 'Owner@12345' };

const GOOD_ANSWER = ['Where Velvet Meets Radiance', 'Your Signature Look, Beautifully Crafted', 'Step In. Bloom Out.'];

/** What the stand-in model answers, keyed by the salon name it finds in the prompt. */
const SCRIPT = {
  'Velvet Rose Atelier': { text: JSON.stringify(GOOD_ANSWER, null, 2) },
  'Fenced Studio': { text: `\`\`\`json\n${JSON.stringify(GOOD_ANSWER, null, 2)}\n\`\`\`` },
  'Partial Studio': {
    text: JSON.stringify([
      'One Polished Line From The Model',
      'Tagline Option 2',
      'This option rambles on for far more than the ten words allowed here',
    ]),
  },
  'Chatty Studio': { text: 'I am sorry, but I cannot help with that.' },
  'Offline Studio': { status: 503, error: { code: 503, message: 'The model is overloaded.', status: 'UNAVAILABLE' } },
};

let api;
let apiPort;
let gemini;
let geminiPort;
let dataDir;
let owner;
/** Every request the stand-in model received. */
const modelCalls = [];

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  return port;
}

async function waitForApi() {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${apiPort}/api/health`);
      if (response.ok) return;
    } catch {
      // The child process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('AI test API did not start in time.');
}

/** Minimal cookie-aware JSON client. */
function makeClient() {
  let cookie = '';
  return {
    async post(endpoint, body) {
      const response = await fetch(`http://127.0.0.1:${apiPort}${endpoint}`, {
        method: 'POST',
        headers: {
          Origin: `http://127.0.0.1:${apiPort}`,
          'X-Requested-With': 'beautyzone',
          'Content-Type': 'application/json',
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
      });
      const session = (response.headers.getSetCookie?.() || []).map((entry) => entry.split(';')[0]).find(Boolean);
      if (session) cookie = session;
      const raw = await response.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = raw;
      }
      return { status: response.status, data };
    },
  };
}

const promptOf = (call) => call.body?.contents?.[0]?.parts?.[0]?.text ?? '';

before(async () => {
  geminiPort = await freePort();
  apiPort = await freePort();
  while (apiPort === geminiPort) apiPort = await freePort();
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beautyzone-ai-taglines-'));

  gemini = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = raw;
    }
    const call = { method: req.method, url: req.url, apiKey: req.headers['x-goog-api-key'], body };
    modelCalls.push(call);

    const salonName = /Salon Name: "([^"]*)"/.exec(promptOf(call))?.[1];
    const reply = SCRIPT[salonName] || { text: JSON.stringify(GOOD_ANSWER) };
    res.setHeader('Content-Type', 'application/json');
    if (reply.error) {
      res.writeHead(reply.status);
      res.end(JSON.stringify({ error: reply.error }));
      return;
    }
    res.writeHead(200);
    res.end(
      JSON.stringify({
        candidates: [{ content: { role: 'model', parts: [{ text: reply.text }] }, finishReason: 'STOP', index: 0 }],
        usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 40, totalTokenCount: 160 },
      })
    );
  });
  await new Promise((resolve, reject) => {
    gemini.once('error', reject);
    gemini.listen(geminiPort, '127.0.0.1', resolve);
  });

  api = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(apiPort),
      DATA_DIR: dataDir,
      NODE_ENV: 'development',
      DISABLE_HMR: 'true',
      SEED_ADMIN_EMAIL: 'admin@test.local',
      SEED_ADMIN_PASSWORD: 'Admin@12345',
      SEED_OWNER_EMAIL: OWNER.email,
      SEED_OWNER_PASSWORD: OWNER.password,
      GOOGLE_CLIENT_ID: '',
      SUPABASE_SECRET_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      GEMINI_API_KEY: API_KEY,
      GEMINI_MODEL: MODEL,
      GOOGLE_GEMINI_BASE_URL: `http://127.0.0.1:${geminiPort}`,
    },
    stdio: 'ignore',
  });
  await waitForApi();

  owner = makeClient();
  const login = await owner.post('/api/auth/login', OWNER);
  assert.equal(login.status, 200, `owner login failed: ${JSON.stringify(login.data)}`);
});

after(async () => {
  if (api) api.kill('SIGTERM');
  if (gemini) await new Promise((resolve) => gemini.close(resolve));
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
});

test('sends the brand-strategist prompt with the salon name filled in', async () => {
  modelCalls.length = 0;
  const res = await owner.post('/api/ai/salon-taglines', { name: 'Velvet Rose Atelier' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data, { taglines: GOOD_ANSWER, source: 'ai', warnings: [] });

  assert.equal(modelCalls.length, 1, 'exactly one model request');
  const [call] = modelCalls;
  assert.equal(call.method, 'POST');
  assert.ok(call.url.includes(`/models/${MODEL}:generateContent`), call.url);
  assert.equal(call.apiKey, API_KEY);

  const prompt = promptOf(call);
  assert.equal(prompt, buildSalonTaglinePrompt('Velvet Rose Atelier'));
  assert.ok(prompt.includes('Salon Name: "Velvet Rose Atelier"'));
  assert.doesNotMatch(prompt, /\{\{|\}\}/, 'no unfilled placeholder reaches the model');
  // Head-room for reasoning models, whose thinking tokens share this budget.
  assert.equal(call.body.generationConfig.maxOutputTokens, 2048);
});

test('accepts a JSON answer wrapped in a code fence', async () => {
  const res = await owner.post('/api/ai/salon-taglines', { salonName: 'Fenced Studio' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data, { taglines: GOOD_ANSWER, source: 'ai', warnings: [] });
});

test('keeps a salon name on one line and inside its quotes', async () => {
  modelCalls.length = 0;
  const res = await owner.post('/api/ai/salon-taglines', { name: '  Glow "Up"\nStudio  ' });
  assert.equal(res.status, 200);
  assert.equal(res.data.source, 'ai');
  assert.equal(modelCalls.length, 1);
  assert.ok(promptOf(modelCalls[0]).includes(`Salon Name: "Glow 'Up' Studio"\n`), promptOf(modelCalls[0]));
});

test('tops up an incomplete model answer with curated suggestions', async () => {
  const res = await owner.post('/api/ai/salon-taglines', { name: 'Partial Studio' });
  assert.equal(res.status, 200);
  assert.equal(res.data.source, 'ai+fallback');
  const curated = fallbackSalonTaglines('Partial Studio', 0);
  assert.deepEqual(res.data.taglines, ['One Polished Line From The Model', curated[0], curated[1]]);
  assert.equal(res.data.warnings.length, 1);
});

test('falls back to curated suggestions when the answer has no usable option', async () => {
  const first = await owner.post('/api/ai/salon-taglines', { name: 'Chatty Studio' });
  assert.equal(first.status, 200);
  assert.equal(first.data.source, 'fallback');
  assert.deepEqual(first.data.taglines, fallbackSalonTaglines('Chatty Studio', 0));
  assert.equal(first.data.warnings.length, 1);

  // "More ideas" pages through the curated list.
  const more = await owner.post('/api/ai/salon-taglines', { name: 'Chatty Studio', variant: 1 });
  assert.equal(more.status, 200);
  assert.deepEqual(more.data.taglines, fallbackSalonTaglines('Chatty Studio', 1));
  assert.notDeepEqual(more.data.taglines, first.data.taglines);
});

test('"more ideas" replaces anything the model repeats', async () => {
  const name = 'Velvet Rose Atelier';
  const curated = fallbackSalonTaglines(name, 1);

  // The stand-in model gives the same answer every time, as a real one may.
  const mixed = await owner.post('/api/ai/salon-taglines', { name, variant: 1, exclude: [GOOD_ANSWER[0], GOOD_ANSWER[2]] });
  assert.equal(mixed.status, 200);
  assert.equal(mixed.data.source, 'ai+fallback');
  assert.deepEqual(mixed.data.taglines, [GOOD_ANSWER[1], curated[0], curated[1]]);
  assert.equal(mixed.data.warnings.length, 1);

  // Matching ignores case and punctuation.
  const allShown = await owner.post('/api/ai/salon-taglines', {
    name,
    variant: 1,
    exclude: GOOD_ANSWER.map((line) => `  ${line.toUpperCase()}!! `),
  });
  assert.equal(allShown.status, 200);
  assert.equal(allShown.data.source, 'fallback');
  assert.deepEqual(allShown.data.taglines, curated);

  // The list is only a hint: a malformed one is ignored, not rejected.
  for (const exclude of ['nope', 7, { a: 1 }, [null, 42, {}]]) {
    const lenient = await owner.post('/api/ai/salon-taglines', { name, exclude });
    assert.equal(lenient.status, 200, JSON.stringify(exclude));
    assert.deepEqual(lenient.data, { taglines: GOOD_ANSWER, source: 'ai', warnings: [] });
  }
});

test('never calls the model for a signed-out or invalid request', async () => {
  modelCalls.length = 0;

  const anonymous = await makeClient().post('/api/ai/salon-taglines', { name: 'Velvet Rose Atelier' });
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.data.code, 'AUTH_REQUIRED');

  for (const body of [{}, { name: '' }, { name: '   ' }, { name: 'V' }, { name: 42 }, { name: 'x'.repeat(121) }]) {
    const res = await owner.post('/api/ai/salon-taglines', body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.match(res.data.error, /Salon name/);
  }

  assert.equal(modelCalls.length, 0);
});

// Keep this last: it makes the provider fail.
test('falls back to curated suggestions when the provider fails', async () => {
  modelCalls.length = 0;
  const res = await owner.post('/api/ai/salon-taglines', { name: 'Offline Studio' });
  assert.equal(res.status, 200);
  assert.equal(res.data.source, 'fallback');
  assert.deepEqual(res.data.taglines, fallbackSalonTaglines('Offline Studio', 0));
  assert.equal(res.data.warnings.length, 1);
  assert.ok(modelCalls.length >= 1, 'the provider was tried first');
});
