import { SalonPackage } from '../types';

export const PACKAGE_PRESET_IMAGES = [
  {
    label: 'Bridal Makeover & Draping',
    url: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
    category: 'Bridal',
  },
  {
    label: 'Hair Botox & Luxury Styling',
    url: '/src/assets/images/hair_styling_luxe_1790672021591.jpg',
    category: 'Hair',
  },
  {
    label: 'Party Glam & Sangeet Makeup',
    url: '/src/assets/images/home_salon_service_1790676110547.jpg',
    category: 'Makeup',
  },
  {
    label: 'Ayurvedic Spa & Body Polish',
    url: '/src/assets/images/prebridal_spa_ritual_1790676123541.jpg',
    category: 'Spa',
  },
  {
    label: 'Jaipur Salon Atmosphere',
    url: '/src/assets/images/hero_jaipur_salon_1790671992521.jpg',
    category: 'Salon',
  },
  {
    label: 'Academy & Masterclass',
    url: '/src/assets/images/academy_training_jaipur_1790676136151.jpg',
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
    name: 'Royal Rajasthani Bridal Package',
    festivalName: 'Wedding Season Exclusive Deal',
    tagline: 'Complete head-to-toe makeover for your big day',
    taglineIdeas: [
      'Complete head-to-toe makeover for your big day',
      'Radiate timeless bridal elegance with luxury Rajasthani touches',
      'Look picture-perfect with HD airbrush finish & Kundan jewellery draping'
    ],
    description: 'Comprehensive 2-day royal makeover for Jaipur brides. Includes HD Airbrush makeup, 24K Gold Leaf facial, bridal nail extensions, and milk body spa.',
    duration: '2 Days (Wedding Eve & D-Day)',
    regularPrice: 38000,
    packagePrice: 28500,
    validity: 'Wedding Season Pass (Oct - Feb)',
    image: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
    services: [
      'Royal Rajasthani HD Bridal Makeover (Airbrush & Jewelry Setting)',
      '24K Gold Leaf Glow Facial with Ultrasound Skin Firming',
      'Bridal Gel Nail Extensions with Swarovski Stones & Gold Foil Art',
      'Rose Petal & Milk Body Spa with Warm Almond Oil Massage'
    ]
  },
  {
    name: 'Karwa Chauth Glow Combo',
    festivalName: 'Karwa Chauth Special Offer',
    tagline: 'Get festive-ready glow with top hair & skin treatments',
    taglineIdeas: [
      'Get festive-ready glow with top hair & skin treatments',
      'Radiate timeless bridal glow for your special Karwa Chauth evening',
      'Head-to-toe festive pampering at exclusive festival savings'
    ],
    description: 'Festive ready in 3 hours with instant glass skin gold facial, bouncy blowdry hair styling, hand manicure & traditional henna.',
    duration: '180 mins',
    regularPrice: 12000,
    packagePrice: 8400,
    validity: '60 Days from purchase',
    image: '/src/assets/images/home_salon_service_1790676110547.jpg',
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
    image: '/src/assets/images/hair_styling_luxe_1790672021591.jpg',
    services: [
      'Moroccan Nanoplastia & Hair Botox Treatment (Chemical-Free)',
      'Hydra-Facial Deep Clean with Blackhead Removal',
      'Haircut, Head Wash & Bouncy Blowdry'
    ]
  },
  {
    name: 'Diwali Party Prep Pack',
    festivalName: 'Diwali Shubh Deepawali Sale',
    tagline: 'Sparkle bright this Diwali with 7-step glass skin glow & glam makeup',
    taglineIdeas: [
      'Sparkle bright this Diwali with 7-step glass skin glow & glam makeup',
      'Get festive celebration ready in just 3 hours with deep pampering',
      'Save big on our most requested luxury salon services'
    ],
    description: 'The ultimate Diwali party glow package featuring waterproof HD makeup, 24K Gold luxury facial, and festive nail art extensions.',
    duration: '190 mins',
    regularPrice: 13500,
    packagePrice: 9450,
    validity: '60 Days from purchase',
    image: '/src/assets/images/prebridal_spa_ritual_1790676123541.jpg',
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
      'Beat the Jaipur summer heat with refreshing icy HydraFacial',
      'Complete sun damage repair and cooling mint body polish',
      'Deeply hydrate, tone and protect your skin against harsh UV damage'
    ],
    description: 'Cooling, purifying package designed for Jaipur summers. Removes sun tan, extracts blackheads, and delivers deep hyaluronic skin hydration.',
    duration: '150 mins',
    regularPrice: 9500,
    packagePrice: 6650,
    validity: '30 Days from purchase',
    image: '/src/assets/images/hero_jaipur_salon_1790671992521.jpg',
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
      'Radiate timeless bridal elegance with luxury Rajasthani touches',
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
      'Flawless glass skin radiance designed for Jaipur weather'
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
  'All Jaipur Outlets',
  'C-Scheme Flagship Salon',
  'Malviya Nagar Studio',
  'Vaishali Nagar Luxury Salon',
  'Doorstep Home Service (Jaipur)'
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
  'Valid across selected Beauty Zone Jaipur salons',
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
      'Royal Rajasthani HD Bridal Makeover (Airbrush & Jewelry Setting)',
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
      'Available at our private bridal suite or at your hotel/wedding venue in Jaipur',
      'Valid for one bride; non-transferable'
    ],
    outlets: ['All Jaipur Outlets', 'Doorstep Home Service (Jaipur)'],
    image: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
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
      'Valid at C-Scheme and Malviya Nagar salons',
      'Can be availed in 1 full day or across 2 consecutive visits'
    ],
    outlets: ['C-Scheme Flagship Salon', 'Malviya Nagar Studio'],
    image: '/src/assets/images/hair_styling_luxe_1790672021591.jpg',
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
    outlets: ['All Jaipur Outlets'],
    image: '/src/assets/images/home_salon_service_1790676110547.jpg',
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
      'Valid across all Beauty Zone salons in Jaipur'
    ],
    outlets: ['C-Scheme Flagship Salon', 'Vaishali Nagar Luxury Salon'],
    image: '/src/assets/images/prebridal_spa_ritual_1790676123541.jpg',
    active: true,
    featured: false,
  },
  {
    id: 'pkg-executive-glow',
    name: 'Jaipur Express Quick Glow Makeover',
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
      'Valid at all 3 Jaipur salon branches'
    ],
    outlets: ['All Jaipur Outlets'],
    image: '/src/assets/images/hero_jaipur_salon_1790671992521.jpg',
    active: true,
    featured: false,
  }
];

const PACKAGES_STORAGE_KEY = 'beautyzone_jaipur_packages_v1';

export function getStoredPackages(): SalonPackage[] {
  if (typeof window === 'undefined') return INITIAL_PACKAGES;
  try {
    const raw = localStorage.getItem(PACKAGES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(INITIAL_PACKAGES));
      return INITIAL_PACKAGES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((pkg: SalonPackage) => {
        const { savings, discountPercent } = calculateSavings(pkg.regular_price, pkg.package_price);
        return {
          ...pkg,
          savings,
          discount: discountPercent,
        };
      });
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
