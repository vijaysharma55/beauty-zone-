import React from 'react';
import { CalendarCheck, Crown, SlidersHorizontal } from 'lucide-react';

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
  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAF5E5]/90 backdrop-blur-md border-b border-[#0F172A]/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <a 
          href="#home" 
          className="group flex items-center gap-2.5 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] luxe-logo-hover cursor-pointer origin-left"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          aria-label="Beauty Zone Jaipur Home"
        >
          <div className="w-9 h-9 rounded-xl bg-white/70 backdrop-blur-md border border-white/60 shadow-xs flex items-center justify-center text-[#D09A40] transition-all duration-300 ease-out group-hover:scale-105 group-hover:drop-shadow-md">
            <Crown className="w-5 h-5 text-[#D09A40] animate-float-subtle" />
          </div>
          <span className="transition-colors duration-300 group-hover:text-[#D09A40]">Beauty Zone</span>
        </a>

        {/* Navigation Links in Simple Indian English */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#4A4A4A]">
          <a href="#services" className="nav-link-underline hover:text-[#D09A40] transition-colors">Services</a>
          <a href="#bridal" className="nav-link-underline hover:text-[#D09A40] transition-colors">Bridal Studio</a>
          <a href="#bundles" className="nav-link-underline hover:text-[#D09A40] transition-colors">Packages</a>
          <a href="#gallery" className="nav-link-underline hover:text-[#D09A40] transition-colors">Real Photos</a>
          <a href="#stylists" className="nav-link-underline hover:text-[#D09A40] transition-colors">Our Stylists</a>
          <a href="#founder" className="nav-link-underline hover:text-[#D09A40] transition-colors">About Founder</a>
          <a href="#booking" className="nav-link-underline hover:text-[#D09A40] transition-colors">Home Service</a>
          <a href="#locations" className="nav-link-underline hover:text-[#D09A40] transition-colors">Our Salons</a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {onOpenManagement && (
            <button
              onClick={onOpenManagement}
              className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white/80 hover:bg-white border border-[#0F172A]/15 hover:border-[#D09A40] rounded-lg luxe-btn shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Admin Dashboard: Manage Packages & Real Photos"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#D09A40]" />
              <span className="hidden sm:inline">Admin Dashboard</span>
            </button>
          )}

          <button
            onClick={onOpenBooking}
            className="px-4 sm:px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-lg luxe-btn shadow-sm whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>
    </header>
  );
};
