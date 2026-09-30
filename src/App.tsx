import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { TrustHighlightsBar } from './components/TrustHighlightsBar';
import { FeaturedReelsShowcase } from './components/FeaturedReelsShowcase';
import { BundledServicesSection } from './components/BundledServicesSection';
import { ServicesSection } from './components/ServicesSection';
import { BridalSpotlight } from './components/BridalSpotlight';
import { BookingSection } from './components/BookingSection';
import { GallerySection } from './components/GallerySection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { StylistsSection } from './components/StylistsSection';
import { FoundersNote } from './components/FoundersNote';
import { SalonsLocations } from './components/SalonsLocations';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { ManagementModal } from './components/ManagementModal';
import { ServiceItem, Stylist, SalonPackage, GalleryItem, VideoItem } from './types';
import { getStoredPackages, saveStoredPackages } from './data/packagesData';
import { getStoredGallery, saveStoredGallery } from './data/galleryData';
import { getStoredServices, saveStoredServices } from './data/servicesStore';
import { getStoredVideos, saveStoredVideos } from './data/videosData';
import { Sparkles, SlidersHorizontal } from 'lucide-react';

export default function App() {
  const [isTokensInspectorOpen, setIsTokensInspectorOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [managementInitialTab, setManagementInitialTab] = useState<'services' | 'packages' | 'gallery' | 'videos'>('services');

  // Module: Live Services Store
  const [services, setServices] = useState<ServiceItem[]>(() => getStoredServices());

  // Module 31: Package Management Store
  const [packages, setPackages] = useState<SalonPackage[]>(() => getStoredPackages());

  // Module 32: Gallery Management Store
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() => getStoredGallery());

  // Module: Video & Reels Store
  const [videos, setVideos] = useState<VideoItem[]>(() => getStoredVideos());
  const [galleryView, setGalleryView] = useState<'photos' | 'videos'>('photos');

  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<{
    title: string;
    price: number;
    services: string[];
  } | null>(null);
  const [selectedStylist, setSelectedStylist] = useState<string | null>(null);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectServiceFromList = (service: ServiceItem) => {
    setSelectedService(service);
    setSelectedBundle(null);
    scrollToSection('booking');
  };

  const handleBookBundle = (bundleTitle: string, price: number, servicesList: string[]) => {
    setSelectedBundle({ title: bundleTitle, price, services: servicesList });
    setSelectedService(null);
    scrollToSection('booking');
  };

  const handleBookWithStylist = (stylist: Stylist) => {
    setSelectedStylist(stylist.name);
    scrollToSection('booking');
  };

  const handleBookFromHero = () => {
    scrollToSection('booking');
  };

  const handleExploreBridal = () => {
    scrollToSection('bridal');
  };

  const handleBookFromGallery = (serviceName: string) => {
    const matched = services.find(
      (s) => s.title.toLowerCase().includes(serviceName.toLowerCase()) || 
             serviceName.toLowerCase().includes(s.title.toLowerCase())
    );
    if (matched) {
      setSelectedService(matched);
      setSelectedBundle(null);
    } else {
      setSelectedService({
        id: `custom-${Date.now()}`,
        title: serviceName,
        category: 'bridal',
        price: 9999,
        duration: '180 mins',
        description: `Custom makeover look based on our Real Photos Gallery: ${serviceName}`,
        highlights: ['Custom Look Recreation', 'Senior Bridal Artist', 'Free Shade & Foundation Match'],
      });
      setSelectedBundle(null);
    }
    scrollToSection('booking');
  };

  const handleOpenManagement = (tab: 'services' | 'packages' | 'gallery' = 'services') => {
    setManagementInitialTab(tab);
    setIsManagementModalOpen(true);
  };

  const handleUpdateServices = (updatedServices: ServiceItem[]) => {
    setServices(updatedServices);
    saveStoredServices(updatedServices);
  };

  const handleUpdatePackages = (updatedPackages: SalonPackage[]) => {
    setPackages(updatedPackages);
    saveStoredPackages(updatedPackages);
  };

  const handleUpdateGallery = (updatedGallery: GalleryItem[]) => {
    setGalleryItems(updatedGallery);
    saveStoredGallery(updatedGallery);
  };

  const handleUpdateVideos = (updatedVideos: VideoItem[]) => {
    setVideos(updatedVideos);
    saveStoredVideos(updatedVideos);
  };

  return (
    <div className="min-h-screen bg-[#FAF5E5] text-[#0F172A] selection:bg-[#D09A40] selection:text-white">
      {/* Top Bar Navigation */}
      <Navbar
        onOpenBooking={() => scrollToSection('booking')}
        onOpenManagement={() => handleOpenManagement('services')}
        onToggleTokens={() => setIsTokensInspectorOpen((prev) => !prev)}
        isTokensOpen={isTokensInspectorOpen}
      />

      <main>
        {/* ========================================================
            1. HERO BANNER & BOOKING ACTION (TOP SECTION)
        ======================================================== */}
        <Hero
          onBookClick={handleBookFromHero}
          onExploreBridal={handleExploreBridal}
        />

        {/* ========================================================
            2. TRUST BAR / HIGHLIGHTS STRIP
        ======================================================== */}
        <TrustHighlightsBar />

        {/* ========================================================
            3. TRENDING REELS & CLIENT TRANSFORMATIONS (FEATURED VIDEOS)
        ======================================================== */}
        <FeaturedReelsShowcase
          videos={videos}
          onBookService={handleBookFromGallery}
          onExploreAllVideos={() => {
            setGalleryView('videos');
            scrollToSection('gallery');
          }}
          onOpenManagement={() => handleOpenManagement('gallery')}
        />

        {/* ========================================================
            4. FESTIVAL OFFERS & COMBO PACKAGES BANNER
        ======================================================== */}
        <BundledServicesSection
          packages={packages}
          onBookBundle={handleBookBundle}
          onOpenManagement={() => handleOpenManagement('packages')}
        />

        {/* ========================================================
            5. POPULAR SALON SERVICES & CATEGORIES (RATE CARD)
        ======================================================== */}
        <ServicesSection 
          services={services}
          onSelectService={handleSelectServiceFromList} 
        />

        {/* Bridal Spotlight Showcase (Anchored to #bridal) */}
        <BridalSpotlight onBookBridal={() => {
          setSelectedService({
            id: 'b1',
            title: 'Royal Rajasthani HD Bridal Makeover',
            category: 'bridal',
            price: 24999,
            duration: '210 mins',
            description: '',
            highlights: [],
          });
          setSelectedBundle(null);
          scrollToSection('booking');
        }} />

        {/* ========================================================
            6. INTERACTIVE PRICE ESTIMATOR / BUDGET CALCULATOR & BOOKING
        ======================================================== */}
        <BookingSection
          selectedServicePreload={selectedService}
          selectedBundlePreload={selectedBundle}
          selectedStylistPreload={selectedStylist}
          onClearPreload={() => setSelectedService(null)}
          onClearBundle={() => setSelectedBundle(null)}
          onClearStylist={() => setSelectedStylist(null)}
        />

        {/* ========================================================
            7. TRANSFORMATION GALLERY (BEFORE & AFTER PHOTOS & REELS)
        ======================================================== */}
        <GallerySection
          galleryItems={galleryItems}
          videos={videos}
          initialView={galleryView}
          onBookService={handleBookFromGallery}
          onOpenManagement={() => handleOpenManagement('gallery')}
        />

        {/* ========================================================
            8. CLIENT REVIEWS & GOOGLE RATINGS (SOCIAL PROOF)
        ======================================================== */}
        <TestimonialsSection />

        {/* Stylists & Founder Spotlight (Social Proof & Expertise) */}
        <StylistsSection onBookWithStylist={handleBookWithStylist} />
        <FoundersNote onOpenBooking={() => scrollToSection('booking')} />

        {/* ========================================================
            9. SALON BRANCH LOCATIONS & DOORSTEP HOME VISIT MAP INFO
        ======================================================== */}
        <SalonsLocations />

        {/* ========================================================
            10. FAQ & FOOTER SECTION
        ======================================================== */}
        <FAQSection onOpenBooking={() => scrollToSection('booking')} />
      </main>

      {/* Main Footer with Social Channels & Operating Hours */}
      <Footer
        onOpenBooking={() => scrollToSection('booking')}
        onOpenTokens={() => setIsTokensInspectorOpen(true)}
        onOpenManagement={() => handleOpenManagement('packages')}
      />

      {/* Floating Admin Dashboard Trigger Button */}
      <div className="fixed bottom-5 left-5 z-40 flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <button
          onClick={() => handleOpenManagement('gallery')}
          className="px-4 py-2.5 rounded-full bg-[#0F172A] text-white shadow-xl hover:bg-[#D09A40] transition-colors border border-white/20 flex items-center gap-2 text-xs font-semibold cursor-pointer group"
          title="Admin Dashboard: Manage Services, Packages, Gallery & Reels"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#D09A40] group-hover:text-white transition-colors" />
          <span>Admin Dashboard</span>
        </button>
      </div>

      {/* Salon Management Console Modal */}
      <ManagementModal
        isOpen={isManagementModalOpen}
        onClose={() => setIsManagementModalOpen(false)}
        services={services}
        packages={packages}
        galleryItems={galleryItems}
        videos={videos}
        onUpdateServices={handleUpdateServices}
        onUpdatePackages={handleUpdatePackages}
        onUpdateGallery={handleUpdateGallery}
        onUpdateVideos={handleUpdateVideos}
        initialTab={managementInitialTab}
      />
    </div>
  );
}
