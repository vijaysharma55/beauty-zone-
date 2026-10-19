import React from 'react';
import { useBrand } from '../context/BrandContext';

export interface SocialLinkItem {
  id: 'instagram' | 'facebook' | 'youtube' | 'whatsapp' | 'maps';
  label: string;
  handle: string;
  href: string;
  followersBadge?: string;
}

export const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.85"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const FacebookIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.85"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const YouTubeIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.85"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" stroke="none" />
  </svg>
);

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.85"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
  </svg>
);

export const GoogleMapsPinIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.85"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

interface SocialLinksBarProps {
  variant?: 'header' | 'footer' | 'light';
  showLabels?: boolean;
  iconSize?: string;
  className?: string;
}

export const SocialLinksBar: React.FC<SocialLinksBarProps> = ({
  variant = 'footer',
  showLabels = false,
  iconSize = 'w-4 h-4',
  className = '',
}) => {
  const { brand } = useBrand();

  const socialLinks: SocialLinkItem[] = [
    {
      id: 'instagram',
      label: 'Instagram',
      handle: brand.instagramHandle,
      href: brand.instagramUrl || 'https://instagram.com',
      followersBadge: '48K+',
    },
    {
      id: 'facebook',
      label: 'Facebook',
      handle: brand.brandName,
      href: brand.facebookUrl || 'https://facebook.com',
      followersBadge: '22K+',
    },
    {
      id: 'youtube',
      label: 'YouTube',
      handle: `${brand.brandName} Studio`,
      href: brand.youtubeUrl || 'https://youtube.com',
      followersBadge: '15K+',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      handle: brand.phoneDisplay,
      href: `https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent(
        `Hi ${brand.brandName} (${brand.cityName}), I would like to book an appointment.`
      )}`,
    },
    {
      id: 'maps',
      label: 'Google Maps',
      handle: `${brand.brandName} ${brand.cityName}`,
      href:
        brand.googleMapsUrl ||
        `https://maps.google.com/?q=${encodeURIComponent(`${brand.brandName} ${brand.cityName}`)}`,
    },
  ];

  const renderIcon = (id: SocialLinkItem['id']) => {
    switch (id) {
      case 'instagram':
        return <InstagramIcon className={iconSize} />;
      case 'facebook':
        return <FacebookIcon className={iconSize} />;
      case 'youtube':
        return <YouTubeIcon className={iconSize} />;
      case 'whatsapp':
        return <WhatsAppIcon className={iconSize} />;
      case 'maps':
        return <GoogleMapsPinIcon className={iconSize} />;
    }
  };

  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {socialLinks.slice(0, 4).map((item) => (
          <a
            key={item.id}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${brand.brandName} on ${item.label}`}
            title={`${item.label} (${item.handle})`}
            className="w-6 h-6 rounded-full bg-white/5 hover:bg-[#D09A40] text-[#FAF5E5]/80 hover:text-[#0F172A] border border-white/10 hover:border-[#D09A40] flex items-center justify-center transition-all duration-200 hover:scale-110"
          >
            {renderIcon(item.id)}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {socialLinks.map((item) => (
        <a
          key={item.id}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${brand.brandName} on ${item.label}`}
          title={`Follow ${item.handle} on ${item.label}`}
          className={
            showLabels
              ? 'group inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/5 hover:bg-[#D09A40] border border-white/10 hover:border-[#D09A40] text-[#FAF5E5]/85 hover:text-[#0F172A] text-xs font-medium transition-all duration-300'
              : 'group w-9 h-9 rounded-full bg-white/5 hover:bg-[#D09A40] border border-white/10 hover:border-[#D09A40] flex items-center justify-center text-[#FAF5E5]/80 hover:text-[#0F172A] transition-all duration-300 hover:-translate-y-0.5 shadow-sm'
          }
        >
          <span className="transition-transform duration-300 group-hover:scale-110">
            {renderIcon(item.id)}
          </span>
          {showLabels && <span>{item.label}</span>}
        </a>
      ))}
    </div>
  );
};
