import React from 'react';
import { TESTIMONIALS } from '../data/salonData';
import { Star, Quote } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

export const TestimonialsSection: React.FC = () => {
  return (
    <section id="reviews" className="py-16 md:py-24 bg-white/60 border-t border-[#0F172A]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealOnScroll duration={0.6}>
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-2">
              <span>Real Customer Reviews</span>
              <span aria-hidden="true">·</span>
              <span>Jaipur Brides & Regulars</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              What Our Customers Say About Us
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#4A4A4A] leading-relaxed">
              Real feedback from brides, wedding guests, and regular salon customers across Jaipur.
            </p>
          </div>
        </RevealOnScroll>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, index) => (
            <RevealOnScroll key={t.id} delay={index * 0.1} duration={0.6}>
              <div
                className="bg-white rounded-2xl border border-[#0F172A]/10 p-6 sm:p-8 flex flex-col justify-between shadow-sm relative group hover:border-[#D09A40] luxe-card-hover h-full"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-[#D09A40] text-[#D09A40]" />
                      ))}
                    </div>
                    <Quote className="w-6 h-6 text-[#D09A40]/30" />
                  </div>

                  <p className="text-xs sm:text-sm text-[#4A4A4A] italic leading-relaxed">
                    "{t.comment}"
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#0F172A]/10">
                  <p className="text-sm font-bold text-[#0F172A]">{t.clientName}</p>
                  <div className="flex items-center gap-1.5 text-xs text-[#D09A40] font-medium mt-0.5">
                    <span>{t.service}</span>
                  </div>
                  <div className="text-[11px] text-[#4A4A4A]/80 mt-1 flex items-center gap-1.5">
                    <span>{t.location}</span>
                    {t.weddingVenue && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[#0F172A]">{t.weddingVenue}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
