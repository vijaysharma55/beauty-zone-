/**
 * AI assist endpoints.
 *
 * These back the "AI" affordances in the white-label studio and owner dashboard:
 *  - POST /api/ai/taglines      → 3 marketing taglines for a package/service
 *  - POST /api/ai/description   → short SEO-ish service description
 *  - POST /api/ai/review-reply  → polite owner reply to a client review
 *  - GET  /api/ai/status        → whether a model is wired up
 *
 * Design contract (no hard dependency on an external provider):
 *  * If GEMINI_API_KEY is configured, the request is forwarded to Google Generative AI.
 *  * If it is missing, the model call fails, times out or returns junk, we fall back to
 *    deterministic, local template generation and still answer `200 OK` with
 *    `source: 'fallback'` so the UI never blocks on a dead provider.
 *  * Every provider failure is logged with `[ai]` prefix and surfaced in the response
 *    `warnings` array for observability.
 *
 * Rate limited: these are unauthenticated-by-design but cheap; tune via env if needed.
 */

import { Router } from 'express';
import { str, rateLimit, ValidationError } from '../security.js';
import { requireAuth } from '../middleware.js';

export const aiRouter = Router();

const aiLimiter = rateLimit({ windowMs: 60_000, max: 30, key: 'ai' });

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 12_000);

/** Lazily loads the SDK so a missing/optional dependency never breaks boot. */
let genaiModule = null;
let genaiLoadError = null;
async function getGenAi() {
  if (genaiModule) return genaiModule;
  if (genaiLoadError) return null;
  try {
    genaiModule = await import('@google/genai');
    return genaiModule;
  } catch (err) {
    genaiLoadError = err;
    console.warn('[ai] @google/genai unavailable, using local fallbacks:', err.message);
    return null;
  }
}

export function aiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Calls Gemini with a hard timeout; resolves `null` on any failure. */
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { text: null, warning: 'AI provider not configured' };

  const sdk = await getGenAi();
  if (!sdk?.GoogleGenAI) return { text: null, warning: 'AI SDK unavailable' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const client = new sdk.GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.8,
        maxOutputTokens: 400,
        abortSignal: controller.signal,
      },
    });
    const text =
      response?.text ??
      response?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join(' ') ??
      '';
    if (!text || !text.trim()) return { text: null, warning: 'AI returned an empty response' };
    return { text: text.trim(), warning: null };
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'AI request timed out' : `AI provider error: ${err.message}`;
    console.error('[ai]', reason);
    return { text: null, warning: reason };
  } finally {
    clearTimeout(timer);
  }
}

/** Splits a model bullet/JSON-ish answer into up to `count` clean lines. */
function parseLines(text, count) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^["']|["']$/g, '').trim())
    .filter((line) => line.length > 2 && line.length < 160)
    .slice(0, count);
}

/* ------------------------------------------------------------------ */
/* Deterministic fallbacks — always available, no network required     */
/* ------------------------------------------------------------------ */

function fallbackTaglines(name, count) {
  const clean = String(name || 'Signature Package').replace(/\s+/g, ' ').trim();
  const pool = [
    `${clean} — crafted for your most photographed day`,
    `Radiance that lasts: the ${clean} experience`,
    `Book ${clean} and glow from ceremony to send-off`,
    `${clean}: premium products, master artists, zero stress`,
    `Your signature look starts with ${clean}`,
  ];
  return pool.slice(0, count);
}

function fallbackDescription(input) {
  const name = String(input?.name || 'this service').trim();
  const category = String(input?.category || 'beauty').trim();
  const minutes = Number(input?.durationMinutes) || 60;
  return `A ${minutes}-minute ${category} treatment — ${name} — delivered by certified specialists using premium, skin-safe products. Includes a personalised consultation, professional after-care guidance and a finish designed to last.`;
}

function fallbackReviewReply(input) {
  const rating = Number(input?.rating) || 5;
  const clientName = String(input?.clientName || '').trim();
  const salonName = String(input?.salonName || 'our studio').trim();
  const greeting = clientName ? `Hi ${clientName},` : 'Hi,';
  const body =
    rating >= 4
      ? `thank you for the lovely words! We're delighted you enjoyed your visit to ${salonName}, and we can't wait to welcome you back.`
      : `thank you for taking the time to share this. We're sorry your experience with ${salonName} missed the mark — please DM us or call the studio so we can make it right.`;
  return `${greeting} ${body}`;
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

aiRouter.get('/status', (_req, res) => {
  res.json({
    configured: aiConfigured(),
    model: MODEL,
    fallbackEnabled: true,
    note: aiConfigured()
      ? 'Live model enabled; deterministic fallback used on any provider failure.'
      : 'Set GEMINI_API_KEY to enable live generation. Deterministic fallback is active.',
  });
});

aiRouter.post('/taglines', aiLimiter, async (req, res, next) => {
  try {
    const name = str(req.body?.name ?? req.body?.packageName, { min: 2, max: 120, field: 'Package name', required: true });
    const count = Math.min(5, Math.max(1, Number(req.body?.count) || 3));
    const prompt = `Write ${count} distinct, luxurious marketing taglines for a salon package named "${name}". Return one per line, no numbering, no quotes, max 12 words each.`;
    const { text, warning } = await callGemini(prompt);
    let taglines = text ? parseLines(text, count) : [];
    let source = 'ai';
    if (taglines.length < count) {
      const local = fallbackTaglines(name, count);
      const merged = [...taglines];
      for (const line of local) {
        if (merged.length >= count) break;
        if (!merged.includes(line)) merged.push(line);
      }
      taglines = merged.slice(0, count);
      source = text ? 'ai+fallback' : 'fallback';
    }
    res.json({ taglines, source, warnings: warning ? [warning] : [] });
  } catch (err) {
    if (err instanceof ValidationError) return next(err);
    console.error('[ai] taglines handler failed', err.message);
    const name = String(req.body?.name ?? req.body?.packageName ?? 'Signature Package');
    res.json({ taglines: fallbackTaglines(name, 3), source: 'fallback', warnings: ['Generation failed; used local templates.'] });
  }
});

aiRouter.post('/description', aiLimiter, async (req, res, next) => {
  try {
    const name = str(req.body?.name, { min: 2, max: 120, field: 'Service name', required: true });
    const category = str(req.body?.category, { max: 40, field: 'Category' }) || 'beauty';
    const durationMinutes = Math.min(1440, Math.max(5, Number(req.body?.durationMinutes) || 60));
    const prompt = `Write one concise, warm marketing description (2 sentences, under 45 words) for a salon service named "${name}" in the ${category} category that takes ${durationMinutes} minutes. Plain text only.`;
    const { text, warning } = await callGemini(prompt);
    const description = text ? text.replace(/\s+/g, ' ').trim() : fallbackDescription({ name, category, durationMinutes });
    res.json({ description, source: text ? 'ai' : 'fallback', warnings: warning ? [warning] : [] });
  } catch (err) {
    if (err instanceof ValidationError) return next(err);
    console.error('[ai] description handler failed', err.message);
    res.json({ description: fallbackDescription(req.body || {}), source: 'fallback', warnings: ['Generation failed; used local template.'] });
  }
});

aiRouter.post('/review-reply', requireAuth, aiLimiter, async (req, res, next) => {
  try {
    const reviewText = str(req.body?.reviewText, { max: 2000, field: 'Review text' });
    const clientName = str(req.body?.clientName, { max: 80, field: 'Client name' });
    const salonName = str(req.body?.salonName, { max: 120, field: 'Salon name' }) || 'our studio';
    const rating = Math.min(5, Math.max(1, Number(req.body?.rating) || 5));
    const prompt = `You are the owner of "${salonName}" replying to a ${rating}-star client review${reviewText ? `: """${reviewText}"""` : ''}. Write a warm, professional 2-sentence reply. Plain text only.`;
    const { text, warning } = await callGemini(prompt);
    const reply = text ? text.replace(/\s+/g, ' ').trim() : fallbackReviewReply({ clientName, salonName, rating });
    res.json({ reply, source: text ? 'ai' : 'fallback', warnings: warning ? [warning] : [] });
  } catch (err) {
    if (err instanceof ValidationError) return next(err);
    console.error('[ai] review-reply handler failed', err.message);
    res.json({ reply: fallbackReviewReply(req.body || {}), source: 'fallback', warnings: ['Generation failed; used local template.'] });
  }
});

/* Any other /api/ai/* path answers with a clear, actionable 404 instead of hanging. */
aiRouter.use((req, res) => {
  res.status(404).json({ error: `Unknown AI endpoint: ${req.method} ${req.baseUrl}${req.path}` });
});

export default aiRouter;
