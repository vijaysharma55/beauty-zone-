import { DEFAULT_WHITE_LABEL_CONFIG } from '../data/whiteLabelConfig';
import type {
  GalleryItem,
  SalonBranch,
  ServiceCategory,
  ServiceItem,
  Stylist,
  WhiteLabelConfig,
} from '../types';
import type { OpeningHours, Salon, SalonService, SalonStaff } from '../types/auth';

const KNOWN_CATEGORIES = new Set<ServiceCategory>([
  'bridal',
  'hair',
  'skin',
  'nails',
  'spa',
  'academy',
]);

const digitsOnly = (value?: string): string => String(value || '').replace(/[^\d]/g, '');

const formatTimingsSummary = (timings?: OpeningHours[]): string => {
  if (!Array.isArray(timings) || timings.length === 0) {
    return '10:00 AM – 8:30 PM (Open Daily)';
  }
  const openDays = timings.filter((t) => !t.closed);
  if (openDays.length === 0) return 'By appointment only';
  const sample = openDays[0];
  if (openDays.length === 7) {
    return `${sample.open} – ${sample.close} (Open All 7 Days)`;
  }
  const closedNames = timings
    .filter((t) => t.closed)
    .map((t) => t.day.charAt(0).toUpperCase() + t.day.slice(1));
  return `${sample.open} – ${sample.close} (Closed: ${closedNames.join(', ')})`;
};

const normalizeSocialUrl = (raw: string | undefined, platform: 'instagram' | 'facebook'): string => {
  const val = String(raw || '').trim();
  if (!val) return '';
  if (/^https?:\/\//i.test(val)) return val;
  const clean = val.replace(/^@/, '');
  return platform === 'instagram'
    ? `https://instagram.com/${clean}`
    : `https://facebook.com/${clean}`;
};

const normalizeInstagramHandle = (raw: string | undefined, fallbackName: string): string => {
  const val = String(raw || '').trim();
  if (!val) {
    const slug = fallbackName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return slug ? `@${slug}` : DEFAULT_WHITE_LABEL_CONFIG.instagramHandle;
  }
  if (/^https?:\/\//i.test(val)) {
    const parts = val.replace(/\/+$/, '').split('/');
    const handle = parts[parts.length - 1] || '';
    return handle ? (handle.startsWith('@') ? handle : `@${handle}`) : DEFAULT_WHITE_LABEL_CONFIG.instagramHandle;
  }
  return val.startsWith('@') ? val : `@${val}`;
};

export function salonServicesToServiceItems(services: SalonService[]): ServiceItem[] {
  return services
    .filter((s) => s.active !== false)
    .map((s) => {
      const lowerCat = String(s.category || '').toLowerCase();
      const category: ServiceCategory = KNOWN_CATEGORIES.has(lowerCat as ServiceCategory)
        ? (lowerCat as ServiceCategory)
        : 'hair';
      const priceRupees =
        typeof s.price === 'number' && Number.isFinite(s.price)
          ? Math.round(s.price)
          : Math.round((Number(s.pricePaise) || 0) / 100);
      const durationLabel = s.durationMinutes ? `${s.durationMinutes} mins` : '45 mins';
      const highlights: string[] = [];
      if (s.categoryLabel && s.categoryLabel !== 'Uncategorised') highlights.push(s.categoryLabel);
      if (s.subcategory) highlights.push(s.subcategory);
      if (s.notes) highlights.push(s.notes);

      return {
        id: s.id,
        title: s.name,
        category,
        price: Math.max(0, priceRupees),
        duration: durationLabel,
        estimatedDuration: durationLabel,
        description: s.description || s.notes || `${s.name} tailored by our studio specialists.`,
        highlights: highlights.slice(0, 4),
        popular: Boolean(s.sortOrder !== undefined && s.sortOrder < 3),
        image: s.imageUrl || undefined,
        priceNote: s.notes || undefined,
      };
    });
}

export function salonGalleryToGalleryItems(salon: Salon): GalleryItem[] {
  const items = Array.isArray(salon.gallery) ? salon.gallery : [];
  return items
    .map((raw, index): GalleryItem | null => {
      const url = typeof raw === 'string' ? raw : raw?.url || '';
      const caption = typeof raw === 'string' ? '' : raw?.caption || '';
      if (!url) return null;
      return {
        id: `salon-gal-${index}-${url.slice(-12)}`,
        type: 'photo',
        title: caption || `${salon.name} Studio Look #${index + 1}`,
        description: salon.tagline || `Crafted at ${salon.name}${salon.city ? ` in ${salon.city}` : ''}.`,
        category: 'Salon Work',
        service: 'Signature Studio Styling',
        image: url,
        sort_order: index,
        featured: index < 3,
        active: true,
        artist: salon.ownerName || salon.name,
      };
    })
    .filter((item): item is GalleryItem => item !== null);
}

export function salonStaffToStylists(staff: SalonStaff[], branchName: string): Stylist[] {
  return staff
    .filter((m) => m.active !== false)
    .map((m) => {
      const haystack = `${m.roleTitle} ${(m.specialties || []).join(' ')}`.toLowerCase();
      const category: Stylist['category'] = haystack.includes('nail')
        ? 'nails'
        : haystack.includes('skin') || haystack.includes('facial')
          ? 'skin'
          : haystack.includes('hair') || haystack.includes('color')
            ? 'hair'
            : 'bridal';

      return {
        id: m.id,
        name: m.name,
        role: m.roleTitle || 'Senior Artist',
        category,
        branch: branchName,
        experience: m.experience || '',
        ratings: m.rating !== null && m.rating !== undefined ? Number(m.rating) || 0 : 0,
        reviewCount: Number(m.reviewCount) || 0,
        bio: m.bio || '',
        avatar: m.photoUrl || '',
        specialties: Array.isArray(m.specialties) ? m.specialties : [],
        certifications: Array.isArray(m.qualifications) ? m.qualifications : [],
        portfolio:
          m.workPhotosConsent && Array.isArray(m.workPhotos)
            ? m.workPhotos.map((p, idx) => ({
                title: p.caption || `${m.name} Work #${idx + 1}`,
                description: '',
                image: p.url,
              }))
            : [],
      };
    });
}

export function salonToBrandConfig(salon: Salon, staff: SalonStaff[] = []): WhiteLabelConfig {
  const base = DEFAULT_WHITE_LABEL_CONFIG;
  const city = salon.city?.trim() || base.cityName;
  const state = salon.state?.trim() || '';
  const country = salon.country?.trim() || base.countryName;

  const accent = salon.theme?.accent || base.theme.accentColor;
  const primary = salon.theme?.primary || base.theme.primaryColor;
  const bg = salon.theme?.background || base.theme.bgColor;
  const surface = salon.theme?.surface || base.theme.surfaceColor;

  const phoneDisplay = salon.phone?.trim() || salon.ownerPhone?.trim() || base.phoneDisplay;
  const phoneRaw = digitsOnly(salon.phone || salon.whatsapp || salon.ownerPhone) || base.phoneRaw;
  const whatsappNumber = digitsOnly(salon.whatsapp || salon.phone || salon.ownerPhone) || phoneRaw;

  const fullAddress =
    [salon.addressLine, salon.city, salon.state, salon.postalCode, salon.country]
      .filter(Boolean)
      .join(', ') || `${city} Studio`;

  const primaryBranch: SalonBranch = {
    id: `branch-${salon.id}`,
    name: salon.name,
    locality: salon.addressLine?.trim() || city,
    address: fullAddress,
    phone: phoneDisplay,
    whatsapp: whatsappNumber,
    timings: formatTimingsSummary(salon.timings),
    googleRating: 4.9,
    reviewCount: 120,
    amenities: ['Private Bridal Suite', 'Sterilized Equipment', 'Doorstep Home Visits Available'],
    isFlagship: true,
  };

  const localities = [
    { name: `${salon.addressLine?.split(',')[0]?.trim() || city} Central`, distanceKm: 2, zone: 'Studio Vicinity' },
    { name: `${city} City Center`, distanceKm: 5, zone: 'Core City' },
    { name: `${city} Suburbs / Wedding Venues`, distanceKm: 12, zone: 'Outer Zone' },
  ];

  const heroTitle = salon.heroTitle?.trim() || salon.name;
  const heroSubtitle =
    salon.heroSubtitle?.trim() ||
    salon.description?.trim() ||
    base.heroDescription;

  const ownerDisplay = salon.ownerName?.trim() || base.founderName;
  const igUrl = normalizeSocialUrl(salon.instagram, 'instagram') || base.instagramUrl;
  const fbUrl = normalizeSocialUrl(salon.facebook, 'facebook') || base.facebookUrl;
  const mapUrl =
    salon.mapUrl?.trim() ||
    `https://maps.google.com/?q=${encodeURIComponent(`${salon.name} ${fullAddress}`)}`;

  return {
    ...base,
    brandName: salon.name,
    brandSubtext: salon.tagline?.trim() || `${city} Luxury Salon & Studio`,
    tagline: salon.tagline?.trim() || base.tagline,
    logoUrl: salon.logoUrl || '',
    cityName: city,
    stateName: state,
    countryName: country,

    phoneDisplay,
    phoneRaw,
    whatsappNumber,
    email: salon.email?.trim() || base.email,
    instagramHandle: normalizeInstagramHandle(salon.instagram, salon.name),
    instagramUrl: igUrl,
    facebookUrl: fbUrl,
    googleMapsUrl: mapUrl,

    heroBadgeText: `${city}${state ? ` · ${state}` : ''} · Verified Studio & Doorstep Services`,
    heroHeadlineLine1: heroTitle,
    heroHeadlineHighlight: city,
    heroHeadlineLine2: '',
    heroDescription: heroSubtitle,
    heroImage: salon.coverImage || base.heroImage,
    heroFloatingCardTitle: salon.name,
    heroFloatingCardSubtitle: salon.addressLine || `${city} Flagship Studio & Home Visits`,

    founderName: ownerDisplay,
    founderRole: `Founder & Director — ${salon.name}`,
    founderBioParagraph1:
      salon.description?.trim() ||
      `Welcome to ${salon.name} in ${city}. Our dedicated team delivers tailored bridal artistry, precision hair design and rejuvenating skin care with transparent pricing.`,
    founderBioParagraph2: base.founderBioParagraph2,
    founderStats: [
      { value: '100%', label: 'Authentic Products' },
      { value: '4.9 ★', label: 'Client Satisfaction' },
      { value: '1', label: `${city} Studio` },
      { value: '7 Days', label: 'Weekly Availability' },
    ],

    loyaltyClubName: `${salon.name} Privilege Club`,
    footerDescription: salon.description?.trim() || `${salon.name} in ${city} — ${salon.tagline || base.footerDescription}`,
    copyrightText: `© ${new Date().getFullYear()} ${salon.name}. All rights reserved.`,

    theme: {
      ...base.theme,
      bgColor: bg,
      primaryColor: primary,
      accentColor: accent,
      accentHoverColor: accent,
      surfaceColor: surface,
    },

    domainSeo: {
      ...base.domainSeo,
      subdomainSlug: salon.slug,
      seoTitle: `${salon.name} | ${city}`,
      seoDescription: heroSubtitle,
      ogTitle: `${salon.name} — ${salon.tagline || city}`,
      ogDescription: heroSubtitle,
      ogImageUrl: salon.coverImage || base.heroImage,
      themeColorHex: primary,
    },

    branches: [primaryBranch],
    localities,
    stylists: staff.length > 0 ? salonStaffToStylists(staff, primaryBranch.name) : base.stylists,
  };
}
