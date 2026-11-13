/**
 * Test harness for the AI endpoints with a live model path.
 *
 * Boots the real API with GEMINI_API_KEY set and points the Google GenAI SDK at
 * a local stand-in for the Gemini REST API (GOOGLE_GEMINI_BASE_URL). That
 * exercises the whole path without a real key or network access:
 * request validation → prompt → SDK → HTTP → answer parsing → response.
 *
 * Every test file that uses it gets its own API process, and with it its own
 * rate-limit window (30 AI requests a minute), so keep a file below that.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OWNER = { email: 'owner@test.local', password: 'Owner@12345' };

export const MODEL = 'gemini-test-model';
export const API_KEY = 'test-only-gemini-key';

/** The prompt text of a request the stand-in model received. */
export const promptOf = (call) => call.body?.contents?.[0]?.parts?.[0]?.text ?? '';

/** The salon name a suggestion prompt was written for. */
export const salonNameIn = (prompt) => /(?:salon named|Salon Name:) "([^"]*)"/i.exec(prompt)?.[1];

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

async function waitForApi(port) {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {
      // The child process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('AI test API did not start in time.');
}

/**
 * Starts the stand-in model and the API, and signs the seeded salon owner in.
 *
 * @param {(prompt: string) => { text: string } | { status: number, error: object }} respond
 *   what the stand-in model answers to a prompt: the answer text, or an API error
 * @returns {Promise<{ owner: object, makeClient: () => object, modelCalls: object[], stop: () => Promise<void> }>}
 *   `owner` and `makeClient()` are JSON clients with `get`, `post` and `patch`
 *   that resolve to `{ status, data }`; `modelCalls` lists every request the
 *   stand-in model received as `{ method, url, apiKey, body }`
 */
export async function startGeminiHarness(respond) {
  const modelCalls = [];
  const geminiPort = await freePort();
  let apiPort = await freePort();
  while (apiPort === geminiPort) apiPort = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beautyzone-ai-'));

  const gemini = createServer(async (req, res) => {
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

    const reply = respond(promptOf(call));
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

  const api = spawn(process.execPath, ['server/index.js'], {
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

  const stop = async () => {
    api.kill('SIGTERM');
    await new Promise((resolve) => gemini.close(resolve));
    await new Promise((resolve) => setTimeout(resolve, 500));
    fs.rmSync(dataDir, { recursive: true, force: true });
  };

  /** Minimal cookie-aware JSON client. */
  const makeClient = () => {
    let cookie = '';
    const request = async (method, endpoint, body) => {
      const response = await fetch(`http://127.0.0.1:${apiPort}${endpoint}`, {
        method,
        headers: {
          Origin: `http://127.0.0.1:${apiPort}`,
          'X-Requested-With': 'beautyzone',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
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
    };
    return {
      get: (endpoint) => request('GET', endpoint),
      post: (endpoint, body) => request('POST', endpoint, body),
      patch: (endpoint, body) => request('PATCH', endpoint, body),
    };
  };

  try {
    await waitForApi(apiPort);
    const owner = makeClient();
    const login = await owner.post('/api/auth/login', OWNER);
    assert.equal(login.status, 200, `owner login failed: ${JSON.stringify(login.data)}`);
    return { owner, makeClient, modelCalls, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}
