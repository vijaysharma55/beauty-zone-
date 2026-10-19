import React from 'react';
import { ShieldCheck, Sparkles, Clock, MapPin, Award, Home } from 'lucide-react';
import { useBrand } from '../context/BrandContext';

export const TrustHighlightsBar: React.FC = () => {
  const { brand } = useBrand();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'shield':
        return <ShieldCheck className="w-5 h-5 text-[#10B981]" />;
      case 'award':
        return <Award className="w-5 h-5 text-[#D09A40]" />;
      case 'home':
        return <Home className="w-5 h-5 text-[#10B981]" />;
      case 'clock':
        return <Clock className="w-5 h-5 text-[#10B981]" />;
      case 'map':
        return <MapPin className="w-5 h-5 text-[#D09A40]" />;
      case 'sparkles':
      default:
        return <Sparkles className="w-5 h-5 text-[#D09A40]" />;
    }
  };

  return (
    <section className="bg-white border-b border-[#0F172A]/10 py-6 shadow-xs relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {brand.trustHighlights.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-[#FAF5E5]/60 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                {getIcon(item.icon)}
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#0F172A] leading-snug">
                  {item.title}
                </h2>
                <p className="text-xs text-[#4A4A4A] mt-0.5 leading-relaxed">
                  {item.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
