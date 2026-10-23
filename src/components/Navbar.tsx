import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Menu,
  X,
  Calendar,
  Sliders,
  Settings,
  Palette,
  UserCircle,
  LayoutDashboard,
} from 'lucide-react';
import { SocialLinksBar } from './SocialIcons';
import { useBrand } from '../context/BrandContext';
import { BrandEmblemIcon } from './WhiteLabelCustomizer';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onNavigate: (sectionId: string) => void;
  onOpenInspector: () => void;
  onOpenManagement: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  onOpenInspector,
  onOpenManagement,
}) => {
  const { brand, setIsCustomizerOpen, t } = useBrand();
  const { user } = useAuth();
  const accountHref = user ? (user.role === 'super_admin' ? '/admin' : '/dashboard') : '/login';
  const accountLabel = user
    ? user.role === 'super_admin'
      ? 'Admin console'
      : 'My dashboard'
    : 'Owner login';
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: t('navReels'), id: 'reels', show: brand.sections.showReels },
    { label: t('navPackages'), id: 'packages', show: brand.sections.showPackages },
    { label: t('navServices'), id: 'services', show: brand.sections.showServices },
    { label: t('navBridal'), id: 'bridal', show: brand.sections.showBridalSpotlight },
    { label: t('navGallery'), id: 'gallery', show: brand.sections.showGallery },
    { label: t('navGiftCards'), id: 'gift-cards', show: brand.sections.showGiftCards },
    { label: t('navRewards'), id: 'rewards', show: brand.sections.showRewards },
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
      {/* Top Info Strip - Desktop Only */}
      <div className="hidden lg:block border-b border-white/10 pb-2 mb-3">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-[#FAF5E5]/80">
          <div className="flex items-center space-x-6">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#D09A40]" />
              <span>
                {brand.cityName}: {branchSummary}
              </span>
            </span>
            <span className="text-[#D09A40]">•</span>
            <Link
              to="/salons?city=Jaipur"
              className="text-[#D09A40] hover:text-[#DCA54A] transition font-semibold flex items-center gap-1.5"
            >
              <span>Explore Salons in Jaipur</span>
              <span className="text-[10px] bg-[#D09A40]/20 text-[#FAF5E5] px-1.5 py-0.5 rounded-full font-bold">
                Jaipur Flagship
              </span>
            </Link>
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

            <Link
              to={accountHref}
              className="flex items-center gap-1.5 bg-white/10 text-[#FAF5E5] border border-white/20 px-2.5 py-1 rounded-full hover:bg-white/20 transition-all font-semibold"
            >
              <UserCircle className="w-3.5 h-3.5 text-[#D09A40]" />
              <span>{accountLabel}</span>
            </Link>

            {/* White-Label Brand Studio Trigger */}
            <button
              onClick={() => setIsCustomizerOpen(true)}
              className="flex items-center gap-1.5 bg-[#D09A40] text-[#0F172A] px-2.5 py-1 rounded-full hover:bg-[#DCA54A] transition-all cursor-pointer font-bold shadow-xs"
              title="Customize White-Label Brand, Theme, Presets & Copy"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>{t('navWhiteLabelStudio')}</span>
            </button>

            <button
              onClick={onOpenManagement}
              className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full hover:bg-emerald-500/25 transition-all cursor-pointer font-medium"
              title="Manage services, packages & gallery in your owner dashboard"
            >
              <Settings className="w-3 h-3" />
              <span>{t('navCatalogAdmin')}</span>
            </button>
            <button
              onClick={onOpenInspector}
              className="flex items-center gap-1.5 bg-[#D09A40]/15 text-[#D09A40] border border-[#D09A40]/30 px-2.5 py-0.5 rounded-full hover:bg-[#D09A40]/25 transition-all cursor-pointer"
              title="Inspect Design System Tokens"
            >
              <Sliders className="w-3 h-3" />
              <span>Tokens</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Brand Emblem */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 text-left group cursor-pointer"
        >
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={brand.brandName}
              className="w-10 h-10 rounded-full object-cover border border-[#D09A40] shadow-md group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D09A40] to-[#B37E28] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300">
              <BrandEmblemIcon
                icon={brand.logoIcon}
                className="w-5 h-5 text-[#0F172A]"
              />
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

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center space-x-6">
          <Link
            to="/salons?city=Jaipur"
            className="relative text-sm font-semibold text-[#D09A40] hover:text-[#DCA54A] transition-colors py-1 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Salons</span>
            <span className="text-[10px] bg-[#D09A40]/20 text-[#FAF5E5] px-1.5 py-0.5 rounded-full font-bold">
              Jaipur
            </span>
          </Link>
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
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-2.5">
          <button
            onClick={() => setIsCustomizerOpen(true)}
            className="lg:hidden flex items-center gap-1.5 border border-[#D09A40]/50 text-[#D09A40] hover:bg-[#D09A40]/15 font-semibold text-xs px-3 py-2.5 rounded-full transition-all cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Brand Studio</span>
          </button>

          <button
            onClick={() => handleLinkClick('booking')}
            className="flex items-center gap-2 bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] font-semibold text-sm px-5 py-2.5 rounded-full shadow-lg hover:shadow-[#D09A40]/25 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>{brand.heroPrimaryCta || t('navBookAppointment')}</span>
          </button>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher variant="dark" compact />
          <button
            onClick={() => setIsCustomizerOpen(true)}
            className="p-2 text-[#D09A40] hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="White-Label Brand Studio"
          >
            <Palette className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#FAF5E5] hover:text-[#D09A40] transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0F172A] border-t border-white/10 px-6 py-5 space-y-4 shadow-2xl">
          <div className="flex flex-col space-y-3">
            <Link
              to="/salons?city=Jaipur"
              onClick={() => setMobileMenuOpen(false)}
              className="text-left text-base font-semibold text-[#D09A40] py-1.5 border-b border-white/5 transition-colors flex items-center justify-between"
            >
              <span>Explore Salons</span>
              <span className="text-[11px] bg-[#D09A40]/20 text-[#FAF5E5] px-2 py-0.5 rounded-full font-bold">
                Jaipur Flagship
              </span>
            </Link>
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className="text-left text-base font-medium text-[#FAF5E5] hover:text-[#D09A40] py-1.5 border-b border-white/5 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <Link
              to={accountHref}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-[#D09A40] text-[#0F172A] font-bold py-3 rounded-full shadow-md"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{accountLabel}</span>
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLinkClick('booking');
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#D09A40] text-[#0F172A] font-bold py-3 rounded-full shadow-md"
            >
              <Calendar className="w-4 h-4" />
              <span>{t('navBookAppointment')}</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setIsCustomizerOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 bg-white/10 border border-[#D09A40]/40 text-[#FAF5E5] font-semibold py-2.5 rounded-full text-sm"
            >
              <Palette className="w-4 h-4 text-[#D09A40]" />
              <span>{t('navWhiteLabelStudio')}</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenManagement();
              }}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold py-2.5 rounded-full text-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Manage catalog (owner)</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
