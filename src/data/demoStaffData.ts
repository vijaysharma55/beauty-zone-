import type { SalonService, SalonStaff } from '../types/auth';

/**
 * Sample demo staff profiles displayed ONLY on unpublished salon websites so
 * salon owners can preview how their Team section, Booking picker and Full
 * Profile modal look across every shared template.
 *
 * Invariants:
 * - Read-only in-memory preview data: never saved to the database or mixed with
 *   real salon employee records.
 * - Marked `isDemo: true` and `bookingEnabled: false` (and prefixed `demo-staff-`)
 *   so neither the UI nor the backend API ever allows booking them.
 */
export const DEMO_SALON_STAFF: ReadonlyArray<SalonStaff> = Object.freeze([
  Object.freeze({
    id: 'demo-staff-1',
    salonId: 'demo-preview',
    name: 'Aarohi Verma',
    roleTitle: 'Creative Bridal Director',
    bio: 'Sample profile: Specialist in luminous HD airbrush bridal artistry, bespoke veil setting and long-wear destination wedding styling.',
    photoUrl: '/images/stylist_bridal_ananya_1790677391838.jpg',
    specialties: ['HD Airbrush Bridal', 'Editorial Glow', 'Saree & Veil Draping', 'Pre-Bridal Consultation'],
    qualifications: [
      'International Airbrush Artistry Diploma',
      'Certified Luxury Bridal Stylist',
    ],
    workPhotos: [
      { url: '/images/bridal_makeup_jaipur_1790672008691.jpg', caption: 'Sample work — Royal HD Bridal Makeover' },
      { url: '/images/jaipur_royal_bride_1792647664582.jpg', caption: 'Sample work — Reception Couture Look' },
    ],
    workPhotosConsent: true,
    active: true,
    bookingEnabled: false,
    rating: 4.9,
    reviewCount: 148,
    experience: '10+ Years',
    isDemo: true,
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
  }),
  Object.freeze({
    id: 'demo-staff-2',
    salonId: 'demo-preview',
    name: 'Kabir Malhotra',
    roleTitle: 'Master Hair Colorist & Stylist',
    bio: 'Sample profile: Precision haircut, hand-painted French balayage and bond-building smoothing rituals tailored to hair texture.',
    photoUrl: '/images/stylist_hair_vikram_1790677441310.jpg',
    specialties: ['French Balayage', 'Precision Cuts', 'Moroccan Nanoplastia', 'Bond Repair'],
    qualifications: [
      'Advanced Cut & Colour Academy Certificate',
      'Certified Bond-Repair & Keratin Specialist',
    ],
    workPhotos: [
      { url: '/images/hair_styling_luxe_1790672021591.jpg', caption: 'Sample work — Dimensional Balayage & Gloss' },
      { url: '/images/luxury_hair_nanoplastia_1792647835332.jpg', caption: 'Sample work — Mirror-Shine Nanoplastia' },
    ],
    workPhotosConsent: true,
    active: true,
    bookingEnabled: false,
    rating: 4.8,
    reviewCount: 112,
    experience: '8+ Years',
    isDemo: true,
    sortOrder: 1,
    createdAt: '',
    updatedAt: '',
  }),
  Object.freeze({
    id: 'demo-staff-3',
    salonId: 'demo-preview',
    name: 'Naina Kapoor',
    roleTitle: 'Senior Clinical Aesthetician',
    bio: 'Sample profile: Evidence-led HydraFacial rituals, gentle botanical peels and customized skin barrier therapies.',
    photoUrl: '/images/stylist_skin_meera_1790677415028.jpg',
    specialties: ['HydraFacial Glow', 'Barrier Repair', 'De-Tan & Brightening', 'Bridal Skin Prep'],
    qualifications: [
      'CIDESCO Certified Skin Aesthetician',
      'Advanced Clinical Facial Therapy Diploma',
    ],
    workPhotos: [
      { url: '/images/skin_spa_treatment_1790672037475.jpg', caption: 'Sample work — Multi-Step HydraFacial Ritual' },
      { url: '/images/prebridal_spa_ritual_1790676123541.jpg', caption: 'Sample work — Botanical Glow Therapy' },
    ],
    workPhotosConsent: true,
    active: true,
    bookingEnabled: false,
    rating: 5.0,
    reviewCount: 94,
    experience: '7+ Years',
    isDemo: true,
    sortOrder: 2,
    createdAt: '',
    updatedAt: '',
  }),
]);

/**
 * Sample preview services used only when an unpublished salon has not added its
 * own services yet, so the owner can still preview the booking interface and
 * staff cards before publishing.
 */
export const DEMO_PREVIEW_SERVICES: ReadonlyArray<SalonService> = Object.freeze([
  Object.freeze({
    id: 'demo-service-1',
    salonId: 'demo-preview',
    name: 'Signature Bridal Makeover (Sample Preview)',
    category: 'bridal',
    description: 'Sample service preview — add your real services in Dashboard → Services.',
    pricePaise: 1899900,
    price: 18999,
    durationMinutes: 150,
    active: true,
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
  }),
  Object.freeze({
    id: 'demo-service-2',
    salonId: 'demo-preview',
    name: 'Balayage & Couture Blowout (Sample Preview)',
    category: 'hair',
    description: 'Sample service preview — add your real services in Dashboard → Services.',
    pricePaise: 649900,
    price: 6499,
    durationMinutes: 120,
    active: true,
    sortOrder: 1,
    createdAt: '',
    updatedAt: '',
  }),
  Object.freeze({
    id: 'demo-service-3',
    salonId: 'demo-preview',
    name: 'HydraFacial Radiance Ritual (Sample Preview)',
    category: 'skin',
    description: 'Sample service preview — add your real services in Dashboard → Services.',
    pricePaise: 399900,
    price: 3999,
    durationMinutes: 60,
    active: true,
    sortOrder: 2,
    createdAt: '',
    updatedAt: '',
  }),
]);
