import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  CalendarCheck, 
  UserCheck, 
  Menu, 
  X, 
  Crown, 
  Image as ImageIcon, 
  Star, 
  Gift, 
  MapPin, 
  HelpCircle, 
  SlidersHorizontal,
  ArrowRight,
  ChevronUp
} from 'lucide-react';

interface MobileBottomDockProps {
  onOpenBooking: () => void;
  onOpenManagement: () => void;
  onSelectSection: (sectionId: string) => void;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  onOpenBooking,
  onOpenManagement,
  onSelectSection,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [showBackToTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 350);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (sectionId: string) => {
    setIsMoreOpen(false);
    onSelectSection(sectionId);
  };

  return (
    <>
      {/* Mobile-Only Floating Back-To-Top Button (positioned safely above dock) */}
      {showBackToTop && (
        <button
          onClick={handleScrollToTop}
          className="md:hidden fixed bottom-20 right-4 z-40 w-10 h-11 rounded-2xl bg-[#0F172A] text-white border border-[#D09A40]/40 shadow-2xl flex flex-col items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer"
          title="Scroll to Top"
          aria-label="Scroll to top of page"
        >
          <ChevronUp className="w-5 h-5 text-[#D09A40]" />
          <span className="text-[8px] font-mono uppercase font-bold text-white/80 -mt-1">TOP</span>
        </button>
      )}

      {/* Fixed Glassmorphic Bottom Navigation Dock (Mobile Only: md:hidden) */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FAF5E5]/95 backdrop-blur-lg border-t border-[#0F172A]/15 px-2 pt-1.5 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex items-center justify-around"
        aria-label="Mobile Application Dock"
      >
        {/* 1. Explore / Services */}
        <button
          onClick={() => handleNavClick('services')}
          className="flex flex-col items-center justify-center min-w-[64px] min-h-[48px] text-[#4A4A4A] hover:text-[#0F172A] active:scale-95 transition-all cursor-pointer group"
        >
          <Compass className="w-5 h-5 text-[#4A4A4A] group-hover:text-[#D09A40] transition-colors" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Explore</span>
        </button>

        {/* 2. Primary Center Action: Book Now */}
        <button
          onClick={onOpenBooking}
          className="relative -mt-4 flex flex-col items-center justify-center cursor-pointer group"
        >
          <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#0F172A] via-[#1E293B] to-[#D09A40] text-white flex items-center justify-center shadow-lg shadow-[#0F172A]/30 border-2 border-white group-active:scale-95 transition-transform">
            <CalendarCheck className="w-6 h-6 text-[#D09A40]" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-[#0F172A] mt-0.5">Book Now</span>
        </button>

        {/* 3. My Bookings / Price Calculator */}
        <button
          onClick={() => handleNavClick('booking')}
          className="flex flex-col items-center justify-center min-w-[64px] min-h-[48px] text-[#4A4A4A] hover:text-[#0F172A] active:scale-95 transition-all cursor-pointer group"
        >
          <UserCheck className="w-5 h-5 text-[#4A4A4A] group-hover:text-[#D09A40] transition-colors" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Bookings</span>
        </button>

        {/* 4. More Bottom Sheet Drawer Trigger */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className="flex flex-col items-center justify-center min-w-[64px] min-h-[48px] text-[#4A4A4A] hover:text-[#0F172A] active:scale-95 transition-all cursor-pointer group"
        >
          <Menu className="w-5 h-5 text-[#4A4A4A] group-hover:text-[#D09A40] transition-colors" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">More</span>
        </button>
      </nav>

      {/* "More" Smooth Mobile Bottom Sheet Drawer */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fade-in">
          {/* Backdrop Click to Dismiss */}
          <div 
            className="flex-1 w-full" 
            onClick={() => setIsMoreOpen(false)} 
            aria-hidden="true"
          />

          {/* Bottom Sheet Modal Body */}
          <div className="w-full bg-[#FAF5E5] rounded-t-3xl border-t border-[#D09A40]/40 p-5 pb-safe max-h-[85dvh] overflow-y-auto shadow-2xl animate-slide-up">
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-[#0F172A]/20 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#0F172A]/10">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#D09A40]" />
                <span className="font-serif font-bold text-base text-[#0F172A]">Beauty Zone Jaipur</span>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-full bg-white text-[#0F172A] hover:bg-[#D09A40] hover:text-white transition-colors cursor-pointer border border-[#0F172A]/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <button
                onClick={() => handleNavClick('bundles')}
                className="p-3 rounded-2xl bg-white border border-[#0F172A]/10 hover:border-[#D09A40] text-left flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#D09A40] flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">Offers & Deals</p>
                  <p className="text-[10px] text-[#4A4A4A]">Combo Packages</p>
                </div>
              </button>

              <button
                onClick={() => handleNavClick('gallery')}
                className="p-3 rounded-2xl bg-white border border-[#0F172A]/10 hover:border-[#D09A40] text-left flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">Gallery & Reels</p>
                  <p className="text-[10px] text-[#4A4A4A]">Real Photos</p>
                </div>
              </button>

              <button
                onClick={() => handleNavClick('reviews')}
                className="p-3 rounded-2xl bg-white border border-[#0F172A]/10 hover:border-[#D09A40] text-left flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-yellow-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">Client Reviews</p>
                  <p className="text-[10px] text-[#4A4A4A]">4.9 Google Rated</p>
                </div>
              </button>

              <button
                onClick={() => handleNavClick('rewards')}
                className="p-3 rounded-2xl bg-white border border-[#0F172A]/10 hover:border-[#D09A40] text-left flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">Beauty Rewards</p>
                  <p className="text-[10px] text-[#4A4A4A]">Loyalty Points</p>
                </div>
              </button>

              <button
                onClick={() => handleNavClick('founder')}
                className="p-3 rounded-2xl bg-white border border-[#0F172A]/10 hover:border-[#D09A40] text-left flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">About Founder</p>
                  <p className="text-[10px] text-[#4A4A4A]">18+ Yrs Heritage</p>
                </div>
              </button>

              <button
                onClick={() => handleNavClick('locations')}
                className="p-3 rounded-2xl bg-white border border-[#0F172A]/10 hover:border-[#D09A40] text-left flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">3 Salon Branches</p>
                  <p className="text-[10px] text-[#4A4A4A]">C-Scheme & More</p>
                </div>
              </button>
            </div>

            {/* Quick Action Footer Links */}
            <div className="space-y-2 pt-3 border-t border-[#0F172A]/10">
              <button
                onClick={() => handleNavClick('faq')}
                className="w-full p-2.5 rounded-xl bg-white border border-[#0F172A]/10 text-xs font-semibold text-[#0F172A] flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#D09A40]" />
                  <span>Frequently Asked Questions</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#D09A40]" />
              </button>

              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenManagement();
                }}
                className="w-full p-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-bold flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#D09A40]" />
                  <span>Salon Admin Dashboard</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#D09A40]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
