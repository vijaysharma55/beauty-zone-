import React, { useMemo, useState } from 'react';
import { BrandOverrideProvider } from '../../context/BrandContext';
import { DEMO_SALON_STAFF } from '../../data/demoStaffData';
import {
  salonGalleryToGalleryItems,
  salonServicesToServiceItems,
  salonToBrandConfig,
} from '../../lib/salonToBrandConfig';
import type { ServiceCategory, ServiceItem } from '../../types';
import type { Salon, SalonService, SalonStaff } from '../../types/auth';
import { Navbar } from '../Navbar';
import { Hero } from '../Hero';
import { TrustHighlightsBar } from '../TrustHighlightsBar';
import { ServicesSection } from '../ServicesSection';
import { RecommendedServicesSection } from '../RecommendedServicesSection';
import { BridalSpotlight } from '../BridalSpotlight';
import { GallerySection } from '../GallerySection';
import { BookingSection } from '../BookingSection';
import { BeautyRewardsSection } from '../BeautyRewardsSection';
import { DigitalGiftCardSection } from '../DigitalGiftCardSection';
import { StylistsSection } from '../StylistsSection';
import { FoundersNote } from '../FoundersNote';
import { TestimonialsSection } from '../TestimonialsSection';
import { SalonsLocations } from '../SalonsLocations';
import { FAQSection } from '../FAQSection';
import { Footer } from '../Footer';
import { FloatingActions } from '../FloatingActions';
import { MobileBottomDock } from '../MobileBottomDock';

const SECTION_ALIASES: Record<string, string> = { packages: 'bundles' };

/**
 * Unified Main Website renderer shared across:
 * - Main homepage (when signed in as a salon owner)
 * - Dashboard Website Preview (/dashboard/preview)
 * - Final Live Salon Website (/salon/:slug and tenant subdomains)
 *
 * Uses the exact same main website sections, styling, and booking experience,
 * hydrated directly with the salon's edited copy, theme, services, gallery,
 * timings, contact details, and staff.
 */
export const SalonSite: React.FC<{
  salon: Salon;
  services: SalonService[];
  staff: SalonStaff[];
  /**
   * Controls unpublished staff preview source:
   * - 'auto' | 'demo' (default when unpublished): displays clearly badged demo staff (`DEMO_SALON_STAFF`).
   * - 'real': displays only the salon's own draft staff without mixing demo records.
   * Published salons ALWAYS display only real active salon staff.
   */
  staffPreviewMode?: 'auto' | 'demo' | 'real';
  previewBanner?: React.ReactNode;
}> = ({ salon, services, staff, staffPreviewMode = 'auto', previewBanner }) => {
  const isWebsiteLive = Boolean(salon.published && !salon.suspended);

  // Never mix demo staff with real salon employee records.
  const displayStaff = useMemo<SalonStaff[]>(() => {
    const realActive = staff.filter((member) => member.active && !member.isDemo);
    if (isWebsiteLive) {
      return realActive;
    }
    if (staffPreviewMode === 'real') {
      return realActive;
    }
    return [...DEMO_SALON_STAFF];
  }, [staff, isWebsiteLive, staffPreviewMode]);

  const mappedServices = useMemo<ServiceItem[]>(
    () => salonServicesToServiceItems(services),
    [services]
  );

  const mappedGallery = useMemo(
    () => salonGalleryToGalleryItems(salon),
    [salon]
  );

  const mappedBrand = useMemo(() => {
    const config = salonToBrandConfig(salon, displayStaff);
    return {
      ...config,
      sections: {
        ...config.sections,
        showPackages: false,
        showReels: false,
      },
    };
  }, [salon, displayStaff]);

  const [preselectedServiceId, setPreselectedServiceId] = useState<string | null>(null);
  const [preselectedServiceTitle, setPreselectedServiceTitle] = useState<string | null>(null);
  const [preselectedLocationMode, setPreselectedLocationMode] = useState<'salon' | 'home' | null>(null);
  const [preselectedBranch, setPreselectedBranch] = useState<string | null>(null);
  const [preselectedStylistName, setPreselectedStylistName] = useState<string | null>(null);
  const [preselectedPromoCode, setPreselectedPromoCode] = useState<string | null>(null);
  const [, setPreselectedCategory] = useState<ServiceCategory | null>(null);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id) || document.getElementById(SECTION_ALIASES[id] || '');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectServiceFromList = (service: ServiceItem) => {
    setPreselectedServiceId(service.id);
    setPreselectedServiceTitle(service.title);
    scrollToSection('booking');
  };

  const handleSelectGalleryItemForBooking = (serviceName: string) => {
    setPreselectedServiceTitle(serviceName);
    scrollToSection('booking');
  };

  const handleHeroBookClick = () => {
    setPreselectedLocationMode('salon');
    scrollToSection('booking');
  };

  const handleHeroExploreClick = () => {
    scrollToSection('services');
  };

  const handleBridalBookConsultation = () => {
    const bridalService = mappedServices.find((s) => s.category === 'bridal') || mappedServices[0];
    if (bridalService) {
      setPreselectedServiceId(bridalService.id);
      setPreselectedServiceTitle(bridalService.title);
    }
    setPreselectedLocationMode('salon');
    scrollToSection('booking');
  };

  const handleBridalExploreCatalog = () => {
    setPreselectedCategory('bridal');
    scrollToSection('services');
  };

  const handleSelectBranchForBooking = (branchName: string) => {
    setPreselectedLocationMode(branchName === 'Home Service' ? 'home' : 'salon');
    if (branchName !== 'Home Service') {
      setPreselectedBranch(branchName);
    }
    scrollToSection('booking');
  };

  const handleSelectStylistForBooking = (stylistName: string, branchName: string) => {
    setPreselectedLocationMode('salon');
    setPreselectedStylistName(stylistName);
    setPreselectedBranch(branchName);
    scrollToSection('booking');
  };

  const handleApplyVoucherToBooking = (voucherCode: string) => {
    setPreselectedPromoCode(voucherCode);
    scrollToSection('booking');
  };

  return (
    <BrandOverrideProvider brand={mappedBrand} readOnly>
      <div
        className="min-h-screen w-full flex flex-col selection:bg-[#D09A40] selection:text-[#0F172A] pb-16 lg:pb-0"
        style={{
          backgroundColor: mappedBrand.theme.bgColor,
          color: mappedBrand.theme.primaryColor,
        }}
      >
        {previewBanner}

        {/* Sticky Navigation Header */}
        <Navbar onNavigate={scrollToSection} />

        {/* Main Content */}
        <main className="w-full flex-grow">
          {/* 1. Full Viewport Hero Section */}
          <Hero
            onBookClick={handleHeroBookClick}
            onExploreServices={handleHeroExploreClick}
          />

          {/* 1.5 Quick Trust & Value Bar */}
          {mappedBrand.sections.showTrustBar && <TrustHighlightsBar />}

          {/* 3. Services Catalog with Category Tabs */}
          {mappedBrand.sections.showServices && (
            <ServicesSection
              services={mappedServices}
              onSelectService={handleSelectServiceFromList}
            />
          )}

          {/* Recommended Services */}
          {mappedServices.length > 0 && (
            <RecommendedServicesSection
              services={mappedServices}
              onSelectService={handleSelectServiceFromList}
            />
          )}

          {/* 4. Bridal Studio Spotlight Banner */}
          {mappedBrand.sections.showBridalSpotlight && (
            <BridalSpotlight
              onBookBridalConsultation={handleBridalBookConsultation}
              onExploreBridalPackages={handleBridalExploreCatalog}
            />
          )}

          {/* 5. Lookbook Gallery */}
          {mappedBrand.sections.showGallery && (
            <GallerySection
              galleryItems={mappedGallery}
              videos={[]}
              onBookService={handleSelectGalleryItemForBooking}
            />
          )}

          {/* 6. Online Appointment Booking & Price Calculator */}
          {mappedBrand.sections.showBooking && (
            <BookingSection
              services={mappedServices}
              preselectedServiceId={preselectedServiceId}
              preselectedServiceTitle={preselectedServiceTitle}
              preselectedLocationMode={preselectedLocationMode}
              preselectedBranch={preselectedBranch}
              preselectedStylistName={preselectedStylistName}
              preselectedPromoCode={preselectedPromoCode}
              salonSlug={salon.slug}
              liveStaff={displayStaff}
              websitePublished={isWebsiteLive}
              staffPreviewMode={staffPreviewMode}
            />
          )}

          {/* 6.5 Loyalty & Rewards Club */}
          {mappedBrand.sections.showRewards && (
            <BeautyRewardsSection
              onBookWithReward={handleApplyVoucherToBooking}
              onBookAppointment={() => scrollToSection('booking')}
            />
          )}

          {/* 6.8 Instant Digital Gift Card Studio */}
          {mappedBrand.sections.showGiftCards && <DigitalGiftCardSection />}

          {/* 7. Meet Our Master Stylists & Artists */}
          {mappedBrand.sections.showStylists && (
            <StylistsSection
              onBookWithStylist={handleSelectStylistForBooking}
              galleryItems={mappedGallery}
              liveStaff={displayStaff}
              websitePublished={isWebsiteLive}
              staffPreviewMode={staffPreviewMode}
              salonSlug={salon.slug}
            />
          )}

          {/* 7.5 Founder's Note & Story */}
          {mappedBrand.sections.showFoundersNote && (
            <FoundersNote onBookBridalConsult={handleBridalBookConsultation} />
          )}

          {/* 8. Client Reviews & Testimonials */}
          {mappedBrand.sections.showTestimonials && <TestimonialsSection />}

          {/* 9. Salon Branches & Locations */}
          {mappedBrand.sections.showLocations && (
            <SalonsLocations onSelectBranchForBooking={handleSelectBranchForBooking} />
          )}

          {/* 10. Frequently Asked Questions */}
          {mappedBrand.sections.showFAQ && (
            <FAQSection onBookConsult={() => scrollToSection('booking')} />
          )}
        </main>

        {/* 11. Footer */}
        <Footer
          onNavigate={scrollToSection}
          onOpenInspector={() => {}}
          onOpenManagement={() => {}}
          popularServices={mappedServices.map((s) => s.title)}
          hideOwnerTools
        />

        {/* Floating WhatsApp Quick Action */}
        {mappedBrand.sections.showFloatingActions && <FloatingActions />}

        {/* Sticky Mobile Bottom Navigation Bar */}
        <MobileBottomDock
          onNavigate={scrollToSection}
          onOpenBooking={() => scrollToSection('booking')}
        />
      </div>
    </BrandOverrideProvider>
  );
};
