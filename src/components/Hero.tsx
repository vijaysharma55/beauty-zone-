import React from 'react';
import {
  Sparkles,
  Calendar,
  MapPin,
  Award,
  ShieldCheck,
  Home,
  Tag,
  Palette,
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
  const { brand, setIsCustomizerOpen, t } = useBrand();

  const branchLocalityList =
    brand.branches.length > 0
      ? brand.branches
          .slice(0, 3)
          .map((b) => b.locality.split('/')[0].trim())
          .join(', ')
      : brand.cityName;

  return (
    <section className="relative min-h-[92vh] pt-28 pb-16 lg:pt-36 lg:pb-24 flex items-center bg-[#0F172A] overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#D09A40]/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[32rem] h-[32rem] rounded-full bg-[#D09A40]/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(var(--wl-accent) 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column - Editorial Narrative & Dual CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Top Trust Pill + White-Label Switcher Pill */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D09A40]/15 border border-[#D09A40]/40 text-[#D09A40] text-xs sm:text-sm font-medium tracking-wide">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{brand.heroBadgeText}</span>
              </div>

              <button
                onClick={() => setIsCustomizerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-[#FAF5E5] text-xs font-semibold transition-all cursor-pointer"
                title="Switch Brand Preset or Customize White-Label Theme"
              >
                <Palette className="w-3.5 h-3.5 text-[#D09A40]" />
                <span>Customize Brand</span>
              </button>
            </div>

            {/* Display Headline */}
            <h1 className="font-serif text-4xl sm:text-5xl xl:text-[56px] font-bold text-[#FAF5E5] leading-[1.12] tracking-tight">
              Best Salon Services for {' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D09A40] via-[#F3D088] to-[#D09A40] italic font-normal">
                You
              </span>{' '}
              {brand.cityName}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[#FAF5E5]/80 max-w-2xl font-light leading-relaxed">
              We offer simple, professional salon services right at your doorstep or our nearby studio. Book your look for any occasion today!
            </p>

            {/* Key Value Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5">
                <Award className="w-5 h-5 text-[#D09A40] shrink-0" />
                <div className="text-xs">
                  <p className="text-[#FAF5E5] font-semibold">{t('heroCertifiedArtists')}</p>
                  <p className="text-[#FAF5E5]/60">Bridal & Salon Experts</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5">
                <ShieldCheck className="w-5 h-5 text-[#10B981] shrink-0" />
                <div className="text-xs">
                  <p className="text-[#FAF5E5] font-semibold">{t('heroGenuineProducts')}</p>
                  <p className="text-[#FAF5E5]/60">MAC, Dyson, L&apos;Oréal</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5">
                <Home className="w-5 h-5 text-[#D09A40] shrink-0" />
                <div className="text-xs">
                  <p className="text-[#FAF5E5] font-semibold">{t('heroHomeService')}</p>
                  <p className="text-[#FAF5E5]/60">Anywhere in {brand.cityName}</p>
                </div>
              </div>
            </div>

            {/* Dual CTAs */}
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                onClick={onBookClick}
                className="flex items-center justify-center gap-2.5 bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] font-bold text-base px-7 py-4 rounded-full shadow-xl hover:shadow-[#D09A40]/30 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
              >
                <Calendar className="w-5 h-5" />
                <span>{brand.heroPrimaryCta}</span>
              </button>
              <button
                onClick={onExploreServices}
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-[#FAF5E5] border border-[#D09A40]/40 font-semibold text-base px-6 py-4 rounded-full transition-all duration-300 cursor-pointer"
              >
                <span>{brand.heroSecondaryCta}</span>
              </button>
            </div>

            {/* Package Savings Pill Link */}
            {onExplorePackages && brand.sections.showPackages && (
              <div className="pt-1">
                <button
                  onClick={onExplorePackages}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#D09A40] hover:text-[#FAF5E5] transition-colors font-medium group cursor-pointer"
                >
                  <span className="px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] font-bold text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Save More
                  </span>
                  <span className="underline underline-offset-4 decoration-[#D09A40]/50 group-hover:decoration-[#FAF5E5]">
                    {brand.heroPromoPillText} →
                  </span>
                </button>
              </div>
            )}

            {/* Local Social Proof */}
            <div className="pt-3 flex items-center gap-4 text-xs sm:text-sm text-[#FAF5E5]/70 border-t border-white/10">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-[#D09A40] text-[#0F172A] font-bold flex items-center justify-center text-xs ring-2 ring-[#0F172A]">
                  A
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-[#0F172A] font-bold flex items-center justify-center text-xs ring-2 ring-[#0F172A]">
                  S
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-300 text-[#0F172A] font-bold flex items-center justify-center text-xs ring-2 ring-[#0F172A]">
                  P
                </div>
              </div>
              <p>
                Rated <strong className="text-[#D09A40]">4.9/5 ★</strong> by{' '}
                <strong className="text-[#FAF5E5]">{t('heroHappyClients')}</strong> in{' '}
                {brand.cityName}
              </p>
            </div>
          </div>

          {/* Right Column - Framed Editorial Portrait */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Decorative Gold Frame Offset */}
              <div className="absolute -inset-3 rounded-3xl border border-[#D09A40]/40 translate-x-3 translate-y-3 pointer-events-none" />

              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-[#1E293B]">
                <img
                  src={brand.heroImage}
                  alt={`${brand.brandName} — ${brand.cityName}`}
                  className="w-full h-[420px] sm:h-[500px] object-cover object-center transform hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-80" />

                {/* Floating Location Card inside Image */}
                <div className="absolute bottom-5 left-5 right-5 bg-[#0F172A]/90 backdrop-blur-md border border-[#D09A40]/30 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block text-[10px] uppercase tracking-widest text-[#D09A40] font-semibold">
                        {brand.heroFloatingCardTitle}
                      </span>
                      <h2 className="font-serif text-base text-[#FAF5E5] font-semibold mt-0.5">
                        {brand.branches.length} {brand.cityName} Studios + Home Visits
                      </h2>
                      <p className="text-xs text-[#FAF5E5]/70 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#D09A40]" />
                        {branchLocalityList}
                      </p>
                    </div>
                    <span className="bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0">
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
