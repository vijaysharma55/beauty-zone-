/**
 * Salon tagline suggestions — rules shared by the browser and the API.
 *
 * Plain, dependency-free JS (like `roles.js` and `staffRoles.js`) so the
 * `POST /api/ai/salon-taglines` endpoint and the dashboard's offline fallback
 * can never drift apart. This module owns:
 *  - the brand-strategist prompt and its `{{Salon_Name}}` placeholder
 *  - parsing and validating a model answer (a JSON array of 3 short strings)
 *  - the deterministic curated suggestions used when no model is reachable
 */

/** Every suggestion round returns exactly this many options. */
export const SALON_TAGLINE_COUNT = 3;
/** The prompt asks for "under 8-10 words"; longer answers are discarded. */
export const SALON_TAGLINE_MAX_WORDS = 10;
/** A single word ("Radiance") is a label, not a tagline. */
export const SALON_TAGLINE_MIN_WORDS = 2;
/** Mirrors the `tagline` validators in `server/routes/salon.js` and `admin.js`. */
export const SALON_TAGLINE_MAX_LENGTH = 160;
export const SALON_NAME_MIN_LENGTH = 2;
export const SALON_NAME_MAX_LENGTH = 120;
/** How many already-shown taglines a "more ideas" request may ask to skip. */
export const SALON_TAGLINE_EXCLUDE_LIMIT = 30;

/**
 * The prompt sent to the model. `{{Salon_Name}}` is the only placeholder and is
 * filled by `buildSalonTaglinePrompt()` — never send this template as-is.
 */
export const SALON_TAGLINE_PROMPT = `You are an expert brand strategist for beauty and wellness businesses.

Salon Name: "{{Salon_Name}}"

Tasks:
1. Generate 3 distinct, professional, and catchy taglines suitable for this salon.
2. Keep each tagline under 8-10 words.
3. Make them modern, engaging, and polished.

Response Format:
Return ONLY a JSON array of 3 string options. Example:
[
  "Tagline Option 1",
  "Tagline Option 2",
  "Tagline Option 3"
]`;

const SALON_NAME_PLACEHOLDER = /\{\{\s*Salon_Name\s*\}\}/g;
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]+/g;
/** The prompt's own example values, in case a model echoes them back. */
const PROMPT_EXAMPLE = /^tagline option \d+$/i;
/** Opening → closing quote a model may leave around an option. */
const QUOTE_PAIRS = { '"': '"', '“': '”', '`': '`', "'": "'", '‘': '’' };

const collapseWhitespace = (value) => value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ */
/* Salon name + prompt                                                 */
/* ------------------------------------------------------------------ */

/**
 * Single-line, length-capped salon name. Line breaks and control characters
 * become spaces, so a name can never add extra lines to the prompt.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeSalonName(value) {
  if (typeof value !== 'string') return '';
  const clean = collapseWhitespace(value);
  if (clean.length <= SALON_NAME_MAX_LENGTH) return clean;
  let capped = '';
  // Iterate by code point so an emoji is never cut in half.
  for (const char of clean) {
    if (capped.length + char.length > SALON_NAME_MAX_LENGTH) break;
    capped += char;
  }
  return capped.trim();
}

/**
 * Fills `{{Salon_Name}}` in the prompt. Throws rather than ever sending the
 * prompt with an empty name.
 *
 * @param {unknown} salonName
 * @returns {string}
 */
export function buildSalonTaglinePrompt(salonName) {
  // The name sits inside straight double quotes in the prompt; keep it there.
  const name = normalizeSalonName(salonName).replace(/"/g, "'");
  if (!name) throw new TypeError('A salon name is required to build the tagline prompt.');
  // A replacer function keeps `$&`-style sequences in a name literal.
  return SALON_TAGLINE_PROMPT.replace(SALON_NAME_PLACEHOLDER, () => name);
}

/* ------------------------------------------------------------------ */
/* Validating a single tagline                                         */
/* ------------------------------------------------------------------ */

/**
 * Counts real words; stand-alone symbols such as "&" or "—" do not count.
 *
 * @param {unknown} text
 * @returns {number}
 */
export function countWords(text) {
  return String(text ?? '')
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/**
 * Strips list markers, wrapping quotes and markdown emphasis from one option.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function cleanSalonTagline(value) {
  if (typeof value !== 'string') return '';
  let text = collapseWhitespace(value)
    .replace(/\*\*|__/g, '')
    .replace(/^(?:[-*•·–—]|\d{1,2}[.)])\s+/, '')
    .replace(/,$/, '')
    .trim();
  for (let pass = 0; pass < 3 && text.length > 2; pass += 1) {
    const open = text[0];
    const close = QUOTE_PAIRS[open];
    const inner = text.slice(1, -1);
    const isItalic = (open === '*' || open === '_') && text.endsWith(open) && !inner.includes(open);
    // `"A" and "B"` is two quoted words, not one wrapped option. Apostrophes
    // are too common inside a tagline for that check to apply to single quotes.
    const isQuoted = close === text[text.length - 1] && (open === "'" || open === '‘' || !inner.includes(close));
    if (!isItalic && !isQuoted) break;
    text = inner.trim();
  }
  return text;
}

/**
 * Whether an already-cleaned option is usable as a salon tagline.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidSalonTagline(value) {
  if (typeof value !== 'string' || value.length > SALON_TAGLINE_MAX_LENGTH) return false;
  if (PROMPT_EXAMPLE.test(value)) return false;
  const words = countWords(value);
  return words >= SALON_TAGLINE_MIN_WORDS && words <= SALON_TAGLINE_MAX_WORDS;
}

const comparisonKey = (tagline) =>
  tagline
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/**
 * Cleans, validates and de-duplicates candidates, keeping at most `limit`.
 * Appends to `picked` and skips anything listed in `excluded`.
 */
function collectTaglines(candidates, limit, picked = [], excluded = []) {
  const seen = new Set([...picked, ...excluded].map(comparisonKey));
  for (const candidate of candidates) {
    if (picked.length >= limit) break;
    const tagline = cleanSalonTagline(candidate);
    if (!isValidSalonTagline(tagline)) continue;
    const key = comparisonKey(tagline);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(tagline);
  }
  return picked;
}

/* ------------------------------------------------------------------ */
/* Parsing a model answer                                              */
/* ------------------------------------------------------------------ */

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Flattens `["…"]`, `[{"tagline": "…"}]` and `{"taglines": ["…"]}` into strings. */
function stringsFromJson(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return Object.values(item).find((entry) => typeof entry === 'string') ?? '';
      }
      return '';
    });
  }
  if (value && typeof value === 'object') {
    const entries = Object.values(value);
    const list = entries.find(Array.isArray);
    return list ? stringsFromJson(list) : entries.filter((entry) => typeof entry === 'string');
  }
  return [];
}

function extractCandidates(raw) {
  // Models often wrap JSON in a ```json fence even when told not to.
  const text = raw.replace(/```[a-z0-9_-]*/gi, '').trim();

  const whole = tryParseJson(text);
  if (whole !== undefined) return stringsFromJson(whole);

  // A JSON array surrounded by prose ("Here are your taglines: [...]").
  const end = text.lastIndexOf(']');
  let start = text.indexOf('[');
  for (let attempt = 0; start !== -1 && start < end && attempt < 20; attempt += 1) {
    const parsed = tryParseJson(text.slice(start, end + 1));
    if (Array.isArray(parsed)) return stringsFromJson(parsed);
    start = text.indexOf('[', start + 1);
  }

  // A cut-off or malformed array: keep every complete string literal in it.
  const open = text.indexOf('[');
  if (open !== -1) {
    const literals = text.slice(open).match(/"(?:[^"\\]|\\.)*"/g) || [];
    const strings = literals.map(tryParseJson).filter((entry) => typeof entry === 'string');
    if (strings.length > 0) return strings;
  }

  // Not JSON at all: accept a bulleted, numbered or quoted list, one per line
  // (but not a lead-in such as `"Velvet Rose" could use:`).
  return text
    .split(/\r?\n/)
    .filter((line) => /^\s*(?:[-*•·]|\d{1,2}[.)]|["“'`])/.test(line) && !/:\s*$/.test(line));
}

/**
 * Turns a raw model answer into at most `SALON_TAGLINE_COUNT` clean, distinct,
 * valid taglines. Returns an empty array when nothing usable is found.
 *
 * @param {unknown} text
 * @returns {string[]}
 */
export function parseSalonTaglines(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  return collectTaglines(extractCandidates(text), SALON_TAGLINE_COUNT);
}

/* ------------------------------------------------------------------ */
/* Curated suggestions (no model required)                             */
/* ------------------------------------------------------------------ */

const GENERAL_LINES = Object.freeze([
  'Where Beauty Meets Confidence',
  'Your Glow, Perfected in Every Detail',
  'Effortless Style, Expertly Crafted',
  'Step In. Glow Out.',
  'Beauty That Feels Like You',
  'Modern Beauty, Timeless Care',
  'Look Radiant. Feel Unstoppable.',
  'Elevate Your Everyday Beauty',
  'Signature Style Starts Here',
  'Expert Hands, Stunning Results',
  'Because You Deserve to Shine',
  'Polished Looks, Personal Touch',
]);

/** Lines tailored to what the salon name says it specialises in. */
const THEMED_LINES = Object.freeze([
  {
    match: /brid(?:e|al)|wedding|dulhan|shaadi|mehe?ndi/,
    lines: [
      'Your Dream Bridal Look, Brought to Life',
      'Timeless Bridal Beauty for Your Big Day',
      'Where Every Bride Finds Her Glow',
      'Flawless Looks for Unforgettable Moments',
    ],
  },
  {
    match: /barber|\bgents\b|\bmen['’]?s\b|\bgroom(?:ing|ers?)?\b/,
    lines: [
      'Sharp Cuts, Sharper Confidence',
      'Grooming, Refined for the Modern Man',
      'Classic Craft, Contemporary Style',
      'Precision Grooming, Effortless Edge',
    ],
  },
  {
    match: /nail|manicure|pedicure/,
    lines: [
      'Polished to Perfection, Every Time',
      'Nails That Speak Your Style',
      'Tiny Details, Flawless Finish',
      'Artistry at Your Fingertips',
    ],
  },
  {
    match: /spas?\b|wellness|ayurved|massage|retreat|therap/,
    lines: [
      'Relax, Renew and Radiate',
      'Your Escape to Calm and Glow',
      'Wellness That Shows on Your Skin',
      'Pause. Breathe. Glow.',
    ],
  },
  {
    match: /skin|derma|clinic|aesthetic|facial|laser/,
    lines: [
      'Healthy Skin, Radiant Confidence',
      'Reveal Your Most Radiant Skin',
      'Expert Care for Skin That Glows',
      'Skin Care That Truly Cares',
    ],
  },
  {
    match: /make-?\s?up|\bmua\b|artistry|\bglam/,
    lines: [
      'Camera-Ready Glam for Every Occasion',
      'Artistry That Brings Out Your Best',
      'Glam That Lasts All Day',
      'Makeup Made for Your Moment',
    ],
  },
  {
    match: /hair|tresses|\blocks\b|\bcuts?\b|scissor|blow\s?dry/,
    lines: [
      'Great Hair Days Start Here',
      'Hair That Turns Heads',
      'Healthy Hair, Beautifully Styled',
      'Your Hair, Your Signature',
    ],
  },
]);

/** FNV-1a: a stable seed so different salons start on different lines. */
function hashName(name) {
  let hash = 2166136261;
  for (const char of name) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const rotate = (list, by) => {
  const offset = list.length ? by % list.length : 0;
  return [...list.slice(offset), ...list.slice(0, offset)];
};

/** Every curated line for this name, most relevant first. */
function curatedDeck(salonName) {
  const name = normalizeSalonName(salonName).toLowerCase();
  const seed = hashName(name);
  const themes = THEMED_LINES.filter((theme) => theme.match.test(name)).map((theme) => rotate(theme.lines, seed));
  const themed = [];
  for (let row = 0; themes.some((lines) => row < lines.length); row += 1) {
    for (const lines of themes) if (row < lines.length) themed.push(lines[row]);
  }
  const general = rotate(GENERAL_LINES, seed);

  // Two tailored lines, then one all-purpose line, until both lists run out.
  const deck = [];
  let t = 0;
  let g = 0;
  while (t < themed.length || g < general.length) {
    if (t < themed.length) deck.push(themed[t++]);
    if (t < themed.length) deck.push(themed[t++]);
    if (g < general.length) deck.push(general[g++]);
  }
  return deck;
}

/**
 * "More ideas" page number: a whole number from 0 to 9999.
 *
 * @param {unknown} variant
 * @returns {number}
 */
export function normalizeTaglineVariant(variant) {
  const value = Math.floor(Number(variant));
  return Number.isFinite(value) && value > 0 ? Math.min(value, 9999) : 0;
}

/**
 * The taglines a "more ideas" request has already shown (most recent last), so
 * they are not offered again. Lenient by design: anything that is not a short
 * string is ignored, and only the latest `SALON_TAGLINE_EXCLUDE_LIMIT` count.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeTaglineExclusions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-SALON_TAGLINE_EXCLUDE_LIMIT)
    .filter((entry) => typeof entry === 'string' && entry.length <= SALON_TAGLINE_MAX_LENGTH)
    .map(collapseWhitespace)
    .filter(Boolean);
}

/**
 * Tops a (possibly empty) list of model taglines up to `SALON_TAGLINE_COUNT`
 * with curated lines. `variant` pages through the curated lines so "more
 * ideas" shows something new even without a model, and nothing listed in
 * `exclude` is returned while an alternative is left.
 *
 * @param {unknown} candidates
 * @param {unknown} salonName
 * @param {unknown} [variant]
 * @param {unknown} [exclude] taglines already shown to the user
 * @returns {string[]}
 */
export function completeSalonTaglines(candidates, salonName, variant = 0, exclude = []) {
  const shown = normalizeTaglineExclusions(exclude);
  const picked = collectTaglines(Array.isArray(candidates) ? candidates : [], SALON_TAGLINE_COUNT, [], shown);
  if (picked.length >= SALON_TAGLINE_COUNT) return picked;
  const deck = curatedDeck(salonName);
  const page = rotate(deck, (normalizeTaglineVariant(variant) * SALON_TAGLINE_COUNT) % deck.length);
  collectTaglines(page, SALON_TAGLINE_COUNT, picked, shown);
  // Every curated line has been shown already: start the deck again.
  return collectTaglines(page, SALON_TAGLINE_COUNT, picked);
}

/**
 * Deterministic curated taglines: the same name, variant and exclusions always
 * return the same three options.
 *
 * @param {unknown} salonName
 * @param {unknown} [variant]
 * @param {unknown} [exclude] taglines already shown to the user
 * @returns {string[]}
 */
export function fallbackSalonTaglines(salonName, variant = 0, exclude = []) {
  return completeSalonTaglines([], salonName, variant, exclude);
}
