/**
 * Canonical RBAC vocabulary. `admin` is an operational administrator with
 * read-mostly console access; `customer` only sees customer-facing surfaces.
 * `salon_owner` is retained for all existing owner accounts.
 * Mirrored in `src/lib/roles.js` (framework-free, shared with the API).
 */
export type Role = 'super_admin' | 'admin' | 'salon_owner' | 'customer';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: 'active' | 'disabled';
  authProvider: 'password' | 'google';
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export type SalonStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested';

export type ReviewAction = 'approve' | 'reject' | 'request_changes';

export interface SalonVersion {
  id: string;
  salonId: string;
  version: number;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'superseded';
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string;
  contentHash?: string;
}

export interface WorkflowBlocker {
  code: string;
  message: string;
  missing?: string[];
}

/**
 * Public website state. Only a super admin can move a salon into
 * 'approved'; a salon owner can only reach 'pending_approval'.
 */
export type WebsiteStatus = 'draft' | 'pending_approval' | 'approved';

export interface SalonWorkflow {
  /** Internal review status (superset of WebsiteStatus). */
  status: SalonStatus;
  /** 3-state public website state exposed to the owner dashboard. */
  websiteStatus?: WebsiteStatus;
  /** Live = approved AND published AND not suspended. */
  isLive?: boolean;
  published?: boolean;
  canBePublished?: boolean;
  awaitingReview?: boolean;
  suspended: boolean;
  suspendedReason: string;
  reviewNote: string;
  submittedAt: string | null;
  approvedAt: string | null;
  reviewedAt: string | null;
  emailVerified: boolean;
  pendingVersion: SalonVersion | null;
  approvedVersion: SalonVersion | null;
  hasUnpublishedChanges: boolean;
  /** True when the owner may submit/resubmit for review. */
  canSubmit: boolean;
  /** Always false for owners — publishing is a super-admin action. */
  canPublish: boolean;
  blockers: WorkflowBlocker[];
}

export interface OpeningHours {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  open: string;
  close: string;
  closed: boolean;
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
  status: SalonStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  reviewNote: string;
  reviewedAt: string | null;
  suspended: boolean;
  suspendedReason: string;
  suspendedAt: string | null;
  templateId: TemplateId;
  timings: OpeningHours[];
  ownerName: string;
  ownerPhone: string;
  onboardingCompleted: boolean;
  websiteVersion?: number | null;
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
  imageUrl?: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffWorkPhoto {
  url: string;
  caption?: string;
}

/** Owner-managed availability. Only 'available' staff can be booked online. */
export type StaffAvailability = 'available' | 'busy' | 'on_leave';

export interface SalonStaff {
  id: string;
  salonId: string;
  name: string;
  roleTitle: string;
  bio: string;
  photoUrl: string;
  specialties: string[];
  qualifications?: string[];
  workPhotos?: StaffWorkPhoto[];
  workPhotosConsent?: boolean;
  active: boolean;
  /** When false the specialist is listed but cannot be booked online. */
  bookingEnabled?: boolean;
  /** Availability status set by the owner (defaults to 'available' when absent). */
  availabilityStatus?: StaffAvailability;
  /** Optional reputation fields shown in the booking picker when genuine rating data is available. */
  rating?: number | null;
  reviewCount?: number | null;
  experience?: string;
  /** True only for client-side preview demo staff on unpublished websites (never persisted). */
  isDemo?: boolean;
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
  salon: {
    id: string;
    name: string;
    slug: string;
    published: boolean;
    status?: SalonStatus;
    suspended?: boolean;
  } | null;
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

export type TemplateId = 'luxe' | 'minimal' | 'noir' | 'blush';

export interface WebsiteTemplate {
  id: TemplateId;
  name: string;
  description: string;
  premium: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  salon: Salon | null;
  workflow: SalonWorkflow | null;
  subscription: MembershipPlan | null;
  onboardingRequired: boolean;
  emailVerificationSent?: boolean;
  devVerificationUrl?: string;
}

export interface AdminApproval extends SalonVersion {
  salon: {
    id: string;
    name: string;
    slug: string;
    city: string;
    published: boolean;
    suspended: boolean;
    status: SalonStatus;
  };
  owner: { name: string; email: string; emailVerified: boolean };
}

export interface ApprovalSnapshot {
  salon: Record<string, unknown>;
  services: Array<Record<string, unknown>>;
  staff: Array<Record<string, unknown>>;
}

export interface PublicSalonResponse {
  salon: Salon;
  services: SalonService[];
  staff: SalonStaff[];
}
