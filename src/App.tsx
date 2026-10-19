import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { TrustHighlightsBar } from './components/TrustHighlightsBar';
import { FeaturedReelsShowcase } from './components/FeaturedReelsShowcase';
import { ServicesSection } from './components/ServicesSection';
import { BundledServicesSection } from './components/BundledServicesSection';
import { BridalSpotlight } from './components/BridalSpotlight';
import { GallerySection } from './components/GallerySection';
import { BookingSection } from './components/BookingSection';
import { BeautyRewardsSection } from './components/BeautyRewardsSection';
import { DigitalGiftCardSection } from './components/DigitalGiftCardSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { StylistsSection } from './components/StylistsSection';
import { FoundersNote } from './components/FoundersNote';
import { SalonsLocations } from './components/SalonsLocations';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { FloatingActions } from './components/FloatingActions';
import { MobileBottomDock } from './components/MobileBottomDock';
import { DesignSystemInspector } from './components/DesignSystemInspector';
import { ManagementModal } from './components/ManagementModal';
import { WhiteLabelCustomizer } from './components/WhiteLabelCustomizer';
import { ServiceCategory, SalonPackage, GalleryItem, VideoItem, ServiceItem } from './types';
import { getStoredPackages, saveStoredPackages } from './data/packagesData';
import { getStoredGallery, saveStoredGallery } from './data/galleryData';
import { getStoredVideos, saveStoredVideos } from './data/videosData';
import { getStoredServices, saveStoredServices } from './data/servicesStore';
import { useBrand } from './context/BrandContext';

export function App() {
  const { brand, formatPrice } = useBrand();
  const [services, setServices] = useState<ServiceItem[]>(() => getStoredServices());
  const [packages, setPackages] = useState<SalonPackage[]>(() => getStoredPackages());
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() => getStoredGallery());
  const [videos, setVideos] = useState<VideoItem[]>(() => getStoredVideos());
  const [galleryView, setGalleryView] = useState<'photos' | 'videos'>('photos');

  const [preselectedServiceId, setPreselectedServiceId] = useState<string | null>(null);
  const [preselectedServiceTitle, setPreselectedServiceTitle] = useState<string | null>(null);
  const [preselectedLocationMode, setPreselectedLocationMode] = useState<'salon' | 'home' | null>(null);
  const [preselectedBranch, setPreselectedBranch] = useState<string | null>(null);
  const [preselectedStylistName, setPreselectedStylistName] = useState<string | null>(null);
  const [preselectedCategory, setPreselectedCategory] = useState<ServiceCategory | null>(null);
  const [preselectedPromoCode, setPreselectedPromoCode] = useState<string | null>(null);

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [managementInitialTab, setManagementInitialTab] = useState<'services' | 'packages' | 'gallery' | 'videos'>('packages');

  const handleUpdateServices = (updated: ServiceItem[]) => {
    setServices(updated);
    saveStoredServices(updated);
  };

  const handleUpdatePackages = (updated: SalonPackage[]) => {
    setPackages(updated);
    saveStoredPackages(updated);
  };

  const handleUpdateGallery = (updated: GalleryItem[]) => {
    setGalleryItems(updated);
    saveStoredGallery(updated);
  };

  const handleUpdateVideos = (updated: VideoItem[]) => {
    setVideos(updated);
    saveStoredVideos(updated);
  };

  const handleOpenManagement = (tab: 'services' | 'packages' | 'gallery' | 'videos' = 'packages') => {
    setManagementInitialTab(tab);
    setIsManagementOpen(true);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectServiceFromList = (service: ServiceItem) => {
    setPreselectedServiceId(service.id);
    setPreselectedServiceTitle(service.title);
    scrollToSection('booking');
  };

  const handleBookBundle = (bundleTitle: string, price: number) => {
    setPreselectedServiceTitle(`${bundleTitle} (Combo — ${formatPrice(price)})`);
    setPreselectedServiceId('b1');
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
    setPreselectedServiceId('b1');
    setPreselectedLocationMode('salon');
    scrollToSection('booking');
  };

  const handleBridalExploreCatalog = () => {
    setPreselectedCategory('bridal');
    scrollToSection('services');
  };

  const handleSelectBranchForBooking = (branchName: string) => {
    setPreselectedLocationMode('salon');
    setPreselectedBranch(branchName);
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
    <div className="min-h-screen flex flex-col bg-[#FAF5E5] text-[#0F172A] selection:bg-[#D09A40] selection:text-[#0F172A] pb-16 lg:pb-0">
      {/* Sticky Navigation Header */}
      <Navbar
        onNavigate={scrollToSection}
        onOpenInspector={() => setIsInspectorOpen(true)}
        onOpenManagement={() => handleOpenManagement('packages')}
      />

      {/* Main Content */}
      <main className="flex-grow">
        {/* 1. Full Viewport Hero Section */}
        <Hero
          onBookClick={handleHeroBookClick}
          onExploreServices={handleHeroExploreClick}
          onExplorePackages={() => scrollToSection('packages')}
        />

        {/* 1.5 Quick Trust & Value Bar */}
        {brand.sections.showTrustBar && <TrustHighlightsBar />}

        {/* 1.8 Featured Video Reels & Watch Showcase */}
        {brand.sections.showReels && (
          <FeaturedReelsShowcase
            videos={videos}
            onBookService={handleSelectGalleryItemForBooking}
            onExploreAllVideos={() => {
              setGalleryView('videos');
              scrollToSection('gallery');
            }}
            onOpenManagement={() => handleOpenManagement('videos')}
          />
        )}

        {/* 2. Curated Value Packages & Bundles */}
        {brand.sections.showPackages && (
          <BundledServicesSection
            packages={packages}
            onBookBundle={handleBookBundle}
            onOpenManagement={() => handleOpenManagement('packages')}
          />
        )}

        {/* 3. Services Catalog with Category Tabs */}
        {brand.sections.showServices && (
          <ServicesSection
            services={services}
            onSelectService={handleSelectServiceFromList}
          />
        )}

        {/* 4. Bridal Studio Spotlight Banner */}
        {brand.sections.showBridalSpotlight && (
          <BridalSpotlight
            onBookBridalConsultation={handleBridalBookConsultation}
            onExploreBridalPackages={handleBridalExploreCatalog}
          />
        )}

        {/* 5. Lookbook Gallery & Before/After Transformations */}
        {brand.sections.showGallery && (
          <GallerySection
            galleryItems={galleryItems}
            videos={videos}
            initialView={galleryView}
            onBookService={handleSelectGalleryItemForBooking}
            onOpenManagement={() => handleOpenManagement('gallery')}
          />
        )}

        {/* 6. Online Appointment Booking & Price Calculator */}
        {brand.sections.showBooking && (
          <BookingSection
            services={services}
            preselectedServiceId={preselectedServiceId}
            preselectedServiceTitle={preselectedServiceTitle}
            preselectedLocationMode={preselectedLocationMode}
            preselectedBranch={preselectedBranch}
            preselectedStylistName={preselectedStylistName}
            preselectedPromoCode={preselectedPromoCode}
          />
        )}

        {/* 6.5 Loyalty & Rewards Club */}
        {brand.sections.showRewards && (
          <BeautyRewardsSection
            onBookWithReward={handleApplyVoucherToBooking}
            onBookAppointment={() => scrollToSection('booking')}
          />
        )}

        {/* 6.8 Instant Digital Gift Card Studio */}
        {brand.sections.showGiftCards && <DigitalGiftCardSection />}

        {/* 7. Meet Our Master Stylists & Artists */}
        {brand.sections.showStylists && (
          <StylistsSection
            onBookWithStylist={handleSelectStylistForBooking}
          />
        )}

        {/* 7.5 Founder's Note & Story */}
        {brand.sections.showFoundersNote && (
          <FoundersNote
            onBookBridalConsult={handleBridalBookConsultation}
          />
        )}

        {/* 8. Client Reviews & Testimonials */}
        {brand.sections.showTestimonials && <TestimonialsSection />}

        {/* 9. Salon Branches & Locations */}
        {brand.sections.showLocations && (
          <SalonsLocations
            onSelectBranchForBooking={handleSelectBranchForBooking}
          />
        )}

        {/* 10. Frequently Asked Questions */}
        {brand.sections.showFAQ && (
          <FAQSection onBookConsult={() => scrollToSection('booking')} />
        )}
      </main>

      {/* 11. Footer */}
      <Footer
        onNavigate={scrollToSection}
        onOpenInspector={() => setIsInspectorOpen(true)}
        onOpenManagement={() => handleOpenManagement('packages')}
      />

      {/* Floating WhatsApp & White-Label Studio Quick Actions */}
      {brand.sections.showFloatingActions && (
        <FloatingActions onBookClick={() => scrollToSection('booking')} />
      )}

      {/* Sticky Mobile Bottom Navigation Bar */}
      <MobileBottomDock
        onNavigate={scrollToSection}
        onOpenBooking={() => scrollToSection('booking')}
      />

      {/* Interactive Design System Inspector Drawer */}
      <DesignSystemInspector
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />

      {/* Salon Management Console (Services, Packages, Gallery & Videos CRUD) */}
      <ManagementModal
        isOpen={isManagementOpen}
        onClose={() => setIsManagementOpen(false)}
        services={services}
        onUpdateServices={handleUpdateServices}
        packages={packages}
        onUpdatePackages={handleUpdatePackages}
        galleryItems={galleryItems}
        onUpdateGallery={handleUpdateGallery}
        videos={videos}
        onUpdateVideos={handleUpdateVideos}
        initialTab={managementInitialTab}
      />

      {/* White-Label Brand Studio Drawer */}
      <WhiteLabelCustomizer />
    </div>
  );
}

export default App;
