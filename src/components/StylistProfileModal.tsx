import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Images,
  Lock,
  MapPin,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import type { SalonStaff, StaffWorkPhoto, TemplateId } from '../types/auth';
import { describeWeeklySchedule } from '../lib/staffRoles.js';

/** Complete staff profile data displayed in the full profile modal. */
export interface StylistProfile {
  id: string;
  name: string;
  role?: string;
  branch?: string;
  experience?: string;
  rating?: number | null;
  reviewCount?: number | null;
  bio?: string;
  avatar?: string;
  specialties?: string[];
  qualifications?: string[];
  /** Alias kept for compatibility with legacy marketing catalog items. */
  certifications?: string[];
  workPhotos?: StaffWorkPhoto[];
  /** Work photos are ONLY rendered when consent is explicitly true. */
  workPhotosConsent?: boolean;
  bookingEnabled?: boolean;
  isDemo?: boolean;
  joinedAt?: string | null;
  /** Recurring weekly roster, summarised in the profile (null = not set). */
  weeklySchedule?: { day: string; startTime: string; endTime: string; closed: boolean }[] | null;
}

/** Canonical mapper from a database `SalonStaff` record to `StylistProfile`. */
export function staffToProfile(
  member: SalonStaff,
  extras: { branch?: string } = {}
): StylistProfile {
  const consented = Boolean(member.workPhotosConsent);
  return {
    id: member.id,
    name: member.name,
    role: member.roleTitle || '',
    branch: extras.branch || '',
    experience: member.experience || '',
    rating:
      member.rating !== null && member.rating !== undefined && Number(member.rating) > 0
        ? Number(member.rating)
        : null,
    reviewCount: Number(member.reviewCount) || 0,
    bio: member.bio || '',
    avatar: member.photoUrl || '',
    specialties: Array.isArray(member.specialties) ? member.specialties.filter(Boolean) : [],
    qualifications: Array.isArray(member.qualifications) ? member.qualifications.filter(Boolean) : [],
    workPhotos: consented && Array.isArray(member.workPhotos) ? member.workPhotos.filter((p) => Boolean(p?.url)) : [],
    workPhotosConsent: consented,
    bookingEnabled: member.bookingEnabled !== false && !member.isDemo,
    isDemo: Boolean(member.isDemo),
    joinedAt: member.createdAt || null,
    weeklySchedule: Array.isArray(member.weeklySchedule) ? member.weeklySchedule : null,
  };
}

interface StylistProfileModalProps {
  profile: StylistProfile | null;
  /** True when this specialist is already locked into the booking form. */
  selected?: boolean;
  /** Controls live vs unpublished booking state. Defaults to true when omitted. */
  websitePublished?: boolean;
  templateId?: TemplateId;
  accent?: string;
  primary?: string;
  background?: string;
  surface?: string;
  onClose: () => void;
  onSelect?: (profile: StylistProfile) => void;
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

/**
 * Dedicated full staff profile modal.
 *
 * - Closed by default (`profile === null` renders nothing).
 * - Displays only genuine, non-empty fields — never empty sections or
 *   placeholder values.
 * - Enforces staff consent before displaying any work/portfolio photos.
 * - Responsive across mobile and desktop viewports.
 */
export const StylistProfileModal: React.FC<StylistProfileModalProps> = ({
  profile,
  selected = false,
  websitePublished = true,
  templateId = 'luxe',
  accent = '#D09A40',
  primary = '#0F172A',
  background = '#FAF5E5',
  surface = '#FFFFFF',
  onClose,
  onSelect,
}) => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<StaffWorkPhoto | null>(null);

  useEffect(() => {
    setAvatarFailed(false);
    setExpandedPhoto(null);
  }, [profile?.id, profile?.avatar]);

  useEffect(() => {
    if (!profile) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (expandedPhoto) {
          setExpandedPhoto(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [profile, onClose, expandedPhoto]);

  if (!profile) return null;

  const numericRating = profile.rating !== null && profile.rating !== undefined ? Number(profile.rating) : NaN;
  const hasGenuineRating = Number.isFinite(numericRating) && numericRating > 0;
  const reviewCount = hasGenuineRating ? Math.max(0, Number(profile.reviewCount) || 0) : 0;
  const experience = profile.experience?.trim() || '';
  const role = profile.role?.trim() || '';
  const bio = profile.bio?.trim() || '';
  const branch = profile.branch?.trim() || '';
  const specialties = (profile.specialties || []).map((s) => s.trim()).filter(Boolean);
  const qualifications = Array.from(
    new Set([...(profile.qualifications || []), ...(profile.certifications || [])].map((q) => q.trim()).filter(Boolean))
  );
  const consentedWorkPhotos =
    profile.workPhotosConsent === true
      ? (profile.workPhotos || []).filter((photo) => Boolean(photo && photo.url?.trim()))
      : [];
  // Weekly roster summary ("Mon–Sat 10:00 – 20:00 · Sun closed").
  const scheduleSummary = Array.isArray(profile.weeklySchedule) && profile.weeklySchedule.length > 0
    ? describeWeeklySchedule(profile.weeklySchedule)
    : '';

  const hasMetricsStrip = hasGenuineRating || Boolean(experience) || selected;
  const hasBodySections =
    Boolean(bio) ||
    Boolean(scheduleSummary) ||
    specialties.length > 0 ||
    qualifications.length > 0 ||
    consentedWorkPhotos.length > 0;

  const canBook =
    Boolean(onSelect) &&
    websitePublished &&
    !profile.isDemo &&
    profile.bookingEnabled !== false;

  const modalRadius =
    templateId === 'noir' ? 'rounded-none' : templateId === 'minimal' ? 'rounded-2xl' : 'rounded-3xl';
  const cardRadius =
    templateId === 'noir' ? 'rounded-none' : templateId === 'minimal' ? 'rounded-lg' : 'rounded-2xl';
  const headingClass = templateId === 'minimal' ? 'font-sans font-semibold' : 'font-serif';

  return (
    <div
      data-testid="staff-full-profile-modal"
      className="fixed inset-0 z-[110] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(4px)' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stylist-profile-heading"
        className={`relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden border shadow-2xl sm:max-h-[88vh] ${modalRadius} rounded-b-none sm:rounded-b-3xl`}
        style={{ backgroundColor: surface, borderColor: `${accent}55`, color: primary }}
      >
        {/* Header */}
        <div
          className={`relative shrink-0 px-5 ${hasMetricsStrip ? 'pb-12' : 'pb-6'} pt-5 sm:px-7 sm:pt-6`}
          style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}EE 60%, ${accent} 165%)` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ backgroundColor: `${accent}26`, color: accent, border: `1px solid ${accent}55` }}
              >
                <Sparkles className="h-3 w-3" /> Staff profile
              </span>
              {profile.isDemo && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}
                >
                  Demo Profile · Sample Preview
                </span>
              )}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close staff profile"
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer hover:opacity-90"
              style={{ backgroundColor: 'rgba(255,255,255,0.14)', color: '#FFFFFF' }}
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>

          <div className="mt-4 flex items-center gap-4 sm:items-end">
            <span
              className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden sm:h-24 sm:w-24 ${cardRadius}`}
              style={{ backgroundColor: `${accent}30`, boxShadow: `0 0 0 3px ${accent}` }}
            >
              {profile.avatar && !avatarFailed ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  onError={() => setAvatarFailed(true)}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <span className={`${headingClass} text-xl font-bold`} style={{ color: accent }}>
                  {initialsOf(profile.name)}
                </span>
              )}
            </span>
            <div className="min-w-0 pb-0.5">
              <h2
                id="stylist-profile-heading"
                className={`${headingClass} text-2xl font-bold leading-tight text-white sm:text-3xl`}
              >
                {profile.name}
              </h2>
              {role && (
                <p className="mt-1 text-xs font-semibold sm:text-sm" style={{ color: accent }}>
                  {role}
                </p>
              )}
              {branch && (
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/75">
                  <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                  <span className="truncate">{branch}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Genuine Rating / Experience strip — rendered ONLY when real metrics exist */}
        {hasMetricsStrip && (
          <div
            className={`-mt-7 mx-4 flex shrink-0 flex-wrap items-stretch gap-2 ${cardRadius} border p-2 shadow-sm sm:mx-6`}
            style={{ backgroundColor: surface, borderColor: `${accent}44` }}
          >
            {hasGenuineRating && (
              <div
                className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2"
                style={{ backgroundColor: background }}
              >
                <Star className="h-4 w-4 shrink-0" style={{ color: accent, fill: accent }} />
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-none">
                    {numericRating.toFixed(1)}
                    <span className="text-[11px] font-medium" style={{ color: `${primary}88` }}>
                      {' '}
                      / 5
                    </span>
                  </p>
                  {reviewCount > 0 && (
                    <p className="mt-0.5 text-[10px]" style={{ color: `${primary}88` }}>
                      {reviewCount} client {reviewCount === 1 ? 'review' : 'reviews'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {experience && (
              <div
                className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2"
                style={{ backgroundColor: background }}
              >
                <BriefcaseBusiness className="h-4 w-4 shrink-0" style={{ color: accent }} />
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-none">{experience}</p>
                  <p className="mt-0.5 text-[10px]" style={{ color: `${primary}88` }}>
                    Professional experience
                  </p>
                </div>
              </div>
            )}

            {selected && (
              <div
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold"
                style={{ backgroundColor: `${accent}1F`, color: primary }}
              >
                <CheckCircle2 className="h-4 w-4" style={{ color: accent }} />
                Selected
              </div>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        {hasBodySections && (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
            {bio && (
              <section>
                <h3
                  className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: `${primary}80` }}
                >
                  About {profile.name}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: `${primary}DD` }}>
                  {bio}
                </p>
              </section>
            )}

            {scheduleSummary && (
              <section>
                <h3
                  className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: `${primary}80` }}
                >
                  <Calendar className="h-3.5 w-3.5" style={{ color: accent }} /> Weekly availability
                </h3>
                <p
                  className="rounded-xl px-3 py-2 text-sm font-medium"
                  style={{ backgroundColor: `${accent}12`, color: primary, border: `1px solid ${accent}26` }}
                >
                  {scheduleSummary}
                </p>
              </section>
            )}

            {specialties.length > 0 && (
              <section>
                <h3
                  className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: `${primary}80` }}
                >
                  <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} /> Skills & specialties
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ backgroundColor: `${accent}18`, color: primary, border: `1px solid ${accent}33` }}
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {qualifications.length > 0 && (
              <section>
                <h3
                  className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: `${primary}80` }}
                >
                  <Award className="h-3.5 w-3.5" style={{ color: accent }} /> Qualifications & certifications
                </h3>
                <ul className="space-y-1.5">
                  {qualifications.map((qualification) => (
                    <li
                      key={qualification}
                      className="flex items-start gap-2 text-xs leading-snug sm:text-[13px]"
                      style={{ color: `${primary}DD` }}
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                      <span>{qualification}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {consentedWorkPhotos.length > 0 && (
              <section>
                <h3
                  className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: `${primary}80` }}
                >
                  <Images className="h-3.5 w-3.5" style={{ color: accent }} /> Portfolio & work gallery
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {consentedWorkPhotos.map((photo, index) => (
                    <button
                      key={`${photo.url}-${index}`}
                      type="button"
                      onClick={() => setExpandedPhoto(photo)}
                      className={`group relative overflow-hidden ${cardRadius} border text-left transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 cursor-pointer`}
                      style={{ borderColor: `${primary}18`, backgroundColor: background }}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || `${profile.name} portfolio work ${index + 1}`}
                        loading="lazy"
                        className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {photo.caption && (
                        <span className="block truncate px-2.5 py-1.5 text-[11px] font-medium" style={{ color: primary }}>
                          {photo.caption}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Expanded portfolio photo lightbox */}
        {expandedPhoto && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/92 p-4"
            onClick={() => setExpandedPhoto(null)}
          >
            <button
              type="button"
              onClick={() => setExpandedPhoto(null)}
              className="mb-3 inline-flex items-center gap-1.5 self-end rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to profile
            </button>
            <img
              src={expandedPhoto.url}
              alt={expandedPhoto.caption || `${profile.name} work`}
              className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            {expandedPhoto.caption && (
              <p className="mt-3 max-w-md text-center text-xs font-medium text-white/90">{expandedPhoto.caption}</p>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div
          className="flex shrink-0 flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          style={{ borderColor: `${primary}14`, backgroundColor: background }}
        >
          <button
            type="button"
            onClick={onClose}
            className="order-2 inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer sm:order-1"
            style={{ borderColor: `${primary}26`, color: primary, backgroundColor: surface }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back / Close</span>
          </button>

          {onSelect &&
            (canBook ? (
              <button
                type="button"
                onClick={() => onSelect(profile)}
                disabled={selected}
                className="order-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer sm:order-2 disabled:cursor-default"
                style={{
                  backgroundColor: selected ? `${accent}33` : accent,
                  color: primary,
                }}
                aria-label={
                  selected ? `${profile.name} is selected for your booking` : `Select ${profile.name} for Booking`
                }
              >
                {selected ? <CheckCircle2 className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                {selected ? `${profile.name} selected` : `Select ${profile.name} for Booking`}
              </button>
            ) : (
              <span
                className="order-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-semibold sm:order-2"
                style={{ borderColor: `${primary}22`, color: `${primary}99`, backgroundColor: `${primary}08` }}
              >
                <Lock className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                {profile.isDemo
                  ? 'Demo profile · Not bookable'
                  : !websitePublished
                    ? 'Publish website to enable booking'
                    : 'Call salon to book this specialist'}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
};

export default StylistProfileModal;
