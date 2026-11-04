import React, { useState } from 'react';
import { Check, Eye, Lock, Sparkles, Star, Users } from 'lucide-react';
import type { TemplateId } from '../types/auth';

/**
 * Normalised shape shared across all booking templates and salon staff rows.
 */
export interface StylistOption {
  id: string;
  name: string;
  role?: string;
  photo?: string;
  specialty?: string;
  rating?: number | null;
  reviewCount?: number | null;
  experience?: string;
  isDemo?: boolean;
  bookingDisabled?: boolean;
}

interface StylistSelectGridProps {
  options: StylistOption[];
  /** Empty string means “any available stylist”. */
  selectedId: string;
  onSelect: (id: string) => void;
  onViewProfile: (id: string) => void;
  accent?: string;
  primary?: string;
  background?: string;
  surface?: string;
  templateId?: TemplateId;
  /** True when the salon website is unpublished (preview-only mode). */
  bookingDisabled?: boolean;
  anyLabel?: string;
  anyDescription?: string;
  emptyMessage?: string;
  /** Extra classes for the responsive grid container. */
  className?: string;
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

const genuineRatingLabel = (option: StylistOption): string | null => {
  if (option.rating === null || option.rating === undefined) return null;
  const rating = Number(option.rating);
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return rating.toFixed(1);
};

/**
 * Responsive staff card picker shared across all booking templates.
 *
 * Displays staff photo, full name, designation, and genuine rating (only when
 * available), plus a “View Full Profile” button on every staff card.
 */
export const StylistSelectGrid: React.FC<StylistSelectGridProps> = ({
  options,
  selectedId,
  onSelect,
  onViewProfile,
  accent = '#D09A40',
  primary = '#0F172A',
  background = '#FAF5E5',
  surface = '#FFFFFF',
  templateId = 'luxe',
  bookingDisabled = false,
  anyLabel = 'Any Available Stylist',
  anyDescription = 'Best match for your service',
  emptyMessage = 'No specialist is accepting online bookings right now — we will assign the best match.',
  className = 'grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3',
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const anySelected = !bookingDisabled && selectedId === '';
  const cardRadius =
    templateId === 'noir' ? 'rounded-none' : templateId === 'minimal' ? 'rounded-xl' : 'rounded-2xl';
  const btnRadius =
    templateId === 'noir' ? 'rounded-none' : templateId === 'minimal' ? 'rounded-md' : 'rounded-lg';

  return (
    <div role="radiogroup" aria-label="Select preferred stylist or staff member" className={className}>
      {/* “No preference” option — hidden only when purely showing demo preview cards */}
      {!options.some((opt) => opt.isDemo) && (
        <div
          className={`relative flex h-full flex-col ${cardRadius} border-2 p-3.5 transition-all`}
          style={{
            borderColor: anySelected ? accent : `${primary}1F`,
            backgroundColor: anySelected ? `${accent}14` : surface,
            boxShadow: anySelected ? `0 6px 18px ${accent}22` : 'none',
            opacity: bookingDisabled ? 0.72 : 1,
          }}
        >
          {anySelected && (
            <span
              className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full"
              style={{ backgroundColor: accent, color: primary }}
              aria-hidden="true"
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
          <button
            type="button"
            disabled={bookingDisabled}
            onClick={() => {
              if (!bookingDisabled) onSelect('');
            }}
            aria-pressed={anySelected}
            className="flex flex-1 flex-col items-center justify-center gap-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed"
            style={{ color: primary }}
          >
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              <Users className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold leading-tight">{anyLabel}</span>
              <span className="mt-0.5 block text-[10px] leading-snug" style={{ color: `${primary}8A` }}>
                {anyDescription}
              </span>
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: `${accent}18`, color: `${primary}AA` }}
            >
              <Sparkles className="h-3 w-3" style={{ color: accent }} />
              {bookingDisabled ? 'Activates on publish' : 'First available'}
            </span>
          </button>
        </div>
      )}

      {options.map((option) => {
        const isNotBookable = Boolean(option.isDemo || option.bookingDisabled || bookingDisabled);
        const selected = !isNotBookable && option.id === selectedId;
        const rating = genuineRatingLabel(option);
        const reviewCount = Number(option.reviewCount) || 0;
        const role = option.role?.trim() || '';
        const showPhoto = Boolean(option.photo && !failedImages[option.id]);

        return (
          <div
            key={option.id}
            data-testid={`booking-staff-card-${option.id}`}
            className={`relative flex h-full flex-col justify-between ${cardRadius} border-2 p-3.5 transition-all`}
            style={{
              borderColor: selected ? accent : option.isDemo ? `${accent}55` : `${primary}1F`,
              backgroundColor: selected ? `${accent}14` : surface,
              boxShadow: selected ? `0 6px 18px ${accent}22` : 'none',
            }}
          >
            {option.isDemo && (
              <span
                className="absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}
              >
                Demo
              </span>
            )}

            {selected && (
              <span
                className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full"
                style={{ backgroundColor: accent, color: primary }}
                aria-hidden="true"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}

            <button
              type="button"
              disabled={isNotBookable}
              onClick={() => {
                if (!isNotBookable) onSelect(option.id);
              }}
              aria-pressed={selected}
              aria-disabled={isNotBookable}
              className="flex flex-1 flex-col items-center gap-2 pt-1 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-default"
              style={{ color: primary }}
            >
              <span
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full"
                style={{
                  backgroundColor: background,
                  boxShadow: selected ? `0 0 0 2px ${accent}` : `0 0 0 1px ${primary}18`,
                }}
              >
                {showPhoto ? (
                  <img
                    src={option.photo}
                    alt={option.name}
                    loading="lazy"
                    onError={() => setFailedImages((prev) => ({ ...prev, [option.id]: true }))}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <span className="font-serif text-sm font-bold" style={{ color: accent }}>
                    {initialsOf(option.name)}
                  </span>
                )}
              </span>

              <span className="min-w-0 w-full space-y-0.5">
                <span className="block truncate text-xs font-bold leading-snug">{option.name}</span>
                {role && (
                  <span className="block truncate text-[11px] font-medium leading-snug" style={{ color: `${primary}99` }}>
                    {role}
                  </span>
                )}
                {option.specialty && option.specialty !== role && (
                  <span className="block truncate text-[10px] leading-snug" style={{ color: `${primary}75` }}>
                    {option.specialty}
                  </span>
                )}
              </span>

              {rating && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: `${accent}18`, color: `${primary}DD` }}
                >
                  <Star className="h-3 w-3" style={{ color: accent, fill: accent }} />
                  <span>{rating}</span>
                  {reviewCount > 0 && <span style={{ color: `${primary}88` }}>({reviewCount})</span>}
                </span>
              )}

              {option.isDemo && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold"
                  style={{ color: '#92400E' }}
                >
                  <Lock className="h-2.5 w-2.5" /> Sample · Not bookable
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile(option.id);
              }}
              className={`relative z-10 mt-2.5 inline-flex w-full items-center justify-center gap-1.5 ${btnRadius} border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer hover:opacity-90`}
              style={{ borderColor: `${primary}26`, color: primary, backgroundColor: surface }}
              aria-label={`View Full Profile of ${option.name}`}
            >
              <Eye className="h-3 w-3 shrink-0" style={{ color: accent }} />
              <span>View Full Profile</span>
            </button>
          </div>
        );
      })}

      {options.length === 0 && (
        <p className="col-span-full text-[11px] leading-snug" style={{ color: `${primary}88` }}>
          {emptyMessage}
        </p>
      )}
    </div>
  );
};

export default StylistSelectGrid;
