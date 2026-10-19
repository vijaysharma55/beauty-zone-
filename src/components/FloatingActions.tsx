import React, { useState, useEffect } from 'react';
import { Calendar, ArrowUp, Palette } from 'lucide-react';
import { WhatsAppIcon } from './SocialIcons';
import { useBrand } from '../context/BrandContext';

interface FloatingActionsProps {
  onBookClick: () => void;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({ onBookClick }) => {
  const { brand, setIsCustomizerOpen } = useBrand();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2.5">
      {/* Scroll to Top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="w-10 h-10 rounded-full bg-[#0F172A]/90 text-[#FAF5E5] border border-[#D09A40]/40 shadow-lg flex items-center justify-center hover:bg-[#D09A40] hover:text-[#0F172A] transition-all cursor-pointer"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* White-Label Brand Studio Floating Trigger */}
      <button
        onClick={() => setIsCustomizerOpen(true)}
        className="flex items-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-[#FAF5E5] border border-[#D09A40]/50 font-bold text-xs px-3.5 py-2.5 rounded-full shadow-xl transition-all hover:scale-105 cursor-pointer"
        title="Open White-Label Brand Studio"
      >
        <Palette className="w-4 h-4 text-[#D09A40]" />
        <span className="hidden sm:inline">White-Label Studio</span>
      </button>

      {/* Direct WhatsApp Concierge */}
      <a
        href={`https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent(
          `Namaste ${brand.brandName} (${brand.cityName}), I want to inquire about salon services or bridal packages.`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs sm:text-sm px-4 py-3 rounded-full shadow-xl hover:shadow-[#10B981]/30 transition-all duration-300 hover:-translate-y-0.5"
      >
        <WhatsAppIcon className="w-4 h-4" />
        <span className="hidden sm:inline">WhatsApp Us</span>
      </a>

      {/* Quick Book Button (Mobile Sticky Helper) */}
      <button
        onClick={onBookClick}
        className="sm:hidden flex items-center gap-2 bg-[#D09A40] text-[#0F172A] font-bold text-xs px-4 py-3 rounded-full shadow-xl border border-[#0F172A]/10"
      >
        <Calendar className="w-4 h-4" />
        <span>Book Now</span>
      </button>
    </div>
  );
};
