import React, { useEffect, useRef } from 'react';
import {
  Award,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  MapPin,
  Sparkles,
  Star,
  X,
} from 'lucide-react';

/** Everything the profile modal can show. Optional fields degrade gracefully. */
export interface StylistProfile {
  id: string;
  name: string;
  role: string;
  branch?: string;
  experience?: string;
  rating?: number | null;
  reviewCount?: number | null;
  bio?: string;
  avatar?: string;
  specialties?: string[];
  certifications?: string[];
  /** ISO date the specialist joined — used when no experience is published. */
  joinedAt?: string | null;
}

interface StylistProfileModalProps {
  profile: StylistProfile | null;
  /** True when this specialist is already the one locked into the booking. */
  selected?: boolean;
  accent?: string;
  primary?: string;
  background?: string;
  surface?: string;
  onClose: () => void;
  onSelect: (profile: StylistProfile) => void;
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

const experienceLabel = (profile: StylistProfile) => {
  if (profile.experience) return profile.experience;
  if (profile.joinedAt) {
    const joined = new Date(profile.joinedAt);
    if (!Number.isNaN(joined.getTime())) {
      const years = Math.max(0, new Date().getFullYear() - joined.getFullYear());
      return years > 0 ? `${years}+ Years with the salon` : 'New to the salon team';
    }
  }
  return null;
};

/**
 * Full stylist / staff profile shown from the booking flow.
 *
 * The primary action locks the specialist into the booking and closes the
 * dialog, so a visitor never has to leave the form to confirm their choice.
 */
export const StylistProfileModal: React.FC<StylistProfileModalProps> = ({
  profile,
  selected = false,
  accent = '#D09A40',
  primary = '#0F172A',
  background = '#FAF5E5',
  surface = '#FFFFFF',
  onClose,
  onSelect,
}) => {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!profile) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [profile, onClose]);

  if (!profile) return null;

  const rating = Number(profile.rating);
  const hasRating = Number.isFinite(rating) && rating > 0;
  const reviewCount = Number(profile.reviewCount) || 0;
  const specialties = (profile.specialties || []).filter(Boolean);
  const certifications = (profile.certifications || []).filter(Boolean);
  const experience = experienceLabel(profile);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-3 sm:p-6"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(4px)' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stylist-profile-heading"
        className="relative my-4 w-full max-w-2xl overflow-hidden rounded-3xl border shadow-2xl sm:my-8"
        style={{ backgroundColor: surface, borderColor: `${accent}55`, color: primary }}
      >
        {/* Header */}
        <div
          className="relative px-5 pb-14 pt-5 sm:px-7 sm:pt-6"
          style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}E6 55%, ${accent} 160%)` }}
        >
          <div className="flex items-start justify-between gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ backgroundColor: `${accent}26`, color: accent, border: `1px solid ${accent}55` }}
            >
              <Sparkles className="h-3 w-3" /> Specialist profile
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close stylist profile"
              className="rounded-full p-1.5 transition-colors cursor-pointer"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#FFFFFF' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex items-end gap-4">
            <span
              className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:h-24 sm:w-24"
              style={{ backgroundColor: `${accent}30`, boxShadow: `0 0 0 3px ${accent}` }}
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <span className="text-xl font-bold" style={{ color: accent }}>
                  {initialsOf(profile.name)}
                </span>
              )}
            </span>
            <div className="min-w-0 pb-1">
              <h2
                id="stylist-profile-heading"
                className="font-serif text-2xl font-bold leading-tight text-white sm:text-3xl"
              >
                {profile.name}
              </h2>
              <p className="mt-1 text-xs font-semibold sm:text-sm" style={{ color: accent }}>
                {profile.role || 'Salon specialist'}
              </p>
              {profile.branch && (
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/70">
                  <MapPin className="h-3.5 w-3.5" style={{ color: accent }} />
                  <span className="truncate">{profile.branch}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Rating / experience strip */}
        <div
          className="-mt-8 mx-4 flex flex-wrap items-stretch gap-2 rounded-2xl border p-2 shadow-sm sm:mx-6"
          style={{ backgroundColor: surface, borderColor: `${accent}44` }}
        >
          <div className="flex flex-1 items-center gap-2 rounded-xl px-2.5 py-2" style={{ backgroundColor: background }}>
            <Star className="h-4 w-4" style={{ color: accent, fill: hasRating ? accent : 'transparent' }} />
            <div className="min-w-0">
              <p className="text-sm font-bold leading-none">
                {hasRating ? rating.toFixed(1) : 'New'}
                <span className="text-[11px] font-medium" style={{ color: `${primary}88` }}>
                  {hasRating ? ' / 5' : ''}
                </span>
              </p>
              <p className="mt-0.5 text-[10px]" style={{ color: `${primary}88` }}>
                {reviewCount > 0 ? `${reviewCount} client reviews` : 'No client reviews yet'}
              </p>
            </div>
          </div>
          {experience && (
            <div className="flex flex-1 items-center gap-2 rounded-xl px-2.5 py-2" style={{ backgroundColor: background }}>
              <BriefcaseBusiness className="h-4 w-4" style={{ color: accent }} />
              <div className="min-w-0">
                <p className="text-sm font-bold leading-none">{experience}</p>
                <p className="mt-0.5 text-[10px]" style={{ color: `${primary}88` }}>
                  Experience
                </p>
              </div>
            </div>
          )}
          {selected && (
            <div
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold"
              style={{ backgroundColor: `${accent}1F`, color: primary }}
            >
              <CheckCircle2 className="h-4 w-4" style={{ color: accent }} />
              Selected
            </div>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[52vh] space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {profile.bio && (
            <section>
              <h3
                className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: `${primary}80` }}
              >
                About {profile.name}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: `${primary}DD` }}>
                {profile.bio}
              </p>
            </section>
          )}

          {specialties.length > 0 && (
            <section>
              <h3
                className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: `${primary}80` }}
              >
                <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} /> Core specialties
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ backgroundColor: `${accent}18`, color: primary, border: `1px solid ${accent}33` }}
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </section>
          )}

          {certifications.length > 0 && (
            <section>
              <h3
                className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: `${primary}80` }}
              >
                <Award className="h-3.5 w-3.5" style={{ color: accent }} /> Certifications
              </h3>
              <ul className="space-y-1.5">
                {certifications.map((certification) => (
                  <li
                    key={certification}
                    className="flex items-start gap-2 text-[12px] leading-snug"
                    style={{ color: `${primary}CC` }}
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                    <span>{certification}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="flex flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          style={{ borderColor: `${primary}14`, backgroundColor: background }}
        >
          <button
            type="button"
            onClick={onClose}
            className="order-2 inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer sm:order-1"
            style={{ borderColor: `${primary}26`, color: primary, backgroundColor: surface }}
          >
            Keep browsing
          </button>
          <button
            type="button"
            onClick={() => onSelect(profile)}
            disabled={selected}
            className="order-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-wide transition-colors sm:order-2 disabled:cursor-default"
            style={{
              backgroundColor: selected ? `${accent}33` : accent,
              color: primary,
            }}
            aria-label={selected ? `${profile.name} is selected for your booking` : `Select ${profile.name} for Booking`}
          >
            {selected ? <CheckCircle2 className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
            {selected ? `${profile.name} selected` : `Select ${profile.name} for Booking`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StylistProfileModal;
