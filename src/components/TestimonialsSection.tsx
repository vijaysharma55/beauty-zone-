import React from 'react';
import { Star, Quote, MapPin, CheckCircle2 } from 'lucide-react';
import { useBrand } from '../context/BrandContext';

export const TestimonialsSection: React.FC = () => {
  const { brand, t } = useBrand();

  return (
    <section id="testimonials" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D09A40]/15 text-[#0F172A] text-xs font-semibold uppercase tracking-widest border border-[#D09A40]/30">
            <Star className="w-3.5 h-3.5 text-[#D09A40] fill-[#D09A40]" />
            <span>{t('testimonialsOverline')}</span>
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] tracking-tight">
            {t('testimonialsTitle')}
          </h2>
          <p className="text-base text-[#4A4A4A]">
            {t('testimonialsSubtitle')}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {brand.testimonials.map((t) => (
            <div
              key={t.id}
              className="bg-[#FAF5E5] rounded-3xl p-7 border border-[#0F172A]/10 elevation-subtle card-lift flex flex-col justify-between relative"
            >
              <Quote className="w-10 h-10 text-[#D09A40]/20 absolute top-6 right-6 pointer-events-none" />

              <div className="space-y-4">
                {/* Stars */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: t.rating }).map((_, idx) => (
                    <Star
                      key={idx}
                      className="w-4 h-4 fill-[#D09A40] text-[#D09A40]"
                    />
                  ))}
                  <span className="ml-2 text-xs font-semibold text-[#10B981] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Client
                  </span>
                </div>

                {/* Service Pill */}
                <div className="inline-block bg-white px-3 py-1 rounded-lg border border-[#0F172A]/10 text-xs font-semibold text-[#0F172A]">
                  {t.service}
                </div>

                {/* Comment */}
                <p className="text-sm text-[#4A4A4A] leading-relaxed italic">
                  &ldquo;{t.comment}&rdquo;
                </p>
              </div>

              {/* Client Footer */}
              <div className="pt-5 mt-6 border-t border-[#0F172A]/10 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#0F172A]">
                    {t.clientName}
                  </h3>
                  <p className="text-xs text-[#4A4A4A] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-[#D09A40]" />
                    <span>{t.location}</span>
                  </p>
                  {t.weddingVenue && (
                    <p className="text-[11px] text-[#D09A40] font-semibold mt-0.5">
                      Venue: {t.weddingVenue}
                    </p>
                  )}
                </div>
                <span className="text-[11px] text-[#4A4A4A]/70">{t.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
