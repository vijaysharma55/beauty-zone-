/**
 * Salon "About Us" description suggestions — rules shared by the browser and
 * the API, built on the tagline rules in `salonTaglines.js`.
 *
 * Plain, dependency-free JS so the `POST /api/ai/salon-descriptions` endpoint
 * and the dashboard's offline fallback can never drift apart. This module owns:
 *  - the copywriter prompt and its `{{Salon_Name}}` / `{{Selected_Tagline}}`
 *    placeholders
 *  - parsing and validating a model answer (a JSON array of 3 descriptions,
 *    one per tone, in a fixed order)
 *  - the deterministic curated descriptions used when no model is reachable
 */

import {
  collapseWhitespace,
  countWords,
  extractJsonStrings,
  hashName,
  normalizeSalonName,
  normalizeSalonTagline,
  normalizeSuggestionVariant,
  unwrapQuotes,
} from './salonTaglines.js';

/**
 * The tone of each option, in the order the prompt asks for them. A model
 * answer is matched to these by position.
 */
export const SALON_DESCRIPTION_TONES = Object.freeze(['Elegant & Premium', 'Modern & Trendy', 'Warm & Customer-Centric']);
/** Every suggestion round returns exactly one description per tone. */
export const SALON_DESCRIPTION_COUNT = SALON_DESCRIPTION_TONES.length;
/**
 * The prompt asks for "around 45-65 words". Models miss a word target by a
 * little, so only answers far outside it (a label, an essay) are discarded.
 */
export const SALON_DESCRIPTION_MIN_WORDS = 30;
export const SALON_DESCRIPTION_MAX_WORDS = 90;
/** Far below the 3000 characters the salon `description` validators accept. */
export const SALON_DESCRIPTION_MAX_LENGTH = 1000;
/** A selected tagline needs at least this many characters to be a basis. */
export const SALON_DESCRIPTION_TAGLINE_MIN_LENGTH = 2;

/**
 * The prompt sent to the model. `{{Salon_Name}}` and `{{Selected_Tagline}}`
 * are the only placeholders and are filled by `buildSalonDescriptionPrompt()`
 * — never send this template as-is.
 */
export const SALON_DESCRIPTION_PROMPT = `You are a professional copywriter for salon websites.

Salon Name: "{{Salon_Name}}"
Selected Tagline: "{{Selected_Tagline}}"

Task:
Generate 3 distinct "About Us" descriptions for this salon. Each option should cover experience, luxury, and quality services, but with a different tone:
1. Option 1: Elegant & Premium (Focus on high-end luxury, relaxation, and elite service).
2. Option 2: Modern & Trendy (Focus on style, contemporary trends, and personalized care).
3. Option 3: Warm & Customer-Centric (Focus on welcoming atmosphere, expertise, and complete makeover experience).

Constraints:
- Length: Around 45-65 words per option.
- No markdown formatting in descriptions.

Response Format:
Return ONLY a JSON array of 3 strings. Example:
[
  "Description Option 1",
  "Description Option 2",
  "Description Option 3"
]`;

const PLACEHOLDER = /\{\{\s*(Salon_Name|Selected_Tagline)\s*\}\}/g;
/** "Option 2:", "Description Option 2 -" … a label a model may put first. */
const OPTION_LABEL = /^(?:description\s+)?option\s*\d+\s*[:.\-–—]?\s*/i;
/** "Elegant & Premium:", "(Modern & Trendy) -" … the tone used as a heading. */
const TONE_LABEL =
  /^\(?\s*(?:elegant\s*(?:&|and)\s*premium|modern\s*(?:&|and)\s*trendy|warm\s*(?:&|and)\s*customer[-\s]?centric)\s*\)?\s*[:\-–—]\s*/i;

/* ------------------------------------------------------------------ */
/* Prompt                                                              */
/* ------------------------------------------------------------------ */

/**
 * Fills `{{Salon_Name}}` and `{{Selected_Tagline}}` in the prompt. Throws
 * rather than ever sending the prompt with either of them empty.
 *
 * @param {unknown} salonName
 * @param {unknown} tagline the tagline the owner selected
 * @returns {string}
 */
export function buildSalonDescriptionPrompt(salonName, tagline) {
  // Both values sit inside straight double quotes in the prompt; keep them there.
  const name = normalizeSalonName(salonName).replace(/"/g, "'");
  const line = normalizeSalonTagline(tagline).replace(/"/g, "'");
  if (!name) throw new TypeError('A salon name is required to build the description prompt.');
  if (!line) throw new TypeError('A tagline is required to build the description prompt.');
  // One pass with a replacer function: a name that itself contains
  // "{{Selected_Tagline}}" or `$&` stays literal.
  return SALON_DESCRIPTION_PROMPT.replace(PLACEHOLDER, (_match, key) => (key === 'Salon_Name' ? name : line));
}

/* ------------------------------------------------------------------ */
/* Validating a single description                                     */
/* ------------------------------------------------------------------ */

/**
 * Turns one option into a single plain-text paragraph: no markdown, no
 * "Option 1:" or tone heading, no wrapping quotes.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function cleanSalonDescription(value) {
  if (typeof value !== 'string') return '';
  const text = collapseWhitespace(value)
    .replace(/\*\*|__|`/g, '')
    // *emphasis* around a word or phrase.
    .replace(/(^|[\s(“"])\*(\S(?:[^*]*\S)?)\*(?=[\s.,;:!?)”"]|$)/g, '$1$2')
    .replace(/^#{1,6}\s+/, '')
    .replace(/^(?:[-*•·]|\d{1,2}[.)])\s+/, '')
    .replace(OPTION_LABEL, '')
    .replace(TONE_LABEL, '');
  return unwrapQuotes(text);
}

/**
 * Whether an already-cleaned option is usable as an "About Us" description.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidSalonDescription(value) {
  if (typeof value !== 'string' || value.length > SALON_DESCRIPTION_MAX_LENGTH) return false;
  // An unfilled placeholder echoed back from the prompt.
  if (/\{\{|\}\}/.test(value)) return false;
  const words = countWords(value);
  return words >= SALON_DESCRIPTION_MIN_WORDS && words <= SALON_DESCRIPTION_MAX_WORDS;
}

const comparisonKey = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** The longest string of `{"tone": "…", "description": "…"}` is the description. */
const longestString = (strings) => strings.reduce((longest, entry) => (entry.length > longest.length ? entry : longest));

/* ------------------------------------------------------------------ */
/* Parsing a model answer                                              */
/* ------------------------------------------------------------------ */

/**
 * Reads a raw model answer into one slot per tone, in the prompt's order.
 * A slot is `null` when its option is missing, unusable or a repeat, so a bad
 * option never shifts the others onto the wrong tone.
 *
 * Only JSON answers are accepted (code fences, surrounding prose, wrapper
 * objects and a cut-off array are tolerated): in free text there is no
 * reliable way to tell which paragraph belongs to which tone.
 *
 * @param {unknown} text
 * @returns {(string | null)[]} always `SALON_DESCRIPTION_COUNT` entries
 */
export function parseSalonDescriptions(text) {
  const slots = Array.from({ length: SALON_DESCRIPTION_COUNT }, () => null);
  if (typeof text !== 'string' || !text.trim()) return slots;
  const candidates = extractJsonStrings(text, longestString);
  if (!candidates) return slots;

  const seen = new Set();
  candidates.slice(0, SALON_DESCRIPTION_COUNT).forEach((candidate, index) => {
    const description = cleanSalonDescription(candidate);
    if (!isValidSalonDescription(description)) return;
    const key = comparisonKey(description);
    if (seen.has(key)) return;
    seen.add(key);
    slots[index] = description;
  });
  return slots;
}

/* ------------------------------------------------------------------ */
/* Curated descriptions (no model required)                            */
/* ------------------------------------------------------------------ */

/** A tagline longer than this reads as a paragraph, not a motto to quote. */
const QUOTABLE_TAGLINE_MAX_WORDS = 12;

/**
 * Three curated descriptions per tone. Each has a `body` that names the salon,
 * a `motto` sentence that quotes the selected tagline, and a `closing` used
 * instead when there is no quotable tagline. Written to land inside the
 * prompt's 45-65 words for an everyday salon name and tagline.
 */
const CURATED = Object.freeze([
  // Elegant & Premium: high-end luxury, relaxation and elite service.
  [
    {
      body: (salon) =>
        `At ${salon.inline}, luxury lives in the details. Our experienced stylists and beauty experts pair premium products with unhurried, attentive service, so every appointment feels like a private retreat. Expect refined hair, skin and beauty care in a serene setting.`,
      motto: (tagline) => `${tagline} is more than our tagline; it is the promise behind every visit.`,
      closing: 'It is elite service, delivered with quiet confidence, every single time.',
    },
    {
      body: (salon) =>
        `${salon.start} is a sanctuary of refined beauty. Guided by years of experience, our team delivers flawless hair, skin and beauty services with the finest products and a calm, indulgent pace. Every detail is considered, so you can simply relax.`,
      motto: (tagline) => `${tagline} is the standard of luxury we hold ourselves to every day.`,
      closing: 'This is the elite standard of care our guests return for.',
    },
    {
      body: (salon) =>
        `Step into ${salon.inline} and leave the rush behind. Our seasoned professionals offer premium hair, skin and beauty treatments, tailored with precision and delivered with discreet, attentive care. From the first welcome to the final touch, every moment feels indulgent.`,
      motto: (tagline) => `${tagline} is the experience we create for every guest we welcome.`,
      closing: 'This is high-end beauty, designed entirely around your comfort.',
    },
  ],
  // Modern & Trendy: style, contemporary trends and personalised care.
  [
    {
      body: (salon) =>
        `${salon.start} is where fresh trends meet expert hands. Our experienced stylists stay ahead of the latest cuts, colours and skin innovations, then tailor every look to your lifestyle. Premium products and a stylish space make high-end beauty feel effortless.`,
      motto: (tagline) => `${tagline} is not just a line on our door; it is how we work.`,
      closing: 'Walk in with an idea and walk out with a look you love.',
    },
    {
      body: (salon) =>
        `Bold ideas, skilled hands and zero guesswork: that is the ${salon.inline} way. Our experienced team blends contemporary techniques with premium products to create looks that suit your style, schedule and personality. Every service is personalised, polished and made to turn heads.`,
      motto: (tagline) => `${tagline} sums up what to expect each time you visit.`,
      closing: 'Think of us as your studio for style that stays current.',
    },
    {
      body: (salon) =>
        `At ${salon.inline}, your style sets the brief. Our experienced team keeps up with what is next in hair, skin and beauty, pairing on-trend techniques with luxurious products and one-to-one advice. The result is a look that feels current and completely you.`,
      motto: (tagline) => `${tagline} is the idea behind everything we do.`,
      closing: 'Modern beauty and expert care, in a studio worth returning to.',
    },
  ],
  // Warm & Customer-Centric: welcoming atmosphere, expertise, complete makeover.
  [
    {
      body: (salon) =>
        `Welcome to ${salon.inline}, where every guest is greeted like family. Our experienced, caring team listens first, then creates a complete makeover experience across hair, skin and beauty, using premium products in a comfortable, luxurious space.`,
      motto: (tagline) => `${tagline} is the promise we keep for every guest, at every visit.`,
      closing: 'You relax, and we take care of the rest, every single time.',
    },
    {
      body: (salon) =>
        `At ${salon.inline}, you are more than an appointment. Our friendly experts bring years of experience to every service, from a quick refresh to a head-to-toe makeover, with quality products and a touch of everyday luxury. We listen, advise and genuinely care.`,
      motto: (tagline) => `${tagline} is the promise at the heart of our salon.`,
      closing: 'Your comfort and confidence always come first with us.',
    },
    {
      body: (salon) =>
        `${salon.start} was built around one idea: feeling at home while you are pampered. Our skilled, experienced team offers trusted hair, skin and beauty services with premium products and honest advice. From your first hello, we look after your complete makeover.`,
      motto: (tagline) => `${tagline} is more than a slogan; it is how we care.`,
      closing: 'Sit back, relax and let us bring out your best.',
    },
  ],
]);

/** How many curated descriptions each tone has. */
const CURATED_VARIANTS = CURATED[0].length;

/**
 * Deterministic curated descriptions, one per tone: the same name, tagline and
 * variant always return the same three options, and each `variant` ("more
 * ideas") moves every tone on to its next text.
 *
 * @param {unknown} salonName
 * @param {unknown} [tagline] the tagline the owner selected
 * @param {unknown} [variant]
 * @returns {string[]} always `SALON_DESCRIPTION_COUNT` entries
 */
export function fallbackSalonDescriptions(salonName, tagline = '', variant = 0) {
  const name = normalizeSalonName(salonName);
  const salon = { start: name || 'Our salon', inline: name || 'our salon' };
  // The motto is quoted, so quotation marks inside it would only confuse.
  const motto = normalizeSalonTagline(tagline).replace(/["“”]/g, '').trim();
  const words = countWords(motto);
  const quoted = words > 0 && words <= QUOTABLE_TAGLINE_MAX_WORDS ? `“${motto}”` : '';
  const index = (hashName(name.toLowerCase()) + normalizeSuggestionVariant(variant)) % CURATED_VARIANTS;
  return CURATED.map((tone) => {
    const curated = tone[index];
    return `${curated.body(salon)} ${quoted ? curated.motto(quoted) : curated.closing}`;
  });
}

/**
 * Fills every empty or unusable slot of a parsed model answer with the
 * curated description for that tone, so the result always has one usable
 * description per tone, in the prompt's order.
 *
 * @param {unknown} candidates one entry per tone, as `parseSalonDescriptions()` returns
 * @param {unknown} salonName
 * @param {unknown} [tagline]
 * @param {unknown} [variant]
 * @returns {string[]} always `SALON_DESCRIPTION_COUNT` entries
 */
export function completeSalonDescriptions(candidates, salonName, tagline = '', variant = 0) {
  const list = Array.isArray(candidates) ? candidates : [];
  const seen = new Set();
  return fallbackSalonDescriptions(salonName, tagline, variant).map((curated, index) => {
    const description = cleanSalonDescription(list[index]);
    const key = comparisonKey(description);
    if (!isValidSalonDescription(description) || seen.has(key)) return curated;
    seen.add(key);
    return description;
  });
}
