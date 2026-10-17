import React, { useRef } from 'react';
import { TESTIMONIALS } from '../data/salonData';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

export const TestimonialsSection: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section id="reviews" className="py-8 sm:py-16 md:py-24 bg-white/60 border-t border-[#0F172A]/10 w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <RevealOnScroll duration={0.6}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
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

            {/* Header Controls for Quick Navigation */}
            <div className="hidden sm:flex items-center gap-1.5 self-start md:self-auto">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                className="w-9 h-9 rounded-full bg-white border border-[#0F172A]/15 hover:border-[#D09A40] text-[#0F172A] flex items-center justify-center transition-all shadow-2xs cursor-pointer hover:bg-[#FAF5E5]"
                title="Scroll Left"
                aria-label="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4 text-[#0F172A]" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                className="w-9 h-9 rounded-full bg-white border border-[#0F172A]/15 hover:border-[#D09A40] text-[#0F172A] flex items-center justify-center transition-all shadow-2xs cursor-pointer hover:bg-[#FAF5E5]"
                title="Scroll Right"
                aria-label="Scroll Right"
              >
                <ChevronRight className="w-4 h-4 text-[#0F172A]" />
              </button>
            </div>
          </div>
        </RevealOnScroll>

        {/* Testimonial Cards Carousel Container with Overlay Side Chevrons */}
        <div className="relative group mt-6">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 hover:bg-white text-[#0F172A] border border-[#0F172A]/15 shadow-md items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 opacity-80 group-hover:opacity-100"
            title="Previous Testimonials"
            aria-label="Previous Testimonials"
          >
            <ChevronLeft className="w-5 h-5 text-[#0F172A]" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 hover:bg-white text-[#0F172A] border border-[#0F172A]/15 shadow-md items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 opacity-80 group-hover:opacity-100"
            title="Next Testimonials"
            aria-label="Next Testimonials"
          >
            <ChevronRight className="w-5 h-5 text-[#0F172A]" />
          </button>

          <div
            ref={scrollRef}
            className="flex overflow-x-auto gap-3.5 pb-3 scrollbar-none snap-x snap-mandatory -mx-3 px-3 md:grid md:grid-cols-3 md:gap-8 md:mx-0 md:px-0 scroll-smooth scroll-pl-3 md:scroll-pl-0"
          >
            {TESTIMONIALS.map((t, index) => (
              <RevealOnScroll key={t.id} delay={index * 0.1} duration={0.6} className="shrink-0 snap-start h-full md:w-auto">
                <div
                  className="w-[85vw] max-w-[300px] shrink-0 snap-start md:w-auto bg-white rounded-2xl border border-[#0F172A]/10 p-5 sm:p-8 flex flex-col justify-between shadow-2xs relative group/card hover:border-[#D09A40] luxe-card-hover h-full"
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
      </div>
    </section>
  );
};
