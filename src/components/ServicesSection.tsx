import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SALON_SERVICES } from '../data/salonData';
import { ServiceItem, ServiceReview } from '../types';
import { INITIAL_SERVICE_REVIEWS, BASELINE_SERVICE_RATINGS } from '../data/serviceReviewsData';
import { ServiceReviewModal } from './ServiceReviewModal';
import { RevealOnScroll } from './RevealOnScroll';
import { 
  Check, 
  Sparkles, 
  ArrowUpRight, 
  Search, 
  X,
  Crown, 
  Scissors, 
  Droplet, 
  Layers,
  ArrowUpDown,
  Star,
  MessageSquare,
  Sparkle,
  Heart,
  GraduationCap,
  Flame,
  Sliders,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Tag
} from 'lucide-react';

interface ServicesSectionProps {
  services?: ServiceItem[];
  onSelectService: (service: ServiceItem) => void;
}

export type ServiceFilterCategory = 'all' | 'bridal' | 'hair' | 'skin' | 'nails' | 'spa' | 'academy';

interface CategoryMetadata {
  id: ServiceFilterCategory;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
  image: string;
  altText: string;
  tagline: string;
  features: string[];
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ services, onSelectService }) => {
  // Deduplicate raw services by unique id or normalized title
  const rawServices = services && services.length > 0 ? services : SALON_SERVICES;
  
  const allServices = useMemo(() => {
    const seen = new Set<string>();
    return rawServices.filter((s) => {
      const key = `${s.id}-${s.title.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawServices]);

  const [activeCategory, setActiveCategory] = useState<ServiceFilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number>(50000);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating-desc'>('featured');
  const [failedImages, setFailedImages] = useState<{ [key: string]: boolean }>({});

  // Review & Rating Modal State
  const [reviews, setReviews] = useState<ServiceReview[]>(() => {
    try {
      const stored = localStorage.getItem('bz_service_reviews');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SERVICE_REVIEWS;
  });

  const [reviewModalService, setReviewModalService] = useState<ServiceItem | null>(null);

  // Quick preset price brackets
  const pricePresetBrackets = [
    { label: 'All Prices', max: 50000 },
    { label: 'Under ₹3,000', max: 3000 },
    { label: 'Under ₹7,500', max: 7500 },
    { label: 'Under ₹15,000', max: 15000 },
    { label: 'Under ₹35,000', max: 35000 },
  ];

  // Calculate live aggregate rating and review count per service
  const serviceRatingsMap = useMemo(() => {
    const map: { [serviceId: string]: { rating: number; count: number } } = {};

    allServices.forEach((service) => {
      const baseline = BASELINE_SERVICE_RATINGS[service.id] || { rating: 4.8, count: 15 };
      const serviceReviews = reviews.filter((r) => r.serviceId === service.id);
      
      if (serviceReviews.length === 0) {
        map[service.id] = baseline;
      } else {
        const totalBaselinePoints = baseline.rating * baseline.count;
        const totalUserPoints = serviceReviews.reduce((sum, r) => sum + r.rating, 0);
        const totalCount = baseline.count + serviceReviews.length;
        const aggregate = Math.round(((totalBaselinePoints + totalUserPoints) / totalCount) * 10) / 10;
        map[service.id] = { rating: aggregate, count: totalCount };
      }
    });

    return map;
  }, [allServices, reviews]);

  // Trending search keywords
  const quickSearchKeywords = [
    'Bridal Airbrush',
    'Hair Botox',
    'Balayage',
    '24K Gold Facial',
    'HydraFacial',
    'Gel Nails',
    'Body Spa',
    'Academy'
  ];

  // Category metadata definitions
  const categories: CategoryMetadata[] = [
    { 
      id: 'bridal', 
      label: 'Bridal Makeup', 
      shortLabel: 'Bridal',
      icon: Crown, 
      tagline: 'HD Airbrush Bridal Makeup & Draping',
      description: 'Waterproof HD airbrush makeup, Kundan jewelry setting, and royal lehenga & dupatta draping.', 
      image: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
      altText: 'Indian bride wearing heavy gold jewelry and red lehenga with HD makeup at Beauty Zone Jaipur',
      features: ['Temptu HD Airbrush', 'Kundan Setting', 'Lehenga Draping', 'Wedding Visits'],
    },
    { 
      id: 'hair', 
      label: 'Hair Care & Styling', 
      shortLabel: 'Hair',
      icon: Scissors, 
      tagline: 'Chemical-Free Hair Botox & Balayage',
      description: '100% safe formaldehyde-free hair smoothening, Olaplex balayage coloring, and haircuts.', 
      image: '/src/assets/images/hair_styling_luxe_1790672021591.jpg',
      altText: 'Client with sleek balayage hair styled at Beauty Zone Jaipur salon',
      features: ['Nanoplastia', 'Olaplex Protection', 'Custom Hair Colors', 'Wash & Blowout'],
    },
    { 
      id: 'skin', 
      label: 'Skin & Facials', 
      shortLabel: 'Skin',
      icon: Droplet, 
      tagline: '24K Gold Leaf Glow & Hydra-Facials',
      description: 'Deep-cleansing HydraFacials, signature 24K real gold leaf facials, and herbal de-tan.', 
      image: '/src/assets/images/skin_spa_treatment_1790672037475.jpg',
      altText: 'Client getting a relaxing 24K gold facial at Beauty Zone Jaipur salon',
      features: ['Real 24K Gold', 'Extraction Care', 'Cooling Ice Globes', 'Herbal De-Tan'],
    },
    { 
      id: 'nails', 
      label: 'Nails & Art', 
      shortLabel: 'Nails',
      icon: Sparkle, 
      tagline: 'Gel Extensions & Swarovski Art',
      description: 'Chip-proof gel nail extensions, chrome finishes, Swarovski crystal art, and Russian manicures.', 
      image: '/src/assets/images/nail_art_luxe_1790676094903.jpg',
      altText: 'Bridal gel nail extensions with stone art at Beauty Zone Jaipur',
      features: ['4-Week Gel', 'Swarovski Stones', 'Russian Manicure', 'Paraffin Spa'],
    },
    { 
      id: 'spa', 
      label: 'Spa & Body Care', 
      shortLabel: 'Spa',
      icon: Heart, 
      tagline: 'Rose Petal Milk Baths & Body Polishing',
      description: 'Indulgent body spa rituals featuring organic milk baths, fresh rose petals, and almond oil massages.', 
      image: '/src/assets/images/prebridal_spa_ritual_1790676123541.jpg',
      altText: 'Relaxing rose petal body spa treatment at Beauty Zone Jaipur',
      features: ['Rose Milk Soak', 'Herbal Scrub', 'Steam Therapy', 'Essential Oils'],
    },
    { 
      id: 'academy', 
      label: 'Makeup Academy', 
      shortLabel: 'Academy',
      icon: GraduationCap, 
      tagline: 'Govt Certified Professional Courses',
      description: 'Diploma in bridal makeup and advanced hair chemical treatments with practice on live models.', 
      image: '/src/assets/images/academy_makeup_class_1790676134907.jpg',
      altText: 'Students practicing makeup in Beauty Zone Jaipur Academy class',
      features: ['Govt & ISO Diploma', 'Full Vanity Kit', 'Live Models', 'Career Support'],
    },
  ];

  // Count per category
  const categoryCounts = useMemo(() => {
    const counts: { [key: string]: number } = { all: allServices.length };
    allServices.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, [allServices]);

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const handleSaveReview = (newReviewData: Omit<ServiceReview, 'id' | 'date'>) => {
    const newRev: ServiceReview = {
      ...newReviewData,
      id: `rev-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
    };
    const updated = [newRev, ...reviews];
    setReviews(updated);
    try {
      localStorage.setItem('bz_service_reviews', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save review in localStorage', e);
    }
  };

  // Filter & sort deduplicated services
  const filteredServices = useMemo(() => {
    let result = [...allServices];

    // Filter by Price Budget
    result = result.filter((s) => s.price <= maxPrice);

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.highlights.some((h) => h.toLowerCase().includes(q))
      );
    }

    // Apply Sorting
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating-desc') {
      result.sort((a, b) => {
        const ratingA = serviceRatingsMap[a.id]?.rating || 0;
        const ratingB = serviceRatingsMap[b.id]?.rating || 0;
        return ratingB - ratingA;
      });
    }

    return result;
  }, [allServices, searchQuery, maxPrice, sortBy, serviceRatingsMap]);

  // Group filtered services by category
  const categorizedFilteredServices = useMemo(() => {
    const map: { [catId: string]: ServiceItem[] } = {};
    categories.forEach((cat) => {
      map[cat.id] = [];
    });

    filteredServices.forEach((service) => {
      if (map[service.category]) {
        map[service.category].push(service);
      } else {
        map[service.category] = [service];
      }
    });

    return map;
  }, [filteredServices, categories]);

  // Determine active display categories based on tab filter
  const displayCategories = useMemo(() => {
    if (activeCategory === 'all') {
      return categories.filter((cat) => (categorizedFilteredServices[cat.id] || []).length > 0);
    }
    return categories.filter((cat) => cat.id === activeCategory);
  }, [activeCategory, categories, categorizedFilteredServices]);

  return (
    <section id="services" className="py-6 sm:py-10 md:py-14 bg-white/80 border-y border-[#0F172A]/10 w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Compact Header & Controls */}
        <RevealOnScroll duration={0.5}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#0F172A]/10">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-1">
                <span>Salon Rate Card</span>
                <span aria-hidden="true">·</span>
                <span>Jaipur</span>
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Our Services & Treatments
              </h2>
            </div>

            {/* Quick Search & Sort Bar */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Search Input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#D09A40] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search service e.g. facial, botox..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs border border-[#0F172A]/15 rounded-lg focus:outline-none focus:border-[#D09A40] bg-white text-[#0F172A]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-[#4A4A4A] hover:text-[#0F172A] p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1 bg-white border border-[#0F172A]/15 rounded-lg px-2.5 py-1.5 text-xs text-[#4A4A4A]">
                <ArrowUpDown className="w-3 h-3 text-[#D09A40]" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent focus:outline-none cursor-pointer text-[#0F172A] font-medium"
                >
                  <option value="featured">Featured</option>
                  <option value="rating-desc">Highest Rated</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* Compact Price Range & Preset Chips */}
        <div className="mt-3 p-3 sm:p-4 rounded-xl bg-[#FAF5E5] border border-[#D09A40]/30 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {/* Slider */}
            <div className="flex items-center gap-3 flex-1">
              <span className="font-bold text-[#0F172A] whitespace-nowrap flex items-center gap-1 shrink-0">
                <Sliders className="w-3.5 h-3.5 text-[#D09A40]" />
                <span>Max Budget:</span>
              </span>
              <input
                type="range"
                min="1499"
                max="50000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#D09A40] cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
              />
              <span className="font-bold font-mono text-[#0F172A] bg-white px-2 py-0.5 rounded border border-[#D09A40]/40 shrink-0">
                {maxPrice >= 50000 ? 'All Prices' : `₹${maxPrice.toLocaleString('en-IN')}`}
              </span>
            </div>

            {/* Quick Brackets */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none no-scrollbar pt-1 sm:pt-0">
              {pricePresetBrackets.map((bracket) => (
                <button
                  key={bracket.label}
                  onClick={() => setMaxPrice(bracket.max)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    maxPrice === bracket.max
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-white text-[#0F172A] border border-[#0F172A]/15 hover:bg-neutral-100'
                  }`}
                >
                  {bracket.label}
                </button>
              ))}
              {maxPrice < 50000 && (
                <button
                  onClick={() => setMaxPrice(50000)}
                  className="px-1.5 py-0.5 text-[11px] text-[#D09A40] font-bold hover:underline cursor-pointer flex items-center gap-0.5 shrink-0"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Navigation Pills */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto scrollbar-none no-scrollbar pb-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
              activeCategory === 'all'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white text-[#4A4A4A] border border-[#0F172A]/10 hover:text-[#0F172A]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#D09A40]" />
            <span>All Categories ({allServices.length})</span>
          </button>

          {categories.map((cat) => {
            const Icon = cat.icon;
            const count = (categorizedFilteredServices[cat.id] || []).length;
            const isSelected = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-white text-[#4A4A4A] border border-[#0F172A]/10 hover:text-[#0F172A]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#D09A40]' : 'text-[#4A4A4A]'}`} />
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-white/20 text-[#FAF5E5]' : 'bg-neutral-100 text-[#4A4A4A]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredServices.length === 0 && (
          <div className="mt-8 p-8 text-center bg-white rounded-2xl border border-[#0F172A]/10 max-w-md mx-auto">
            <Search className="w-10 h-10 text-[#D09A40] mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-[#0F172A]">No Services Found</h3>
            <p className="text-xs text-[#4A4A4A] mt-1 mb-4">
              Try adjusting your price filter or search query to explore our beauty catalog.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setMaxPrice(50000);
                  setActiveCategory('all');
                }}
                className="px-4 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-[#D09A40] transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {/* Render Single-Line Horizontal Side-Scrolling Rows for Each Category */}
        <div className="mt-6 space-y-6">
          {displayCategories.map((cat) => {
            const catServices = categorizedFilteredServices[cat.id] || [];
            if (catServices.length === 0) return null;

            return (
              <CategoryHorizontalRow
                key={cat.id}
                category={cat}
                services={catServices}
                serviceRatingsMap={serviceRatingsMap}
                failedImages={failedImages}
                onSelectService={onSelectService}
                onOpenReviewModal={(svc) => setReviewModalService(svc)}
                onImageError={handleImageError}
              />
            );
          })}
        </div>

      </div>

      {/* Service Review Modal */}
      {reviewModalService && (
        <ServiceReviewModal
          service={reviewModalService}
          reviews={reviews.filter((r) => r.serviceId === reviewModalService.id)}
          aggregateRating={serviceRatingsMap[reviewModalService.id]?.rating || 4.9}
          reviewCount={serviceRatingsMap[reviewModalService.id]?.count || 18}
          onClose={() => setReviewModalService(null)}
          onSubmitReview={handleSaveReview}
        />
      )}
    </section>
  );
};

// Sub-Component: Single-Line Horizontal Row for a Category
interface CategoryHorizontalRowProps {
  category: CategoryMetadata;
  services: ServiceItem[];
  serviceRatingsMap: { [serviceId: string]: { rating: number; count: number } };
  failedImages: { [key: string]: boolean };
  onSelectService: (service: ServiceItem) => void;
  onOpenReviewModal: (service: ServiceItem) => void;
  onImageError: (id: string) => void;
}

const CategoryHorizontalRow: React.FC<CategoryHorizontalRowProps> = ({
  category,
  services,
  serviceRatingsMap,
  failedImages,
  onSelectService,
  onOpenReviewModal,
  onImageError,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const Icon = category.icon;

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#0F172A]/10 p-3.5 sm:p-5 shadow-2xs relative group">
      {/* Category Row Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#0F172A]/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#FAF5E5] text-[#D09A40]">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight">
                {category.label}
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 font-semibold text-[#4A4A4A]">
                {services.length} {services.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>
            <p className="text-[11px] text-[#4A4A4A] hidden sm:block">
              {category.tagline}
            </p>
          </div>
        </div>

        {/* Sleek Overlay Navigation Arrow Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleScroll('left')}
            aria-label={`Scroll ${category.label} left`}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-[#0F172A]/15 hover:border-[#D09A40] text-[#0F172A] hover:bg-[#FAF5E5] flex items-center justify-center transition-all shadow-2xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-[#0F172A]" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            aria-label={`Scroll ${category.label} right`}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-[#0F172A]/15 hover:border-[#D09A40] text-[#0F172A] hover:bg-[#FAF5E5] flex items-center justify-center transition-all shadow-2xs cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-[#0F172A]" />
          </button>
        </div>
      </div>

      {/* Single-Line Horizontal Side-Scrolling Row Container with Side Overlay Chevrons */}
      <div className="relative group/row">
        <button
          type="button"
          onClick={() => handleScroll('left')}
          aria-label={`Scroll ${category.label} left`}
          className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-[#0F172A] border border-[#0F172A]/15 shadow-md items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 opacity-80 group-hover/row:opacity-100"
        >
          <ChevronLeft className="w-4 h-4 text-[#0F172A]" />
        </button>
        <button
          type="button"
          onClick={() => handleScroll('right')}
          aria-label={`Scroll ${category.label} right`}
          className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-[#0F172A] border border-[#0F172A]/15 shadow-md items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 opacity-80 group-hover/row:opacity-100"
        >
          <ChevronRight className="w-4 h-4 text-[#0F172A]" />
        </button>

        <div
          ref={rowRef}
          className="flex flex-row overflow-x-auto snap-x snap-mandatory scrollbar-none no-scrollbar gap-3 sm:gap-4 py-1.5 flex-nowrap scroll-smooth scroll-pl-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
        {services.map((service) => {
          const ratingData = serviceRatingsMap[service.id] || { rating: 4.8, count: 18 };
          const hasFailed = failedImages[service.id];

          return (
            <div
              key={service.id}
              className="w-[180px] sm:w-[210px] min-w-[170px] max-w-[220px] shrink-0 snap-start bg-[#FAF5E5]/40 hover:bg-white rounded-xl border border-[#0F172A]/10 hover:border-[#D09A40] p-3 flex flex-col justify-between transition-all group/card shadow-2xs"
            >
              <div>
                {/* Compact Service Image Header */}
                <div className="relative aspect-[16/10] -mx-3 -mt-3 mb-2.5 overflow-hidden rounded-t-xl bg-neutral-200">
                  {!hasFailed && service.image ? (
                    <img
                      src={service.image}
                      alt={service.title}
                      loading="lazy"
                      onError={() => onImageError(service.id)}
                      className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#FAF5E5] text-[#D09A40]">
                      <Sparkles className="w-6 h-6 opacity-60" />
                    </div>
                  )}

                  {/* Rating Tag */}
                  <div className="absolute top-1.5 left-1.5 bg-[#0F172A]/85 text-white px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    <span>{ratingData.rating}</span>
                  </div>

                  {service.popular && (
                    <div className="absolute top-1.5 right-1.5 bg-[#D09A40] text-white px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">
                      Popular
                    </div>
                  )}
                </div>

                {/* Service Title */}
                <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] line-clamp-2 leading-snug group-hover/card:text-[#D09A40] transition-colors">
                  {service.title}
                </h4>

                {/* Duration & Highlights */}
                <div className="flex items-center gap-1.5 text-[11px] text-[#4A4A4A] mt-1 font-mono">
                  <Clock className="w-3 h-3 text-[#D09A40]" />
                  <span>{service.duration}</span>
                </div>

                {service.highlights && service.highlights.length > 0 && (
                  <p className="text-[10px] text-neutral-500 mt-1 line-clamp-1 italic">
                    ✓ {service.highlights[0]}
                  </p>
                )}
              </div>

              {/* Card Footer: Price & Quick Book */}
              <div className="mt-3 pt-2 border-t border-[#0F172A]/10 flex items-center justify-between gap-1.5">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 block leading-none">Starting</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-[#0F172A]">
                    ₹{service.price.toLocaleString('en-IN')}
                  </span>
                </div>

                <button
                  onClick={() => onSelectService(service)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-[#0F172A] hover:bg-[#D09A40] text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                >
                  Book
                </button>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};
