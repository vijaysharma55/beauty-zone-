import React, { useEffect } from 'react';
import {
  X,
  Clock,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Gem,
  CalendarCheck,
  MapPin,
  Tag,
  ArrowRight,
  ListChecks,
} from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import type { TreatmentDetail } from '../data/treatmentCopy';
import { SmartImage } from './crud/SmartImage';

interface TreatmentDetailModalProps {
  detail: TreatmentDetail | null;
  onClose: () => void;
  onBook: (detail: TreatmentDetail) => void;
  bookLabel?: string;
}

/**
 * Full editorial view for a service card or a bridal/combo package.
 * Renders the complete step-by-step protocol, benefits, ideal skin/hair types,
 * genuine product list and transparent pricing so no card is ever a blank tile.
 */
export const TreatmentDetailModal: React.FC<TreatmentDetailModalProps> = ({
  detail,
  onClose,
  onBook,
  bookLabel = 'Book This Treatment',
}) => {
  const { formatPrice } = useBrand();

  useEffect(() => {
    if (!detail) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [detail, onClose]);

  if (!detail) return null;

  const hasSavings = !!detail.originalPrice && detail.originalPrice > detail.price;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="treatment-detail-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#0F172A]/15 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="relative shrink-0 border-b border-[#0F172A]/10 bg-[#FAF5E5]/70">
          <div className="flex flex-col sm:flex-row">
            <div className="relative h-40 w-full shrink-0 overflow-hidden bg-neutral-200 sm:h-auto sm:w-56 md:w-64">
              {detail.image ? (
                <SmartImage
                  src={detail.image}
                  alt={detail.title}
                  className="h-full w-full object-cover"
                  fallbackClassName="rounded-none"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#FAF5E5] text-[#D09A40]">
                  <Sparkles className="h-8 w-8 opacity-60" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0F172A] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#D09A40]">
                    <Sparkles className="h-3 w-3" />
                    {detail.eyebrow}
                  </span>
                  <h2
                    id="treatment-detail-title"
                    className="mt-2 font-serif text-xl font-bold leading-tight text-[#0F172A] sm:text-2xl md:text-3xl"
                  >
                    {detail.title}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-[#4A4A4A]">{detail.categoryLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close treatment details"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#0F172A]/15 bg-white text-[#0F172A] transition-colors hover:border-[#D09A40] hover:bg-[#FAF5E5] cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FAF5E5] px-2.5 py-1 text-xs font-bold text-[#D09A40] border border-[#D09A40]/25">
                  <Clock className="h-3.5 w-3.5" />
                  {detail.duration}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  100% Genuine Products
                </span>
                {detail.validity && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#4A4A4A] border border-[#0F172A]/10">
                    <Tag className="h-3.5 w-3.5 text-[#D09A40]" />
                    Valid {detail.validity}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Scrollable editorial body ─────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-6 px-5 py-6 sm:px-7 lg:grid-cols-12 lg:gap-8">
            {/* Left column: overview + protocol + ideal for */}
            <div className="lg:col-span-7 space-y-6">
              <section>
                <h3 className="flex items-center gap-2 font-serif text-lg font-bold text-[#0F172A]">
                  <Sparkles className="h-4 w-4 text-[#D09A40]" />
                  Treatment Overview
                </h3>
                <p className="mt-2 text-sm leading-[1.85] text-[#4A4A4A]">{detail.description}</p>
              </section>

              <section className="rounded-2xl border border-[#0F172A]/10 bg-[#FAF5E5]/40 p-4 sm:p-5">
                <h3 className="flex items-center gap-2 font-serif text-lg font-bold text-[#0F172A]">
                  <ListChecks className="h-4 w-4 text-[#D09A40]" />
                  The Step-by-Step Protocol
                </h3>
                <ol className="mt-3 space-y-3">
                  {detail.processSteps.map((step, index) => (
                    <li key={`${detail.id}-step-${index}`} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0F172A] font-mono text-[11px] font-bold text-[#D09A40]">
                        {index + 1}
                      </span>
                      <p className="text-[13px] leading-relaxed text-[#0F172A]/85">{step}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="rounded-2xl border border-[#D09A40]/30 bg-white p-4 sm:p-5">
                <h3 className="font-serif text-lg font-bold text-[#0F172A]">Ideal Skin, Hair &amp; Client Profile</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#4A4A4A]">{detail.idealFor}</p>
              </section>
            </div>

            {/* Right column: benefits, products, inclusions, pricing */}
            <div className="lg:col-span-5 space-y-6">
              <section>
                <h3 className="font-serif text-lg font-bold text-[#0F172A]">Key Benefits</h3>
                <ul className="mt-3 space-y-2">
                  {detail.benefits.map((benefit, index) => (
                    <li key={`${detail.id}-benefit-${index}`} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#D09A40]" />
                      <span className="text-[13px] leading-relaxed text-[#0F172A]/85">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl bg-[#0F172A] p-4 sm:p-5">
                <h3 className="flex items-center gap-2 font-serif text-base font-bold text-[#FAF5E5]">
                  <Gem className="h-4 w-4 text-[#D09A40]" />
                  Premium Brands &amp; Genuine Products
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#FAF5E5]/65">
                  Sealed, authentic professional stock — opened in front of you at every appointment.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {detail.productsUsed.map((product, index) => (
                    <span
                      key={`${detail.id}-product-${index}`}
                      className="rounded-lg border border-[#D09A40]/35 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#FAF5E5]"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </section>

              {detail.inclusions.length > 0 && (
                <section>
                  <h3 className="font-serif text-lg font-bold text-[#0F172A]">
                    {detail.kind === 'package' ? 'Services Included' : 'Signature Inclusions'}
                  </h3>
                  <ul className="mt-3 space-y-1.5 rounded-2xl border border-[#0F172A]/10 p-3.5">
                    {detail.inclusions.map((item, index) => (
                      <li key={`${detail.id}-inclusion-${index}`} className="flex items-start gap-2 text-[12px] leading-snug text-[#4A4A4A]">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D09A40]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {!!detail.outlets?.length && (
                <div className="flex items-start gap-2 text-xs text-[#4A4A4A]">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D09A40]" />
                  <span>Valid at: {detail.outlets.join(', ')}</span>
                </div>
              )}

              {!!detail.usageRules?.length && (
                <section className="rounded-2xl border border-[#0F172A]/10 bg-[#FAF5E5]/40 p-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Terms &amp; Booking Notes</h4>
                  <ul className="mt-2 space-y-1">
                    {detail.usageRules.map((rule, index) => (
                      <li key={`${detail.id}-rule-${index}`} className="flex items-start gap-1.5 text-[11px] leading-snug text-[#4A4A4A]">
                        <span className="font-bold text-[#D09A40]">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="rounded-2xl border border-[#D09A40]/40 bg-[#FAF5E5]/70 p-4">
                <h3 className="font-serif text-lg font-bold text-[#0F172A]">Transparent Pricing</h3>
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-[#0F172A]">{formatPrice(detail.price)}</span>
                  {hasSavings && (
                    <span className="font-mono text-sm text-neutral-400 line-through">
                      {formatPrice(detail.originalPrice as number)}
                    </span>
                  )}
                </div>
                {hasSavings && (detail.savings || detail.discount) && (
                  <span className="mt-1.5 inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                    {detail.savings ? `Save ${formatPrice(detail.savings)}` : ''}
                    {detail.savings && detail.discount ? ' · ' : ''}
                    {detail.discount ? `${detail.discount}% OFF` : ''}
                  </span>
                )}
                <p className="mt-2.5 text-[11px] leading-relaxed text-[#4A4A4A]">{detail.priceNote}</p>
              </section>
            </div>
          </div>
        </div>

        {/* ── Sticky booking footer ─────────────────────────────────────── */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-[#0F172A]/10 bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-neutral-400">{detail.kind === 'package' ? 'Package Price' : 'Treatment Price'}</p>
            <p className="font-mono text-lg font-bold text-[#0F172A]">
              {formatPrice(detail.price)}
              <span className="ml-2 font-sans text-xs font-medium text-[#4A4A4A]">· {detail.duration}</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#0F172A]/15 px-4 py-2.5 text-xs font-bold text-[#0F172A] transition-colors hover:bg-[#FAF5E5] cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onBook(detail)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-[#D09A40] hover:text-[#0F172A] cursor-pointer"
            >
              <CalendarCheck className="h-4 w-4 text-[#D09A40]" />
              {bookLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
