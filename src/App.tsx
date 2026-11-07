import React, { useCallback, useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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
import { RecommendedServicesSection } from './components/RecommendedServicesSection';
import { FoundersNote } from './components/FoundersNote';
import { SalonsLocations } from './components/SalonsLocations';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { FloatingActions } from './components/FloatingActions';
import { MobileBottomDock } from './components/MobileBottomDock';
import { ServiceCategory, SalonPackage, GalleryItem, VideoItem, ServiceItem } from './types';
import { getStoredPackages, mergeNewPackagesOnce, saveStoredPackages } from './data/packagesData';
import { getStoredGallery, saveStoredGallery } from './data/galleryData';
import { getStoredVideos, saveStoredVideos } from './data/videosData';
import { getStoredServices, saveStoredServices } from './data/servicesStore';
import { loadSiteSection, saveSiteSection } from './lib/sectionStore';
import { useBrand } from './context/BrandContext';
import { useAuth } from './context/AuthContext';
import { api, ApiError } from './lib/api';
import type { PublicSalonResponse, SalonStaff } from './types/auth';
import { Button } from './components/ui';
import { SubdomainAwareHome } from './components/site/SubdomainResolver';
import { PUBLIC_PATHS } from './publicPaths';
import { homeStructuredData, SITE_ORIGIN } from './homeMetadata';


const LoginPage = React.lazy(() => import('./components/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = React.lazy(() => import('./components/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = React.lazy(() => import('./components/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('./components/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));
const ProtectedRoute = React.lazy(() => import('./components/auth/ProtectedRoute').then((module) => ({ default: module.ProtectedRoute })));

const DashboardLayout = React.lazy(() => import('./components/dashboard/DashboardLayout').then((module) => ({ default: module.DashboardLayout })));
const OverviewPage = React.lazy(() => import('./components/dashboard/OverviewPage').then((module) => ({ default: module.OverviewPage })));
const OnboardingPage = React.lazy(() => import('./components/dashboard/OnboardingPage').then((module) => ({ default: module.OnboardingPage })));
const WebsiteEditor = React.lazy(() => import('./components/dashboard/WebsiteEditor').then((module) => ({ default: module.WebsiteEditor })));
const ServicesPage = React.lazy(() => import('./components/dashboard/ServicesPage').then((module) => ({ default: module.ServicesPage })));
const StaffPage = React.lazy(() => import('./components/dashboard/StaffPage').then((module) => ({ default: module.StaffPage })));
const BillingPage = React.lazy(() => import('./components/dashboard/BillingPage').then((module) => ({ default: module.BillingPage })));
const PaymentSettingsPage = React.lazy(() => import('./components/dashboard/PaymentSettingsPage').then((module) => ({ default: module.PaymentSettingsPage })));
const MyPaymentsPage = React.lazy(() => import('./components/dashboard/MyPaymentsPage').then((module) => ({ default: module.MyPaymentsPage })));
const BookingsPage = React.lazy(() => import('./components/dashboard/BookingsPage').then((module) => ({ default: module.BookingsPage })));
const AnalyticsPage = React.lazy(() => import('./components/dashboard/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const AccountPage = React.lazy(() => import('./components/dashboard/AccountPage').then((module) => ({ default: module.AccountPage })));
const PreviewPage = React.lazy(() => import('./components/dashboard/PreviewPage').then((module) => ({ default: module.PreviewPage })));
const VerifyEmailPage = React.lazy(() => import('./components/dashboard/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage })));
const ApprovalPage = React.lazy(() => import('./components/dashboard/ApprovalPage').then((module) => ({ default: module.ApprovalPage })));

const AdminLayout = React.lazy(() => import('./components/admin/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const AdminOverview = React.lazy(() => import('./components/admin/AdminOverview').then((module) => ({ default: module.AdminOverview })));
const AdminUsers = React.lazy(() => import('./components/admin/AdminUsers').then((module) => ({ default: module.AdminUsers })));
const AdminSalons = React.lazy(() => import('./components/admin/AdminSalons').then((module) => ({ default: module.AdminSalons })));
const AdminSubscriptions = React.lazy(() => import('./components/admin/AdminSubscriptions').then((module) => ({ default: module.AdminSubscriptions })));
const AdminSettings = React.lazy(() => import('./components/admin/AdminSettings').then((module) => ({ default: module.AdminSettings })));
const AdminPayments = React.lazy(() => import('./components/admin/AdminPayments').then((module) => ({ default: module.AdminPayments })));
const AdminApprovals = React.lazy(() => import('./components/admin/AdminApprovals').then((module) => ({ default: module.AdminApprovals })));

const PublicSalonPage = React.lazy(() => import('./components/site/PublicSalonPage').then((module) => ({ default: module.PublicSalonPage })));
const SalonDirectoryPage = React.lazy(() => import('./components/site/SalonDirectoryPage').then((module) => ({ default: module.SalonDirectoryPage })));

const NexoraSalonOSPage = React.lazy(() => import('./components/nexora-salonos/NexoraSalonOSPage').then((module) => ({ default: module.NexoraSalonOSPage })));

const CustomerPanel = React.lazy(() => import('./components/customer/CustomerPanel').then((module) => ({ default: module.CustomerPanel })));
const ReceiptPage = React.lazy(() => import('./components/customer/ReceiptPage').then((module) => ({ default: module.ReceiptPage })));

const BrandingModal = React.lazy(() => import('./components/BrandingModal').then((module) => ({ default: module.BrandingModal })));
const DesignSystemInspector = React.lazy(() => import('./components/DesignSystemInspector').then((module) => ({ default: module.DesignSystemInspector })));
const WhiteLabelCustomizer = React.lazy(() => import('./components/WhiteLabelCustomizer').then((module) => ({ default: module.WhiteLabelCustomizer })));

function MarketingSite() {
  const { brand, formatPrice, isCustomizerOpen } = useBrand();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceItem[]>(() => getStoredServices());
  const [packages, setPackages] = useState<SalonPackage[]>(() => getStoredPackages());
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() => getStoredGallery());
  const [videos, setVideos] = useState<VideoItem[]>(() => getStoredVideos());
  const [liveStaff, setLiveStaff] = useState<SalonStaff[] | null>(null);
  const [flagshipPublished, setFlagshipPublished] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PublicSalonResponse>('/public/salons/lumina-luxe')
      .then((res) => {
        if (cancelled) return;
        setLiveStaff(res.staff);
        setFlagshipPublished(Boolean(res.salon?.published && !res.salon?.suspended));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setFlagshipPublished(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);
  // Pull the signed-in owner's published content from Supabase; localStorage remains a fallback cache.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [cloudServices, cloudPackages, cloudGallery, cloudVideos] = await Promise.all([
          loadSiteSection<ServiceItem[]>('services'),
          loadSiteSection<SalonPackage[]>('packages'),
          loadSiteSection<GalleryItem[]>('gallery'),
          loadSiteSection<VideoItem[]>('videos'),
        ]);
        if (cancelled) return;
        if (cloudServices) { setServices(cloudServices); saveStoredServices(cloudServices); }
        const packageSource = cloudPackages || packages;
        const packageMigration = mergeNewPackagesOnce(
          packageSource,
          user?.id ? `owner-${user.id}` : 'public'
        );
        const currentPackages = packageMigration.packages;
        if (cloudPackages || packageMigration.added) {
          setPackages(currentPackages);
          saveStoredPackages(currentPackages);
        }
        if (cloudPackages && user?.id && packageMigration.added) {
          await saveSiteSection('packages', currentPackages);
        }
        if (cloudGallery) { setGalleryItems(cloudGallery); saveStoredGallery(cloudGallery); }
        if (cloudVideos) { setVideos(cloudVideos); saveStoredVideos(cloudVideos); }
        // First signed-in visit: copy the existing local cache into that owner's cloud section.
        if (user?.id) {
          const firstSyncs: Promise<void>[] = [];
          if (!cloudServices) firstSyncs.push(saveSiteSection('services', services));
          if (!cloudPackages) firstSyncs.push(saveSiteSection('packages', currentPackages));
          if (!cloudGallery) firstSyncs.push(saveSiteSection('gallery', galleryItems));
          if (!cloudVideos) firstSyncs.push(saveSiteSection('videos', videos));
          await Promise.all(firstSyncs);
        }
      } catch (error) {
        console.error('[site-content] Supabase read failed; using cached content:', error);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const [galleryView, setGalleryView] = useState<'photos' | 'videos'>('photos');

  const [preselectedServiceId, setPreselectedServiceId] = useState<string | null>(null);
  const [preselectedServiceTitle, setPreselectedServiceTitle] = useState<string | null>(null);
  const [preselectedLocationMode, setPreselectedLocationMode] = useState<'salon' | 'home' | null>(null);
  const [preselectedBranch, setPreselectedBranch] = useState<string | null>(null);
  const [preselectedStylistName, setPreselectedStylistName] = useState<string | null>(null);
  const [preselectedCategory, setPreselectedCategory] = useState<ServiceCategory | null>(null);
  const [preselectedPromoCode, setPreselectedPromoCode] = useState<string | null>(null);

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [hasOpenedInspector, setHasOpenedInspector] = useState(false);
  const [hasOpenedBrandingModal, setHasOpenedBrandingModal] = useState(false);
  const [hasOpenedCustomizer, setHasOpenedCustomizer] = useState(false);

  useEffect(() => {
    if (isCustomizerOpen) setHasOpenedCustomizer(true);
  }, [isCustomizerOpen]);

  // Inline CRUD handlers used by the section cards. State updates stay in sync
  // with localStorage so edits survive reloads and route changes.
  const handleUpdateServices = useCallback((next: ServiceItem[]) => {
    setServices(next);
    saveStoredServices(next);
    void saveSiteSection('services', next).catch((error) => console.error('[site-content] Services save failed:', error));
  }, []);

  const handleUpdatePackages = useCallback((next: SalonPackage[]) => {
    setPackages(next);
    saveStoredPackages(next);
    void saveSiteSection('packages', next).catch((error) => console.error('[site-content] Packages save failed:', error));
  }, []);

  const handleUpdateGallery = useCallback((next: GalleryItem[]) => {
    setGalleryItems(next);
    saveStoredGallery(next);
    void saveSiteSection('gallery', next).catch((error) => console.error('[site-content] Gallery save failed:', error));
  }, []);

  const handleUpdateVideos = useCallback((next: VideoItem[]) => {
    setVideos(next);
    saveStoredVideos(next);
    void saveSiteSection('videos', next).catch((error) => console.error('[site-content] Video save failed:', error));
  }, []);

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
    <div className="min-h-screen w-full flex flex-col bg-[#FAF5E5] text-[#0F172A] selection:bg-[#D09A40] selection:text-[#0F172A] pb-16 lg:pb-0">
      {/* Sticky Navigation Header */}
      <Navbar onNavigate={scrollToSection} />

      {/* Main Content */}
      <main className="w-full flex-grow">
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
            onUpdateVideos={handleUpdateVideos}
          />
        )}

        {/* 2. Curated Value Packages & Bundles */}
        {brand.sections.showPackages && (
          <BundledServicesSection
            packages={packages}
            onBookBundle={handleBookBundle}
            onOpenManagement={() => handleOpenManagement('packages')}
            onUpdatePackages={handleUpdatePackages}
          />
        )}

        {/* 3. Services Catalog with Category Tabs */}
        {brand.sections.showServices && (
          <ServicesSection
            services={services}
            onSelectService={handleSelectServiceFromList}
            onUpdateServices={handleUpdateServices}
          />
        )}

        {/* AI-Powered Recommendations */}
        <RecommendedServicesSection
          services={services}
          onSelectService={handleSelectServiceFromList}
        />

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
            onUpdateGallery={handleUpdateGallery}
            onUpdateVideos={handleUpdateVideos}
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
            salonSlug="lumina-luxe"
            liveStaff={liveStaff}
            websitePublished={flagshipPublished}
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
            galleryItems={galleryItems}
            onUpdateGallery={handleUpdateGallery}
            liveStaff={liveStaff}
            websitePublished={flagshipPublished}
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
        onOpenInspector={() => { setHasOpenedInspector(true); setIsInspectorOpen(true); }}
        onOpenManagement={() => handleOpenManagement('packages')}
      />

      {/* Floating WhatsApp & White-Label Studio Quick Actions */}
      {brand.sections.showFloatingActions && (
        <FloatingActions onOpenBranding={() => { setHasOpenedBrandingModal(true); setIsBrandingModalOpen(true); }} />
      )}

      {/* Sticky Mobile Bottom Navigation Bar */}
      <MobileBottomDock
        onNavigate={scrollToSection}
        onOpenBooking={() => scrollToSection('booking')}
      />

      {/* Interactive Design System Inspector Drawer — loaded on first open */}
      {hasOpenedInspector && (
        <React.Suspense fallback={null}>
          <DesignSystemInspector
            isOpen={isInspectorOpen}
            onClose={() => setIsInspectorOpen(false)}
          />
        </React.Suspense>
      )}

      {/* Branding Management Modal — loaded on first open */}
      {hasOpenedBrandingModal && (
        <React.Suspense fallback={null}>
          <BrandingModal
            isOpen={isBrandingModalOpen}
            onClose={() => setIsBrandingModalOpen(false)}
          />
        </React.Suspense>
      )}

      {/* White-Label Brand Studio Drawer — loaded on first open */}
      {hasOpenedCustomizer && (
        <React.Suspense fallback={null}>
          <WhiteLabelCustomizer />
        </React.Suspense>
      )}
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

function RouteIndexingPolicy() {
  const { pathname } = useLocation();
  useEffect(() => {
    const privatePaths = new Set([
      PUBLIC_PATHS.login,
      PUBLIC_PATHS.register,
      PUBLIC_PATHS.forgotPassword,
      PUBLIC_PATHS.resetPassword,
      PUBLIC_PATHS.verifyEmail,
      '/my-appointments',
    ]);
    const isPrivate = privatePaths.has(pathname)
      || pathname === '/dashboard'
      || pathname.startsWith('/dashboard/')
      || pathname === '/admin'
      || pathname.startsWith('/admin/');
    const isPublicIndexable = pathname === PUBLIC_PATHS.home
      || pathname === PUBLIC_PATHS.salons
      || /^\/salon\/[a-z0-9-]+$/i.test(pathname);

    let robots = document.getElementById('route-robots-policy') as HTMLMetaElement | null;
    if (isPrivate || !isPublicIndexable) {
      if (!robots) {
        robots = document.createElement('meta') as HTMLMetaElement;
        robots.id = 'route-robots-policy';
        robots.name = 'robots';
        document.head.appendChild(robots);
      }
      robots.content = 'noindex,nofollow,noarchive';
    } else if (robots) {
      robots.remove();
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    const socialUrl = document.querySelector('meta[property="og:url"]');
    if (isPrivate || !isPublicIndexable) {
      canonical?.remove();
      socialUrl?.remove();
    } else {
      const url = new URL(pathname, SITE_ORIGIN);
      if (canonical) canonical.setAttribute('href', url.href);
      else {
        const link = document.createElement('link');
        link.rel = 'canonical';
        link.href = url.href;
        document.head.appendChild(link);
      }
      if (socialUrl) socialUrl.setAttribute('content', url.href);
      else {
        const meta = document.createElement('meta');
        meta.setAttribute('property', 'og:url');
        meta.content = url.href;
        document.head.appendChild(meta);
      }
    }
  }, [pathname]);
  return null;
}

function HomeMetadata() {
  const { pathname } = useLocation();
  const { brand } = useBrand();
  useEffect(() => {
    const urlTag = document.querySelector('meta[property="og:url"]');
    const schemaTag = document.getElementById('home-structured-data');
    if (pathname !== PUBLIC_PATHS.home) {
      urlTag?.remove();
      schemaTag?.remove();
      return;
    }
    if (!urlTag) {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:url');
      meta.content = `${SITE_ORIGIN}/`;
      document.head.appendChild(meta);
    }
    const script = schemaTag || document.createElement('script');
    script.id = 'home-structured-data';
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(homeStructuredData(brand));
    if (!schemaTag) document.head.appendChild(script);
  }, [pathname, brand]);
  return null;
}

export function App() {
  return (
    <>
    <HomeMetadata />
    <RouteIndexingPolicy />
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FAF5E5] text-sm text-slate-600">Loading page…</div>}>
    <Routes>
      {/* Public marketing site — subdomain-aware: tenant subdomains render the salon site */}
      <Route path={PUBLIC_PATHS.home} element={<SubdomainAwareHome><MarketingSite /></SubdomainAwareHome>} />

      {/* Authentication */}
      <Route path={PUBLIC_PATHS.login} element={<LoginPage />} />
      <Route path={PUBLIC_PATHS.register} element={<RegisterPage />} />
      <Route path={PUBLIC_PATHS.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={PUBLIC_PATHS.resetPassword} element={<ResetPasswordPage />} />
      <Route path={PUBLIC_PATHS.verifyEmail} element={<VerifyEmailPage />} />

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
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="payments" element={<MyPaymentsPage />} />
        <Route path="settings/payments" element={<PaymentSettingsPage />} />
        <Route path="payment-settings" element={<PaymentSettingsPage />} />
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
        <Route path="payments" element={<AdminPayments />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Public salon directory and search with city filtering */}
      <Route path={PUBLIC_PATHS.salons} element={<SalonDirectoryPage />} />

      {/* Customer area (phone-OTP sign-in) with appointment history. Not in PUBLIC_PATHS: private, noindex. */}
      <Route path="/my-appointments" element={<CustomerPanel />} />
      <Route path="/receipt/:bookingId" element={<ReceiptPage />} />

      {/* Public, unauthenticated salon websites with unique URLs */}
      <Route path="/salon/:slug" element={<PublicSalonPage />} />

      {/* Nexora SalonOS sales landing page (noindex by default; see RouteIndexingPolicy) */}
      <Route path="/nexora-salonos" element={<NexoraSalonOSPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </React.Suspense>
    </>
  );
}

export default App;
