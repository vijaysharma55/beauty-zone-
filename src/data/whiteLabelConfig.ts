import { WhiteLabelConfig, WhiteLabelTheme } from '../types';
import { SALON_BRANCHES, TESTIMONIALS } from './salonData';
import { SALON_STYLISTS } from './stylistsData';

export const WHITE_LABEL_STORAGE_KEY = 'whitelabel_salon_brand_config_v3';

export const DEFAULT_WHITE_LABEL_THEME: WhiteLabelTheme = {
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
};

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
  brandName: 'Beauty Zone',
  brandSubtext: 'Premium Salon, Bridal Studio & Academy',
  tagline: 'Exquisite Bridal Transformations, Hair Botox & Clinical Skin Care',
  logoUrl: '',
  logoIcon: 'sparkles',
  cityName: 'Jaipur',
  stateName: 'Rajasthan',
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
  heroImage: '/images/jaipur_luxury_salon_1792644552318.jpg',
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
  bridalSubheadline:
    'Every bridal journey begins with a private skin, undertone and outfit consultation, followed by a MAC Prep + Prime skin ritual and layered HD or Temptu airbrush artistry with Huda Beauty and Charlotte Tilbury. From intimate ceremonies to grand palace weddings, our senior team travels to your venue or welcomes you in our private bridal suites — with Kundan jewellery setting, couture draping, a Dyson finish and a sealed 16-hour touch-up kit. Suitable for every Indian skin tone, including oily, dry, combination and sensitive skin.',
  bridalImage: '/images/jaipur_royal_bride_1792647664582.jpg',
  bridalFeatures: [
    'Step 1 – Private shade matching & skin prep: Forest Essentials cleanse, collagen mask and MAC Prep + Prime hydration for all skin types',
    'Step 2 – HD & silicone Temptu airbrush base: MAC, Huda Beauty, Charlotte Tilbury and NARS in thin, flash-safe layers',
    'Step 3 – Couture finishing: bespoke eye artistry, Ardell lashes, Kundan jewellery setting, veil fixing and lehenga/dupatta draping',
    'Step 4 – 16-hour seal: Dyson-styled hair, MAC Fix+ setting, flash-photo check and a personalised take-home touch-up kit',
  ],

  founderName: 'Aaradhya Singhania',
  founderRole: 'Founder & Master Bridal Director',
  founderExperienceBadge: '16+ Years of Excellence',
  founderQuoteHeadline: 'Every client deserves a serene, unhurried luxury experience with honest advice and authentic products.',
  founderBioParagraph1:
    'When we founded our flagship studio, our mission was simple: to bring international backstage makeup artistry, clinical skin therapies, and damage-free hair treatments under one roof with transparent pricing.',
  founderBioParagraph2:
    'Every brush is UV-sterilized, every serum is opened in front of you, and every stylist is trained to listen first. Whether it is your wedding day or a relaxing weekend spa ritual, you are in caring, expert hands.',
  founderImage: '/images/salon_founder_portrait_1792648125569.jpg',
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

  theme: DEFAULT_WHITE_LABEL_THEME,

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
    seoTitle: 'Beauty Zone Jaipur | Salon & Bridal Services',
    seoDescription:
      'Book salon and doorstep home services in Jaipur, including HD bridal makeup, hair botox, 24K gold facials and curated salon packages.',
    seoKeywords:
      'luxury salon, bridal makeup studio, hair botox, hydrafacial, nail art extensions, home salon service',
    canonicalUrl: 'https://beauty-zone-pearl.vercel.app/',
    ogTitle: 'Lumina Luxe — Signature Bridal, Hair & Skin Luxury Studio',
    ogDescription:
      '4.9 ★ Rated across 3,500+ clients. Visit our luxury studio branches or book doorstep salon & bridal services.',
    ogImageUrl: '/images/jaipur_luxury_salon_1792644552318.jpg',
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

export function loadWhiteLabelConfig(): WhiteLabelConfig {
  if (typeof window === 'undefined') return DEFAULT_WHITE_LABEL_CONFIG;
  try {
    localStorage.removeItem('whitelabel_salon_brand_config_v2');
    const raw = localStorage.getItem(WHITE_LABEL_STORAGE_KEY);
    if (!raw) return DEFAULT_WHITE_LABEL_CONFIG;
    const parsed = JSON.parse(raw);
    const { presetId: _removedPresetId, ...sanitizedParsed } = parsed && typeof parsed === 'object' ? parsed : {};

    // Auto-migrate legacy placeholder image paths to the latest 8K photorealistic assets
    const sanitizeImagePath = (url: any, fallback: string) => {
      if (!url || typeof url !== 'string') return fallback;
      if (url.includes('hero_jaipur_salon')) return '/images/jaipur_luxury_salon_1792644552318.jpg';
      if (url.includes('bridal_makeup_jaipur')) return fallback;
      if (url.includes('founder_portrait')) return '/images/salon_founder_portrait_1792648125569.jpg';
      return url;
    };

    const heroImage = sanitizeImagePath(parsed.heroImage, DEFAULT_WHITE_LABEL_CONFIG.heroImage);
    const bridalImage = parsed.bridalImage && !parsed.bridalImage.includes('bridal_makeup_jaipur')
      ? parsed.bridalImage
      : DEFAULT_WHITE_LABEL_CONFIG.bridalImage;
    const founderImage = sanitizeImagePath(parsed.founderImage, DEFAULT_WHITE_LABEL_CONFIG.founderImage);

    return {
      ...DEFAULT_WHITE_LABEL_CONFIG,
      ...sanitizedParsed,
      heroImage,
      bridalImage,
      founderImage,
      theme: {
        ...DEFAULT_WHITE_LABEL_CONFIG.theme,
        ...(sanitizedParsed.theme || {}),
      },
      sections: {
        ...DEFAULT_WHITE_LABEL_CONFIG.sections,
        ...(sanitizedParsed.sections || {}),
      },
      localization: {
        ...DEFAULT_WHITE_LABEL_CONFIG.localization,
        ...(sanitizedParsed.localization || {}),
        enabledLanguages:
          Array.isArray(sanitizedParsed.localization?.enabledLanguages) &&
          sanitizedParsed.localization.enabledLanguages.length > 0
            ? sanitizedParsed.localization.enabledLanguages
            : DEFAULT_WHITE_LABEL_CONFIG.localization.enabledLanguages,
        customTranslations: {
          ...DEFAULT_WHITE_LABEL_CONFIG.localization.customTranslations,
          ...(sanitizedParsed.localization?.customTranslations || {}),
        },
      },
      domainSeo: {
        ...DEFAULT_WHITE_LABEL_CONFIG.domainSeo,
        ...(sanitizedParsed.domainSeo || {}),
        // Migrate known legacy SEO titles while preserving owner-customized SEO titles.
        seoTitle: [
          'Beauty Zone | Premium Salon, Bridal Studio & Academy Services in Jaipur',
          'Lumina Luxe — Luxury Salon, Bridal Studio & Spa | Metropolitan City',
        ].includes(sanitizedParsed.domainSeo?.seoTitle || '')
          ? DEFAULT_WHITE_LABEL_CONFIG.domainSeo.seoTitle
          : (sanitizedParsed.domainSeo?.seoTitle ?? DEFAULT_WHITE_LABEL_CONFIG.domainSeo.seoTitle),
        // Migrate the former default without overriding custom canonical URLs.
        canonicalUrl: /^https:\/\/www\.luminaluxestudio\.com\/?$/.test(sanitizedParsed.domainSeo?.canonicalUrl || '')
          ? DEFAULT_WHITE_LABEL_CONFIG.domainSeo.canonicalUrl
          : (sanitizedParsed.domainSeo?.canonicalUrl ?? DEFAULT_WHITE_LABEL_CONFIG.domainSeo.canonicalUrl),
      },
      branches:
        Array.isArray(sanitizedParsed.branches) && sanitizedParsed.branches.length > 0
          ? sanitizedParsed.branches
          : DEFAULT_WHITE_LABEL_CONFIG.branches,
      localities:
        Array.isArray(sanitizedParsed.localities) && sanitizedParsed.localities.length > 0
          ? sanitizedParsed.localities
          : DEFAULT_WHITE_LABEL_CONFIG.localities,
      stylists:
        Array.isArray(sanitizedParsed.stylists) && sanitizedParsed.stylists.length > 0
          ? sanitizedParsed.stylists.map((s: any) => ({
              ...s,
              ratings: s.ratings ?? s.rating ?? 5,
            }))
          : DEFAULT_WHITE_LABEL_CONFIG.stylists,
      testimonials:
        Array.isArray(sanitizedParsed.testimonials) && sanitizedParsed.testimonials.length > 0
          ? sanitizedParsed.testimonials
          : DEFAULT_WHITE_LABEL_CONFIG.testimonials,
      faqs:
        Array.isArray(sanitizedParsed.faqs) && sanitizedParsed.faqs.length > 0
          ? sanitizedParsed.faqs
          : DEFAULT_WHITE_LABEL_CONFIG.faqs,
      trustHighlights:
        Array.isArray(sanitizedParsed.trustHighlights) && sanitizedParsed.trustHighlights.length > 0
          ? sanitizedParsed.trustHighlights
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
