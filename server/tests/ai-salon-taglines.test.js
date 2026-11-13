/**
 * Live-model contract for POST /api/ai/salon-taglines: brand taglines for a salon name.
 *
 * Runs against the real API with a local stand-in for the Gemini REST API
 * (see `support/gemini-harness.js`), so no key or network access is needed.
 *
 * Run with: npm run test:ai
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { buildSalonTaglinePrompt, fallbackSalonTaglines } from '../../src/lib/salonTaglines.js';
import { API_KEY, MODEL, promptOf, salonNameIn, startGeminiHarness } from './support/gemini-harness.js';

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

let owner;
let makeClient;
/** Every request the stand-in model received. */
let modelCalls;
let stop;

before(async () => {
  ({ owner, makeClient, modelCalls, stop } = await startGeminiHarness(
    (prompt) => SCRIPT[salonNameIn(prompt)] || { text: JSON.stringify(GOOD_ANSWER) }
  ));
});

after(async () => {
  if (stop) await stop();
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
  assert.ok(prompt.includes('Generate 3 catchy, professional wellness taglines for a salon named "Velvet Rose Atelier".'));
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
  assert.ok(promptOf(modelCalls[0]).includes(`salon named "Glow 'Up' Studio".`), promptOf(modelCalls[0]));
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
