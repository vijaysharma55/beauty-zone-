/**
 * Canonical service-catalogue vocabulary shared by the browser and the API.
 *
 * Plain, dependency-free JS (like `staffRoles.js`) so the Express API validates
 * exactly the labels the dashboard renders. Two kinds of values coexist:
 *
 *  - **Preset categories** — the platform defaults (Hair, Nails, Makeup, …).
 *    They are stored with a lowercase key (`hair`, `nails`) so every existing
 *    service row, public template and analytics query keeps working.
 *  - **Custom categories** — anything the salon owner types, stored verbatim.
 *    A custom label is never forced into a preset key, so "Gel Nails" stays a
 *    category of its own instead of silently collapsing into `nails`.
 *
 * Subcategories are always display labels (e.g. "Gel Nails" under `nails`).
 * Preset subcategories are re-spelled to their canonical form so two services
 * typed as "gel nails" and "Gel Nails" land in the same group.
 *
 * @typedef {{ value: string, label: string, subcategories: string[] }} ServiceCategoryPreset
 * @typedef {{ category: string, label: string, total: number, active: number, subcategories: ServiceSubcategoryGroup[] }} ServiceCategoryGroup
 * @typedef {{ subcategory: string, label: string, total: number, services: unknown[] }} ServiceSubcategoryGroup
 */

export const MAX_SERVICE_CATEGORY_LENGTH = 60;
export const MAX_SERVICE_SUBCATEGORY_LENGTH = 60;
export const MAX_SERVICE_NOTES_LENGTH = 1000;

/**
 * Default main categories with their suggested subcategories.
 * Suggestions are only hints: owners can always add their own.
 * @type {ReadonlyArray<ServiceCategoryPreset>}
 */
export const SERVICE_CATEGORY_PRESETS = Object.freeze([
  Object.freeze({
    value: 'hair',
    label: 'Hair',
    subcategories: Object.freeze([
      'Haircut & Styling',
      'Hair Colour',
      'Balayage & Highlights',
      'Keratin & Smoothening',
      'Hair Spa & Treatments',
      'Hair Extensions',
    ]),
  }),
  Object.freeze({
    value: 'nails',
    label: 'Nails',
    subcategories: Object.freeze([
      'Gel Nails',
      'Acrylic Nails',
      'Nail Extensions & Refills',
      'Nail Art',
      'Manicure',
      'Pedicure',
    ]),
  }),
  Object.freeze({
    value: 'makeup',
    label: 'Makeup',
    subcategories: Object.freeze([
      'Bridal Makeup',
      'Party Makeup',
      'HD & Airbrush Makeup',
      'Engagement Makeup',
      'Makeup Lessons',
    ]),
  }),
  Object.freeze({
    value: 'skin',
    label: 'Skin',
    subcategories: Object.freeze([
      'Facial & Cleanup',
      'HydraFacial',
      'Peels & Pigmentation',
      'Acne & Scar Care',
      'Waxing & Threading',
      'Laser & Advanced Care',
    ]),
  }),
  Object.freeze({
    value: 'bridal',
    label: 'Bridal',
    subcategories: Object.freeze([
      'Bridal Makeup',
      'Pre-Bridal Packages',
      'Bridal Hair',
      'Draping & Jewellery Setting',
      'Mehendi & Haldi Looks',
    ]),
  }),
  Object.freeze({
    value: 'spa',
    label: 'Spa',
    subcategories: Object.freeze([
      'Body Massage',
      'Aromatherapy',
      'Body Polishing',
      'Head & Foot Spa',
      'Couple Spa',
    ]),
  }),
  Object.freeze({
    value: 'academy',
    label: 'Academy',
    subcategories: Object.freeze([
      'Makeup Courses',
      'Hair Courses',
      'Nail Courses',
      'Skin Courses',
      'Certification',
    ]),
  }),
  Object.freeze({
    value: 'other',
    label: 'Other',
    subcategories: Object.freeze(['Consultation', 'Add-ons', 'Packages']),
  }),
]);

/** Lowercase preset keys — mirrors the historical `services.category` values. */
export const SERVICE_CATEGORY_KEYS = Object.freeze(SERVICE_CATEGORY_PRESETS.map((preset) => preset.value));

/** Category used when a payload omits one (backwards compatible with 'other'). */
export const DEFAULT_SERVICE_CATEGORY = 'other';

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trim, collapse internal whitespace and strip control characters. */
function cleanLabel(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value
    .replace(CONTROL_CHARS_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

const keyOf = (value) => cleanLabel(value, 200).toLowerCase();

const PRESET_BY_KEY = new Map(SERVICE_CATEGORY_PRESETS.map((preset) => [preset.value, preset]));
const PRESET_BY_LABEL = new Map(SERVICE_CATEGORY_PRESETS.map((preset) => [preset.label.toLowerCase(), preset]));

/** Every preset subcategory label, keyed by lowercase, with its category key. */
const PRESET_SUBCATEGORY_BY_KEY = new Map();
for (const preset of SERVICE_CATEGORY_PRESETS) {
  for (const subcategory of preset.subcategories) {
    const key = subcategory.toLowerCase();
    if (!PRESET_SUBCATEGORY_BY_KEY.has(key)) {
      PRESET_SUBCATEGORY_BY_KEY.set(key, { label: subcategory, category: preset.value });
    }
  }
}

/** The preset behind a category value/label, or null for a custom category. */
export function findServiceCategoryPreset(value) {
  const key = keyOf(value);
  if (!key) return null;
  return PRESET_BY_KEY.get(key) || PRESET_BY_LABEL.get(key) || null;
}

/**
 * Canonical main category.
 *
 * Presets collapse to their lowercase key (`Hair` → `hair`, `NAILS` → `nails`);
 * custom labels are preserved exactly as typed (trimmed and length-capped).
 */
export function normalizeServiceCategory(value) {
  const label = cleanLabel(value, MAX_SERVICE_CATEGORY_LENGTH);
  if (!label) return '';
  return findServiceCategoryPreset(label)?.value || label;
}

/** Canonical subcategory label; known presets get their official spelling. */
export function normalizeServiceSubcategory(value) {
  const label = cleanLabel(value, MAX_SERVICE_SUBCATEGORY_LENGTH);
  if (!label) return '';
  return PRESET_SUBCATEGORY_BY_KEY.get(label.toLowerCase())?.label || label;
}

/** Human label for a stored category value (`hair` → `Hair`, custom kept as-is). */
export function serviceCategoryLabel(value) {
  const label = cleanLabel(value, MAX_SERVICE_CATEGORY_LENGTH);
  if (!label) return 'Uncategorised';
  const preset = findServiceCategoryPreset(label);
  if (preset) return preset.label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Human label for a stored subcategory value. */
export function serviceSubcategoryLabel(value) {
  const label = cleanLabel(value, MAX_SERVICE_SUBCATEGORY_LENGTH);
  return label || 'General';
}

/**
 * Suggested subcategories for a main category.
 * Custom categories have no presets until the owner adds their own.
 */
export function suggestedSubcategories(category) {
  const preset = findServiceCategoryPreset(category);
  return preset ? [...preset.subcategories] : [];
}

const presetOrder = new Map(SERVICE_CATEGORY_PRESETS.map((preset, index) => [preset.value, index]));

/** Deterministic ordering: presets first in canonical order, then custom A–Z. */
function compareCategories(a, b) {
  const ai = presetOrder.has(a) ? presetOrder.get(a) : Number.MAX_SAFE_INTEGER;
  const bi = presetOrder.has(b) ? presetOrder.get(b) : Number.MAX_SAFE_INTEGER;
  if (ai !== bi) return ai - bi;
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

/** Deterministic ordering: suggested subcategories first, then custom A–Z, "General" last. */
function compareSubcategories(category, a, b) {
  if (!a) return 1;
  if (!b) return -1;
  const suggestions = suggestedSubcategories(category).map((item) => item.toLowerCase());
  const ai = suggestions.indexOf(a.toLowerCase());
  const bi = suggestions.indexOf(b.toLowerCase());
  const aRank = ai === -1 ? suggestions.length : ai;
  const bRank = bi === -1 ? suggestions.length : bi;
  if (aRank !== bRank) return aRank - bRank;
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

/**
 * Group a flat service list into main category → subcategory buckets.
 * Never mutates the input; service order inside a bucket is preserved.
 *
 * @param {ReadonlyArray<Record<string, any>>} services
 * @returns {ServiceCategoryGroup[]}
 */
export function groupServicesByCategory(services) {
  const list = Array.isArray(services) ? services : [];
  /** @type {Map<string, { category: string, total: number, active: number, subs: Map<string, unknown[]> }>} */
  const categories = new Map();

  for (const service of list) {
    if (!service) continue;
    const category = normalizeServiceCategory(service.category) || DEFAULT_SERVICE_CATEGORY;
    const subcategory = normalizeServiceSubcategory(service.subcategory);
    if (!categories.has(category)) {
      categories.set(category, { category, total: 0, active: 0, subs: new Map() });
    }
    const group = categories.get(category);
    group.total += 1;
    if (service.active !== false) group.active += 1;
    if (!group.subs.has(subcategory)) group.subs.set(subcategory, []);
    group.subs.get(subcategory).push(service);
  }

  return Array.from(categories.values())
    .sort((a, b) => compareCategories(a.category, b.category))
    .map((group) => ({
      category: group.category,
      label: serviceCategoryLabel(group.category),
      total: group.total,
      active: group.active,
      subcategories: Array.from(group.subs.entries())
        .sort(([a], [b]) => compareSubcategories(group.category, a, b))
        .map(([subcategory, items]) => ({
          subcategory,
          label: serviceSubcategoryLabel(subcategory),
          total: items.length,
          services: items,
        })),
    }));
}

/**
 * Options for the category pickers: every preset (so a fresh catalogue can be
 * built from the suggested vocabulary) plus any custom category already in use.
 *
 * @param {ReadonlyArray<Record<string, any>>} services
 * @param {ReadonlyArray<string>} [extraCategories] categories added in this session
 */
export function serviceCategoryOptions(services, extraCategories = []) {
  const used = new Map();
  for (const service of Array.isArray(services) ? services : []) {
    if (!service) continue;
    const category = normalizeServiceCategory(service.category);
    if (!category) continue;
    if (!used.has(category)) used.set(category, []);
    const subcategory = normalizeServiceSubcategory(service.subcategory);
    if (subcategory && !used.get(category).includes(subcategory)) used.get(category).push(subcategory);
  }
  for (const extra of Array.isArray(extraCategories) ? extraCategories : []) {
    const category = normalizeServiceCategory(extra);
    if (category && !used.has(category)) used.set(category, []);
  }

  const options = [];
  const seen = new Set();
  for (const preset of SERVICE_CATEGORY_PRESETS) {
    const fromServices = used.get(preset.value) || [];
    seen.add(preset.value);
    options.push({
      value: preset.value,
      label: preset.label,
      custom: false,
      subcategories: dedupeLabels([...preset.subcategories, ...fromServices]),
    });
  }
  const customValues = Array.from(used.keys())
    .filter((category) => !seen.has(category))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  for (const category of customValues) {
    options.push({
      value: category,
      label: serviceCategoryLabel(category),
      custom: true,
      subcategories: dedupeLabels(used.get(category) || []),
    });
  }
  return options;
}

/** Case-insensitive de-duplication that keeps the first spelling. */
export function dedupeLabels(values) {
  const out = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const label = cleanLabel(value, MAX_SERVICE_SUBCATEGORY_LENGTH);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}
