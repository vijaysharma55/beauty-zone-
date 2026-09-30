import { BundlePackage } from '../types';

export const CURATED_BUNDLES: BundlePackage[] = [
  {
    id: 'bundle-bridal-glow',
    title: 'The Royal Bridal Glow & Draping Package',
    tagline: 'Complete Bridal Package for Destination & Jaipur Weddings',
    description: 'Our most popular wedding package. Combines HD airbrush bridal makeup, 24K gold glow facial, gel nail extensions with stone art, and relaxing rose petal milk body spa.',
    originalPrice: 37496,
    discountedPrice: 29999,
    savings: 7497,
    duration: '2 Sessions (Wedding Eve & Wedding Day)',
    servicesIncluded: [
      'Royal Rajasthani HD Bridal Makeover (Airbrush Makeup & Jewelry Setting)',
      '24K Gold Leaf Glow Facial with Ultrasound Skin Firming',
      'Bridal Gel Nail Extensions with Swarovski Stones & Gold Foil Art',
      'Rose Petal & Milk Body Spa with Warm Almond Oil Massage'
    ],
    image: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
    badge: 'Save ₹7,497 (20% OFF)',
    popular: true,
  },
  {
    id: 'bundle-pre-wedding-radiance',
    title: 'Pre-Wedding Glow & Hair Botox Combo',
    tagline: 'Frizz-Free Smooth Hair with 7-Step Deep Clean Facial',
    description: 'A 1-day complete beauty makeover combining formaldehyde-free Moroccan nanoplastia hair smoothening with deep-clean Hydra-Facial and Russian manicure.',
    originalPrice: 16396,
    discountedPrice: 12499,
    savings: 3897,
    duration: '330 mins (Full Day Care)',
    servicesIncluded: [
      'Moroccan Nanoplastia & Hair Botox Treatment (Chemical-Free)',
      'Hydra-Facial Deep Clean with Blackhead Removal',
      'Russian Manicure & Warm Paraffin Hand Spa',
      'Haircut, Head Wash & Bouncy Blowdry'
    ],
    image: '/src/assets/images/hair_styling_luxe_1790672021591.jpg',
    badge: 'Save ₹3,897 (24% OFF)',
    popular: true,
  },
  {
    id: 'bundle-sangeet-glam',
    title: 'Sangeet & Cocktail Party Look Combo',
    tagline: 'Photo-Ready Glowing Makeup with Trendy Hair Color',
    description: 'Specially created for sangeet and cocktail nights. Includes waterproof party makeup, soft French balayage hair color, and long-lasting gel nail extensions.',
    originalPrice: 22997,
    discountedPrice: 17999,
    savings: 4998,
    duration: '360 mins',
    servicesIncluded: [
      'Sangeet & Party Glam Makeup (Dewy Glow & Soft Waves)',
      'French Balayage & Ombre Hair Color with Olaplex Protection',
      'Bridal Gel Nail Extensions with Gold Foil Art'
    ],
    image: '/src/assets/images/home_salon_service_1790676110547.jpg',
    badge: 'Save ₹4,998 (22% OFF)',
  },
  {
    id: 'bundle-ayurvedic-detox',
    title: 'Ayurvedic Body Polish & Glow Spa Combo',
    tagline: 'Herbal De-Tan & Deep Skin Moisturization for Dry Weather',
    description: 'Traditional herbal spa treatment designed to remove sun tan, scrub away dry skin, and deeply nourish with almond oil, kesar, and real rose petals.',
    originalPrice: 13497,
    discountedPrice: 9999,
    savings: 3498,
    duration: '230 mins',
    servicesIncluded: [
      '24K Gold Leaf Glow Facial with Pure Kesar & Sandalwood',
      'Herbal Full Body Scrub & Mud Pack',
      'Rose Petal & Milk Body Spa with Steam Bath'
    ],
    image: '/src/assets/images/prebridal_spa_ritual_1790676123541.jpg',
    badge: 'Save ₹3,498 (26% OFF)',
  },
];
