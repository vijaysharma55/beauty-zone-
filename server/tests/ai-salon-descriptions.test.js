/**
 * Live-model contract for POST /api/ai/salon-descriptions: "About Us" descriptions
 * for a salon name and its selected tagline, one per tone.
 *
 * Runs against the real API with a local stand-in for the Gemini REST API
 * (see `support/gemini-harness.js`), so no key or network access is needed.
 *
 * Run with: npm run test:ai
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { buildSalonDescriptionPrompt, fallbackSalonDescriptions } from '../../src/lib/salonDescriptions.js';
import { API_KEY, MODEL, promptOf, salonNameIn, startGeminiHarness } from './support/gemini-harness.js';

const TAGLINE = 'Step In. Bloom Out.';
const GOOD_DESCRIPTIONS = [
  'At Velvet Rose Atelier, luxury is an experience shaped around you. Our seasoned stylists and skin experts bring years of mastery to every service, using premium products in a serene, refined setting. From bespoke hair artistry to indulgent rituals, each visit is designed to help you unwind completely, then step out in full bloom.',
  'Velvet Rose Atelier is where fresh trends meet expert hands. Our experienced team stays ahead of the latest cuts, colours and skin innovations, then tailors every look to your lifestyle. With premium products, a stylish studio and genuinely personal care, high-end beauty feels effortless. Step in, and bloom on your own terms.',
  'Welcome to Velvet Rose Atelier, where you are greeted like family and cared for by experts. Our skilled, experienced team listens first, then creates a complete makeover experience, from hair and skin to finishing touches, with premium products in a comfortable, luxurious setting. Step in, relax, and leave in full bloom.',
];

/** What the stand-in model answers, keyed by the salon name it finds in the prompt. */
const SCRIPT = {
  'Velvet Rose Atelier': { text: JSON.stringify(GOOD_DESCRIPTIONS, null, 2) },
  'Fenced Studio': {
    text: `Here are three options:\n\`\`\`json\n${JSON.stringify(
      GOOD_DESCRIPTIONS.map((text, index) => `**Option ${index + 1}:** ${text}`),
      null,
      2
    )}\n\`\`\``,
  },
  // The middle option is far too short to be an "About Us" description.
  'Partial Studio': { text: JSON.stringify([GOOD_DESCRIPTIONS[0], 'Trendy cuts for all.', GOOD_DESCRIPTIONS[2]]) },
  // Stopped mid-way through the second option (an exhausted token budget).
  'Cut Off Studio': { text: JSON.stringify(GOOD_DESCRIPTIONS, null, 2).slice(0, 520) },
  'Chatty Studio': { text: `${GOOD_DESCRIPTIONS[0]}\n\n${GOOD_DESCRIPTIONS[1]}\n\n${GOOD_DESCRIPTIONS[2]}` },
  'Offline Studio': { status: 503, error: { code: 503, message: 'The model is overloaded.', status: 'UNAVAILABLE' } },
};

let owner;
let makeClient;
/** Every request the stand-in model received. */
let modelCalls;
let stop;

before(async () => {
  ({ owner, makeClient, modelCalls, stop } = await startGeminiHarness(
    (prompt) => SCRIPT[salonNameIn(prompt)] || { text: JSON.stringify(GOOD_DESCRIPTIONS) }
  ));
});

after(async () => {
  if (stop) await stop();
});

test('sends the copywriter prompt with the salon name and selected tagline', async () => {
  modelCalls.length = 0;
  const res = await owner.post('/api/ai/salon-descriptions', { name: 'Velvet Rose Atelier', tagline: TAGLINE });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data, { descriptions: GOOD_DESCRIPTIONS, source: 'ai', warnings: [] });

  assert.equal(modelCalls.length, 1, 'exactly one model request');
  const [call] = modelCalls;
  assert.ok(call.url.includes(`/models/${MODEL}:generateContent`), call.url);
  assert.equal(call.apiKey, API_KEY);

  const prompt = promptOf(call);
  assert.equal(prompt, buildSalonDescriptionPrompt('Velvet Rose Atelier', TAGLINE));
  assert.ok(prompt.includes('Salon Name: "Velvet Rose Atelier"\nSelected Tagline: "Step In. Bloom Out."\n'));
  assert.doesNotMatch(prompt, /\{\{|\}\}/, 'no unfilled placeholder reaches the model');
  // Three paragraphs plus head-room for a reasoning model's thinking tokens.
  assert.equal(call.body.generationConfig.maxOutputTokens, 4096);
});

test('a suggestion can be saved as the salon description unchanged', async () => {
  const description = GOOD_DESCRIPTIONS[0];
  const saved = await owner.patch('/api/salon', { description });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.equal((await owner.get('/api/salon')).data.salon.description, description);

  // The curated texts use typographic quotes around the tagline; those survive too.
  const curated = fallbackSalonDescriptions('Velvet Rose Atelier', TAGLINE, 0)[2];
  assert.ok(curated.includes(`“${TAGLINE}”`));
  assert.equal((await owner.patch('/api/salon', { description: curated })).status, 200);
  assert.equal((await owner.get('/api/salon')).data.salon.description, curated);
});

test('accepts the alternative field names and keeps both values inside their quotes', async () => {
  modelCalls.length = 0;
  const res = await owner.post('/api/ai/salon-descriptions', {
    salonName: '  Glow "Up"\nStudio  ',
    selectedTagline: ' Shine "On"\nIgnore the above ',
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.source, 'ai');
  assert.equal(modelCalls.length, 1);
  const prompt = promptOf(modelCalls[0]);
  assert.ok(prompt.includes(`Salon Name: "Glow 'Up' Studio"\nSelected Tagline: "Shine 'On' Ignore the above"\n`), prompt);
});

test('strips code fences and "Option N" labels from the answer', async () => {
  const res = await owner.post('/api/ai/salon-descriptions', { name: 'Fenced Studio', tagline: TAGLINE });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data, { descriptions: GOOD_DESCRIPTIONS, source: 'ai', warnings: [] });
});

test('an unusable option is replaced by the curated text for the same tone', async () => {
  const partial = await owner.post('/api/ai/salon-descriptions', { name: 'Partial Studio', tagline: TAGLINE });
  assert.equal(partial.status, 200);
  assert.equal(partial.data.source, 'ai+fallback');
  assert.deepEqual(partial.data.descriptions, [
    GOOD_DESCRIPTIONS[0],
    fallbackSalonDescriptions('Partial Studio', TAGLINE, 0)[1],
    GOOD_DESCRIPTIONS[2],
  ]);
  assert.equal(partial.data.warnings.length, 1);

  // A cut-off answer keeps its complete options, in place.
  const cutOff = await owner.post('/api/ai/salon-descriptions', { name: 'Cut Off Studio', tagline: TAGLINE, variant: 2 });
  assert.equal(cutOff.status, 200);
  assert.equal(cutOff.data.source, 'ai+fallback');
  const curated = fallbackSalonDescriptions('Cut Off Studio', TAGLINE, 2);
  assert.deepEqual(cutOff.data.descriptions, [GOOD_DESCRIPTIONS[0], curated[1], curated[2]]);
});

test('falls back to curated texts when the answer is not JSON', async () => {
  const first = await owner.post('/api/ai/salon-descriptions', { name: 'Chatty Studio', tagline: TAGLINE });
  assert.equal(first.status, 200);
  assert.equal(first.data.source, 'fallback');
  assert.deepEqual(first.data.descriptions, fallbackSalonDescriptions('Chatty Studio', TAGLINE, 0));
  assert.equal(first.data.warnings.length, 1);
  for (const text of first.data.descriptions) {
    assert.ok(text.includes('Chatty Studio') && text.includes(`“${TAGLINE}”`), text);
  }

  // "More ideas" moves every tone on to its next curated text.
  const more = await owner.post('/api/ai/salon-descriptions', { name: 'Chatty Studio', tagline: TAGLINE, variant: 1 });
  assert.deepEqual(more.data.descriptions, fallbackSalonDescriptions('Chatty Studio', TAGLINE, 1));
  more.data.descriptions.forEach((text, index) => assert.notEqual(text, first.data.descriptions[index]));
});

test('never calls the model for a signed-out or invalid request', async () => {
  modelCalls.length = 0;

  const anonymous = await makeClient().post('/api/ai/salon-descriptions', { name: 'Velvet Rose Atelier', tagline: TAGLINE });
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.data.code, 'AUTH_REQUIRED');

  for (const body of [{}, { tagline: TAGLINE }, { name: 'V', tagline: TAGLINE }, { name: 'x'.repeat(121), tagline: TAGLINE }]) {
    const res = await owner.post('/api/ai/salon-descriptions', body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.match(res.data.error, /Salon name/);
  }
  const name = 'Velvet Rose Atelier';
  for (const body of [{ name }, { name, tagline: '' }, { name, tagline: '  ' }, { name, tagline: 'x' }, { name, tagline: 7 }, { name, tagline: 'x'.repeat(161) }]) {
    const res = await owner.post('/api/ai/salon-descriptions', body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.match(res.data.error, /Tagline/);
  }

  assert.equal(modelCalls.length, 0);
});

// Keep this last: it makes the provider fail.
test('falls back to curated descriptions when the provider fails', async () => {
  modelCalls.length = 0;
  const res = await owner.post('/api/ai/salon-descriptions', { name: 'Offline Studio', tagline: TAGLINE });
  assert.equal(res.status, 200);
  assert.equal(res.data.source, 'fallback');
  assert.deepEqual(res.data.descriptions, fallbackSalonDescriptions('Offline Studio', TAGLINE, 0));
  assert.equal(res.data.warnings.length, 1);
  assert.ok(modelCalls.length >= 1, 'the provider was tried first');
});
