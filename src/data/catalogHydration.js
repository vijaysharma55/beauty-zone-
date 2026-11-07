/**
 * Framework-free catalogue hydration / cache-merging primitives.
 *
 * Design contract (important for 100k+ users and for owner trust):
 *  1. Owner-authored data is NEVER overwritten: titles, prices (including a
 *     deliberate 0 / "price on consultation"), images, durations and any
 *     non-empty copy are preserved byte-for-byte.
 *  2. Only blank/legacy-placeholder descriptions are replaced. Short but
 *     genuine owner copy is *appended to* with canonical editorial detail so it
 *     is enriched without losing the owner's words.
 *  3. Missing structured fields (process steps, benefits, idealFor, brands,
 *     price notes) are filled from the master catalog or a generated fallback.
 *  4. Cloud + local caches are merged by id: cloud wins for shared records,
 *     local-only custom records are kept, and missing fields are repaired from
 *     the other source. Nothing is silently dropped on a partial cloud read.
 *  5. Input arrays are never mutated (safe for React state and concurrent
 *     readers), and malformed/oversized caches are sanitised before use.
 *
 * Plain JS so the same logic can be exhaustively unit-tested in Node.
 */

export const MAX_CATALOG_ITEMS = 500;
export const SHORT_DESCRIPTION_THRESHOLD = 200;

/** Exact legacy stubs shipped by older builds. Anything else is owner copy. */
export const LEGACY_DESCRIPTIONS = new Set([
  'confirm with salon',
  'please confirm availability',
  'please confirm availability and pricing with the salon',
  'luxury salon service',
  'signature treatment',
  'bridal package',
  'coming soon',
  'n/a',
  'tbd',
  '-',
]);

/** @param {unknown} value @returns {string} */
export function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** @param {unknown} value @returns {boolean} */
export function isBlank(value) { return cleanText(value).length === 0; }

/** @param {unknown} value @returns {boolean} */
export function isLegacyDescription(value) {
  const text = cleanText(value).toLowerCase();
  return !text || LEGACY_DESCRIPTIONS.has(text) || text.startsWith('please confirm availability');
}

/**
 * Preserve a finite, non-negative number even when it is 0. Only missing,
 * NaN or negative values fall back to the canonical value.
 * @param {unknown} value
 * @param {unknown} fallback
 * @returns {number}
 */
export function preserveNumber(value, fallback) {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (Number.isFinite(numeric) && numeric >= 0) return numeric;
  const backup = typeof fallback === 'number' ? fallback : Number(fallback);
  return Number.isFinite(backup) && backup >= 0 ? backup : 0;
}

/** @param {unknown} value @returns {boolean} */
function hasItems(value) {
  return Array.isArray(value) && value.some((entry) => cleanText(entry).length > 0);
}

/** @param {unknown} value @returns {string[]} */
function strings(value) {
  return Array.isArray(value) ? value.filter((entry) => cleanText(entry).length > 0) : [];
}

/**
 * Enrich a description without discarding owner-authored text.
 * @param {unknown} ownerText
 * @param {unknown} canonicalText
 * @returns {string}
 */
export function hydrateDescription(ownerText, canonicalText) {
  const owner = cleanText(ownerText);
  const canonical = cleanText(canonicalText);
  if (isLegacyDescription(owner)) return canonical || owner;
  if (!canonical || owner === canonical) return owner;
  if (owner.length >= SHORT_DESCRIPTION_THRESHOLD) return owner;
  // Do not duplicate copy that is already partially present.
  if (owner.includes(canonical.slice(0, 80)) || canonical.includes(owner)) return owner;
  return `${owner}\n\n${canonical}`;
}

/**
 * Fill editorial fields that are missing, leaving owner values untouched.
 * @param {any} item
 * @param {any} canonical
 * @param {any} fallback
 * @returns {Record<string, unknown>}
 */
export function hydrateEditorial(item, canonical, fallback) {
  const pick = (key, arrayKey = false) => {
    const own = arrayKey ? hasItems(item?.[key]) : !isBlank(item?.[key]);
    if (own) return item[key];
    const fromCanonical = arrayKey ? hasItems(canonical?.[key]) : !isBlank(canonical?.[key]);
    if (fromCanonical) return canonical[key];
    const fromFallback = arrayKey ? hasItems(fallback?.[key]) : !isBlank(fallback?.[key]);
    return fromFallback ? fallback[key] : item?.[key];
  };
  return {
    processSteps: pick('processSteps', true),
    benefits: pick('benefits', true),
    idealFor: pick('idealFor'),
    productsUsed: pick('productsUsed', true),
    priceNote: pick('priceNote'),
  };
}

/**
 * Copy only blank/missing fields from `extra` into `base`.
 * Used to repair a partial cloud record from the local cache (or vice versa).
 * @param {any} base @param {any} extra
 */
export function fillMissingFields(base, extra) {
  if (!extra || typeof extra !== 'object') return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const current = out[key];
    const currentEmpty = Array.isArray(current)
      ? current.length === 0
      : typeof current === 'string'
        ? current.trim() === ''
        : current === undefined || current === null || (typeof current === 'number' && !Number.isFinite(current));
    if (!currentEmpty) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Sanitise a parsed localStorage/cloud payload before it reaches React state.
 * @param {unknown} items
 * @returns {any[]}
 */
export function sanitizeCatalog(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const id = cleanText(raw.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ ...raw, id });
    if (out.length >= MAX_CATALOG_ITEMS) break;
  }
  return out;
}

/**
 * Merge a published/cloud catalogue with the local fallback cache by id.
 * Cloud order wins for shared records, but every blank field is repaired from
 * the local record and local-only custom cards are appended, so a partial or
 * stale cloud read can never delete an owner's work.
 *
 * The result is intentionally *raw*: callers run their own enrichment
 * afterwards so the master editorial catalog is always applied exactly once.
 *
 * @param {any[]} preferred  Cloud/published records (authoritative order).
 * @param {any[]} fallback   Local cache records (source of custom-only items).
 * @returns {any[]}
 */
export function mergeCatalogs(preferred, fallback) {
  const primary = sanitizeCatalog(preferred);
  const secondary = sanitizeCatalog(fallback);
  const byId = new Map(secondary.map((item) => [item.id, item]));
  const merged = primary.map((item) => fillMissingFields(item, byId.get(item.id)));
  const primaryIds = new Set(primary.map((item) => item.id));
  for (const item of secondary) {
    if (primaryIds.has(item.id)) continue;
    merged.push({ ...item });
  }
  return merged;
}

/**
 * @param {any} item @param {any} canonical @param {any} fallback
 * @returns {any}
 */
export function hydrateServiceItem(item, canonical, fallback) {
  if (!item || typeof item !== 'object' || !cleanText(item.id)) return item;
  const reference = canonical || {};
  const generated = fallback || reference || {};
  const description = hydrateDescription(
    item.description,
    reference.description || generated.description || ''
  );
  return {
    ...item,
    title: cleanText(item.title) || cleanText(reference.title) || 'Signature Luxury Treatment',
    description,
    // 0 is a deliberate owner value (complimentary / price on consultation).
    price: preserveNumber(item.price, reference.price),
    duration: cleanText(item.duration) || cleanText(reference.duration) || '60 mins',
    estimatedDuration:
      cleanText(item.estimatedDuration) || cleanText(item.duration) ||
      cleanText(reference.duration) || '60 mins',
    highlights: hasItems(item.highlights) ? item.highlights : (hasItems(reference.highlights) ? reference.highlights : strings(generated.benefits).slice(0, 4)),
    image: item.image || reference.image || undefined,
    ...hydrateEditorial(item, reference, generated),
  };
}

/**
 * @param {any} item @param {any} canonical @param {any} fallback
 * @returns {any}
 */
export function hydratePackageItem(item, canonical, fallback) {
  if (!item || typeof item !== 'object' || !cleanText(item.id)) return item;
  const reference = canonical || {};
  const generated = fallback || {};
  const regularPrice = preserveNumber(item.regular_price, reference.regular_price);
  const packagePrice = preserveNumber(item.package_price, reference.package_price ?? regularPrice);
  const expectedSavings = Math.max(0, regularPrice - packagePrice);
  const expectedDiscount = regularPrice > 0 ? Math.round((expectedSavings / regularPrice) * 100) : 0;
  const savingsIsValid = Number.isFinite(Number(item.savings)) && Number(item.savings) === expectedSavings;
  const discountIsValid = Number.isFinite(Number(item.discount)) && Number(item.discount) === expectedDiscount;
  const description = hydrateDescription(
    item.description,
    reference.description || generated.description || ''
  );
  const placeholder = (value) => isLegacyDescription(value);
  return {
    ...item,
    name: cleanText(item.name) || cleanText(reference.name) || 'Curated Luxury Package',
    tagline: cleanText(item.tagline) || cleanText(reference.tagline) || '',
    offer_name: cleanText(item.offer_name) || cleanText(reference.offer_name) || 'Special Offer',
    description,
    services: hasItems(item.services) ? item.services : (hasItems(reference.services) ? reference.services : []),
    duration: cleanText(item.duration) || cleanText(reference.duration) || '120 mins',
    regular_price: regularPrice,
    package_price: packagePrice,
    savings: savingsIsValid ? item.savings : expectedSavings,
    discount: discountIsValid ? item.discount : expectedDiscount,
    validity: placeholder(item.validity)
      ? (cleanText(reference.validity) || cleanText(generated.validity) || '90 Days from purchase')
      : item.validity,
    outlets: hasItems(item.outlets)
      ? item.outlets.filter((entry) => !placeholder(entry))
      : (hasItems(reference.outlets)
        ? reference.outlets
        : hasItems(generated.outlets) ? generated.outlets : ['All Salon Outlets']),
    usage_rules: hasItems(item.usage_rules)
      ? item.usage_rules.filter((entry) => !placeholder(entry))
      : (hasItems(reference.usage_rules)
        ? reference.usage_rules
        : hasItems(generated.usage_rules) ? generated.usage_rules : []),
    image: item.image || reference.image || '/images/jaipur_luxury_salon_1792644552318.jpg',
    ...hydrateEditorial(item, reference, generated),
  };
}

/** @param {any} item @returns {boolean} */
export function serviceHasPricing(item) { return Number(item?.price) > 0; }
/** @param {any} item @returns {boolean} */
export function packageHasPricing(item) { return Number(item?.package_price) > 0; }

/** Cheap structural equality used to avoid rewriting localStorage on every read. */
export function catalogsEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
