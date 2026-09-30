export interface ServiceItem {
  id: string;
  title: string;
  category: 'bridal' | 'hair' | 'skin' | 'nails' | 'spa' | 'academy';
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

