export type ServiceCategory = 'bridal' | 'hair' | 'skin' | 'nails' | 'spa' | 'academy';

export interface ServiceItem {
  id: string;
  title: string;
  category: ServiceCategory;
  price: number;
  duration: string;
  description: string;
  highlights: string[];
  popular?: boolean;
  image?: string;
  rating?: number;
  reviewCount?: number;
}

export interface ServiceReview {
  id: string;
  serviceId: string;
  authorName: string;
  rating: number; // 1 to 5
  comment: string;
  date: string;
  location?: string;
  verifiedBooking?: boolean;
}

export interface BundlePackage {
  id: string;
  title: string;
  tagline: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  savings: number;
  duration: string;
  servicesIncluded: string[];
  image: string;
  badge?: string;
  popular?: boolean;
}

export interface Stylist {
  id: string;
  name: string;
  role: string;
  category: 'bridal' | 'hair' | 'skin' | 'nails';
  branch: string;
  experience: string;
  rating: number;
  reviewCount: number;
  bio: string;
  avatar: string;
  specialties: string[];
  certifications: string[];
  portfolio: {
    title: string;
    description: string;
    image: string;
  }[];
}

export interface SalonBranch {
  id: string;
  name: string;
  locality: string;
  address: string;
  phone: string;
  whatsapp: string;
  timings: string;
  googleRating: number;
  reviewCount: number;
  amenities: string[];
  isFlagship?: boolean;
}

export type ServiceMode = 'in-salon' | 'at-home';

export interface BookingFormData {
  fullName: string;
  phone: string;
  email: string;
  serviceMode: ServiceMode;
  branch: string;
  homeAddress: string;
  homeLocality: string;
  distanceKm: number;
  distanceFee: number;
  advanceDepositRequired: number;
  advancePaymentVerified: boolean;
  advancePaymentRef?: string;
  advancePaymentMethod?: 'upi' | 'card' | 'netbanking';
  serviceCategory: string;
  selectedService: string;
  preferredDate: string;
  preferredTime: string;
  artistLevel: string;
  notes: string;
}

export interface Testimonial {
  id: string;
  clientName: string;
  location: string;
  service: string;
  date: string;
  comment: string;
  rating: number;
  weddingVenue?: string;
}

export interface SalonPackage {
  id: string;
  name: string;
  tagline?: string;
  description: string;
  offer_name?: string;
  services: string[];
  duration: string;
  regular_price: number;
  package_price: number;
  discount: number; // percentage e.g. 20
  savings: number; // regular_price - package_price
  validity: string; // e.g. '60 Days'
  valid_from?: string;
  valid_until?: string;
  usage_rules: string[];
  outlets: string[];
  image: string;
  active: boolean;
  featured?: boolean;
}

export type GalleryUploadType = 'photo' | 'before_after' | 'portfolio' | 'work_showcase';

export type VideoPlatform = 'youtube' | 'instagram' | 'facebook' | 'other';

export interface VideoItem {
  id: string;
  url: string;
  embedUrl: string;
  platform: VideoPlatform;
  title: string;
  description: string;
  category: string;
  thumbnail?: string;
  videoUrl?: string;
  featured: boolean;
  active: boolean;
  viewsCount?: string;
  viewsNumeric?: number;
  pinCount?: number;
  clicksCount?: number;
  engagementScore?: number;
  duration?: string;
  created_at?: string;
  author?: string;
}

export interface GalleryItem {
  id: string;
  type: GalleryUploadType;
  title: string;
  description: string;
  category: string;
  service: string;
  image: string;
  before_image?: string;
  sort_order: number;
  featured: boolean;
  active: boolean;
  created_at?: string;
  artist?: string;
}

export type LoyaltyTierLevel = 'silver' | 'gold' | 'platinum';

export interface LoyaltyActivity {
  id: string;
  date: string;
  branch: string;
  serviceTitle: string;
  billAmount: number;
  pointsEarned: number;
  type: 'visit' | 'bonus' | 'referral';
}

export interface RedeemedReward {
  id: string;
  rewardTitle: string;
  voucherCode: string;
  pointsCost: number;
  dateRedeemed: string;
  validTill: string;
  status: 'active' | 'used';
  discountValue: string;
}

export interface RewardOffer {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  discountValue: string;
  category: 'discount' | 'free_service' | 'upgrade' | 'bridal';
  badge?: string;
  iconName?: string;
}

export interface LoyaltyCustomer {
  phone: string;
  name: string;
  memberId: string;
  tier: LoyaltyTierLevel;
  totalPoints: number;
  lifetimePoints: number;
  visitsCount: number;
  joinedDate: string;
  activities: LoyaltyActivity[];
  redeemedRewards: RedeemedReward[];
}

export type BrandLogoIcon = 'crown' | 'sparkles' | 'scissors' | 'gem' | 'heart' | 'flower' | 'star' | 'shield';

export type SupportedLanguage = 'en' | 'hi' | 'mr' | 'gu' | 'pa' | 'ar' | 'es';

export interface TranslationDictionary {
  // Navigation
  navReels: string;
  navPackages: string;
  navServices: string;
  navBridal: string;
  navGallery: string;
  navGiftCards: string;
  navRewards: string;
  navLocations: string;
  navBookAppointment: string;
  navHomeServiceAvailable: string;
  navWhiteLabelStudio: string;
  navCatalogAdmin: string;

  // Hero
  heroBookBtn: string;
  heroExploreBtn: string;
  heroCertifiedArtists: string;
  heroGenuineProducts: string;
  heroHomeService: string;
  heroOpenToday: string;
  heroHappyClients: string;

  // Section Headings & Overlines
  reelsOverline: string;
  reelsTitle: string;
  reelsSubtitle: string;

  packagesOverline: string;
  packagesTitle: string;
  packagesSubtitle: string;
  packagesBookCombo: string;

  servicesOverline: string;
  servicesTitle: string;
  servicesSearchPlaceholder: string;
  servicesBookNow: string;

  bridalBookConsult: string;
  bridalViewMenu: string;
  bridalDirectDesk: string;

  galleryOverline: string;
  galleryTitle: string;
  gallerySubtitle: string;

  bookingOverline: string;
  bookingTitle: string;
  bookingSubtitle: string;
  bookingWhereQuestion: string;
  bookingVisitSalon: string;
  bookingHomeService: string;
  bookingFullName: string;
  bookingPhone: string;
  bookingSelectService: string;
  bookingSelectStylist: string;
  bookingPreferredDate: string;
  bookingPreferredTime: string;
  bookingConfirmBtn: string;
  bookingEstimatedTotal: string;

  rewardsTitle: string;
  rewardsSubtitle: string;
  rewardsCheckPoints: string;

  giftCardBadge: string;
  giftCardGenerateBtn: string;

  stylistsOverline: string;
  stylistsTitle: string;
  stylistsSubtitle: string;

  founderOverline: string;
  founderBookConsult: string;

  testimonialsOverline: string;
  testimonialsTitle: string;
  testimonialsSubtitle: string;

  locationsOverline: string;
  locationsTitle: string;
  locationsSubtitle: string;
  locationsDirections: string;
  locationsBookHomeVisit: string;

  faqOverline: string;
  faqTitle: string;
  faqSubtitle: string;
  faqAskWhatsapp: string;

  footerQuickLinks: string;
  footerPopularServices: string;
  footerContactBookings: string;
}

export interface WhiteLabelLocalizationConfig {
  defaultLanguage: SupportedLanguage;
  activeLanguage: SupportedLanguage;
  enabledLanguages: SupportedLanguage[];
  showLanguageSwitcher: boolean;
  customTranslations: Partial<Record<SupportedLanguage, Partial<TranslationDictionary>>>;
}

export interface WhiteLabelDomainSeoConfig {
  customDomain: string;
  subdomainSlug: string;
  dnsVerified: boolean;
  sslEnabled: boolean;
  forceHttps: boolean;
  wwwRedirect: boolean;
  cnameTarget: string;
  aRecordIp: string;
  faviconUrl: string;
  appleTouchIconUrl: string;
  themeColorHex: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  twitterCardType: 'summary_large_image' | 'summary';
  robotsIndexing: boolean;
  googleAnalyticsId: string;
  metaPixelId: string;
  googleSiteVerification: string;
}

export interface BookingFormState {
  fullName: string;
  phone: string;
  locationType: 'salon' | 'home';
  selectedBranch: string;
  homeAddress: string;
  locality: string;
  distanceKm: number;
  serviceCategory: string;
  selectedService: string;
  preferredStylist: string;
  appointmentDate: string;
  timeSlot: string;
  bridalTrialRequired: boolean;
  specialNotes: string;
  advancePaymentVerified: boolean;
  advancePaymentRef: string;
  advancePaymentMethod: 'upi' | 'card';
}

export interface WhiteLabelTheme {
  id: string;
  name: string;
  bgColor: string;
  primaryColor: string;
  accentColor: string;
  accentHoverColor: string;
  textMutedColor: string;
  surfaceColor: string;
  fontHeading: string;
  fontBody: string;
}

export interface LocalityZone {
  name: string;
  distanceKm: number;
  zone: string;
}

export interface TrustHighlightItem {
  title: string;
  subtitle: string;
  icon: string;
}

export interface FAQItem {
  id?: string;
  category?: string;
  question: string;
  answer: string;
}

export interface WhiteLabelSectionToggles {
  showTrustBar: boolean;
  showReels: boolean;
  showPackages: boolean;
  showServices: boolean;
  showBridalSpotlight: boolean;
  showGallery: boolean;
  showBooking: boolean;
  showRewards: boolean;
  showGiftCards: boolean;
  showStylists: boolean;
  showFoundersNote: boolean;
  showTestimonials: boolean;
  showLocations: boolean;
  showFAQ: boolean;
  showFloatingActions: boolean;
}

export interface WhiteLabelConfig {
  presetId: string;
  brandName: string;
  brandSubtext: string;
  tagline: string;
  logoUrl: string;
  logoIcon: BrandLogoIcon;
  cityName: string;
  stateName: string;
  countryName: string;
  establishedYear: string;
  currencySymbol: string;
  currencyCode: string;

  phoneDisplay: string;
  phoneRaw: string;
  whatsappNumber: string;
  email: string;
  instagramHandle: string;
  instagramUrl: string;
  youtubeUrl: string;
  facebookUrl: string;
  googleMapsUrl: string;

  upiId: string;
  bookingPrefix: string;
  giftCardPrefix: string;
  loyaltyPrefix: string;
  homeServiceBaseFee: number;
  homeServicePerKmRate: number;
  homeServiceFreeThreshold: number;
  advancePercentage: number;

  heroBadgeText: string;
  heroHeadlineLine1: string;
  heroHeadlineHighlight: string;
  heroHeadlineLine2: string;
  heroDescription: string;
  heroImage: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  heroFloatingCardTitle: string;
  heroFloatingCardSubtitle: string;
  heroPromoPillText: string;

  trustHighlights: TrustHighlightItem[];

  bridalBadgeText: string;
  bridalHeadline: string;
  bridalSubheadline: string;
  bridalImage: string;
  bridalFeatures: string[];

  founderName: string;
  founderRole: string;
  founderExperienceBadge: string;
  founderQuoteHeadline: string;
  founderBioParagraph1: string;
  founderBioParagraph2: string;
  founderImage: string;
  founderStats: { value: string; label: string }[];

  loyaltyClubName: string;
  loyaltyTagline: string;
  giftCardTitle: string;
  giftCardSubtitle: string;

  footerDescription: string;
  copyrightText: string;
  showPoweredByBadge: boolean;

  theme: WhiteLabelTheme;
  sections: WhiteLabelSectionToggles;
  localization: WhiteLabelLocalizationConfig;
  domainSeo: WhiteLabelDomainSeoConfig;

  branches: SalonBranch[];
  localities: LocalityZone[];
  stylists: Stylist[];
  testimonials: Testimonial[];
  faqs: FAQItem[];
}


