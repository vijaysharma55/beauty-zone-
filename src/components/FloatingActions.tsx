import React, { useState, useEffect } from 'react';
import { ArrowUp, Image as ImageIcon } from 'lucide-react';
import { WhatsAppIcon } from './SocialIcons';
import { useBrand } from '../context/BrandContext';

interface FloatingActionsProps {
  onOpenBranding?: () => void;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({ onOpenBranding }) => {
  const { brand } = useBrand();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2.5">
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D09A40]/40 bg-[#0F172A]/90 text-[#FAF5E5] shadow-lg transition-all hover:bg-[#D09A40] hover:text-[#0F172A]"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      {onOpenBranding && (
        <button
          onClick={onOpenBranding}
          className="flex items-center gap-2 rounded-full border border-[#D09A40]/50 bg-[#FAF5E5] px-3.5 py-2.5 text-xs font-bold text-[#0F172A] shadow-xl transition-all hover:scale-105 hover:bg-white"
          title="Edit Founder Branding"
        >
          <ImageIcon className="h-4 w-4 text-[#D09A40]" />
          <span className="hidden sm:inline">Edit Founder</span>
        </button>
      )}

      <a
        href={"https://wa.me/" + brand.whatsappNumber + "?text=" + encodeURIComponent("Namaste " + brand.brandName + " (" + brand.cityName + "), I want to inquire about salon services or bridal packages.")}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2.5 rounded-full bg-[#10B981] px-4 py-3 text-xs font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#059669] hover:shadow-[#10B981]/30 sm:text-sm"
      >
        <WhatsAppIcon className="h-4 w-4" />
        <span className="hidden sm:inline">WhatsApp Us</span>
      </a>
    </div>
  );
};
