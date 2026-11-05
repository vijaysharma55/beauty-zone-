import { SalonPackage } from '../types';

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
    description: 'Comprehensive 2-day royal makeover for brides. Includes HD Airbrush makeup, 24K Gold Leaf facial, bridal nail extensions, and milk body spa.',
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
    description: 'Festive ready in 3 hours with instant glass skin gold facial, bouncy blowdry hair styling, hand manicure & luxury spa care.',
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
    description: 'Transform rough, frizzy hair into silky smooth tresses with 100% formaldehyde-free nanoplastia, deep scalp spa and precision split-end haircut.',
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
    description: 'The ultimate party glow package featuring waterproof HD makeup, 24K Gold luxury facial, and festive nail art extensions.',
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
    description: 'Cooling, purifying package designed for warm weather. Removes sun tan, extracts blackheads, and delivers deep hyaluronic skin hydration.',
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

export const INITIAL_PACKAGES: SalonPackage[] = [
  {
    id: 'pkg-royal-bridal-glow',
    name: 'The Royal Bridal Glow & Draping Package',
    description: 'Our complete wedding package. Includes HD airbrush bridal makeup, 24K gold glow facial, gel nail extensions with stone work, and rose petal milk body spa.',
    services: [
      'Signature Royal HD Bridal Makeover (Airbrush & Jewelry Setting)',
      '24K Gold Leaf Glow Facial with Ultrasound Skin Firming',
      'Bridal Gel Nail Extensions with Swarovski Stones & Gold Foil Art',
      'Rose Petal & Milk Body Spa with Warm Almond Oil Massage'
    ],
    duration: '2 Sessions (Wedding Eve & Wedding Day)',
    regular_price: 37496,
    package_price: 29999,
    discount: 20,
    savings: 7497,
    validity: '90 Days from purchase',
    usage_rules: [
      'Please book at least 7 days before your wedding date',
      'Includes free makeup shade matching and consultation',
      'Available at our private bridal suite or at your hotel/wedding venue',
      'Valid for one bride; non-transferable'
    ],
    outlets: ['All Salon Outlets', 'Doorstep Home Service'],
    image: '/images/bridal_makeup_jaipur_1790672008691.jpg',
    active: true,
    featured: true,
  },
  {
    id: 'pkg-pre-wedding-radiance',
    name: 'Pre-Wedding Glow & Hair Botox Combo',
    description: 'A 1-day complete beauty makeover combining chemical-free Moroccan nanoplastia hair smoothening with deep-clean Hydra-Facial and Russian manicure.',
    services: [
      'Moroccan Nanoplastia & Hair Botox Treatment (Chemical-Free)',
      'Hydra-Facial Deep Clean with Blackhead Removal',
      'Russian Manicure & Warm Paraffin Hand Spa',
      'Haircut, Head Wash & Bouncy Blowdry'
    ],
    duration: '330 mins (Full Day Care)',
    regular_price: 16396,
    package_price: 12499,
    discount: 24,
    savings: 3897,
    validity: '60 Days from purchase',
    usage_rules: [
      'Booking 48 hours in advance recommended',
      'Free patch test done 24 hours before Nanoplastia treatment',
      'Valid across all flagship & studio branches',
      'Can be availed in 1 full day or across 2 consecutive visits'
    ],
    outlets: ['All Salon Outlets'],
    image: '/images/hair_styling_luxe_1790672021591.jpg',
    active: true,
    featured: true,
  },
  {
    id: 'pkg-sangeet-glam',
    name: 'Sangeet & Cocktail Party Look Combo',
    description: 'Specially created for sangeet and cocktail nights. Includes waterproof party makeup, soft French balayage hair color, and long-lasting gel nail extensions.',
    services: [
      'Sangeet & Party Glam Makeup (Dewy Glow & Soft Waves)',
      'French Balayage & Ombre Hair Color with Olaplex Protection',
      'Bridal Gel Nail Extensions with Gold Foil Art'
    ],
    duration: '360 mins',
    regular_price: 22997,
    package_price: 17999,
    discount: 22,
    savings: 4998,
    validity: '60 Days from purchase',
    usage_rules: [
      'Valid Monday to Saturday with 24 hours prior booking',
      'Includes free eyelash application and makeup setting spray',
      'Non-refundable once the first service is taken'
    ],
    outlets: ['All Salon Outlets'],
    image: '/images/home_salon_service_1790676110547.jpg',
    active: true,
    featured: false,
  },
  {
    id: 'pkg-ayurvedic-detox',
    name: 'Ayurvedic Body Polish & Glow Spa Combo',
    description: 'Traditional herbal spa treatment designed to remove sun tan, scrub away dry skin, and deeply nourish with almond oil, kesar, and real rose petals.',
    services: [
      '24K Gold Leaf Glow Facial with Pure Kesar & Sandalwood',
      'Herbal Full Body Scrub & Mud Pack',
      'Rose Petal & Milk Body Spa with Steam Bath'
    ],
    duration: '230 mins',
    regular_price: 13497,
    package_price: 9999,
    discount: 26,
    savings: 3498,
    validity: '90 Days from purchase',
    usage_rules: [
      'Prior appointment required based on spa room availability',
      'Please inform our team of any skin sensitivities beforehand',
      'Valid across all salon branches'
    ],
    outlets: ['All Salon Outlets'],
    image: '/images/prebridal_spa_ritual_1790676123541.jpg',
    active: true,
    featured: false,
  },
  {
    id: 'pkg-executive-glow',
    name: 'Express Quick Glow Makeover',
    description: 'A quick 90-minute package for working professionals and busy days. Includes quick Hydra-Glow facial, clean manicure, and bouncy blowdry styling.',
    services: [
      'Hydra-Facial Quick Clean (45 mins)',
      'Professional Haircut & Bouncy Blowdry',
      'Russian Manicure & Nail Buffing'
    ],
    duration: '90 mins',
    regular_price: 6899,
    package_price: 4999,
    discount: 28,
    savings: 1900,
    validity: '30 Days from purchase',
    usage_rules: [
      'Walk-ins welcome based on stylist availability; booking recommended',
      'Valid at all salon branches'
    ],
    outlets: ['All Salon Outlets'],
    image: '/images/jaipur_luxury_salon_1792644552318.jpg',
    active: true,
    featured: false,
  },
  {
    id: 'pkg-royal-heritage-bridal-makeover',
    name: 'Royal Heritage Bridal Makeover',
    tagline: 'Flawless, camera-ready beauty that lasts from the first ritual to the last dance.',
    offer_name: 'Bridal Special',
    description: 'Bridal preparation package covering makeup, hairstyling, draping, facial prep and finishing services.',
    services: [
      'HD / Airbrush Bridal Makeup',
      'Signature Bridal Hairstyling with Accessories Setting',
      'Draping of Saree / Lehenga with Dupatta Setting',
      '24K Gold Facial Glow Prep',
      'Manicure & Pedicure',
      'Eyelash Application & Touch-Up Kit'
    ],
    duration: 'Full Day Care',
    regular_price: 0,
    package_price: 0,
    discount: 0,
    savings: 0,
    validity: 'Confirm with salon',
    usage_rules: ['Please confirm availability, appointment timing and package pricing with the salon before booking.'],
    outlets: ['Confirm with salon'],
    image: '/images/jaipur_royal_bride_1792647664582.jpg',
    active: true,
    featured: true,
  },
  {
    id: 'pkg-moroccan-botox-hair-revival',
    name: 'Moroccan Botox Hair Revival',
    tagline: 'Silky, frizz-free, healthy hair, with zero harsh chemicals.',
    offer_name: 'Best Seller',
    description: 'Hair smoothening package with scalp analysis, cleansing, treatment, steam therapy and aftercare.',
    services: [
      'Hair & Scalp Analysis',
      'Deep Cleansing Ritual Wash',
      'Formaldehyde-Free Smoothening Treatment',
      'Moroccan Argan Oil Botox Infusion',
      'Steam Seal Therapy',
      'Blow-Dry Finish & Aftercare Guide'
    ],
    duration: '180 mins',
    regular_price: 0,
    package_price: 0,
    discount: 0,
    savings: 0,
    validity: 'Confirm with salon',
    usage_rules: ['Please confirm availability, appointment timing and package pricing with the salon before booking.'],
    outlets: ['Confirm with salon'],
    image: '/images/luxury_hair_nanoplastia_1792647835332.jpg',
    active: true,
    featured: true,
  },
  {
    id: 'pkg-24k-gold-hydra-glow-pass',
    name: '24K Gold Hydra Glow Pass',
    tagline: 'Radiant, even-toned skin, perfected well before your big day.',
    offer_name: '20% OFF',
    description: 'Pre-wedding skin and body-care package with facial, de-tan, polishing and waxing services.',
    services: [
      'Skin Consultation & Concern Mapping',
      '24K Gold Hydra Facial',
      'De-Tan & Brightening Treatment',
      'Underarm, Arm & Leg Polishing',
      'Full-Body Waxing (Rica / Chocolate)',
      'Threading & Face Bleach / Clean-Up'
    ],
    duration: '3 Sessions',
    regular_price: 0,
    package_price: 0,
    discount: 0,
    savings: 0,
    validity: 'Confirm with salon',
    usage_rules: ['Please confirm availability, appointment timing and package pricing with the salon before booking.'],
    outlets: ['Confirm with salon'],
    image: '/images/skin_spa_treatment_1790672037475.jpg',
    active: true,
    featured: true,
  },
  {
    id: 'pkg-glam-night-sangeet-edit',
    name: 'Glam Night Sangeet Edit',
    tagline: 'Turn heads on the dance floor with a flawless, all-night glam look.',
    offer_name: 'Trending',
    description: 'Party and sangeet makeover package with makeup, hairstyling, draping and touch-up essentials.',
    services: [
      'Party Glam Makeup (Long-Wear, Photo-Ready)',
      'Curls / Waves / Updo Hairstyling',
      'Saree or Lehenga Draping',
      'Lashes & Glitter Accents',
      'Express Skin Prep & Glow Primer',
      'Mini Touch-Up Kit'
    ],
    duration: '120 mins',
    regular_price: 0,
    package_price: 0,
    discount: 0,
    savings: 0,
    validity: 'Confirm with salon',
    usage_rules: ['Please confirm availability, appointment timing and package pricing with the salon before booking.'],
    outlets: ['Confirm with salon'],
    image: '/images/home_salon_service_1790676110547.jpg',
    active: true,
    featured: false,
  },
  {
    id: 'pkg-velvet-touch-body-spa-ritual',
    name: 'Velvet Touch Body Spa Ritual',
    tagline: 'Unwind deeply and step out with soft, glowing, rejuvenated skin.',
    offer_name: 'Limited Slots',
    description: 'Body spa and polish package with massage, exfoliation, steam, hydration and relaxation services.',
    services: [
      'Aromatherapy Full-Body Massage',
      'Exfoliating Body Scrub',
      'Skin-Brightening Body Polish',
      'Warm Steam Relaxation',
      'Hydrating Body Wrap & Moisture Seal',
      'Foot Reflexology Finish'
    ],
    duration: '90 mins',
    regular_price: 0,
    package_price: 0,
    discount: 0,
    savings: 0,
    validity: 'Confirm with salon',
    usage_rules: ['Please confirm availability, appointment timing and package pricing with the salon before booking.'],
    outlets: ['Confirm with salon'],
    image: '/images/prebridal_spa_ritual_1790676123541.jpg',
    active: true,
    featured: false,
  },
];

const PACKAGES_STORAGE_KEY = 'whitelabel_salon_packages_v3';
const PACKAGE_SEED_MIGRATION_PREFIX = `${PACKAGES_STORAGE_KEY}_seed_v1_`;
const NEW_PACKAGE_IDS = [
  'pkg-royal-heritage-bridal-makeover',
  'pkg-moroccan-botox-hair-revival',
  'pkg-24k-gold-hydra-glow-pass',
  'pkg-glam-night-sangeet-edit',
  'pkg-velvet-touch-body-spa-ritual',
];

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
    localStorage.removeItem('whitelabel_salon_packages_v2');
    const raw = localStorage.getItem(PACKAGES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(INITIAL_PACKAGES));
      return INITIAL_PACKAGES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const migration = mergeNewPackagesOnce(parsed as SalonPackage[], 'local-cache');
      const normalized = migration.packages.map((pkg: SalonPackage) => {
        const { savings, discountPercent } = calculateSavings(pkg.regular_price, pkg.package_price);
        return {
          ...pkg,
          savings,
          discount: discountPercent,
        };
      });
      if (migration.added) saveStoredPackages(normalized);
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
    const verified = packages.map((pkg) => {
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
