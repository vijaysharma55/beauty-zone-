import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ServicesSection } from './components/ServicesSection';
import { BridalSpotlight } from './components/BridalSpotlight';
import { StylistsSection } from './components/StylistsSection';
import { FoundersNote } from './components/FoundersNote';
import { GallerySection } from './components/GallerySection';
import { BundledServicesSection } from './components/BundledServicesSection';
import { BookingSection } from './components/BookingSection';
import { SalonsLocations } from './components/SalonsLocations';
import { TestimonialsSection } from './components/TestimonialsSection';
import { Footer } from './components/Footer';
import { DesignSystemInspector } from './components/DesignSystemInspector';
import { ManagementModal } from './components/ManagementModal';
import { ServiceItem, Stylist, SalonPackage, GalleryItem } from './types';
import { getStoredPackages, saveStoredPackages } from './data/packagesData';
import { getStoredGallery, saveStoredGallery } from './data/galleryData';
import { SALON_SERVICES } from './data/salonData';
import { Sparkles, SlidersHorizontal, Settings } from 'lucide-react';

export default function App() {
  const [isTokensInspectorOpen, setIsTokensInspectorOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [managementInitialTab, setManagementInitialTab] = useState<'packages' | 'gallery'>('packages');

  // Module 31: Package Management Store
  const [packages, setPackages] = useState<SalonPackage[]>(() => getStoredPackages());

  // Module 32: Gallery Management Store
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() => getStoredGallery());

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

  const handleBookBundle = (bundleTitle: string, price: number, services: string[]) => {
    setSelectedBundle({ title: bundleTitle, price, services });
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
    // Try to find matching service in catalog
    const matched = SALON_SERVICES.find(
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

  const handleOpenManagement = (tab: 'packages' | 'gallery' = 'packages') => {
    setManagementInitialTab(tab);
    setIsManagementModalOpen(true);
  };

  const handleUpdatePackages = (updatedPackages: SalonPackage[]) => {
    setPackages(updatedPackages);
    saveStoredPackages(updatedPackages);
  };

  const handleUpdateGallery = (updatedGallery: GalleryItem[]) => {
    setGalleryItems(updatedGallery);
    saveStoredGallery(updatedGallery);
  };

  return (
    <div className="min-h-screen bg-[#FAF5E5] text-[#0F172A] selection:bg-[#D09A40] selection:text-white">
      {/* Top Bar Navigation with Management Console trigger */}
      <Navbar
        onOpenBooking={() => scrollToSection('booking')}
        onOpenManagement={() => handleOpenManagement('packages')}
        onToggleTokens={() => setIsTokensInspectorOpen((prev) => !prev)}
        isTokensOpen={isTokensInspectorOpen}
      />

      <main>
        {/* Hero Section */}
        <Hero
          onBookClick={handleBookFromHero}
          onExploreBridal={handleExploreBridal}
        />

        {/* Curated Services Showcase */}
        <ServicesSection onSelectService={handleSelectServiceFromList} />

        {/* Bridal Studio & Heritage Destination Weddings */}
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

        {/* Meet Your Stylist - Professional Bios & Portfolios */}
        <StylistsSection onBookWithStylist={handleBookWithStylist} />

        {/* Founder's Note - Bio, Vision Statement & Heritage Philosophy */}
        <FoundersNote onOpenBooking={() => scrollToSection('booking')} />

        {/* Module 32: Couture Gallery & Transformation Lookbook */}
        <GallerySection
          galleryItems={galleryItems}
          onBookService={handleBookFromGallery}
          onOpenManagement={() => handleOpenManagement('gallery')}
        />

        {/* Module 31: Bundled Services & Package Management Integration */}
        <BundledServicesSection
          packages={packages}
          onBookBundle={handleBookBundle}
          onOpenManagement={() => handleOpenManagement('packages')}
        />

        {/* 9-Input Booking & Price Estimator Form */}
        <BookingSection
          selectedServicePreload={selectedService}
          selectedBundlePreload={selectedBundle}
          selectedStylistPreload={selectedStylist}
          onClearPreload={() => setSelectedService(null)}
          onClearBundle={() => setSelectedBundle(null)}
          onClearStylist={() => setSelectedStylist(null)}
        />

        {/* Jaipur Branch Sanctuaries */}
        <SalonsLocations />

        {/* Verified Wedding & Client Stories */}
        <TestimonialsSection />
      </main>

      {/* Quiet Footer Contract */}
      <Footer
        onOpenBooking={() => scrollToSection('booking')}
        onOpenTokens={() => setIsTokensInspectorOpen(true)}
        onOpenManagement={() => handleOpenManagement('packages')}
      />

      {/* Floating Action Buttons (Fixed Bottom-Left) */}
      <div className="fixed bottom-5 left-5 z-40 flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <button
          onClick={() => handleOpenManagement('packages')}
          className="px-4 py-2.5 rounded-full bg-[#0F172A] text-white shadow-xl hover:bg-[#D09A40] transition-colors border border-white/20 flex items-center gap-2 text-xs font-semibold cursor-pointer group"
          title="Admin Dashboard: Manage Packages & Real Photos"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#D09A40] group-hover:text-white transition-colors" />
          <span>Admin Dashboard</span>
        </button>

        <button
          onClick={() => setIsTokensInspectorOpen((prev) => !prev)}
          className="px-3.5 py-2.5 rounded-full bg-white/90 text-[#0F172A] shadow-lg hover:bg-white transition-colors border border-neutral-300 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title="View Color & Font Details"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#D09A40]" />
          <span className="hidden sm:inline">Design Details</span>
        </button>
      </div>

      {/* Module 31 & 32: Salon Management Modal Console */}
      <ManagementModal
        isOpen={isManagementModalOpen}
        onClose={() => setIsManagementModalOpen(false)}
        packages={packages}
        galleryItems={galleryItems}
        onUpdatePackages={handleUpdatePackages}
        onUpdateGallery={handleUpdateGallery}
        initialTab={managementInitialTab}
      />

      {/* Design System Token Inspector Panel */}
      <DesignSystemInspector
        isOpen={isTokensInspectorOpen}
        onClose={() => setIsTokensInspectorOpen(false)}
      />
    </div>
  );
}
