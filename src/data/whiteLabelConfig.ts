import { WhiteLabelConfig, WhiteLabelTheme } from '../types';
import { SALON_BRANCHES, TESTIMONIALS } from './salonData';
import { SALON_STYLISTS } from './stylistsData';

export const WHITE_LABEL_STORAGE_KEY = 'whitelabel_salon_brand_config_v2';

export const THEME_PRESETS: WhiteLabelTheme[] = [
  {
    id: 'champagne-gold',
    name: 'Champagne Gold & Slate',
    bgColor: '#FAF5E5',
    primaryColor: '#0F172A',
    accentColor: '#D09A40',
    accentHoverColor: '#DCA54A',
    textMutedColor: '#4A4A4A',
    surfaceColor: '#FFFFFF',
    fontHeading: "'Playfair Display', Georgia, serif",
    fontBody: "'Source Sans 3', 'Inter', system-ui, sans-serif",
  },
  {
    id: 'velvet-rose',
    name: 'Velvet Rose & Espresso',
    bgColor: '#FFF5F7',
    primaryColor: '#2B111C',
    accentColor: '#D45D79',
    accentHoverColor: '#E0728C',
    textMutedColor: '#523A44',
    surfaceColor: '#FFFFFF',
    fontHeading: "'Playfair Display', Georgia, serif",
    fontBody: "'Source Sans 3', 'Inter', system-ui, sans-serif",
  },
  {
    id: 'emerald-botanica',
    name: 'Emerald Botanica & Sage',
    bgColor: '#F3F8F5',
    primaryColor: '#0A261D',
    accentColor: '#10B981',
    accentHoverColor: '#059669',
    textMutedColor: '#374B43',
    surfaceColor: '#FFFFFF',
    fontHeading: "'Playfair Display', Georgia, serif",
    fontBody: "'Source Sans 3', 'Inter', system-ui, sans-serif",
  },
  {
    id: 'amethyst-royal',
    name: 'Amethyst Royal & Plum',
    bgColor: '#F8F5FC',
    primaryColor: '#1D1033',
    accentColor: '#8B5CF6',
    accentHoverColor: '#7C3AED',
    textMutedColor: '#4A3E5D',
    surfaceColor: '#FFFFFF',
    fontHeading: "'Playfair Display', Georgia, serif",
    fontBody: "'Source Sans 3', 'Inter', system-ui, sans-serif",
  },
  {
    id: 'terracotta-sand',
    name: 'Terracotta & Warm Sand',
    bgColor: '#FDF8F5',
    primaryColor: '#2A1810',
    accentColor: '#C86D51',
    accentHoverColor: '#D97E62',
    textMutedColor: '#544037',
    surfaceColor: '#FFFFFF',
    fontHeading: "'Playfair Display', Georgia, serif",
    fontBody: "'Source Sans 3', 'Inter', system-ui, sans-serif",
  },
  {
    id: 'obsidian-bronze',
    name: 'Obsidian & Bronze Minimal',
    bgColor: '#F8FAFC',
    primaryColor: '#090D16',
    accentColor: '#B4833E',
    accentHoverColor: '#C8964E',
    textMutedColor: '#475569',
    surfaceColor: '#FFFFFF',
    fontHeading: "'Inter Tight', 'Inter', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
  },
];

export const FONT_PAIRINGS = [
  {
    id: 'editorial-luxury',
    label: 'Editorial Luxury (Playfair + Source Sans)',
    fontHeading: "'Playfair Display', Georgia, serif",
    fontBody: "'Source Sans 3', 'Inter', system-ui, sans-serif",
  },
  {
    id: 'modern-geometric',
    label: 'Modern Studio (Inter Tight + Inter)',
    fontHeading: "'Inter Tight', 'Inter', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
  },
  {
    id: 'classic-serif',
    label: 'Classic Heritage (Georgia + Inter)',
    fontHeading: "Georgia, 'Playfair Display', serif",
    fontBody: "'Inter', system-ui, sans-serif",
  },
];

export const DEFAULT_WHITE_LABEL_CONFIG: WhiteLabelConfig = {
  presetId: 'lumina-luxe',
  brandName: 'Lumina Luxe',
  brandSubtext: 'Luxury Salon & Bridal Studio',
  tagline: 'Bespoke Bridal Artistry, Clinical Skin & Luxury Hair Care',
  logoUrl: '',
  logoIcon: 'sparkles',
  cityName: 'Metropolitan City',
  stateName: 'Luxury District',
  countryName: 'India',
  establishedYear: '2016',
  currencySymbol: '₹',
  currencyCode: 'INR',

  phoneDisplay: '+91 98000 12345',
  phoneRaw: '919800012345',
  whatsappNumber: '919800012345',
  email: 'concierge@luminaluxestudio.com',
  instagramHandle: '@luminaluxestudio',
  instagramUrl: 'https://instagram.com',
  youtubeUrl: 'https://youtube.com',
  facebookUrl: 'https://facebook.com',
  googleMapsUrl: 'https://maps.google.com',

  upiId: 'luminaluxe@icici',
  bookingPrefix: 'LLX',
  giftCardPrefix: 'LLX-GIFT',
  loyaltyPrefix: 'LLX-VIP',
  homeServiceBaseFee: 299,
  homeServicePerKmRate: 25,
  homeServiceFreeThreshold: 4999,
  advancePercentage: 25,

  heroBadgeText: '4.9 ★ Rated across 3,500+ Verified Clients · Salon & Doorstep Studio',
  heroHeadlineLine1: 'Signature Bridal,',
  heroHeadlineHighlight: 'Hair & Skin',
  heroHeadlineLine2: 'Luxury Studio',
  heroDescription:
    'Experience long-lasting HD Airbrush bridal makeovers, chemical-free hair smoothening, and clinical Hydra-Facials by certified master stylists using 100% authentic international products.',
  heroImage: '/src/assets/images/hero_jaipur_salon_1790671992521.jpg',
  heroPrimaryCta: 'Book Appointment',
  heroSecondaryCta: 'Explore Services & Prices',
  heroFloatingCardTitle: 'Private Bridal & VIP Suites',
  heroFloatingCardSubtitle: 'Dedicated suites at all branches + doorstep venue styling',
  heroPromoPillText: '20% OFF on Complete Pre-Bridal & Combo Packages',

  trustHighlights: [
    {
      title: '100% Genuine Products',
      subtitle: 'MAC, Huda, Dyson, L’Oréal & Olaplex sealed kits',
      icon: 'shield',
    },
    {
      title: 'Certified Senior Artists',
      subtitle: '8+ years experience in bridal, hair & skin care',
      icon: 'award',
    },
    {
      title: 'Hospital-Grade Hygiene',
      subtitle: 'UV-sterilized tools & disposable single-use kits',
      icon: 'sparkles',
    },
    {
      title: 'Salon + Doorstep Service',
      subtitle: 'Visit our luxury studios or book at your home/hotel',
      icon: 'home',
    },
  ],

  bridalBadgeText: 'Wedding & Destination Bridal Specialists',
  bridalHeadline: 'Flawless 16-Hour Waterproof Bridal Artistry',
  bridalSubheadline: 'From intimate ceremonies to grand palace weddings, our senior bridal team travels to your venue or welcomes you in our private bridal suites.',
  bridalImage: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
  bridalFeatures: [
    'HD & Silicone Airbrush Makeup with MAC, Charlotte Tilbury & Huda Beauty',
    'Complete Fine Jewelry Setting, Veil Fixing & Couture Outfit Draping',
    'Dedicated On-Venue Team for Bride, Bridesmaids & Family Guests',
    'Personalized Pre-Wedding Skin & Hair Glow Regimen',
  ],

  founderName: 'Aaradhya Singhania',
  founderRole: 'Founder & Master Bridal Director',
  founderExperienceBadge: '16+ Years of Excellence',
  founderQuoteHeadline: 'Every client deserves a serene, unhurried luxury experience with honest advice and authentic products.',
  founderBioParagraph1:
    'When we founded our flagship studio, our mission was simple: to bring international backstage makeup artistry, clinical skin therapies, and damage-free hair treatments under one roof with transparent pricing.',
  founderBioParagraph2:
    'Every brush is UV-sterilized, every serum is opened in front of you, and every stylist is trained to listen first. Whether it is your wedding day or a relaxing weekend spa ritual, you are in caring, expert hands.',
  founderImage: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
  founderStats: [
    { value: '4,500+', label: 'Brides Styled' },
    { value: '4.9 ★', label: 'Google Rating' },
    { value: '3', label: 'Luxury Studios' },
    { value: '1,200+', label: 'Academy Graduates' },
  ],

  loyaltyClubName: 'Lumina Privilege Club',
  loyaltyTagline: 'Earn 10 Reward Points on every 100 spent and unlock complimentary spa & bridal upgrades.',
  giftCardTitle: 'Luxury Salon Digital Gift Cards',
  giftCardSubtitle: 'Send an instant, personalized beauty & spa gift voucher via WhatsApp with custom designs.',

  footerDescription:
    'Premier luxury salon, bridal makeup studio, and professional beauty academy delivering world-class hair, skin, nail, and bridal transformations.',
  copyrightText: '© 2026 Lumina Luxe Studio. White-Label Salon Platform. All rights reserved.',
  showPoweredByBadge: true,

  theme: THEME_PRESETS[0],

  sections: {
    showTrustBar: true,
    showReels: true,
    showPackages: true,
    showServices: true,
    showBridalSpotlight: true,
    showGallery: true,
    showBooking: true,
    showRewards: true,
    showGiftCards: true,
    showStylists: true,
    showFoundersNote: true,
    showTestimonials: true,
    showLocations: true,
    showFAQ: true,
    showFloatingActions: true,
  },

  localization: {
    defaultLanguage: 'en',
    activeLanguage: 'en',
    enabledLanguages: ['en', 'hi', 'mr', 'gu', 'pa', 'ar', 'es'],
    showLanguageSwitcher: true,
    customTranslations: {},
  },

  domainSeo: {
    customDomain: 'www.luminaluxestudio.com',
    subdomainSlug: 'lumina-luxe',
    dnsVerified: true,
    sslEnabled: true,
    forceHttps: true,
    wwwRedirect: true,
    cnameTarget: 'cname.whitelabel-salon.cloud',
    aRecordIp: '76.76.21.21',
    faviconUrl: '',
    appleTouchIconUrl: '',
    themeColorHex: '#0F172A',
    seoTitle: 'Lumina Luxe — Luxury Salon, Bridal Studio & Spa | Metropolitan City',
    seoDescription:
      'Book HD Airbrush bridal makeovers, chemical-free Moroccan hair botox, 24K gold facials, and doorstep salon services with certified senior artists.',
    seoKeywords:
      'luxury salon, bridal makeup studio, hair botox, hydrafacial, nail art extensions, home salon service',
    canonicalUrl: 'https://www.luminaluxestudio.com',
    ogTitle: 'Lumina Luxe — Signature Bridal, Hair & Skin Luxury Studio',
    ogDescription:
      '4.9 ★ Rated across 3,500+ clients. Visit our luxury studio branches or book doorstep salon & bridal services.',
    ogImageUrl: '/src/assets/images/hero_jaipur_salon_1790671992521.jpg',
    twitterCardType: 'summary_large_image',
    robotsIndexing: true,
    googleAnalyticsId: '',
    metaPixelId: '',
    googleSiteVerification: '',
  },

  branches: SALON_BRANCHES,
  localities: [
    { name: 'Downtown Central / Flagship Zone', distanceKm: 2, zone: 'Central Zone' },
    { name: 'Grand Avenue / Business District', distanceKm: 4, zone: 'Central Zone' },
    { name: 'South Avenue / Metro Plaza', distanceKm: 6, zone: 'South Zone' },
    { name: 'Westside Promenade / Enclave', distanceKm: 7, zone: 'West Zone' },
    { name: 'North Park / Botanical Gardens', distanceKm: 9, zone: 'North Zone' },
    { name: 'Eastside Luxury Villas & Resorts', distanceKm: 12, zone: 'East Zone' },
    { name: 'Airport Hotel & Convention Corridor', distanceKm: 14, zone: 'Hospitality Zone' },
    { name: 'Other Locality / Outstation Venue', distanceKm: 10, zone: 'Custom Zone' },
  ],
  stylists: SALON_STYLISTS,
  testimonials: TESTIMONIALS,
  faqs: [
    {
      question: 'Which makeup and hair care brands do you use at your studio?',
      answer:
        'We use 100% genuine, sealed international products including MAC, Huda Beauty, Charlotte Tilbury, NARS, Bobbi Brown, Temptu Airbrush, Dyson, L’Oréal Professionnel, Olaplex, and GK Hair. You are welcome to inspect every product before your service begins.',
      category: 'Products & Hygiene',
    },
    {
      question: 'Do you travel to hotels, resorts, or homes for bridal and party makeup?',
      answer:
        'Yes! Our senior bridal team and doorstep salon specialists travel to your home, wedding hotel, or destination resort. You can calculate exact travel charges and book directly using our online appointment calculator.',
      category: 'Bridal & Home Service',
    },
    {
      question: 'Is Moroccan Nanoplastia safe for colored or chemically treated hair?',
      answer:
        'Yes, our Moroccan Nanoplastia and Hair Botox treatments are 100% formaldehyde-free and enriched with amino acids, argan oil, and collagen. It repairs dry, frizzy hair without damaging your hair bonds.',
      category: 'Hair Treatments',
    },
    {
      question: 'How early should I book my bridal makeup package?',
      answer:
        'For peak wedding season dates, we recommend booking 4 to 8 weeks in advance to reserve your preferred Chief Bridal Artist and schedule your pre-bridal skin & hair glow sessions.',
      category: 'Booking & Payments',
    },
    {
      question: 'Can I customize a pre-bridal or festival combo package?',
      answer:
        'Absolutely! You can pick any of our curated combo packages or speak with our studio manager on WhatsApp to swap services according to your skin type and preferences.',
      category: 'Packages & Offers',
    },
    {
      question: 'Do you offer professional makeup and hair academy courses?',
      answer:
        'Yes, our Studio Academy offers certified courses in Professional Bridal Makeup, Advanced Hair Chemical & Color, Nail Artistry, and Cosmetology with hands-on practice and portfolio shoots.',
      category: 'Academy',
    },
  ],
};

export const WHITE_LABEL_PRESETS: {
  id: string;
  label: string;
  badge: string;
  description: string;
  config: WhiteLabelConfig;
}[] = [
  {
    id: 'lumina-luxe',
    label: 'Lumina Luxe Studio',
    badge: 'Default White-Label',
    description: 'Neutral luxury salon, bridal studio & academy template with Champagne Gold & Slate palette.',
    config: DEFAULT_WHITE_LABEL_CONFIG,
  },
  {
    id: 'velvet-rose',
    label: 'Velvet Rose Atelier (Mumbai)',
    badge: 'Rose & Espresso',
    description: 'High-fashion celebrity bridal, nail bar & hair atelier tailored for Mumbai luxury neighborhoods.',
    config: {
      ...DEFAULT_WHITE_LABEL_CONFIG,
      presetId: 'velvet-rose',
      brandName: 'Velvet Rose',
      brandSubtext: 'Couture Salon & Nail Atelier',
      tagline: 'Celebrity Bridal Glamour, Russian Nail Art & Luxury Hair Couture in Mumbai',
      logoIcon: 'crown',
      cityName: 'Mumbai',
      stateName: 'Maharashtra',
      countryName: 'India',
      establishedYear: '2018',
      currencySymbol: '₹',
      currencyCode: 'INR',
      phoneDisplay: '+91 98201 77889',
      phoneRaw: '919820177889',
      whatsappNumber: '919820177889',
      email: 'bookings@velvetroseatelier.in',
      instagramHandle: '@velvetrosemumbai',
      upiId: 'velvetrose.mumbai@hdfcbank',
      bookingPrefix: 'VRA',
      giftCardPrefix: 'VELVET-GIFT',
      loyaltyPrefix: 'VRA-CLUB',
      heroBadgeText: 'Mumbai’s Premier Bridal, Balayage & Russian Nail Art Atelier',
      heroHeadlineLine1: 'Couture Hair,',
      heroHeadlineHighlight: 'Bridal & Nails',
      heroHeadlineLine2: 'in Mumbai',
      heroDescription:
        'From Bandra’s celebrity red-carpet blowouts to editorial HD airbrush bridal makeovers and Russian gel extensions—crafted with 100% luxury international formulas.',
      founderName: 'Rhea Kapoor Mehta',
      founderRole: 'Creative Director & Celebrity Stylist',
      founderExperienceBadge: '14+ Years Backstage & Bridal',
      loyaltyClubName: 'Velvet Rose Privé',
      copyrightText: '© 2026 Velvet Rose Atelier Mumbai. Powered by White-Label Salon Studio.',
      theme: THEME_PRESETS[1],
      branches: [
        {
          id: 'bandra-flagship',
          name: 'Bandra West Flagship Atelier',
          locality: 'Pali Hill / Bandra West',
          address: '14th Road, Off Linking Road, Pali Hill, Bandra West, Mumbai 400050',
          phone: '+91 22 2600 7788',
          whatsapp: '+91 98201 77889',
          timings: '10:00 AM – 9:00 PM (All Days)',
          googleRating: 4.9,
          reviewCount: 1840,
          amenities: ['Celebrity Bridal Suite', 'Valet Parking', 'Matcha & Espresso Bar', 'Russian Nail Lounge'],
          isFlagship: true,
        },
        {
          id: 'juhu-studio',
          name: 'Juhu Tara Luxury Studio',
          locality: 'Juhu Tara Road',
          address: 'Level 2, Sea View Arcade, Juhu Tara Road, Mumbai 400049',
          phone: '+91 22 2618 4455',
          whatsapp: '+91 98201 77890',
          timings: '10:30 AM – 8:30 PM (All Days)',
          googleRating: 4.9,
          reviewCount: 1120,
          amenities: ['HydraFacial MD Clinic', 'Colorist Lab', 'Valet Service', 'Private VIP Cabins'],
        },
        {
          id: 'colaba-boutique',
          name: 'Colaba Heritage Salon & Spa',
          locality: 'Apollo Bunder / Colaba',
          address: 'Mandlik Road, Behind Taj Mahal Palace, Colaba, Mumbai 400001',
          phone: '+91 22 2284 9900',
          whatsapp: '+91 98201 77891',
          timings: '10:00 AM – 8:30 PM (All Days)',
          googleRating: 4.8,
          reviewCount: 940,
          amenities: ['Bridal Dressing Lounge', 'Luxury Foot Spa', 'High-Speed Wi-Fi'],
        },
      ],
      localities: [
        { name: 'Bandra West / Pali Hill', distanceKm: 2, zone: 'Western Suburbs' },
        { name: 'Khar / Santacruz West', distanceKm: 4, zone: 'Western Suburbs' },
        { name: 'Juhu / Versova', distanceKm: 6, zone: 'Western Suburbs' },
        { name: 'Worli / Lower Parel', distanceKm: 9, zone: 'South-Central Mumbai' },
        { name: 'Colaba / Cuffe Parade / Marine Drive', distanceKm: 14, zone: 'South Mumbai' },
        { name: 'Powai / BKC Luxury Hotels', distanceKm: 11, zone: 'Hospitality Corridor' },
      ],
    },
  },
  {
    id: 'emerald-botanica',
    label: 'Verde Botanica Spa (Delhi NCR)',
    badge: 'Emerald & Sage',
    description: 'Organic clinical skin, ayurvedic spa & sustainable hair sanctuary for Delhi NCR.',
    config: {
      ...DEFAULT_WHITE_LABEL_CONFIG,
      presetId: 'emerald-botanica',
      brandName: 'Verde Botanica',
      brandSubtext: 'Organic Salon, Skin Clinic & Spa',
      tagline: 'Botanical Hair Rituals, Clinical Facial Aesthetics & Holistic Bridal Glow',
      logoIcon: 'flower',
      cityName: 'New Delhi',
      stateName: 'Delhi NCR',
      countryName: 'India',
      establishedYear: '2019',
      currencySymbol: '₹',
      currencyCode: 'INR',
      phoneDisplay: '+91 98111 45678',
      phoneRaw: '919811145678',
      whatsappNumber: '919811145678',
      email: 'care@verdebotanica.in',
      instagramHandle: '@verdebotanicadelhi',
      upiId: 'verdebotanica@axis',
      bookingPrefix: 'VBS',
      giftCardPrefix: 'VERDE-GIFT',
      loyaltyPrefix: 'VBS-GREEN',
      heroBadgeText: '100% Ammonia-Free, Vegan & Clinical Luxury Beauty Sanctuary in Delhi NCR',
      heroHeadlineLine1: 'Conscious Beauty,',
      heroHeadlineHighlight: 'Botanical Spa',
      heroHeadlineLine2: '& Bridal Sanctuary',
      heroDescription:
        'Combining organic botanical formulations, 0% formaldehyde hair smoothening, and clinical Hydra-Facials with serene luxury across Khan Market, Vasant Vihar, and Gurugram.',
      founderName: 'Dr. Avantika Sondhi',
      founderRole: 'Founder & Chief Cosmetologist',
      founderExperienceBadge: '15+ Years in Holistic Aesthetics',
      loyaltyClubName: 'Verde Green Circle',
      copyrightText: '© 2026 Verde Botanica Salon & Spa. Powered by White-Label Salon Studio.',
      theme: THEME_PRESETS[2],
      branches: [
        {
          id: 'khan-market',
          name: 'Khan Market Sanctuary Flagship',
          locality: 'Khan Market / Lutyens Delhi',
          address: 'Middle Lane, Khan Market, New Delhi 110003',
          phone: '+91 11 4175 2233',
          whatsapp: '+91 98111 45678',
          timings: '10:00 AM – 8:30 PM (All Days)',
          googleRating: 4.9,
          reviewCount: 1520,
          amenities: ['Herbal Tea Lounge', 'Ayurvedic Steam Suites', 'Clinical Facial Cabins', 'Chauffeur Parking'],
          isFlagship: true,
        },
        {
          id: 'vasant-vihar',
          name: 'Vasant Vihar Bridal & Skin Lounge',
          locality: 'Basant Lok / Vasant Vihar',
          address: 'Priya Complex Promenade, Vasant Vihar, New Delhi 110057',
          phone: '+91 11 4601 8899',
          whatsapp: '+91 98111 45679',
          timings: '10:00 AM – 8:30 PM (All Days)',
          googleRating: 4.9,
          reviewCount: 1180,
          amenities: ['Private Bridal Suite', 'Organic Color Bar', 'Scalp Micro-Camera Lab'],
        },
        {
          id: 'gurugram-golf-course',
          name: 'Golf Course Road Studio',
          locality: 'Sector 54 / Golf Course Road',
          address: 'Two Horizon Center Atrium, Golf Course Road, Gurugram 122002',
          phone: '+91 124 420 9900',
          whatsapp: '+91 98111 45680',
          timings: '10:30 AM – 9:00 PM (All Days)',
          googleRating: 4.8,
          reviewCount: 990,
          amenities: ['Express Blowout Bar', 'Russian Nail Bar', 'Valet Parking', 'VIP Spa Suites'],
        },
      ],
      localities: [
        { name: 'Khan Market / Jor Bagh / Golf Links', distanceKm: 2, zone: 'Central Delhi' },
        { name: 'Defence Colony / Greater Kailash (GK I & II)', distanceKm: 5, zone: 'South Delhi' },
        { name: 'Vasant Vihar / Shanti Niketan / Chanakyapuri', distanceKm: 7, zone: 'South-West Delhi' },
        { name: 'Chhatarpur Farms / Aerocity Wedding Hotels', distanceKm: 11, zone: 'Wedding Corridor' },
        { name: 'DLF Phase 1–5 / Golf Course Road, Gurugram', distanceKm: 14, zone: 'Gurugram NCR' },
      ],
    },
  },
  {
    id: 'aurelia-prive',
    label: 'Aurelia Privé (International / $ USD)',
    badge: 'Multi-Currency ($ USD)',
    description: 'International white-label preset showcasing USD ($) pricing, Obsidian & Bronze theme, and global cities.',
    config: {
      ...DEFAULT_WHITE_LABEL_CONFIG,
      presetId: 'aurelia-prive',
      brandName: 'Aurelia Privé',
      brandSubtext: 'Beverly Hills Hair, Skin & Bridal',
      tagline: 'Red-Carpet Hair Color, Clinical Aesthetics & Couture Bridal Styling',
      logoIcon: 'gem',
      cityName: 'Beverly Hills',
      stateName: 'California',
      countryName: 'USA',
      establishedYear: '2015',
      currencySymbol: '$',
      currencyCode: 'USD',
      phoneDisplay: '+1 (310) 555-0192',
      phoneRaw: '13105550192',
      whatsappNumber: '13105550192',
      email: 'concierge@aureliaprive.com',
      instagramHandle: '@aureliaprivebh',
      upiId: 'pay@aureliaprive.com',
      bookingPrefix: 'AUR',
      giftCardPrefix: 'AURELIA-GIFT',
      loyaltyPrefix: 'AUR-VIP',
      homeServiceBaseFee: 45,
      homeServicePerKmRate: 4,
      homeServiceFreeThreshold: 450,
      heroBadgeText: '5.0 ★ Rated Luxury Salon & Red-Carpet Bridal Atelier in Beverly Hills',
      heroHeadlineLine1: 'Bespoke Balayage,',
      heroHeadlineHighlight: 'Bridal & Aesthetics',
      heroHeadlineLine2: 'in Beverly Hills',
      heroDescription:
        'Celebrity hair colorists, master bridal makeup artists, and board-certified aestheticians delivering effortless luxury in private suites or on-location.',
      founderName: 'Camille Laurent',
      founderRole: 'Founder & Master Colorist',
      founderExperienceBadge: '18+ Years Paris, NYC & LA',
      loyaltyClubName: 'Aurelia Privé Society',
      copyrightText: '© 2026 Aurelia Privé LLC. Powered by White-Label Salon Studio.',
      theme: THEME_PRESETS[5],
      branches: [
        {
          id: 'rodeo-flagship',
          name: 'Rodeo Drive Flagship Penthouse',
          locality: 'Golden Triangle / Beverly Hills',
          address: '420 N Rodeo Dr, Penthouse Suite, Beverly Hills, CA 90210',
          phone: '+1 (310) 555-0192',
          whatsapp: '+1 (310) 555-0192',
          timings: '9:00 AM – 8:00 PM (Tue – Sun)',
          googleRating: 5.0,
          reviewCount: 1290,
          amenities: ['Private Celebrity Entrance', 'Valet Parking', 'Champagne & Espresso Bar', 'Bridal Penthouse'],
          isFlagship: true,
        },
        {
          id: 'weho-atelier',
          name: 'West Hollywood Color & Nail Lab',
          locality: 'Melrose Place / West Hollywood',
          address: '8440 Melrose Place, West Hollywood, CA 90069',
          phone: '+1 (310) 555-0148',
          whatsapp: '+1 (310) 555-0148',
          timings: '10:00 AM – 8:00 PM (All Days)',
          googleRating: 4.9,
          reviewCount: 870,
          amenities: ['Balayage Daylight Studio', 'Russian Gel Bar', 'HydraFacial MD Suite'],
        },
        {
          id: 'santa-monica',
          name: 'Santa Monica Coastal Spa & Salon',
          locality: 'Montana Avenue / Santa Monica',
          address: '1218 Montana Ave, Santa Monica, CA 90403',
          phone: '+1 (310) 555-0175',
          whatsapp: '+1 (310) 555-0175',
          timings: '9:30 AM – 7:30 PM (All Days)',
          googleRating: 4.9,
          reviewCount: 740,
          amenities: ['Organic Head Spa', 'Oxygen Facial Rooms', 'Private Patio Lounge'],
        },
      ],
      localities: [
        { name: 'Beverly Hills / Golden Triangle', distanceKm: 2, zone: 'Westside Core' },
        { name: 'Bel Air / Holmby Hills', distanceKm: 5, zone: 'Luxury Estates' },
        { name: 'West Hollywood / Sunset Strip', distanceKm: 4, zone: 'Central LA' },
        { name: 'Santa Monica / Pacific Palisades', distanceKm: 9, zone: 'Coastal Zone' },
        { name: 'Malibu Beachfront Resorts & Villas', distanceKm: 18, zone: 'Destination Venues' },
      ],
    },
  },
  {
    id: 'royal-heritage',
    label: 'Royal Heritage Studio (Jaipur)',
    badge: 'Classic Heritage',
    description: 'Royal Rajasthani bridal, destination palace wedding & academy configuration for Jaipur.',
    config: {
      ...DEFAULT_WHITE_LABEL_CONFIG,
      presetId: 'royal-heritage',
      brandName: 'Royal Heritage',
      brandSubtext: 'Jaipur Bridal Studio & Academy',
      tagline: 'Palace Wedding Bridal Makeovers, Moroccan Hair Care & Luxury Spa in Jaipur',
      logoIcon: 'crown',
      cityName: 'Jaipur',
      stateName: 'Rajasthan',
      countryName: 'India',
      establishedYear: '2008',
      currencySymbol: '₹',
      currencyCode: 'INR',
      phoneDisplay: '+91 98290 12345',
      phoneRaw: '919829012345',
      whatsappNumber: '919829012345',
      email: 'concierge@royalheritagejaipur.com',
      instagramHandle: '@royalheritagejaipur',
      upiId: 'royalheritage.jaipur@icici',
      bookingPrefix: 'RHJ',
      giftCardPrefix: 'RHJ-GIFT',
      loyaltyPrefix: 'RHJ-ROYAL',
      heroBadgeText: 'Jaipur’s Trusted Bridal, Hair & Skin Salon — 3 Branches + Doorstep Service',
      heroHeadlineLine1: 'Royal Bridal,',
      heroHeadlineHighlight: 'Hair & Skin',
      heroHeadlineLine2: 'Salon in Jaipur',
      heroDescription:
        'From HD Airbrush bridal makeovers and Kundan jewelry setting to chemical-free hair botox and 24K gold facials—trusted by 5,000+ Jaipur brides and families.',
      founderName: 'Gayatri Devi Rathore',
      founderRole: 'Founder & Chief Bridal Mentor',
      founderExperienceBadge: '18+ Years in Jaipur',
      loyaltyClubName: 'Royal Heritage Privilege Club',
      copyrightText: '© 2026 Royal Heritage Studio Jaipur. Powered by White-Label Salon Studio.',
      theme: THEME_PRESETS[0],
      branches: [
        {
          id: 'c-scheme',
          name: 'C-Scheme Flagship Salon',
          locality: 'C-Scheme / Civil Lines',
          address: 'Plot 14, Sardar Patel Marg, Near Statue Circle, C-Scheme, Jaipur 302001',
          phone: '+91 141 238 9012',
          whatsapp: '+91 98290 12345',
          timings: '10:00 AM – 8:30 PM (Open All 7 Days)',
          googleRating: 4.9,
          reviewCount: 1420,
          amenities: ['Private Bridal Rooms', 'Valet Car Parking', 'Tea & Coffee Lounge', 'Waiting Area'],
          isFlagship: true,
        },
        {
          id: 'malviya-nagar',
          name: 'Malviya Nagar Studio & Academy',
          locality: 'Malviya Nagar / Near WTP',
          address: 'D-12, Calgiri Marg, Near World Trade Park (WTP), Malviya Nagar, Jaipur 302017',
          phone: '+91 141 272 4589',
          whatsapp: '+91 98290 54321',
          timings: '10:30 AM – 8:00 PM (Open All 7 Days)',
          googleRating: 4.8,
          reviewCount: 980,
          amenities: ['Makeup Academy Lab', 'HydraFacial Room', 'Easy Parking', 'Free Wi-Fi'],
        },
        {
          id: 'vaishali-nagar',
          name: 'Vaishali Nagar Luxury Salon',
          locality: 'Vaishali Nagar',
          address: 'B-4, Amrapali Circle, Gandhi Path, Vaishali Nagar, Jaipur 302021',
          phone: '+91 141 235 6780',
          whatsapp: '+91 98290 67890',
          timings: '10:00 AM – 8:30 PM (Open All 7 Days)',
          googleRating: 4.9,
          reviewCount: 1150,
          amenities: ['Quick Hair Styling', 'Nail Art Studio', 'Valet Parking', 'Private Facial Rooms'],
        },
      ],
      localities: [
        { name: 'C-Scheme / Ashok Nagar', distanceKm: 2, zone: 'Central Zone' },
        { name: 'Civil Lines / Bais Godam', distanceKm: 3, zone: 'Central Zone' },
        { name: 'Malviya Nagar / JLN Marg', distanceKm: 7, zone: 'South Zone' },
        { name: 'Vaishali Nagar / Queens Road', distanceKm: 8, zone: 'West Zone' },
        { name: 'Mansarovar / Gopalpura Bypass', distanceKm: 9, zone: 'South-West Zone' },
        { name: 'Amer Road / Kukas Wedding Resorts', distanceKm: 16, zone: 'Palace & Resort Belt' },
      ],
    },
  },
];

export function loadWhiteLabelConfig(): WhiteLabelConfig {
  if (typeof window === 'undefined') return DEFAULT_WHITE_LABEL_CONFIG;
  try {
    const raw = localStorage.getItem(WHITE_LABEL_STORAGE_KEY);
    if (!raw) return DEFAULT_WHITE_LABEL_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_WHITE_LABEL_CONFIG,
      ...parsed,
      theme: {
        ...DEFAULT_WHITE_LABEL_CONFIG.theme,
        ...(parsed.theme || {}),
      },
      sections: {
        ...DEFAULT_WHITE_LABEL_CONFIG.sections,
        ...(parsed.sections || {}),
      },
      localization: {
        ...DEFAULT_WHITE_LABEL_CONFIG.localization,
        ...(parsed.localization || {}),
        enabledLanguages:
          Array.isArray(parsed.localization?.enabledLanguages) &&
          parsed.localization.enabledLanguages.length > 0
            ? parsed.localization.enabledLanguages
            : DEFAULT_WHITE_LABEL_CONFIG.localization.enabledLanguages,
        customTranslations: {
          ...DEFAULT_WHITE_LABEL_CONFIG.localization.customTranslations,
          ...(parsed.localization?.customTranslations || {}),
        },
      },
      domainSeo: {
        ...DEFAULT_WHITE_LABEL_CONFIG.domainSeo,
        ...(parsed.domainSeo || {}),
      },
      branches:
        Array.isArray(parsed.branches) && parsed.branches.length > 0
          ? parsed.branches
          : DEFAULT_WHITE_LABEL_CONFIG.branches,
      localities:
        Array.isArray(parsed.localities) && parsed.localities.length > 0
          ? parsed.localities
          : DEFAULT_WHITE_LABEL_CONFIG.localities,
      stylists:
        Array.isArray(parsed.stylists) && parsed.stylists.length > 0
          ? parsed.stylists
          : DEFAULT_WHITE_LABEL_CONFIG.stylists,
      testimonials:
        Array.isArray(parsed.testimonials) && parsed.testimonials.length > 0
          ? parsed.testimonials
          : DEFAULT_WHITE_LABEL_CONFIG.testimonials,
      faqs:
        Array.isArray(parsed.faqs) && parsed.faqs.length > 0
          ? parsed.faqs
          : DEFAULT_WHITE_LABEL_CONFIG.faqs,
      trustHighlights:
        Array.isArray(parsed.trustHighlights) && parsed.trustHighlights.length > 0
          ? parsed.trustHighlights
          : DEFAULT_WHITE_LABEL_CONFIG.trustHighlights,
    };
  } catch (err) {
    console.error('Failed to load white-label config:', err);
    return DEFAULT_WHITE_LABEL_CONFIG;
  }
}

export function saveWhiteLabelConfig(config: WhiteLabelConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WHITE_LABEL_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save white-label config:', err);
  }
}
