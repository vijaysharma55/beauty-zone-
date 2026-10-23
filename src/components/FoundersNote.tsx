import React from 'react';
import { Award, Heart, Sparkles, ShieldCheck, Quote, Calendar } from 'lucide-react';
import { useBrand } from '../context/BrandContext';

interface FoundersNoteProps {
  onBookBridalConsult: () => void;
}

export const FoundersNote: React.FC<FoundersNoteProps> = ({ onBookBridalConsult }) => {
  const { brand, t } = useBrand();

  const branchSummary =
    brand.branches.length > 0
      ? brand.branches
          .slice(0, 3)
          .map((b) => b.locality.split('/')[0].trim())
          .join(', ')
      : brand.cityName;

  return (
    <section className="py-20 lg:py-24 bg-white border-t border-[#0F172A]/10 relative overflow-hidden">
      {/* Subtle Ambient Gold Accents */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#D09A40]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#0F172A]/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="bg-[#FAF5E5] rounded-3xl border border-[#D09A40]/30 p-6 sm:p-10 lg:p-14 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Founder Portrait & Credentials */}
            <div className="lg:col-span-5">
              <div className="relative max-w-sm mx-auto lg:max-w-none">
                <div className="absolute -inset-2.5 rounded-3xl border border-[#D09A40]/40 translate-x-2 translate-y-2 pointer-events-none" />
                <div className="relative rounded-2xl overflow-hidden bg-[#0F172A] shadow-2xl border border-[#0F172A]/15">
                  <img
                    src={brand.founderImage}
                    alt={`${brand.founderName} — ${brand.founderRole}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-64 sm:h-80 object-cover object-center aspect-[4/3]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/20 to-transparent" />

                  <div className="absolute bottom-4 left-4 right-4 bg-[#0F172A]/95 backdrop-blur-md border border-[#D09A40]/30 rounded-xl p-4 text-[#FAF5E5]">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-serif text-lg font-bold text-[#FAF5E5]">
                          {brand.founderName}
                        </p>
                        <p className="text-xs text-[#D09A40] font-medium">
                          {brand.founderRole}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#D09A40]/20 text-[#D09A40] text-[11px] font-bold">
                        {brand.founderExperienceBadge}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Warm Personal Message */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F172A]/5 border border-[#0F172A]/10 text-[#0F172A] text-xs font-semibold uppercase tracking-widest">
                <Heart className="w-3.5 h-3.5 text-[#D09A40] fill-[#D09A40]" />
                <span>{t('founderOverline')}</span>
              </div>

              <div className="relative">
                <Quote className="w-10 h-10 text-[#D09A40]/25 -mb-3" />
                <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A] leading-snug">
                  &ldquo;{brand.founderQuoteHeadline}&rdquo;
                </h2>
              </div>

              <div className="space-y-4 text-sm sm:text-base text-[#4A4A4A] leading-relaxed">
                <p>{brand.founderBioParagraph1}</p>
                <p>{brand.founderBioParagraph2}</p>
              </div>

              {/* 4 Stats Grid */}
              {brand.founderStats && brand.founderStats.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {brand.founderStats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-3 border border-[#0F172A]/10 text-center shadow-2xs"
                    >
                      <div className="font-serif text-xl font-bold text-[#0F172A]">
                        {stat.value}
                      </div>
                      <div className="text-[11px] text-[#4A4A4A] font-medium">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 3 Personal Guarantees */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                <div className="bg-white rounded-xl p-3.5 border border-[#0F172A]/10 shadow-xs">
                  <ShieldCheck className="w-5 h-5 text-[#10B981] mb-1.5" />
                  <p className="text-xs font-bold text-[#0F172A]">100% Genuine Products</p>
                  <p className="text-[11px] text-[#4A4A4A] mt-0.5">
                    Every product is opened and shown to you before use.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-[#0F172A]/10 shadow-xs">
                  <Sparkles className="w-5 h-5 text-[#D09A40] mb-1.5" />
                  <p className="text-xs font-bold text-[#0F172A]">Natural Skin Tone Match</p>
                  <p className="text-[11px] text-[#4A4A4A] mt-0.5">
                    Zero white-cast or cakey base—just your natural glow.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-[#0F172A]/10 shadow-xs">
                  <Award className="w-5 h-5 text-[#D09A40] mb-1.5" />
                  <p className="text-xs font-bold text-[#0F172A]">Fixed & Honest Prices</p>
                  <p className="text-[11px] text-[#4A4A4A] mt-0.5">
                    Clear prices in {brand.currencySymbol} with zero hidden extras at billing.
                  </p>
                </div>
              </div>

              {/* Signature & Action */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#0F172A]/10">
                <div>
                  <p className="font-serif italic text-xl text-[#0F172A] font-semibold">
                    Warmest wishes, {brand.founderName.split(' ')[0]}
                  </p>
                  <p className="text-xs text-[#4A4A4A]">
                    {brand.branches.length} Studios ({branchSummary}) • Est. {brand.establishedYear}
                  </p>
                </div>

                <button
                  onClick={onBookBridalConsult}
                  className="inline-flex items-center justify-center gap-2 bg-[#0F172A] hover:bg-[#D09A40] text-[#FAF5E5] hover:text-[#0F172A] font-bold text-xs sm:text-sm px-5 py-3 rounded-xl transition-all duration-300 shadow-md cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-[#D09A40] group-hover:text-[#0F172A]" />
                  <span>{t('founderBookConsult')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
