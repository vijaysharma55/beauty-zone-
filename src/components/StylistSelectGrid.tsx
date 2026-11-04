import React from 'react';
import { Check, Info, Sparkles, Star, Users } from 'lucide-react';

/**
 * Normalised shape shared by the demo stylist catalogue (`Stylist`) and the
 * salon dashboard's `SalonStaff` rows, so one picker can render both.
 */
export interface StylistOption {
  id: string;
  name: string;
  role: string;
  photo?: string;
  specialty?: string;
  rating?: number | null;
  reviewCount?: number | null;
  experience?: string;
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

const ratingLabel = (option: StylistOption) => {
  const rating = Number(option.rating);
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return rating.toFixed(1);
};

/**
 * Mini-card picker used inside the booking flow.
 *
 * Each card shows the specialist's photo, name, specialty and star rating, and
 * carries its own “View Profile” action so a visitor can read the full profile
 * before locking the choice in.
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
  anyLabel = 'Any Available Stylist',
  anyDescription = 'Best match for your service',
  emptyMessage = 'No specialist is accepting online bookings right now — we will assign the best match.',
  className = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
}) => {
  const anySelected = selectedId === '';

  return (
    <div role="radiogroup" aria-label="Select preferred stylist or staff member" className={className}>
      {/* “No preference” option */}
      <div
        className="relative flex h-full flex-col rounded-2xl border-2 p-3 transition-all"
        style={{
          borderColor: anySelected ? accent : `${primary}1F`,
          backgroundColor: anySelected ? `${accent}14` : surface,
          boxShadow: anySelected ? `0 6px 18px ${accent}22` : 'none',
        }}
      >
        {anySelected && (
          <span
            className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
            style={{ backgroundColor: accent, color: primary }}
            aria-hidden="true"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
        <button
          type="button"
          onClick={() => onSelect('')}
          aria-pressed={anySelected}
          className="flex flex-1 flex-col items-center gap-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
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
            First available
          </span>
        </button>
      </div>

      {options.map((option) => {
        const selected = option.id === selectedId;
        const rating = ratingLabel(option);
        return (
          <div
            key={option.id}
            className="relative flex h-full flex-col rounded-2xl border-2 p-3 transition-all"
            style={{
              borderColor: selected ? accent : `${primary}1F`,
              backgroundColor: selected ? `${accent}14` : surface,
              boxShadow: selected ? `0 6px 18px ${accent}22` : 'none',
            }}
          >
            {selected && (
              <span
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
                style={{ backgroundColor: accent, color: primary }}
                aria-hidden="true"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}

            <button
              type="button"
              onClick={() => onSelect(option.id)}
              aria-pressed={selected}
              className="flex flex-1 flex-col items-center gap-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{ color: primary }}
            >
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full"
                style={{
                  backgroundColor: background,
                  boxShadow: selected ? `0 0 0 2px ${accent}` : `0 0 0 1px ${primary}18`,
                }}
              >
                {option.photo ? (
                  <img
                    src={option.photo}
                    alt={option.name}
                    loading="lazy"
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <span className="text-sm font-bold" style={{ color: accent }}>
                    {initialsOf(option.name)}
                  </span>
                )}
              </span>

              <span className="min-w-0 w-full">
                <span className="block truncate text-xs font-bold leading-tight">{option.name}</span>
                <span className="mt-0.5 block truncate text-[10px] leading-snug" style={{ color: `${primary}99` }}>
                  {option.role || 'Salon specialist'}
                </span>
                {option.specialty && (
                  <span className="mt-1 block truncate text-[10px] leading-snug" style={{ color: `${primary}77` }}>
                    {option.specialty}
                  </span>
                )}
              </span>

              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: `${accent}18`, color: `${primary}CC` }}
              >
                <Star className="h-3 w-3" style={{ color: accent, fill: rating ? accent : 'transparent' }} />
                {rating ? (
                  <>
                    {rating}
                    {Number(option.reviewCount) > 0 && (
                      <span style={{ color: `${primary}88` }}>({option.reviewCount})</span>
                    )}
                  </>
                ) : (
                  'New specialist'
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onViewProfile(option.id)}
              className="relative z-10 mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer"
              style={{ borderColor: `${primary}26`, color: primary, backgroundColor: surface }}
              aria-label={`View full profile of ${option.name}`}
            >
              <Info className="h-3 w-3" style={{ color: accent }} />
              View Profile
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
