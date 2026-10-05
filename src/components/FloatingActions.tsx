import React, { useState, useEffect } from 'react';
import { ChevronUp, SlidersHorizontal } from 'lucide-react';
import { SOCIAL_LINKS, WhatsAppIcon } from './SocialIcons';

interface FloatingActionsProps {
  onOpenBooking: () => void;
  onOpenManagement: () => void;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({
  onOpenManagement,
}) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 320);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Desktop & Tablet Floating Actions (Right Bottom) */}
      <div className="hidden md:flex fixed bottom-6 right-6 z-40 flex-col items-end gap-3 pointer-events-auto">
        {/* Scroll To Top Floating Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="w-11 h-11 rounded-full bg-white/95 text-[#0F172A] hover:bg-[#FAF5E5] hover:text-[#D09A40] border border-[#0F172A]/15 shadow-xl flex items-center justify-center transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group"
            title="Scroll to Top"
            aria-label="Scroll to top of page"
          >
            <ChevronUp className="w-5 h-5 text-[#0F172A] group-hover:text-[#D09A40] transition-colors" />
          </button>
        )}

        {/* Floating WhatsApp CTA Button */}
        <a
          href={SOCIAL_LINKS.whatsapp.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-emerald-600/30 cursor-pointer border border-white/20"
          title="Chat with Beauty Zone Jaipur Salon on WhatsApp"
          aria-label="Chat on WhatsApp"
        >
          <div className="relative">
            <WhatsAppIcon className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full border border-emerald-700 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-200 rounded-full border border-emerald-700" />
          </div>
          <span className="font-semibold text-xs tracking-wide">
            WhatsApp Inquiry
          </span>
        </a>
      </div>

      {/* Floating Admin Dashboard Trigger Button (Left Bottom - Desktop) */}
      <div className="hidden md:flex fixed bottom-6 left-6 z-40 items-center gap-2">
        <button
          onClick={onOpenManagement}
          className="px-4 py-2.5 rounded-full bg-[#0F172A] text-white shadow-xl hover:bg-[#D09A40] transition-all duration-200 border border-white/20 flex items-center gap-2 text-xs font-semibold cursor-pointer group hover:-translate-y-0.5"
          title="Admin Dashboard: Manage Services, Packages, Gallery & Reels"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#D09A40] group-hover:text-white transition-colors" />
          <span>Admin Dashboard</span>
        </button>
      </div>
    </>
  );
};
