import React from 'react';
import {
  Sparkles,
  Calendar,
  MapPin,
  Award,
  ShieldCheck,
  Home,
  Tag,
} from 'lucide-react';
import { useBrand } from '../context/BrandContext';

interface HeroProps {
  onBookClick: () => void;
  onExploreServices: () => void;
  onExplorePackages?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onBookClick,
  onExploreServices,
  onExplorePackages,
}) => {
  const { brand, t } = useBrand();
  const primary = brand.theme?.primaryColor || '#0F172A';
  const accent = brand.theme?.accentColor || '#D09A40';
  const bg = brand.theme?.bgColor || '#FAF5E5';
  const surface = brand.theme?.surfaceColor || '#FFFFFF';

  const branchLocalityList =
    brand.branches.length > 0
      ? brand.branches
          .slice(0, 3)
          .map((b) => b.locality.split('/')[0].trim())
          .join(', ')
      : brand.cityName;

  const isDefaultHeadline =
    !brand.heroHeadlineLine1 || brand.heroHeadlineLine1 === 'Signature Bridal,';

  return (
    <section
      className="relative min-h-[92vh] py-16 lg:py-24 flex items-center w-full overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: accent }}
        />
        <div
          className="absolute bottom-0 right-0 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: accent }}
        />
      </div>

      <div className="w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-center">
          {/* Left Column - Editorial Narrative & Dual CTAs */}
          <div className="lg:col-span-7 space-y-6 lg:pl-16 px-4 sm:px-6 text-left">
            <div className="flex flex-wrap items-center gap-2.5">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-medium tracking-wide"
                style={{
                  backgroundColor: `${accent}18`,
                  borderColor: `${accent}4D`,
                  color: accent,
                }}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{brand.heroBadgeText}</span>
              </div>
            </div>

            {isDefaultHeadline ? (
              <h1
                className="font-serif text-4xl sm:text-5xl xl:text-[56px] font-bold leading-[1.12] tracking-tight"
                style={{ color: primary }}
              >
                Salon &amp; Doorstep Home Services in{' '}
                <span className="italic font-normal" style={{ color: accent }}>
                  {brand.cityName}
                </span>
              </h1>
            ) : (
              <h1
                className="font-serif text-4xl sm:text-5xl xl:text-[56px] font-bold leading-[1.12] tracking-tight"
                style={{ color: primary }}
              >
                {brand.heroHeadlineLine1}{' '}
                {brand.cityName &&
                  !brand.heroHeadlineLine1.toLowerCase().includes(brand.cityName.toLowerCase()) && (
                    <span className="italic font-normal" style={{ color: accent }}>
                      · {brand.cityName}
                    </span>
                  )}
              </h1>
            )}

            <p className="text-base sm:text-lg text-[#4A4A4A] max-w-2xl font-light leading-relaxed">
              {brand.heroDescription ||
                'We offer simple, professional salon services right at your doorstep or our nearby studio. Book your look for any occasion today!'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div
                className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-sm"
                style={{ backgroundColor: surface }}
              >
                <Award className="w-5 h-5 shrink-0" style={{ color: accent }} />
                <div className="text-xs">
                  <p className="font-semibold" style={{ color: primary }}>
                    {t('heroCertifiedArtists')}
                  </p>
                  <p className="text-slate-600">Bridal & Salon Experts</p>
                </div>
              </div>
              <div
                className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-sm"
                style={{ backgroundColor: surface }}
              >
                <ShieldCheck className="w-5 h-5 text-[#10B981] shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold" style={{ color: primary }}>
                    {t('heroGenuineProducts')}
                  </p>
                  <p className="text-slate-600">MAC, Dyson, L&apos;Oréal</p>
                </div>
              </div>
              <div
                className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-sm"
                style={{ backgroundColor: surface }}
              >
                <Home className="w-5 h-5 shrink-0" style={{ color: accent }} />
                <div className="text-xs">
                  <p className="font-semibold" style={{ color: primary }}>
                    {t('heroHomeService')}
                  </p>
                  <p className="text-slate-600">Anywhere in {brand.cityName}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                onClick={onBookClick}
                className="flex items-center justify-center gap-2.5 font-bold text-base px-7 py-4 rounded-full shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                style={{ backgroundColor: primary, color: bg }}
              >
                <Calendar className="w-5 h-5" />
                <span>{brand.heroPrimaryCta}</span>
              </button>
              <button
                onClick={onExploreServices}
                className="flex items-center justify-center gap-2 border font-semibold text-base px-6 py-4 rounded-full transition-all duration-300 cursor-pointer"
                style={{
                  backgroundColor: `${accent}18`,
                  borderColor: `${accent}66`,
                  color: primary,
                }}
              >
                <span>{brand.heroSecondaryCta}</span>
              </button>
            </div>

            {onExplorePackages && brand.sections.showPackages && (
              <div className="pt-1">
                <button
                  onClick={onExplorePackages}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm transition-colors font-medium group cursor-pointer"
                  style={{ color: accent }}
                >
                  <span className="px-2 py-0.5 rounded bg-[#10B981]/10 text-[#065f46] font-bold text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Save More
                  </span>
                  <span className="underline underline-offset-4">
                    {brand.heroPromoPillText} →
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 relative px-4 sm:px-6 lg:pr-16">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div
                className="absolute -inset-3 rounded-3xl border translate-x-3 translate-y-3 pointer-events-none"
                style={{ borderColor: `${accent}4D` }}
              />

              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white bg-white">
                <img
                  src={brand.heroImage}
                  alt={`${brand.brandName} — ${brand.cityName}`}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-[420px] sm:h-[500px] object-cover object-center transform hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                <div className="absolute bottom-5 left-5 right-5 bg-white/90 backdrop-blur-md border border-white/50 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className="inline-block text-[10px] uppercase tracking-widest font-semibold"
                        style={{ color: accent }}
                      >
                        {brand.heroFloatingCardTitle}
                      </span>
                      <h2 className="font-serif text-base font-semibold mt-0.5" style={{ color: primary }}>
                        {brand.branches.length} {brand.cityName} {brand.branches.length === 1 ? 'Studio' : 'Studios'} + Home Visits
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" style={{ color: accent }} />
                        {branchLocalityList}
                      </p>
                    </div>
                    <span className="bg-[#10B981]/10 text-[#065f46] border border-[#10B981]/20 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0">
                      {t('heroOpenToday')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
