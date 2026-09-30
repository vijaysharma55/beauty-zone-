import React from 'react';
import { Sparkles, Crown, Quote, Award, ArrowRight } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

interface FoundersNoteProps {
  onOpenBooking?: () => void;
}

export const FoundersNote: React.FC<FoundersNoteProps> = ({ onOpenBooking }) => {
  return (
    <section id="founder" className="py-16 md:py-24 bg-[#FAF5E5] border-t border-[#0F172A]/10 relative overflow-hidden">
      {/* Subtle decorative background watermarks */}
      <div className="absolute top-1/2 -left-20 w-80 h-80 bg-[#D09A40]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#0F172A]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Founder Portrait & Credential Badge */}
          <div className="lg:col-span-5">
            <RevealOnScroll direction="right" duration={0.7}>
              <div className="relative group">
                <div className="absolute -inset-3 bg-gradient-to-tr from-[#D09A40]/30 via-transparent to-[#0F172A]/10 rounded-3xl blur-xs transform -rotate-1 group-hover:rotate-0 transition-transform duration-500 pointer-events-none" />
                
                {/* Main Card with Portrait */}
                <div className="relative rounded-2xl overflow-hidden bg-white border border-[#0F172A]/15 shadow-2xl luxe-card-hover">
                  <div className="aspect-[3/4] w-full overflow-hidden bg-[#FAF5E5]">
                    <img
                      src="/src/assets/images/founder_portrait_1790694693142.jpg"
                      alt="Gayatri Devi Rathore - Founder of Beauty Zone Jaipur"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover luxe-img-zoom"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/85 via-[#0F172A]/20 to-transparent pointer-events-none" />
                  </div>

                  {/* Floating Experience Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[#0F172A] text-xs font-mono font-bold tracking-wider uppercase border border-white/60 shadow-md flex items-center gap-1.5 animate-float-subtle">
                      <Crown className="w-3.5 h-3.5 text-[#D09A40]" />
                      <span>18+ Years in Jaipur</span>
                    </span>
                  </div>

                  {/* Bottom Portrait Caption */}
                  <div className="absolute bottom-5 left-5 right-5 text-white z-10">
                    <div className="flex items-center gap-2 text-[#D09A40] text-xs font-mono uppercase tracking-wider">
                      <Award className="w-3.5 h-3.5" />
                      <span>Master Bridal Artist & Skin Expert</span>
                    </div>
                    <h3 
                      className="text-2xl font-bold text-white mt-1"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      Gayatri Devi Rathore
                    </h3>
                    <p className="text-white/80 text-xs mt-0.5">
                      Founder, Beauty Zone Jaipur
                    </p>
                  </div>
                </div>

                {/* Floating Quote Stamp */}
                <div className="hidden sm:flex absolute -bottom-6 -right-6 p-4 rounded-2xl bg-white text-[#0F172A] shadow-xl border border-[#D09A40]/40 max-w-xs items-start gap-3 animate-float-slow z-20">
                  <div className="w-8 h-8 rounded-full bg-[#FAF5E5] flex items-center justify-center text-[#D09A40] shrink-0 font-serif">
                    <Quote className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] italic text-[#4A4A4A] leading-snug">
                      "Real beauty is about enhancing your natural charm so you feel confident and happy."
                    </p>
                    <p className="text-[10px] font-bold text-[#D09A40] uppercase tracking-wider mt-1 font-mono">
                      — G. D. Rathore
                    </p>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>

          {/* Right Column: Founder's Narrative & Vision */}
          <div className="lg:col-span-7 space-y-6">
            <RevealOnScroll direction="left" delay={0.15} duration={0.7}>
              {/* Overline Badge */}
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase">
                <Sparkles className="w-4 h-4" />
                <span>Founder's Message & Vision</span>
                <span aria-hidden="true">·</span>
                <span>Beauty Zone Jaipur</span>
              </div>

              {/* Headline */}
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] tracking-tight leading-tight mt-2"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Bringing Royal Care and Modern Beauty Together in Jaipur
              </h2>

              {/* Bio & Vision Paragraphs in Simple Indian English */}
              <div className="space-y-4 text-sm sm:text-base text-[#4A4A4A] leading-relaxed font-light">
                <p>
                  When I started <strong className="text-[#0F172A] font-semibold">Beauty Zone Jaipur</strong> in 2008, 
                  my goal was simple: to give brides and families in Jaipur top-quality salon services with 
                  100% genuine products, skilled artists, and warm hospitality.
                </p>
                <p>
                  With certified training in professional bridal makeup and advanced skincare, I created our 
                  salons to blend traditional Ayurvedic ingredients like kesar, chandan, and almond oils with 
                  modern technologies like machine Hydra-Facials and chemical-free hair botox.
                </p>
                <p className="text-xs sm:text-sm text-[#0F172A]/90 italic border-l-2 border-[#D09A40] pl-4 py-1 bg-white/40 rounded-r-xl">
                  "For us, every customer who walks into our salon is like family. Our promise is clean, 
                  hygienic rooms, genuine branded products, and careful styling so you look your absolute best."
                </p>
              </div>

              {/* Key Vision Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-white border border-[#0F172A]/10 shadow-xs luxe-card-hover">
                  <div className="w-7 h-7 rounded-lg bg-[#FAF5E5] text-[#D09A40] flex items-center justify-center font-bold mb-2">
                    1
                  </div>
                  <h4 className="font-bold text-xs text-[#0F172A]">Flawless Makeup</h4>
                  <p className="text-[11px] text-[#4A4A4A] mt-1 leading-snug">
                    Lightweight HD airbrush makeup that looks natural and stays sweat-free all day.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#0F172A]/10 shadow-xs luxe-card-hover">
                  <div className="w-7 h-7 rounded-lg bg-[#FAF5E5] text-[#D09A40] flex items-center justify-center font-bold mb-2">
                    2
                  </div>
                  <h4 className="font-bold text-xs text-[#0F172A]">Safe Branded Care</h4>
                  <p className="text-[11px] text-[#4A4A4A] mt-1 leading-snug">
                    Chemical-free hair smoothening and skin-safe, dermatologically tested products.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#0F172A]/10 shadow-xs luxe-card-hover">
                  <div className="w-7 h-7 rounded-lg bg-[#FAF5E5] text-[#D09A40] flex items-center justify-center font-bold mb-2">
                    3
                  </div>
                  <h4 className="font-bold text-xs text-[#0F172A]">Personal Attention</h4>
                  <p className="text-[11px] text-[#4A4A4A] mt-1 leading-snug">
                    Private bridal rooms, comfortable waiting lounges, and doorstep home services.
                  </p>
                </div>
              </div>

              {/* Signature & CTA Section */}
              <div className="pt-6 border-t border-[#0F172A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                    With Warm Regards,
                  </span>
                  <div 
                    className="text-3xl text-[#0F172A] select-none font-serif italic tracking-wide"
                    style={{ fontFamily: "'Playfair Display', cursive" }}
                  >
                    Gayatri D. Rathore
                  </div>
                  <span className="text-[11px] text-[#D09A40] font-mono block mt-0.5">
                    Founder, Beauty Zone Jaipur
                  </span>
                </div>

                {onOpenBooking && (
                  <button
                    onClick={onOpenBooking}
                    className="px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl luxe-btn shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                  >
                    <span>Book an Appointment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </RevealOnScroll>
          </div>

        </div>
      </div>
    </section>
  );
};
