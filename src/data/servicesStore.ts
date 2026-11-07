import type { ServiceItem } from '../types';
import { SALON_SERVICES } from './salonData';
import { buildFallbackServiceCopy, displayServiceDescription } from './treatmentCopy';
import {
  hydrateServiceItem,
  mergeCatalogs,
  sanitizeCatalog,
  catalogsEqual,
  serviceHasPricing,
} from './catalogHydration.js';

const SERVICES_STORAGE_KEY = 'whitelabel_salon_services_v3';
const LEGACY_SERVICE_KEYS = ['whitelabel_salon_services_v2'];

/**
 * One-time content enrichment for catalogues saved by older builds and for
 * cloud-published catalogues fetched on hydration.
 *
 * Owner-authored titles, prices (including a deliberate 0), images, durations
 * and non-empty copy are preserved. Blank/legacy descriptions are replaced;
 * short owner copy is extended with canonical editorial detail; missing
 * protocol/benefit/brand fields are filled from the master catalog or a
 * category-specific fallback. No card can render a blank description.
 */
export function enrichServiceCatalog(
  items: ServiceItem[],
  canonical: ServiceItem[] = SALON_SERVICES
): ServiceItem[] {
  const byId = new Map(canonical.map((service) => [service.id, service]));
  return (sanitizeCatalog(items) as ServiceItem[]).map((item) =>
    hydrateServiceItem(item, byId.get(item.id) || null, buildFallbackServiceCopy(item)) as ServiceItem
  );
}

/**
 * Cloud/local cache reconciliation. Cloud records keep their order, blank
 * fields are repaired from the local cache, and owner-created local-only cards
 * are retained. Enrichment is applied once to the merged result.
 */
export function reconcileServiceCatalogs(
  cloud: ServiceItem[] | null,
  local: ServiceItem[],
  canonical: ServiceItem[] = SALON_SERVICES
): ServiceItem[] {
  if (!cloud) return enrichServiceCatalog(local, canonical);
  return enrichServiceCatalog(mergeCatalogs(cloud, local) as ServiceItem[], canonical);
}

export const getStoredServices = (): ServiceItem[] => {
  if (typeof localStorage === 'undefined') return SALON_SERVICES;
  try {
    LEGACY_SERVICE_KEYS.forEach((key) => localStorage.removeItem(key));
    const raw = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // An empty array is a valid saved catalog (all items deleted).
      if (Array.isArray(parsed)) {
        const safe = sanitizeCatalog(parsed) as ServiceItem[];
        const enriched = enrichServiceCatalog(safe);
        // Only write when something actually changed: avoids a localStorage
        // write on every page view for high-traffic, cached sessions.
        if (!catalogsEqual(enriched, parsed)) saveStoredServices(enriched);
        return enriched;
      }
    }
  } catch (e) {
    console.error('Failed to load services from localStorage', e);
  }
  return SALON_SERVICES;
};

export const saveStoredServices = (services: ServiceItem[]): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    // Cap the payload so a corrupted/custom catalog cannot exceed the 5 MB
    // localStorage quota and take the whole site down.
    localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(sanitizeCatalog(services)));
  } catch (e) {
    console.error('Failed to save services to localStorage', e);
  }
};

/**
 * Explicitly saves a base64 encoded image string to the service catalog.
 */
export const persistServiceImage = (serviceId: string, base64Image: string): void => {
  const services = getStoredServices();
  const updated = services.map((s) => (s.id === serviceId ? { ...s, image: base64Image } : s));
  saveStoredServices(updated);
};

/** Non-empty description used by compact surfaces such as the booking picker. */
export const serviceCardDescription = (service: ServiceItem): string => displayServiceDescription(service);

/** True when a card has a genuine published price (0 means "on consultation"). */
export const hasServicePricing = (service: ServiceItem): boolean => serviceHasPricing(service);
