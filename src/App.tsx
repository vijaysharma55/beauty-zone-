import React, { useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
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
import { WhiteLabelCustomizer } from './components/WhiteLabelCustomizer';
import { ServiceCategory, SalonPackage, GalleryItem, VideoItem, ServiceItem } from './types';
import { getStoredPackages } from './data/packagesData';
import { getStoredGallery } from './data/galleryData';
import { getStoredVideos } from './data/videosData';
import { getStoredServices } from './data/servicesStore';
import { useBrand } from './context/BrandContext';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { OverviewPage } from './components/dashboard/OverviewPage';
import { OnboardingPage } from './components/dashboard/OnboardingPage';
import { WebsiteEditor } from './components/dashboard/WebsiteEditor';
import { ServicesPage } from './components/dashboard/ServicesPage';
import { StaffPage } from './components/dashboard/StaffPage';
import { BillingPage } from './components/dashboard/BillingPage';
import { AccountPage } from './components/dashboard/AccountPage';
import { PreviewPage } from './components/dashboard/PreviewPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminOverview } from './components/admin/AdminOverview';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminSalons } from './components/admin/AdminSalons';
import { AdminSubscriptions } from './components/admin/AdminSubscriptions';
import { AdminSettings } from './components/admin/AdminSettings';
import { PublicSalonPage } from './components/site/PublicSalonPage';
import { VerifyEmailPage } from './components/dashboard/VerifyEmailPage';
import { ApprovalPage } from './components/dashboard/ApprovalPage';
import { AdminApprovals } from './components/admin/AdminApprovals';
import { Button } from './components/ui';

function MarketingSite() {
  const { brand, formatPrice } = useBrand();
  const { user } = useAuth();
  const navigate = useNavigate();
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

  /**
   * Catalog management now lives in the authenticated owner dashboard.
   * Anonymous visitors are sent to sign in instead of seeing an editing console.
   */
  const handleOpenManagement = (tab: 'services' | 'packages' | 'gallery' | 'videos' = 'services') => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role === 'super_admin') {
      navigate('/admin/salons');
      return;
    }
    navigate(tab === 'gallery' ? '/dashboard/website' : tab === 'videos' ? '/dashboard/website' : '/dashboard/services');
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

      {/* White-Label Brand Studio Drawer */}
      <WhiteLabelCustomizer />
    </div>
  );
}

const NotFoundPage: React.FC = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF5E5] px-6 text-center">
    <p className="font-serif text-6xl font-bold text-[#D09A40]">404</p>
    <h1 className="mt-2 font-serif text-2xl font-bold text-slate-900">Page not found</h1>
    <p className="mt-2 max-w-md text-sm text-slate-600">
      The page you were looking for doesn't exist. If you're looking for a salon website, check the link shared by the
      salon owner.
    </p>
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      <Link to="/">
        <Button variant="primary">Back to BeautyZone</Button>
      </Link>
      <Link to="/login">
        <Button variant="secondary">Salon owner sign in</Button>
      </Link>
    </div>
  </div>
);

export function App() {
  return (
    <Routes>
      {/* Public marketing site (existing showcase, unchanged) */}
      <Route path="/" element={<MarketingSite />} />

      {/* Authentication */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Salon owner dashboard — protected, salon-owner role only */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute role="salon_owner">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="website" element={<WebsiteEditor />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="approval" element={<ApprovalPage />} />
        <Route path="preview" element={<PreviewPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="account" element={<AccountPage />} />
      </Route>

      {/* Super admin console — protected, super-admin role only */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="super_admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="approvals" element={<AdminApprovals />} />
        <Route path="salons" element={<AdminSalons />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Public, unauthenticated salon websites with unique URLs */}
      <Route path="/salon/:slug" element={<PublicSalonPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
