import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Mail,
  Heart,
} from 'lucide-react';
import { SocialLinksBar, InstagramIcon } from './SocialIcons';
import { useBrand } from '../context/BrandContext';
import { BrandEmblemIcon } from './BrandEmblemIcon';
import { useAuth } from '../context/AuthContext';
import { isAdminRole, isStaffRole } from '../lib/roles.js';
import { homeForAuthUser } from '../lib/authRoutes';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
  onOpenInspector: () => void;
  onOpenManagement: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenInspector,
  onOpenManagement,
}) => {
  const { brand, setIsCustomizerOpen, t } = useBrand();
  const { user } = useAuth();
  // Template/catalog tools are only offered to signed-in owners and admins.
  const isStaff = isStaffRole(user?.role);
  const accountHref = user ? homeForAuthUser(user, true) : '/login';

  const branchNames =
    brand.branches.length > 0
      ? brand.branches.map((b) => b.name).join(' • ')
      : `${brand.cityName} Flagship Studio`;

  return (
    <footer className="bg-[#0F172A] text-[#FAF5E5] pt-16 pb-8 border-t border-[#D09A40]/20">
      <div className="w-full px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Column 1: Brand Identity */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.brandName}
                  className="w-10 h-10 rounded-full object-cover border border-[#D09A40] shadow-md"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D09A40] to-[#B37E28] flex items-center justify-center shadow-md">
                  <BrandEmblemIcon
                    icon={brand.logoIcon}
                    className="w-5 h-5 text-[#0F172A]"
                  />
                </div>
              )}
              <div>
                <span className="block font-serif text-xl font-bold tracking-wider text-[#FAF5E5] leading-none">
                  {brand.brandName.toUpperCase()}
                </span>
                <span className="block text-[10px] uppercase tracking-[0.22em] text-[#D09A40] mt-1 font-medium">
                  {brand.brandSubtext}
                </span>
              </div>
            </div>
            <p className="text-sm text-[#FAF5E5]/70 leading-relaxed max-w-sm">
              {brand.footerDescription}
            </p>
            <div className="pt-2 space-y-2.5">
              <p className="text-[11px] uppercase tracking-widest text-[#D09A40] font-semibold">
                Follow Our {brand.cityName} Transformations
              </p>
              <SocialLinksBar variant="footer" />
            </div>
          </div>

          {/* Column 2: Quick Navigation */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-[#D09A40] font-bold">
              {t('footerQuickLinks')}
            </h2>
            <ul className="space-y-2.5 text-sm text-[#FAF5E5]/75">
              <li>
                <button
                  onClick={() => onNavigate('packages')}
                  className="hover:text-[#D09A40] transition-colors cursor-pointer"
                >
                  Combo Packages
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('services')}
                  className="hover:text-[#D09A40] transition-colors cursor-pointer"
                >
                  Services & Price List
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('bridal')}
                  className="hover:text-[#D09A40] transition-colors cursor-pointer"
                >
                  Bridal Makeup Studio
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('gallery')}
                  className="hover:text-[#D09A40] transition-colors cursor-pointer"
                >
                  Before & After Photos
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('booking')}
                  className="hover:text-[#D09A40] transition-colors cursor-pointer"
                >
                  Book Appointment
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('locations')}
                  className="hover:text-[#D09A40] transition-colors cursor-pointer"
                >
                  Our {brand.cityName} Salons
                </button>
              </li>
              <li>
                <Link to="/salons?city=Jaipur" className="hover:text-[#D09A40] transition-colors">
                  Explore all salons
                </Link>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('faq')}
                  className="hover:text-[#D09A40] transition-colors cursor-pointer"
                >
                  Common Questions (FAQs)
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Top Treatments */}
          <div className="lg:col-span-3 space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-[#D09A40] font-bold">
              {t('footerPopularServices')}
            </h2>
            <ul className="space-y-2.5 text-sm text-[#FAF5E5]/75">
              <li>Signature HD Bridal Makeup</li>
              <li>Moroccan Nanoplastia & Hair Botox</li>
              <li>24K Gold Leaf Glow Facial</li>
              <li>7-Step Deep Clean Hydra-Facial</li>
              <li>Bridal Gel Nail Extensions & Art</li>
              <li>Makeup & Hair Academy Courses</li>
            </ul>
          </div>

          {/* Column 4: Direct Contact */}
          <div className="lg:col-span-3 space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-[#D09A40] font-bold">
              {t('footerContactBookings')}
            </h2>
            <div className="space-y-2.5 text-sm text-[#FAF5E5]/75">
              <p className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#D09A40] shrink-0 mt-1" />
                <span>
                  {branchNames} ({brand.cityName})
                </span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#D09A40] shrink-0" />
                <a
                  href={`tel:+${brand.phoneRaw}`}
                  className="hover:text-[#D09A40] transition-colors"
                >
                  {brand.phoneDisplay}
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#D09A40] shrink-0" />
                <a
                  href={`mailto:${brand.email}`}
                  className="hover:text-[#D09A40] transition-colors"
                >
                  {brand.email}
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <InstagramIcon className="w-4 h-4 text-[#D09A40] shrink-0" />
                <a
                  href={brand.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#D09A40] transition-colors"
                >
                  {brand.instagramHandle}
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#FAF5E5]/50">
          <p>{brand.copyrightText}</p>
          <nav aria-label="Owner tools" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[#FAF5E5]/40">
            <Link to={accountHref} className="hover:text-[#D09A40] transition-colors">
              {user ? (isAdminRole(user.role) ? 'Admin console' : 'My workspace') : 'Owner login'}
            </Link>
            {isStaff && (
              <>
                <button onClick={onOpenManagement} className="hover:text-[#D09A40] transition-colors cursor-pointer">
                  Catalog admin
                </button>
                <button onClick={() => setIsCustomizerOpen(true)} className="hover:text-[#D09A40] transition-colors cursor-pointer">
                  Brand studio
                </button>
                <button onClick={onOpenInspector} className="hover:text-[#D09A40] transition-colors cursor-pointer">
                  Design tokens
                </button>
              </>
            )}
          </nav>
          {brand.showPoweredByBadge && (
            <p className="flex items-center gap-1.5">
              <span>Crafted with</span>
              <Heart className="w-3.5 h-3.5 text-[#D09A40] fill-[#D09A40]" />
              <span>for {brand.brandName} ({brand.cityName})</span>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
};
