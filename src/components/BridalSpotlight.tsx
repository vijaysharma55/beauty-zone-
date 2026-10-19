import React from 'react';
import { Crown, CheckCircle2, Calendar, Sparkles, PhoneCall } from 'lucide-react';
import { useBrand } from '../context/BrandContext';

interface BridalSpotlightProps {
  onBookBridalConsultation: () => void;
  onExploreBridalPackages: () => void;
}

export const BridalSpotlight: React.FC<BridalSpotlightProps> = ({
  onBookBridalConsultation,
  onExploreBridalPackages,
}) => {
  const { brand, formatPrice, t } = useBrand();

  return (
    <section id="bridal" className="py-20 lg:py-28 bg-[#0F172A] text-[#FAF5E5] relative overflow-hidden">
      {/* Subtle Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#D09A40]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#D09A40]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column - Image Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden border-2 border-[#D09A40]/40 shadow-2xl">
              <img
                src={brand.bridalImage}
                alt={`${brand.brandName} Bridal Makeover — ${brand.cityName}`}
                className="w-full h-[460px] sm:h-[520px] object-cover object-top hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-85" />

              {/* Bottom Overlay Badge */}
              <div className="absolute bottom-5 left-5 right-5 bg-[#0F172A]/90 backdrop-blur-md border border-[#D09A40]/40 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#D09A40] font-bold block">
                      Signature Bridal Package
                    </span>
                    <p className="font-serif text-lg font-bold text-[#FAF5E5]">
                      Starts at {formatPrice(14999)}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#D09A40] text-[#0F172A] text-xs font-bold">
                    Free Trial Consultation
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Bridal Details */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D09A40]/15 border border-[#D09A40]/40 text-[#D09A40] text-xs font-semibold uppercase tracking-widest">
              <Crown className="w-4 h-4" />
              <span>{brand.bridalBadgeText}</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#FAF5E5] leading-tight">
              {brand.bridalHeadline}
            </h2>

            <p className="text-base sm:text-lg text-[#FAF5E5]/80 leading-relaxed">
              {brand.bridalSubheadline}
            </p>

            {/* Key Bridal Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {brand.bridalFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-4"
                >
                  <CheckCircle2 className="w-5 h-5 text-[#D09A40] shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm text-[#FAF5E5]/90 leading-relaxed font-medium">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                onClick={onBookBridalConsultation}
                className="flex items-center gap-2.5 bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] font-bold text-sm sm:text-base px-7 py-4 rounded-full shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>{t('bridalBookConsult')}</span>
              </button>

              <button
                onClick={onExploreBridalPackages}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-[#FAF5E5] border border-[#D09A40]/40 font-semibold text-sm sm:text-base px-6 py-4 rounded-full transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#D09A40]" />
                <span>{t('bridalViewMenu')}</span>
              </button>

              <a
                href={`tel:+${brand.phoneRaw}`}
                className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#D09A40] hover:underline font-semibold ml-1"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{t('bridalDirectDesk')}: {brand.phoneDisplay}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
