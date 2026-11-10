import React, { useCallback, useMemo, useState } from 'react';
import CardNavSource from './reactbits/CardNav';
import { BrandEmblemIcon } from './BrandEmblemIcon';
import { useBrand } from '../context/BrandContext';
import { SUPPORTED_LANGUAGES } from '../data/i18nData';
import type { SupportedLanguage } from '../types';
import './Navbar.css';

/**
 * Customer-facing header only. Owner/admin entry points (login, catalog admin,
 * brand studio, design tokens) live in the footer's discreet "Owner tools" row.
 *
 * The bar itself is the React Bits <CardNav /> component: a floating glass pill
 * with the brand emblem, a card mega-menu and the primary booking CTA. Every
 * in-page destination is a button link (no URL hash), so the smooth-scroll
 * offset of the floating bar stays under our control.
 */
interface NavbarProps {
  onNavigate: (sectionId: string) => void;
}

/**
 * CardNav ships as plain JavaScript, so its prop types are inferred from the
 * default `DEFAULT_ITEMS` array. Declaring the contract here keeps the site
 * navigation fully typed while still consuming the unmodified React Bits
 * component (in-page `section` links instead of hrefs, plus locale entries).
 */
interface CardNavLink {
  label: string;
  href?: string;
  ariaLabel?: string;
  section?: string;
  locale?: SupportedLanguage;
}

interface CardNavCard {
  label: string;
  description?: string;
  bgColor?: string;
  textColor?: string;
  links: CardNavLink[];
}

interface CardNavProps {
  logo?: React.ReactNode;
  logoAlt?: string;
  logoHref?: string;
  items: CardNavCard[];
  cta?: { label: string; href?: string; onClick?: (event: React.MouseEvent) => void };
  theme?: 'dark' | 'light';
  surface?: 'glass' | 'solid';
  openOn?: 'click' | 'hover';
  cardEffect?: 'rise' | 'unfold' | 'fade';
  stagger?: number;
  bounce?: number;
  speed?: number;
  cardHeight?: number;
  maxWidth?: number;
  accentColor?: string;
  menuLabel?: boolean;
  intro?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  linkComponent?: React.ElementType;
  onLinkClick?: (link: CardNavLink, item: CardNavCard, event: React.MouseEvent) => void;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

const CardNav = CardNavSource as unknown as React.ComponentType<CardNavProps>;

const toRgba = (hex: string, alpha: number, fallback: string) => {
  const value = String(hex || '').replace('#', '').trim();
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) return fallback;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { brand, t, language, setLanguage } = useBrand();

  const primary = brand.theme?.primaryColor || '#0F172A';
  const accent = brand.theme?.accentColor || '#D09A40';

  const enabledLanguages = useMemo(() => {
    const codes =
      brand.localization?.enabledLanguages?.length > 0
        ? brand.localization.enabledLanguages
        : (['en'] as SupportedLanguage[]);
    return SUPPORTED_LANGUAGES.filter((option) => codes.includes(option.code));
  }, [brand.localization?.enabledLanguages]);

  const [menuOpen, setMenuOpen] = useState(false);

  // `onNavigate` owns the id mapping (e.g. "packages" → the rendered "bundles").
  const go = useCallback(
    (id?: string) => {
      if (id) onNavigate(id);
    },
    [onNavigate]
  );

  const items = useMemo<CardNavCard[]>(() => {
    const cards: CardNavCard[] = [];

    if (brand.sections.showServices || brand.sections.showPackages) {
      cards.push({
        label: t('navServices'),
        description: t('navCardServicesDesc'),
        links: [
          brand.sections.showServices && {
            label: t('navServices'),
            section: 'services',
          },
          brand.sections.showPackages && {
            label: t('navPackages'),
            section: 'packages',
          },
          brand.sections.showReels && {
            label: t('navReels'),
            section: 'featured-reels',
          },
          brand.sections.showGiftCards && {
            label: t('navGiftCards'),
            section: 'gift-cards',
          },
        ].filter(Boolean) as CardNavLink[],
      });
    }

    if (brand.sections.showBridalSpotlight || brand.sections.showGallery) {
      cards.push({
        label: t('navBridal'),
        description: t('navCardBridalDesc'),
        links: [
          brand.sections.showBridalSpotlight && {
            label: t('navBridal'),
            section: 'bridal',
          },
          brand.sections.showGallery && {
            label: t('navGallery'),
            section: 'gallery',
          },
          brand.sections.showStylists && {
            label: t('stylistsOverline'),
            section: 'stylists',
          },
          brand.sections.showTestimonials && {
            label: t('testimonialsOverline'),
            section: 'testimonials',
          },
        ].filter(Boolean) as CardNavLink[],
      });
    }

    const contactLinks: CardNavLink[] = [
      brand.sections.showLocations && {
        label: t('navLocations'),
        section: 'locations',
      },
      {
        label: brand.phoneDisplay,
        href: `tel:+${brand.phoneRaw}`,
        ariaLabel: `${t('navHomeServiceAvailable')} — ${brand.phoneDisplay}`,
      },
      {
        label: 'WhatsApp',
        href: `https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent(
          `Namaste ${brand.brandName} (${brand.cityName}), I would like to book an appointment.`
        )}`,
        ariaLabel: `WhatsApp ${brand.brandName}`,
      },
      {
        label: brand.email,
        href: `mailto:${brand.email}`,
        ariaLabel: `${brand.brandName} ${brand.email}`,
      },
      brand.sections.showFAQ && {
        label: t('faqOverline'),
        section: 'faq',
      },
    ].filter(Boolean) as CardNavLink[];

    if (contactLinks.length > 0) {
      cards.push({
        label: t('navLocations'),
        description: t('navCardVisitDesc'),
        links: contactLinks,
      });
    }

    if (enabledLanguages.length > 1 && brand.localization?.showLanguageSwitcher !== false) {
      cards.push({
        label: t('navLanguage'),
        description: t('navCardLanguageDesc'),
        links: enabledLanguages.map((option) => ({
          label: option.code === language ? `✓ ${option.nativeName}` : option.nativeName,
          ariaLabel:
            option.code === language
              ? `${option.name} (${t('navLanguageCurrent')})`
              : option.name,
          locale: option.code,
        })),
      });
    }

    return cards.length > 0
      ? cards
      : [
          {
            label: t('navServices'),
            links: [{ label: t('navServices'), section: 'services' }],
          },
        ];
  }, [brand, enabledLanguages, language, t]);

  const handleLinkClick = useCallback(
    (link: CardNavLink) => {
      setMenuOpen(false);
      if (link.locale) {
        setLanguage(link.locale);
        return;
      }
      go(link.section);
    },
    [go, setLanguage]
  );

  const handleBooking = useCallback(() => {
    setMenuOpen(false);
    go('booking');
  }, [go]);

  // CardNav anchors its logo with `logoHref`; intercepting the click in the
  // capture phase keeps the visitor on the page (smooth scroll to the top)
  // instead of pushing a stray "#" onto this hash-free marketing URL.
  const handleShellClickCapture = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.card-nav__logo')) return;
    event.preventDefault();
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const logo = (
    <span className="bz-nav__brand">
      <span className="bz-nav__emblem" aria-hidden="true">
        {brand.logoUrl ? (
          <img src={brand.logoUrl} alt="" className="bz-nav__emblem-img" />
        ) : (
          <BrandEmblemIcon icon={brand.logoIcon} className="bz-nav__emblem-icon" />
        )}
      </span>
      <span className="bz-nav__wordmark">
        <span className="bz-nav__name">{brand.brandName.toUpperCase()}</span>
        <span className="bz-nav__subtext">{brand.brandSubtext}</span>
      </span>
    </span>
  );

  return (
    <header className="bz-nav" data-brand-header>
      <div className="bz-nav__shell" onClickCapture={handleShellClickCapture}>
        <CardNav
          logo={logo}
          logoAlt={brand.brandName}
          logoHref="#"
          items={items}
          cta={{ label: t('navBookAppointment'), onClick: handleBooking }}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          theme="dark"
          surface="glass"
          openOn="click"
          cardEffect="rise"
          cardHeight={188}
          maxWidth={1120}
          accentColor={accent}
          ariaLabel={`${brand.brandName} main navigation`}
          stagger={0.1}
          bounce={0.22}
          onLinkClick={handleLinkClick}
          style={{
            '--cn-panel': toRgba(primary, 0.82, 'rgba(15, 23, 42, 0.82)'),
            '--cn-solid': primary,
            '--cn-tile': `linear-gradient(180deg, ${toRgba(primary, 0.92, primary)} 0%, ${primary} 100%)`,
            '--cn-logo': '30px',
          } as React.CSSProperties}
        />
      </div>
    </header>
  );
};

export default Navbar;
