import { detectSalonDomain, normalizeSalonContextText, type DomainKey, type ExistingServiceSignal, type SalonDomainResult, type SalonDomainInput } from './detectSalonDomain';
import { getCatalogTemplates, SERVICE_CATALOG, type ServiceTemplate } from './serviceCatalog';

export interface SalonSuggestionContext extends SalonDomainInput {
  detection?: SalonDomainResult;
}

export interface RankedCategory {
  domain: DomainKey;
  category: string;
  label: string;
  recommended: boolean;
  domainRank: number;
}

export interface RankedTemplate extends ServiceTemplate {
  domain: DomainKey;
  category: string;
  categoryLabel: string;
  subcategory: string;
  alreadyAdded: boolean;
  rankScore: number;
}

export interface TemplatePrefill {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  durationMinutes: number;
  price: number;
  priceIsSuggested: boolean;
  priceSource: 'salon-history' | 'catalog-range' | 'catalog-default';
}

const CATEGORY_DOMAIN: Record<string, DomainKey> = {
  hair: 'hair', nails: 'nails', skin: 'skin', makeup: 'makeup',
  bridal: 'bridal', spa: 'spa_massage', barber: 'barber',
  waxing_threading: 'waxing_threading', mehendi: 'mehendi',
};

function normalized(value: unknown): string {
  return normalizeSalonContextText(value).replace(/s\b/g, '');
}

function domainOrder(context: SalonSuggestionContext): DomainKey[] {
  const detection = context.detection || detectSalonDomain(context);
  const preferred = detection.primaryDomain === 'unisex_general'
    ? ['unisex_general' as DomainKey, ...detection.secondaryDomains]
    : [detection.primaryDomain, ...detection.secondaryDomains];
  return [...new Set([...preferred, 'nails', 'hair', 'skin', 'makeup', 'bridal', 'waxing_threading', 'spa_massage', 'barber', 'mehendi', 'unisex_general'])];
}

function getGenderFocus(context: SalonSuggestionContext): 'women' | 'men' | 'unisex' {
  const profile = normalized([context.name, context.tagline, context.about].filter(Boolean).join(' '));
  if (/\b(ladies only|women only|female only|ladies salon|women salon)\b/.test(profile)) return 'women';
  if (/\b(gents only|men only|mens salon|men salon|barber shop|barbershop)\b/.test(profile)) return 'men';
  return 'unisex';
}

function isAlreadyAdded(template: ServiceTemplate, category: string, subcategory: string, services: ExistingServiceSignal[]): boolean {
  const target = normalized(template.name);
  return services.some((service) => {
    const existing = normalized(service?.name);
    if (!existing) return false;
    if (existing === target || existing.includes(target) || target.includes(existing)) return true;
    const sameCategory = normalized(service.category) === normalized(category);
    const sameSubcategory = normalized(service.subcategory) === normalized(subcategory);
    return sameCategory && sameSubcategory && existing.split(' ').filter(Boolean).length > 1 &&
      target.split(' ').filter(Boolean).length > 1 &&
      existing.split(' ').filter((word) => target.split(' ').includes(word)).length >= Math.min(2, target.split(' ').length);
  });
}

function profileKeywordBoost(template: ServiceTemplate, context: SalonSuggestionContext): number {
  const profile = normalized([context.name, context.tagline, context.about].filter(Boolean).join(' '));
  const matches = template.tags.filter((tag) => {
    const clean = normalized(tag);
    return clean.length > 2 && profile.includes(clean);
  }).length;
  return matches * 4;
}

function existingCategoryBoost(category: string, subcategory: string, services: ExistingServiceSignal[]): number {
  return services.reduce((score, service) => {
    if (normalized(service.category) === normalized(category)) return score + 5;
    if (subcategory && normalized(service.subcategory) === normalized(subcategory)) return score + 3;
    return score;
  }, 0);
}

export function rankCategories(context: SalonSuggestionContext): RankedCategory[] {
  const order = domainOrder(context);
  const preferredDomains = new Set(order.slice(0, context.detection?.primaryDomain === 'unisex_general' ? 1 : 1 + (context.detection?.secondaryDomains.length || 0)));
  const rows: RankedCategory[] = [];
  for (const domain of order) {
    for (const category of SERVICE_CATALOG[domain].categories) {
      if (rows.some((row) => row.category === category.key)) continue;
      rows.push({
        domain,
        category: category.key,
        label: category.label,
        recommended: preferredDomains.has(domain),
        domainRank: order.indexOf(domain),
      });
    }
  }
  return rows.sort((a, b) =>
    Number(b.recommended) - Number(a.recommended) ||
    a.domainRank - b.domainRank ||
    a.label.localeCompare(b.label)
  );
}

export function rankTemplates(
  context: SalonSuggestionContext,
  options: { query?: string; includeAlreadyAdded?: boolean; limit?: number } = {}
): RankedTemplate[] {
  const services = Array.isArray(context.existingServices) ? context.existingServices : [];
  const order = domainOrder(context);
  const query = normalized(options.query);
  const gender = getGenderFocus(context);
  const rows: RankedTemplate[] = [];

  order.forEach((domain, domainIndex) => {
    for (const item of getCatalogTemplates(domain)) {
      const alreadyAdded = isAlreadyAdded(item, item.category, item.subcategory, services);
      if (alreadyAdded && !options.includeAlreadyAdded) continue;
      if (gender !== 'unisex' && item.gender && item.gender !== 'unisex' && item.gender !== gender) continue;
      if (query) {
        const searchable = normalized([item.name, item.description, item.categoryLabel, item.subcategory, ...item.tags].join(' '));
        if (!searchable.includes(query)) continue;
      }
      const score = (10 - domainIndex) * 100 +
        item.popularity * 5 +
        existingCategoryBoost(item.category, item.subcategory, services) +
        profileKeywordBoost(item, context);
      rows.push({ ...item, alreadyAdded, rankScore: score });
    }
  });

  rows.sort((a, b) =>
    b.rankScore - a.rankScore ||
    a.name.localeCompare(b.name) ||
    a.id.localeCompare(b.id)
  );
  return typeof options.limit === 'number' ? rows.slice(0, Math.max(0, options.limit)) : rows;
}

function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function buildTemplatePrefill(template: RankedTemplate, context: SalonSuggestionContext): TemplatePrefill {
  const services = Array.isArray(context.existingServices) ? context.existingServices : [];
  const similar = services.filter((service) =>
    normalized(service.category) === normalized(template.category) ||
    (template.subcategory && normalized(service.subcategory) === normalized(template.subcategory))
  );
  const historicalDuration = median(similar.map((service) => Number(service.durationMinutes)));
  const historicalPrices = similar.map((service) => {
    if (Number(service.pricePaise) > 0) return Number(service.pricePaise) / 100;
    return Number(service.price);
  });
  const historicalPrice = median(historicalPrices);
  const range = template.suggestedPriceRange;
  const catalogPrice = range ? Math.round((range[0] + range[1]) / 2) : 0;

  return {
    name: template.name,
    description: template.description,
    category: template.category,
    subcategory: template.subcategory,
    durationMinutes: historicalDuration || template.defaultDurationMin,
    price: historicalPrice || catalogPrice,
    priceIsSuggested: true,
    priceSource: historicalPrice ? 'salon-history' : range ? 'catalog-range' : 'catalog-default',
  };
}

export function getRecommendedDomains(context: SalonSuggestionContext): DomainKey[] {
  const detection = context.detection || detectSalonDomain(context);
  return detection.primaryDomain === 'unisex_general'
    ? ['unisex_general']
    : [detection.primaryDomain, ...detection.secondaryDomains];
}
