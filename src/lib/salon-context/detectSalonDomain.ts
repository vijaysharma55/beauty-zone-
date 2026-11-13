export type DomainKey =
  | 'nails' | 'hair' | 'skin' | 'makeup' | 'spa_massage'
  | 'barber' | 'bridal' | 'waxing_threading' | 'mehendi' | 'unisex_general';

export interface ExistingServiceSignal {
  name?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  durationMinutes?: number;
  pricePaise?: number;
  price?: number;
}

export interface SalonDomainInput {
  name?: string | null;
  tagline?: string | null;
  about?: string | null;
  primaryCategory?: string | null;
  existingServices?: ExistingServiceSignal[];
}

export interface SalonDomainResult {
  primaryDomain: DomainKey;
  secondaryDomains: DomainKey[];
  confidence: number;
  signals: string[];
  scores: Record<DomainKey, number>;
}

const DOMAIN_KEYWORDS: Record<Exclude<DomainKey, 'unisex_general'>, string[]> = {
  nails: ['nail', 'nails', 'manicure', 'pedicure', 'gel polish', 'acrylic', 'polygel', 'nail art', 'nail extension', 'extension nails', 'chrome nails', 'cat eye'],
  hair: ['hair', 'haircut', 'hair cut', 'hair color', 'hair colour', 'keratin', 'smoothening', 'rebonding', 'balayage', 'highlights', 'blow dry', 'hair spa', 'scalp', 'hairstyle'],
  skin: ['skin', 'facial', 'cleanup', 'clean up', 'glow', 'derma', 'hydrafacial', 'hydra facial', 'detan', 'de tan', 'bleach', 'peel', 'pigmentation', 'acne', 'skin care', 'beauty'],
  makeup: ['makeup', 'make up', 'makeup artist', 'hd makeup', 'airbrush', 'party makeup', 'saree draping', 'draping'],
  spa_massage: ['spa', 'massage', 'therapy', 'aroma', 'aromatherapy', 'reflexology', 'body polish', 'wellness', 'head massage'],
  barber: ['barber', 'barbershop', 'gents', 'gent salon', 'men salon', 'mens salon', 'men\'s salon', 'beard', 'shave', 'shaving', 'mens grooming', 'male grooming'],
  bridal: ['bridal', 'bride', 'wedding', 'pre bridal', 'engagement', 'bridal studio', 'bridal makeup'],
  waxing_threading: ['wax', 'waxing', 'threading', 'eyebrow', 'upperlip', 'upper lip', 'full arms', 'full legs', 'underarms'],
  mehendi: ['mehendi', 'mehandi', 'henna', 'mehndi', 'bridal henna'],
};

const DOMAIN_ORDER: DomainKey[] = [
  'nails', 'hair', 'skin', 'makeup', 'spa_massage',
  'barber', 'bridal', 'waxing_threading', 'mehendi', 'unisex_general',
];

const emptyScores = (): Record<DomainKey, number> => ({
  nails: 0, hair: 0, skin: 0, makeup: 0, spa_massage: 0,
  barber: 0, bridal: 0, waxing_threading: 0, mehendi: 0, unisex_general: 0,
});

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywordMatches(text: string, keyword: string): boolean {
  if (!text) return false;
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return false;
  const escaped = normalizedKeyword.split(' ').map((part) =>
    part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/s$/, 's?')
  ).join('\\s+');
  return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, 'i').test(text);
}

function detectMatches(value: unknown): string[] {
  const text = normalizeText(value);
  const found: string[] = [];
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS) as [Exclude<DomainKey, 'unisex_general'>, string[]][]) {
    const matches = keywords.filter((keyword) => keywordMatches(text, keyword));
    if (matches.length) found.push(domain);
  }
  return found;
}

export function detectSalonDomain(input: SalonDomainInput = {}): SalonDomainResult {
  const scores = emptyScores();
  const signals: string[] = [];
  const add = (domain: Exclude<DomainKey, 'unisex_general'>, points: number, signal: string) => {
    scores[domain] += points;
    signals.push(signal);
  };

  const explicit = normalizeText(input.primaryCategory);
  const explicitDomains = explicit ? detectMatches(explicit) : [];
  if (explicit) {
    const matches = explicitDomains;
    for (const domain of matches) add(domain, 5, `primary category indicates ${domain.replace('_', ' ')}`);
  }

  const nameMatches = detectMatches(input.name);
  for (const domain of nameMatches) add(domain, 4, `salon name contains ${domain.replace('_', ' ')} signal`);

  const taglineMatches = detectMatches(input.tagline);
  for (const domain of taglineMatches) add(domain, 3, `tagline contains ${domain.replace('_', ' ')} signal`);

  const services = Array.isArray(input.existingServices) ? input.existingServices : [];
  const serviceCounts = emptyScores();
  for (const service of services) {
    const matches = new Set([
      ...detectMatches(service?.name),
      ...detectMatches(service?.category),
      ...detectMatches(service?.subcategory),
    ]);
    for (const domain of matches) serviceCounts[domain] += 1;
  }
  for (const domain of DOMAIN_ORDER) {
    if (domain === 'unisex_general' || serviceCounts[domain] === 0) continue;
    const count = serviceCounts[domain];
    add(domain, 3 * Math.min(count, 5), `${count} existing service${count === 1 ? '' : 's'} in ${domain.replace('_', ' ')}`);
  }

  const aboutMatches = detectMatches(input.about);
  for (const domain of aboutMatches) add(domain, 2, `about text mentions ${domain.replace('_', ' ')}`);

  const ranked = DOMAIN_ORDER
    .filter((domain): domain is Exclude<DomainKey, 'unisex_general'> => domain !== 'unisex_general')
    .map((domain) => ({ domain, score: scores[domain] }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain));

  if (!ranked.length || ranked[0].score < 3) {
    return { primaryDomain: 'unisex_general', secondaryDomains: [], confidence: 0, signals, scores };
  }

  const top = ranked[0];
  const runnerUp = ranked[1];
  // Ambiguous signals should not force a specialty. Keep the generic ordering.
  if (runnerUp && !explicitDomains.includes(top.domain) && top.score - runnerUp.score <= Math.max(1.25, top.score * 0.12)) {
    return {
      primaryDomain: 'unisex_general',
      secondaryDomains: ranked.slice(0, 4).map((item) => item.domain),
      confidence: Math.min(1, top.score / 16),
      signals: [...signals, 'multiple salon domains have nearly equal evidence'],
      scores,
    };
  }

  const secondaryDomains = ranked
    .slice(1)
    .filter((item) => item.score >= 1.5 && item.score >= top.score * 0.22)
    .map((item) => item.domain);

  return {
    primaryDomain: top.domain,
    secondaryDomains,
    confidence: Math.min(1, top.score / 16),
    signals,
    scores,
  };
}

export function normalizeSalonContextText(value: unknown): string {
  return normalizeText(value);
}
