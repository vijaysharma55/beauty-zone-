import React from 'react';
import { Store, Award, ShieldCheck, Home, Sparkles, Clock, CheckCircle } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

export const TrustHighlightsBar: React.FC = () => {
  const highlights = [
    {
      icon: Store,
      title: '3 Jaipur Salons',
      subtitle: 'C-Scheme, Vaishali & Raja Park',
      badge: 'Flagship Sanctuaries',
    },
    {
      icon: Award,
      title: '15+ Years Experience',
      subtitle: '12,000+ Happy Brides Styled',
      badge: 'Certified Masters',
    },
    {
      icon: ShieldCheck,
      title: '100% Branded Products',
      subtitle: 'MAC, Moroccanoil & Kryolan',
      badge: 'Zero Harsh Chemicals',
    },
    {
      icon: Home,
      title: 'Home Salon Service Available',
      subtitle: 'Doorstep Visits Across Jaipur',
      badge: 'Sanitized Single-Use Kits',
    },
  ];

  return (
    <section id="trust-bar" className="py-6 sm:py-8 bg-[#0F172A] text-white border-y border-[#D09A40]/30 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(#D09A40_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 lg:divide-x divide-white/10">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                className={`flex items-center gap-3.5 pt-4 sm:pt-0 ${idx > 0 ? 'lg:pl-6' : ''}`}
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#D09A40] shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#D09A40]" />
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#FAF5E5]/70 font-semibold truncate">
                      {item.badge}
                    </span>
                  </div>
                  <h4 className="font-serif text-sm sm:text-base font-bold text-white truncate leading-tight">
                    {item.title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-[#FAF5E5]/60 truncate font-light mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
