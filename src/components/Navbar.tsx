import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Menu, X, CalendarCheck } from 'lucide-react';
import { SocialLinksBar } from './SocialIcons';
import { useBrand } from '../context/BrandContext';
import { BrandEmblemIcon } from './BrandEmblemIcon';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Customer-facing header only. Owner/admin entry points (login, catalog admin,
 * brand studio, design tokens) live in the footer's discreet "Owner tools" row.
 */
interface NavbarProps {
  onNavigate: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { brand, t } = useBrand();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: t('navServices'), id: 'services', show: brand.sections.showServices },
    { label: t('navPackages'), id: 'packages', show: brand.sections.showPackages },
    { label: t('navBridal'), id: 'bridal', show: brand.sections.showBridalSpotlight },
    { label: t('navGallery'), id: 'gallery', show: brand.sections.showGallery },
    { label: t('navLocations'), id: 'locations', show: brand.sections.showLocations },
  ].filter((item) => item.show);

  const handleLinkClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  const branchSummary =
    brand.branches.length > 0
      ? brand.branches
          .slice(0, 3)
          .map((b) => b.locality.split('/')[0].trim())
          .join(' • ')
      : brand.cityName;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#0F172A]/95 backdrop-blur-md shadow-xl py-3 border-b border-[#D09A40]/20'
          : 'bg-[#0F172A] py-4'
      }`}
    >
      {/* Top Info Strip - Desktop Only (customer information, no tools) */}
      <div className="hidden lg:block border-b border-white/10 pb-2 mb-3">
        <div className="w-full px-4 flex items-center justify-between text-xs text-[#FAF5E5]/80">
          <div className="flex items-center space-x-6">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#D09A40]" />
              <span>
                {brand.cityName}: {branchSummary}
              </span>
            </span>
            <span className="text-[#D09A40]">•</span>
            <span>{t('navHomeServiceAvailable')}</span>
          </div>
          <div className="flex items-center space-x-5">
            <LanguageSwitcher variant="dark" compact />
            <SocialLinksBar
              variant="header"
              iconSize="w-3.5 h-3.5"
              className="border-r border-white/15 pr-4"
            />
            <a
              href={`tel:+${brand.phoneRaw}`}
              className="flex items-center gap-1.5 hover:text-[#D09A40] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#D09A40]" />
              <span>{brand.phoneDisplay}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="w-full px-4 flex items-center justify-between gap-4">
        {/* Brand Emblem */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 text-left group cursor-pointer"
          aria-label={`${brand.brandName} - back to top`}
        >
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={brand.brandName}
              className="w-10 h-10 rounded-full object-cover border border-[#D09A40] shadow-md group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D09A40] to-[#B37E28] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300">
              <BrandEmblemIcon icon={brand.logoIcon} className="w-5 h-5 text-[#0F172A]" />
            </div>
          )}
          <div>
            <span className="block font-serif text-xl sm:text-2xl font-bold tracking-wider text-[#FAF5E5] leading-none">
              {brand.brandName.toUpperCase()}
            </span>
            <span className="block text-[10px] uppercase tracking-[0.22em] text-[#D09A40] mt-1 font-medium">
              {brand.brandSubtext}
            </span>
          </div>
        </button>

        {/* Desktop: essential links + primary CTA */}
        <nav className="hidden lg:flex items-center space-x-7" aria-label="Main">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link.id)}
              className="relative text-sm font-medium text-[#FAF5E5]/90 hover:text-[#D09A40] transition-colors py-1 group cursor-pointer"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#D09A40] transition-all duration-300 group-hover:w-full" />
            </button>
          ))}
          <button
            onClick={() => handleLinkClick('booking')}
            className="flex items-center gap-2 bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] font-bold text-sm px-5 py-2.5 rounded-full shadow-lg hover:shadow-[#D09A40]/25 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>{t('navBookAppointment')}</span>
          </button>
        </nav>

        {/* Mobile / tablet: compact CTA always visible + menu */}
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher variant="dark" compact />
          <button
            onClick={() => handleLinkClick('booking')}
            className="flex items-center gap-1.5 bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] font-bold text-xs sm:text-sm px-3.5 py-2 rounded-full shadow-md cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>
              <span className="sm:hidden">Book</span>
              <span className="hidden sm:inline">{t('navBookAppointment')}</span>
            </span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#FAF5E5] hover:text-[#D09A40] transition-colors"
            aria-label="Toggle Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0F172A] border-t border-white/10 px-6 py-5 space-y-4 shadow-2xl">
          <nav className="flex flex-col space-y-3" aria-label="Mobile">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className="text-left text-base font-medium text-[#FAF5E5] hover:text-[#D09A40] py-1.5 border-b border-white/5 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>
          <button
            onClick={() => handleLinkClick('booking')}
            className="w-full flex items-center justify-center gap-2 bg-[#D09A40] text-[#0F172A] font-bold py-3 rounded-full shadow-md"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>{t('navBookAppointment')}</span>
          </button>
        </div>
      )}
    </header>
  );
};
