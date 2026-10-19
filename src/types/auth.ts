export type Role = 'super_admin' | 'salon_owner';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: 'active' | 'disabled';
  authProvider: 'password' | 'google';
  lastLoginAt: string | null;
  createdAt: string;
}

export interface MembershipPlan {
  id: string;
  salonId: string;
  plan: 'trial' | 'starter' | 'pro' | 'elite';
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalonTheme {
  accent?: string;
  primary?: string;
  background?: string;
  surface?: string;
}

export interface GalleryImage {
  url: string;
  caption?: string;
}

export interface Salon {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logoUrl: string;
  coverImage: string;
  gallery: GalleryImage[];
  phone: string;
  email: string;
  whatsapp: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  mapUrl: string;
  instagram: string;
  facebook: string;
  heroTitle: string;
  heroSubtitle: string;
  theme: SalonTheme;
  published: boolean;
  publishedAt: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; name: string; email: string; status: string };
  subscription?: { plan: string; status: string; currentPeriodEnd: string | null } | null;
  serviceCount?: number;
}

export interface SalonService {
  id: string;
  salonId: string;
  name: string;
  category: string;
  description: string;
  pricePaise: number;
  price: number;
  durationMinutes: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalonStaff {
  id: string;
  salonId: string;
  name: string;
  roleTitle: string;
  bio: string;
  photoUrl: string;
  specialties: string[];
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionWithSalon extends MembershipPlan {
  salonName: string;
  salonSlug: string;
  ownerEmail: string;
}

export interface AdminUser extends AuthUser {
  salon: { id: string; name: string; slug: string; published: boolean } | null;
  subscription: { plan: string; status: string } | null;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  allowRegistrations: boolean;
  trialDays: number;
  maintenanceMessage: string;
  defaultPlan: 'trial' | 'starter' | 'pro' | 'elite';
}

export interface AuthResponse {
  user: AuthUser;
  salon: Salon | null;
  subscription: MembershipPlan | null;
  onboardingRequired: boolean;
}

export interface PublicSalonResponse {
  salon: Salon;
  services: SalonService[];
  staff: SalonStaff[];
}
