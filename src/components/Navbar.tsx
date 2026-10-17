import React, { useState, useEffect } from 'react';
import { CalendarCheck, Crown, SlidersHorizontal, Sparkles, Menu, X, Phone, MessageCircle, ArrowUpRight, Gift, Film } from 'lucide-react';
import { SOCIAL_LINKS, WhatsAppIcon } from './SocialIcons';

interface NavbarProps {
  onOpenBooking: () => void;
  onOpenManagement?: () => void;
  onToggleTokens?: () => void;
  isTokensOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBooking,
  onOpenManagement,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.hash = targetId;
    }
  };

  const navLinks = [
    { label: 'Trending Reels', targetId: 'featured-reels', badge: true },
    { label: 'Deals & Offers', targetId: 'bundles', highlight: true },
    { label: 'Gift Cards', targetId: 'gift-cards', highlight: true },
    { label: 'Services & Rates', targetId: 'services' },
    { label: 'Price Calculator', targetId: 'booking' },
    { label: 'Transformations', targetId: 'gallery' },
    { label: 'Reviews', targetId: 'reviews' },
    { label: 'Rewards Club', targetId: 'rewards' },
    { label: 'Our Salons', targetId: 'locations' },
    { label: 'FAQs', targetId: 'faq' },
  ];

  return (
    <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${
      scrolled 
        ? 'bg-[#FAF5E5] shadow-sm border-b border-[#0F172A]/10' 
        : 'bg-[#FAF5E5] border-b border-[#0F172A]/10'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <a 
          href="#home" 
          onClick={(e) => handleNavClick(e, 'home')}
          className="group flex items-center gap-2.5 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] luxe-logo-hover cursor-pointer origin-left"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          aria-label="Beauty Zone Jaipur Home"
        >
          <div className="w-9 h-9 rounded-xl bg-white border border-[#D09A40]/30 shadow-xs flex items-center justify-center text-[#D09A40] transition-all duration-300 ease-out group-hover:scale-105 group-hover:drop-shadow-md">
            <Crown className="w-5 h-5 text-[#D09A40] animate-float-subtle" />
          </div>
          <div className="flex flex-col">
            <span className="transition-colors duration-300 group-hover:text-[#D09A40] leading-none">Beauty Zone</span>
            <span className="text-[10px] font-sans font-normal tracking-widest text-[#D09A40] uppercase mt-0.5">Jaipur Luxury Salon</span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-4 text-xs lg:text-sm font-medium text-[#4A4A4A]">
          {navLinks.map((link) => (
            <a
              key={link.targetId}
              href={`#${link.targetId}`}
              onClick={(e) => handleNavClick(e, link.targetId)}
              className={`nav-link-underline transition-colors flex items-center gap-1.5 py-1 ${
                link.highlight 
                  ? 'text-[#D09A40] font-bold hover:text-[#b8832e]' 
                  : 'hover:text-[#D09A40]'
              }`}
            >
              <span>{link.label}</span>
              {link.badge && (
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              )}
            </a>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenManagement && (
            <button
              onClick={onOpenManagement}
              className="hidden sm:flex px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white/80 hover:bg-white border border-[#0F172A]/15 hover:border-[#D09A40] rounded-xl luxe-btn shadow-xs items-center gap-1.5 cursor-pointer"
              title="Admin Dashboard: Manage Packages, Services & Videos"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#D09A40]" />
              <span>Admin Dashboard</span>
            </button>
          )}

          <button
            onClick={onOpenBooking}
            className="px-3.5 sm:px-4.5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl luxe-btn shadow-sm whitespace-nowrap cursor-pointer flex items-center gap-1.5 transition-all hover:shadow-md"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Book Appointment</span>
          </button>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2.5 rounded-xl bg-white/80 border border-[#0F172A]/15 text-[#0F172A] hover:text-[#D09A40] hover:bg-white transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#0F172A]/10 bg-[#FAF5E5] px-4 pt-3 pb-6 shadow-xl animate-fade-in">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {navLinks.map((link) => (
              <a
                key={link.targetId}
                href={`#${link.targetId}`}
                onClick={(e) => handleNavClick(e, link.targetId)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
                  link.highlight
                    ? 'bg-amber-50 border-[#D09A40]/40 text-[#D09A40]'
                    : 'bg-white/80 border-[#0F172A]/10 text-[#0F172A] hover:bg-white'
                }`}
              >
                <span>{link.label}</span>
                {link.badge ? (
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                ) : (
                  <ArrowUpRight className="w-3 h-3 text-[#D09A40]" />
                )}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-[#0F172A]/10 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <a
                href={SOCIAL_LINKS.whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
                <span>WhatsApp Us</span>
              </a>

              <a
                href="tel:+919829012345"
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-100 border border-[#0F172A]/15 text-[#0F172A] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Phone className="w-3.5 h-3.5 text-[#D09A40]" />
                <span>Call Salon</span>
              </a>
            </div>

            {onOpenManagement && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenManagement();
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#0F172A] text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#D09A40]" />
                <span>Open Salon Admin Dashboard</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
