import React from 'react';
import { Store, Award, ShieldCheck, Home } from 'lucide-react';

export const TrustHighlightsBar: React.FC = () => {
  const highlights = [
    {
      icon: Store,
      title: '3 Jaipur Salons',
      subtitle: 'C-Scheme, Vaishali & Raja Park',
      badge: 'Flagship Salons',
    },
    {
      icon: Award,
      title: '15+ Years Experience',
      subtitle: '12,000+ Happy Brides',
      badge: 'Certified Masters',
    },
    {
      icon: ShieldCheck,
      title: '100% Branded Products',
      subtitle: 'MAC, Moroccanoil & Kryolan',
      badge: 'Zero Chemicals',
    },
    {
      icon: Home,
      title: 'Home Visit Available',
      subtitle: 'Doorstep Visits in Jaipur',
      badge: 'Sanitized Kits',
    },
  ];

  return (
    <section id="trust-bar" className="py-4 sm:py-8 bg-[#0F172A] text-white border-y border-[#D09A40]/30 relative overflow-hidden w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-[#D09A40]/15 border border-[#D09A40]/30 flex items-center justify-center text-[#D09A40] shrink-0">
                  <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-[#D09A40]" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#D09A40] font-bold block truncate">
                    {item.badge}
                  </span>
                  <h4 className="font-serif text-xs sm:text-base font-bold text-white truncate leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-[10px] sm:text-xs text-[#FAF5E5]/60 truncate font-light">
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
