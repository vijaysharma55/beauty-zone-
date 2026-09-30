import React from 'react';
import { Crown, Sparkles, CheckCircle2 } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

interface BridalSpotlightProps {
  onBookBridal: () => void;
}

export const BridalSpotlight: React.FC<BridalSpotlightProps> = ({ onBookBridal }) => {
  return (
    <section id="bridal" className="py-16 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealOnScroll duration={0.65} yOffset={20}>
          <div className="bg-[#0F172A] text-white rounded-2xl p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-2xl">
            {/* Subtle decorative gold glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#D09A40]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
              {/* Left Column: Image with Frame */}
              <div className="lg:col-span-5">
                <RevealOnScroll direction="left" delay={0.1} duration={0.6}>
                  <div className="relative rounded-xl overflow-hidden aspect-[4/5] border border-[#D09A40]/30 shadow-2xl">
                    <img
                      src="/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg"
                      alt="Jaipur Bridal Makeup by Beauty Zone"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-4 right-4 text-xs text-white/90">
                      <p className="font-semibold text-[#D09A40]">Royal Rajputi & Destination Bride</p>
                      <p className="text-white/70 text-[11px]">Real Bride Styled at Rambagh Palace, Jaipur</p>
                    </div>
                  </div>
                </RevealOnScroll>
              </div>

              {/* Right Column: Bridal Studio Details */}
              <div className="lg:col-span-7 space-y-6">
                <RevealOnScroll direction="right" delay={0.15} duration={0.6}>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase">
                    <Crown className="w-4 h-4" />
                    <span>Specialist Bridal Studio</span>
                    <span aria-hidden="true">·</span>
                    <span>Jaipur & Destination Weddings</span>
                  </div>

                  <h2
                    className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mt-2"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Traditional Royal Bridal Looks with Modern Long-Lasting Makeup
                  </h2>

                  <p className="text-sm sm:text-base text-white/80 leading-relaxed font-light mt-3">
                    Indian weddings have long ceremonies, bright photo lights, and emotional moments. 
                    Our senior makeup artists make sure your bridal makeup stays 100% fresh, lightweight, 
                    and comfortable from morning pheras till the night reception. We also specialize in heavy Kundan, 
                    Polki, and Borla jewelry setting and lehenga draping.
                  </p>

                  {/* Bridal Highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#D09A40] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-white">Hotel & Venue Visits</h4>
                        <p className="text-xs text-white/70 mt-0.5">
                          Our team travels to your wedding hotel or resort anywhere in Jaipur and Rajasthan.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#D09A40] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-white">Family & Bridesmaid Makeup</h4>
                        <p className="text-xs text-white/70 mt-0.5">
                          Dedicated team of artists to get the mother, sisters, and friends ready on time.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#D09A40] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-white">Waterproof HD Airbrush</h4>
                        <p className="text-xs text-white/70 mt-0.5">
                          Long-lasting makeup that looks natural in person and flawless in high-res wedding photos.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#D09A40] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-white">Pre-Bridal Skin Care Plan</h4>
                        <p className="text-xs text-white/70 mt-0.5">
                          Special skin glow & care treatments started 1 to 2 months before the wedding.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-4 flex flex-wrap items-center gap-4">
                    <button
                      onClick={onBookBridal}
                      className="px-6 py-3.5 text-xs sm:text-sm font-semibold text-[#0F172A] bg-[#D09A40] hover:bg-[#DCA54A] rounded-xl transition-colors cursor-pointer shadow-lg whitespace-nowrap"
                    >
                      Book Bridal Makeup
                    </button>
                    <div className="text-xs text-white/70">
                      <span>✨ Includes free makeup consultation and jewelry setting advice</span>
                    </div>
                  </div>
                </RevealOnScroll>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
