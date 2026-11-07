import type { SalonPackage } from '../types';
import { buildFallbackPackageCopy, displayPackageDescription } from './treatmentCopy';
import { LUXURY_PACKAGE_CATALOG } from './luxuryPackageCatalog';
import {
  hydratePackageItem,
  mergeCatalogs,
  sanitizeCatalog,
  catalogsEqual,
  packageHasPricing,
} from './catalogHydration.js';

export const PACKAGE_NAME_SUGGESTIONS = [
  'Royal Heritage Bridal Makeover',
  'Moroccan Botox Hair Revival',
  '24K Gold Hydra Glow Pass',
  'Velvet Touch Body Spa Ritual',
  'Glam Night Sangeet Edit',
  'Regal Bride Signature Edit',
  'Keratin Silk Renewal',
  'Bridal Radiance Countdown',
  'Diamond Glow Skin Ritual',
  'Pearl Luxe Pamper Day',
];

export const PACKAGE_BADGE_SUGGESTIONS = [
  '20% OFF',
  'Best Seller',
  'Trending',
  'Bridal Special',
  'Limited Slots',
  'Bridal Favorite',
  'Festive Pass',
  'New Launch',
  'Few Slots Left',
  'Flat 15% OFF',
  'Top Rated',
  'Couple Offer',
  'Weekend Deal',
  'Premium Pick',
  'Wedding Season',
];

export const PACKAGE_PRESET_IMAGES = [
  {
    label: 'Bridal Makeover & Draping',
    url: '/images/jaipur_royal_bride_1792647664582.jpg',
    category: 'Bridal',
  },
  {
    label: 'Hair Botox & Nanoplastia',
    url: '/images/luxury_hair_nanoplastia_1792647835332.jpg',
    category: 'Hair',
  },
  {
    label: 'Bridal Gel Nail Extensions & Art',
    url: '/images/bridal_nail_art_1792647953738.jpg',
    category: 'Nails',
  },
  {
    label: 'Party Glam & Sangeet Makeup',
    url: '/images/home_salon_service_1790676110547.jpg',
    category: 'Makeup',
  },
  {
    label: 'Ayurvedic Spa & Body Polish',
    url: '/images/prebridal_spa_ritual_1790676123541.jpg',
    category: 'Spa',
  },
  {
    label: 'Luxury Salon Atmosphere',
    url: '/images/jaipur_luxury_salon_1792644552318.jpg',
    category: 'Salon',
  },
  {
    label: 'Academy & Masterclass',
    url: '/images/makeup_academy_class_1792648280089.jpg',
    category: 'Academy',
  },
];

export interface PackagePresetTemplate {
  name: string;
  festivalName: string;
  tagline: string;
  taglineIdeas: [string, string, string];
  description: string;
  duration: string;
  regularPrice: number;
  packagePrice: number;
  validity: string;
  image: string;
  services: string[];
}

export const PACKAGE_PRESET_TEMPLATES: PackagePresetTemplate[] = [
  {
    name: 'Signature Royal Bridal Package',
    festivalName: 'Wedding Season Exclusive Deal',
    tagline: 'Complete head-to-toe makeover for your big day',
    taglineIdeas: [
      'Complete head-to-toe makeover for your big day',
      'Radiate timeless bridal elegance with luxury couture touches',
      'Look picture-perfect with HD airbrush finish & fine jewellery draping'
    ],
    description: 'A comprehensive 2-day royal bridal programme priced at ₹28,500. Session one begins with a complexion and outfit consultation, a 24K Gold Leaf Glow Facial with kesar and ultrasound infusion, Swarovski bridal gel extensions and a rose petal milk body spa. On the wedding day our Chief Artist builds a MAC, Huda Beauty and Temptu HD airbrush base, defines the eyes, sets Kundan jewellery, drapes the lehenga and seals the look for 16+ hours. Ideal for every Indian skin tone and skin type, with a shade-match trial, lashes and touch-up kit included.',
    duration: '2 Days (Wedding Eve & D-Day)',
    regularPrice: 38000,
    packagePrice: 28500,
    validity: 'Wedding Season Pass (Oct - Feb)',
    image: '/images/bridal_makeup_jaipur_1790672008691.jpg',
    services: [
      'Signature Royal HD Bridal Makeover (Airbrush & Jewelry Setting)',
      '24K Gold Leaf Glow Facial with Ultrasound Skin Firming',
      'Bridal Gel Nail Extensions with Swarovski Stones & Gold Foil Art',
      'Rose Petal & Milk Body Spa with Warm Almond Oil Massage'
    ]
  },
  {
    name: 'Festive Celebration Glow Combo',
    festivalName: 'Festive Special Offer',
    tagline: 'Get festive-ready glow with top hair & skin treatments',
    taglineIdeas: [
      'Get festive-ready glow with top hair & skin treatments',
      'Radiate timeless bridal glow for your special celebration evening',
      'Head-to-toe festive pampering at exclusive festival savings'
    ],
    description: 'A 180-minute festive-ready ritual priced at ₹8,400. We start with a skin and hair consultation, then perform a 24K Gold Leaf Glow Facial with real gold, Kashmiri kesar, sandalwood and ultrasound serum infusion for instant glass-skin radiance. A Kérastase wash, precision shape-up and Dyson bouncy blow-dry follow, before a dry Russian manicure with warm paraffin and CND Shellac. Expect luminous, even-toned skin, a frizz-free 3-day blowout and immaculate nails with zero downtime. Ideal for dull, dry and combination skin and all hair textures.',
    duration: '180 mins',
    regularPrice: 12000,
    packagePrice: 8400,
    validity: '60 Days from purchase',
    image: '/images/home_salon_service_1790676110547.jpg',
    services: [
      '24K Gold Leaf Glow Facial with Ultrasound Skin Firming',
      'Haircut, Head Wash & Bouncy Blowdry',
      'Russian Manicure & Warm Paraffin Hand Spa'
    ]
  },
  {
    name: 'Festive Hair Spa & Keratin Deal',
    festivalName: 'Grand Hair Revival Festival',
    tagline: 'Save big on our most requested luxury salon services',
    taglineIdeas: [
      'Save big on our most requested luxury salon services',
      'Transform frizzy locks into mirror-shine silky smooth hair',
      'Chemical-free Moroccan Nanoplastia with revitalizing scalp therapy'
    ],
    description: 'A 210-minute hair revival priced at ₹10,850. After a strand and scalp analysis with a documented patch test, we double-cleanse with L’Oréal Professionnel Metal Detox, apply Olaplex bond protection, infuse a formaldehyde-free Moroccan argan nanoplastia complex, steam-seal and finish with a Kérastase masque. A 7-step HydraFacial MD deep clean and a precision split-end haircut with Dyson blow-dry complete the reset. Expect 5–6 months of frizz-free mirror shine and decongested, hydrated skin. Ideal for frizzy, porous, colour-treated and hard-water damaged hair and oily or congested skin.',
    duration: '210 mins',
    regularPrice: 15500,
    packagePrice: 10850,
    validity: '90 Days from purchase',
    image: '/images/hair_styling_luxe_1790672021591.jpg',
    services: [
      'Moroccan Nanoplastia & Hair Botox Treatment (Chemical-Free)',
      'Hydra-Facial Deep Clean with Blackhead Removal',
      'Haircut, Head Wash & Bouncy Blowdry'
    ]
  },
  {
    name: 'Grand Party & Gala Prep Pack',
    festivalName: 'Festive Gala Sale',
    tagline: 'Sparkle bright this season with 7-step glass skin glow & glam makeup',
    taglineIdeas: [
      'Sparkle bright this season with 7-step glass skin glow & glam makeup',
      'Get festive celebration ready in just 3 hours with deep pampering',
      'Save big on our most requested luxury salon services'
    ],
    description: 'A 190-minute celebration edit priced at ₹9,450. Begin with an illuminating 24K Gold Leaf Glow Facial using real gold, kesar and ultrasound infusion, followed by long-wear waterproof HD party makeup with Charlotte Tilbury, Huda Beauty and MAC glitter pigments plus Ardell lashes. A Dyson-styled soft-wave finish and CND/OPI gel extensions with Swarovski and 24K gold foil art complete the look. Expect 10–12 hours of dance-proof glam, glass-skin radiance and 4-week chip-proof nails. Ideal for normal, dry and combination skin and all hair textures.',
    duration: '190 mins',
    regularPrice: 13500,
    packagePrice: 9450,
    validity: '60 Days from purchase',
    image: '/images/prebridal_spa_ritual_1790676123541.jpg',
    services: [
      'Sangeet & Party Glam Makeup (Dewy Glow & Soft Waves)',
      '24K Gold Leaf Glow Facial with Ultrasound Skin Firming',
      'Bridal Gel Nail Extensions with Swarovski Stones & Gold Foil Art'
    ]
  },
  {
    name: 'Summer Hydration Glow Kit',
    festivalName: 'Summer Sun Shield & De-Tan Sale',
    tagline: 'Deep hydration, cooling cleanse and herbal de-tan for glowing summer skin',
    taglineIdeas: [
      'Beat the summer heat with refreshing icy HydraFacial',
      'Complete sun damage repair and cooling mint body polish',
      'Deeply hydrate, tone and protect your skin against harsh UV damage'
    ],
    description: 'A 150-minute warm-weather skin reset priced at ₹6,650. A magnified skin analysis opens the ritual, followed by a genuine 7-step HydraFacial MD with painless vortex blackhead extraction, glycolic resurfacing, hyaluronic serum infusion, LED therapy and cooling ice globes. A rose petal and milk body spa with warm almond oil massage and steam follows, and a dry Russian manicure with paraffin and CND Shellac finishes the hands. Expect clearer pores, deep hydration, softer skin and zero downtime. Ideal for oily, congested, tanned, dull and combination skin.',
    duration: '150 mins',
    regularPrice: 9500,
    packagePrice: 6650,
    validity: '30 Days from purchase',
    image: '/images/jaipur_luxury_salon_1792644552318.jpg',
    services: [
      'Hydra-Facial Deep Clean with Blackhead Removal',
      'Rose Petal & Milk Body Spa with Warm Almond Oil Massage',
      'Russian Manicure & Warm Paraffin Hand Spa'
    ]
  }
];

export function generateTaglineIdeas(packageName: string): [string, string, string] {
  const lower = packageName.toLowerCase();
  
  if (lower.includes('bridal') || lower.includes('wedding') || lower.includes('dulhan')) {
    return [
      'Complete head-to-toe makeover for your big day',
      'Radiate timeless bridal elegance with luxury couture touches',
      'Look picture-perfect with HD airbrush finish and royal jewellery draping'
    ];
  }
  if (lower.includes('hair') || lower.includes('botox') || lower.includes('keratin') || lower.includes('spa')) {
    return [
      'Save big on our most requested luxury salon services',
      'Transform frizzy locks into mirror-shine smooth hair',
      'Chemical-free Moroccan Nanoplastia with revitalizing scalp therapy'
    ];
  }
  if (lower.includes('glow') || lower.includes('skin') || lower.includes('facial') || lower.includes('hydra')) {
    return [
      'Get festive-ready glow with top hair & skin treatments',
      'Recharge tired skin with deep ultrasound hydration & 24K gold leaf',
      'Flawless glass skin radiance designed for all-season comfort'
    ];
  }
  if (lower.includes('party') || lower.includes('sangeet') || lower.includes('glam') || lower.includes('diwali')) {
    return [
      'Sparkle bright at every festive celebration with HD glam',
      'Get festive-ready glow with top hair & skin treatments',
      'Save big on our most requested luxury salon services'
    ];
  }
  return [
    `Complete head-to-toe makeover with verified salon savings`,
    `Get festive-ready glow with top hair & skin treatments`,
    `Save big on our most requested luxury salon services`
  ];
}

export const OUTLET_OPTIONS = [
  'All Salon Outlets',
  'Downtown Flagship Salon',
  'South Avenue Studio & Academy',
  'Westside Luxury Salon',
  'Doorstep Home Service'
];

export const VALIDITY_OPTIONS = [
  '30 Days from purchase',
  '60 Days from purchase',
  '90 Days from purchase',
  '180 Days (6 Months)',
  '365 Days (1 Year)',
  'Wedding Season Pass (Oct - Feb)'
];

export const DEFAULT_USAGE_RULES = [
  'Please book your appointment at least 24 hours in advance',
  'Valid across selected salon studio branches',
  'Cannot be transferred to another person once started',
  'Includes free skin & hair consultation before the service',
  'Can be used across 2 visits within the validity period'
];

export function calculateSavings(regularPrice: number, packagePrice: number) {
  const safeRegular = Math.max(0, regularPrice);
  const safePackage = Math.max(0, packagePrice);
  const savings = Math.max(0, safeRegular - safePackage);
  const discountPercent = safeRegular > 0 ? Math.round((savings / safeRegular) * 100) : 0;
  return {
    savings,
    discountPercent,
  };
}

/**
 * Public master package catalog. Full editorial copy lives in
 * ./luxuryPackageCatalog.ts; every package has a rich description and a
 * published, non-zero price so no card ever shows a blank or "price on request".
 */
export const INITIAL_PACKAGES: SalonPackage[] = LUXURY_PACKAGE_CATALOG;

const PACKAGES_STORAGE_KEY = 'whitelabel_salon_packages_v3';
const PACKAGE_SEED_MIGRATION_PREFIX = `${PACKAGES_STORAGE_KEY}_seed_v1_`;
const LEGACY_PACKAGE_KEYS = ['whitelabel_salon_packages_v2'];
const NEW_PACKAGE_IDS = [
  'pkg-royal-heritage-bridal-makeover',
  'pkg-moroccan-botox-hair-revival',
  'pkg-24k-gold-hydra-glow-pass',
  'pkg-glam-night-sangeet-edit',
  'pkg-velvet-touch-body-spa-ritual',
];

const isPlaceholder = (value?: string) => {
  const text = (value || '').trim().toLowerCase();
  return !text || text === 'confirm with salon' || text.startsWith('please confirm availability');
};

/**
 * Content enrichment for package catalogues saved by older builds.
 *
 * Short/missing descriptions are replaced with the full luxury editorial
 * record and any zero or "confirm with salon" price, validity, outlet or term
 * is filled with the published value. Longer owner-written copy and custom
 * packages are preserved. This means no card can ever render a blank tile or
 * a disabled "Pricing pending" booking button.
 */
/**
 * Non-destructive content enrichment for package catalogues.
 *
 * Custom owner pricing (including a genuine 0), names, images and written
 * copy are preserved. Only blank/legacy descriptions and missing fields are
 * filled; short owner copy is extended rather than replaced. No public card
 * can render a blank tile or a disabled "Pricing pending" booking button.
 */
export function enrichPackageCatalog(
  items: SalonPackage[],
  canonical: SalonPackage[] = INITIAL_PACKAGES
): SalonPackage[] {
  const byId = new Map(canonical.map((pkg) => [pkg.id, pkg]));
  return (sanitizeCatalog(items) as SalonPackage[]).map((pkg) => {
    const fallback = {
      ...buildFallbackPackageCopy(pkg),
      validity: '90 Days from purchase',
      outlets: ['All Salon Outlets'],
      usage_rules: DEFAULT_USAGE_RULES,
    };
    return hydratePackageItem(pkg, byId.get(pkg.id) || null, fallback) as SalonPackage;
  });
}

/**
 * Cloud/local cache reconciliation: cloud order wins, blank fields are
 * repaired from the local cache, and locally created custom packages survive
 * a partial cloud read. Enrichment is applied exactly once afterwards.
 */
export function reconcilePackageCatalogs(
  cloud: SalonPackage[] | null,
  local: SalonPackage[],
  canonical: SalonPackage[] = INITIAL_PACKAGES
): SalonPackage[] {
  if (!cloud) return enrichPackageCatalog(local, canonical);
  return enrichPackageCatalog(mergeCatalogs(cloud, local) as SalonPackage[], canonical);
}

export function mergeNewPackagesOnce(
  existing: SalonPackage[],
  scope: string
): { packages: SalonPackage[]; added: boolean } {
  if (typeof window === 'undefined') return { packages: existing, added: false };

  const marker = `${PACKAGE_SEED_MIGRATION_PREFIX}${scope}`;
  try {
    if (localStorage.getItem(marker) === 'done') {
      return { packages: existing, added: false };
    }

    const existingIds = new Set(existing.map((pkg) => pkg.id));
    const additions = INITIAL_PACKAGES.filter(
      (pkg) => NEW_PACKAGE_IDS.includes(pkg.id) && !existingIds.has(pkg.id)
    );
    localStorage.setItem(marker, 'done');
    return { packages: [...existing, ...additions], added: additions.length > 0 };
  } catch (error) {
    console.error('[packages] Package catalog migration could not be recorded:', error);
    const existingIds = new Set(existing.map((pkg) => pkg.id));
    const additions = INITIAL_PACKAGES.filter(
      (pkg) => NEW_PACKAGE_IDS.includes(pkg.id) && !existingIds.has(pkg.id)
    );
    return { packages: [...existing, ...additions], added: additions.length > 0 };
  }
}

export function getStoredPackages(): SalonPackage[] {
  if (typeof window === 'undefined') return INITIAL_PACKAGES;
  try {
    LEGACY_PACKAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    const raw = localStorage.getItem(PACKAGES_STORAGE_KEY);
    if (!raw) {
      saveStoredPackages(INITIAL_PACKAGES);
      return INITIAL_PACKAGES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const safe = sanitizeCatalog(parsed) as SalonPackage[];
      const migration = mergeNewPackagesOnce(safe, 'local-cache');
      const normalized = enrichPackageCatalog(migration.packages);
      if (migration.added || !catalogsEqual(normalized, parsed)) {
        saveStoredPackages(normalized);
      }
      return normalized;
    }
    return INITIAL_PACKAGES;
  } catch (err) {
    console.error('Failed reading packages from localStorage', err);
    return INITIAL_PACKAGES;
  }
}

export function saveStoredPackages(packages: SalonPackage[]): void {
  if (typeof window === 'undefined') return;
  try {
    const verified = (sanitizeCatalog(packages) as SalonPackage[]).map((pkg) => {
      const { savings, discountPercent } = calculateSavings(pkg.regular_price, pkg.package_price);
      return {
        ...pkg,
        savings,
        discount: discountPercent,
      };
    });
    localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(verified));
  } catch (err) {
    console.error('Failed writing packages to localStorage', err);
  }
}

/** True when a package has a genuine published price. */
export const hasPackagePricing = (pkg: SalonPackage): boolean => packageHasPricing(pkg);

/** Public, never-empty description for a package card. */
export const packageCardDescription = (pkg: SalonPackage): string => displayPackageDescription(pkg);
