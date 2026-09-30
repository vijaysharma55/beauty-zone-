import React, { useState, useMemo } from 'react';
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
  IndianRupee
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
  const allServices = services && services.length > 0 ? services : SALON_SERVICES;
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

  // Quick preset price brackets for instant 1-tap filtering
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

  // Quick trending search recommendations
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

  // Comprehensive category metadata for all beauty service segments
  const categories: CategoryMetadata[] = [
    { 
      id: 'all', 
      label: 'All Services', 
      shortLabel: 'All',
      icon: Layers, 
      tagline: 'Complete Beauty Zone Jaipur Service List',
      description: 'Browse all our salon treatments including bridal makeup, hair smoothening, glowing facials, nail art extensions, body spa, and certified makeup courses.', 
      image: '/src/assets/images/hero_jaipur_salon_1790671992521.jpg',
      altText: 'Interior view of Beauty Zone Jaipur salon',
      features: ['3 Jaipur Salons', 'Private Bridal Suites', '100% Genuine Branded Products', 'Doorstep Home Service'],
    },
    { 
      id: 'bridal', 
      label: 'Bridal Makeup', 
      shortLabel: 'Bridal',
      icon: Crown, 
      tagline: 'HD Airbrush Bridal Makeup & Draping for Weddings',
      description: 'Waterproof HD airbrush makeup, Kundan jewelry setting, and royal lehenga & dupatta draping for brides, sangeet, and destination weddings.', 
      image: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
      altText: 'Indian bride wearing heavy gold jewelry and red lehenga with HD makeup at Beauty Zone Jaipur',
      features: ['Temptu HD Airbrush', 'Kundan & Borla Setting', 'Lehenga Draping Included', 'Destination Wedding Visits'],
    },
    { 
      id: 'hair', 
      label: 'Hair Care & Styling', 
      shortLabel: 'Hair',
      icon: Scissors, 
      tagline: 'Chemical-Free Hair Botox, Nanoplastia & Balayage',
      description: '100% safe formaldehyde-free hair smoothening, Olaplex balayage hair coloring, and precision haircuts for soft, shiny, frizz-free hair.', 
      image: '/src/assets/images/hair_styling_luxe_1790672021591.jpg',
      altText: 'Client with sleek balayage hair styled at Beauty Zone Jaipur salon',
      features: ['Chemical-Free Nanoplastia', 'Olaplex Bond Protection', 'Custom Hair Colors', 'Relaxing Wash & Blowout'],
    },
    { 
      id: 'skin', 
      label: 'Skin & Facials', 
      shortLabel: 'Skin',
      icon: Droplet, 
      tagline: '24K Gold Leaf Glow & 7-Step Hydra-Facials',
      description: 'Deep-cleansing HydraFacials, signature 24K real gold leaf facials, and natural herbal kesar de-tan treatments for glowing, blemish-free skin.', 
      image: '/src/assets/images/skin_spa_treatment_1790672037475.jpg',
      altText: 'Client getting a relaxing 24K gold facial at Beauty Zone Jaipur salon',
      features: ['Real 24K Gold Leaf', 'Deep Blackhead Extraction', 'Cooling Ice Globes', 'Natural Herbal De-Tan'],
    },
    { 
      id: 'nails', 
      label: 'Nails & Art', 
      shortLabel: 'Nails',
      icon: Sparkle, 
      tagline: 'Bridal Gel Extensions & Swarovski Nail Art',
      description: 'Chip-proof gel nail extensions, chrome finishes, Swarovski crystal stone art, and dry Russian machine manicures that last 4+ weeks.', 
      image: '/src/assets/images/nail_art_luxe_1790676094903.jpg',
      altText: 'Bridal gel nail extensions with stone art at Beauty Zone Jaipur',
      features: ['4-Week Chip-Free Gel', 'Real Swarovski Stones', 'Russian Manicure Care', 'Warm Paraffin Hand Spa'],
    },
    { 
      id: 'spa', 
      label: 'Spa & Body Care', 
      shortLabel: 'Spa',
      icon: Heart, 
      tagline: 'Rose Petal Milk Baths & Full Body Polishing',
      description: 'Indulgent body spa rituals featuring organic milk baths, fresh rose petals, almond oil massages, and herbal de-tan body scrubs.', 
      image: '/src/assets/images/prebridal_spa_ritual_1790676123541.jpg',
      altText: 'Relaxing rose petal body spa treatment at Beauty Zone Jaipur',
      features: ['Rose Petal & Milk Soak', 'Full Body Herbal Scrub', 'Warm Steam Therapy', 'Pure Essential Oils'],
    },
    { 
      id: 'academy', 
      label: 'Makeup Academy', 
      shortLabel: 'Academy',
      icon: GraduationCap, 
      tagline: 'Govt & ISO Certified Professional Makeup Courses',
      description: '30-day professional diploma in bridal makeup and advanced hair chemical treatments with practice on live models and 100% freelance support.', 
      image: '/src/assets/images/academy_makeup_class_1790676134907.jpg',
      altText: 'Students practicing makeup in Beauty Zone Jaipur Academy class',
      features: ['Govt & ISO Diploma', 'Full Vanity Kit Included', 'Practice on Live Models', 'Freelance Career Guidance'],
    },
  ];

  // Calculate item counts per category
  const categoryCounts = useMemo(() => {
    const counts: { [key: string]: number } = { all: allServices.length };
    allServices.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, [allServices]);

  const activeCategoryMeta = categories.find((c) => c.id === activeCategory) || categories[0];

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  // Submit and persist review
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

  // Check matching services across the entire catalog for global search assistance
  const globalMatchesCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase();
    return allServices.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.category === 'skin' && (q.includes('skin') || q.includes('facial'))) ||
        (s.category === 'hair' && (q.includes('hair') || q.includes('cut'))) ||
        (s.category === 'bridal' && (q.includes('bride') || q.includes('bridal') || q.includes('wedding'))) ||
        (s.category === 'nails' && (q.includes('nail') || q.includes('manicure'))) ||
        (s.category === 'spa' && (q.includes('spa') || q.includes('body') || q.includes('massage'))) ||
        (s.category === 'academy' && (q.includes('course') || q.includes('class') || q.includes('academy') || q.includes('learn'))) ||
        s.description.toLowerCase().includes(q) ||
        s.highlights.some((h) => h.toLowerCase().includes(q))
    ).length;
  }, [allServices, searchQuery]);

  // Dynamic filter & search logic with Price Range filtering
  const filteredAndSortedServices = useMemo(() => {
    let result = activeCategory === 'all'
      ? [...allServices]
      : allServices.filter((s) => s.category === activeCategory);

    // Apply Price Budget Filter
    result = result.filter((s) => s.price <= maxPrice);

    // Apply Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.category === 'skin' && (q.includes('skin') || q.includes('facial'))) ||
          (s.category === 'hair' && (q.includes('hair') || q.includes('cut'))) ||
          (s.category === 'bridal' && (q.includes('bride') || q.includes('bridal') || q.includes('wedding'))) ||
          (s.category === 'nails' && (q.includes('nail') || q.includes('manicure'))) ||
          (s.category === 'spa' && (q.includes('spa') || q.includes('body') || q.includes('massage'))) ||
          (s.category === 'academy' && (q.includes('course') || q.includes('class') || q.includes('academy') || q.includes('learn'))) ||
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
  }, [allServices, activeCategory, searchQuery, maxPrice, sortBy, serviceRatingsMap]);

  return (
    <section id="services" className="py-16 md:py-24 bg-white/70 border-y border-[#0F172A]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Section Header */}
        <RevealOnScroll duration={0.6}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#0F172A]/10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-2">
                <span>Services & Treatments</span>
                <span aria-hidden="true">·</span>
                <span>Jaipur Salon Rate Card & Price Range Filter</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Our Best Beauty & Hair Services
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#4A4A4A] leading-relaxed font-light">
                Use the category tabs and price range slider below to quickly find beauty treatments, 
                nail extensions, and bridal makeovers that fit your exact budget.
              </p>
            </div>

            {/* Quick Search & Sort Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Input with Clear Button */}
              <div className="relative min-w-[260px] sm:min-w-[280px]">
                <Search className="w-4 h-4 text-[#D09A40] absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search service e.g. facial, hair botox, bridal..."
                  className="w-full pl-9 pr-8 py-2.5 text-xs border border-[#0F172A]/15 rounded-xl focus:outline-none focus:border-[#D09A40] focus:ring-1 focus:ring-[#D09A40] bg-white text-[#0F172A] transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-3 text-[#4A4A4A] hover:text-[#0F172A] p-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-[#0F172A]/15 rounded-xl px-3 py-2 text-xs text-[#4A4A4A] shadow-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#D09A40]" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent focus:outline-none cursor-pointer text-[#0F172A] font-medium"
                >
                  <option value="featured">Featured Order</option>
                  <option value="rating-desc">Highest Rated (★ 5.0)</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* Price Range Slider & Budget Filter Control Panel */}
        <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-[#FAF5E5] border border-[#D09A40]/30 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left: Slider Input with Real-Time Ceiling Display */}
            <div className="flex-1 max-w-xl">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A]">
                  <Sliders className="w-3.5 h-3.5 text-[#D09A40]" />
                  <span>Filter by Budget (Price Range):</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#4A4A4A]">Up to:</span>
                  <span className="text-sm font-bold font-mono text-[#0F172A] bg-white px-2.5 py-0.5 rounded-lg border border-[#D09A40]/40 shadow-2xs">
                    {maxPrice >= 50000 ? 'All Prices (₹50,000+)' : `₹${maxPrice.toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>

              {/* Range Slider Track */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="1499"
                  max="50000"
                  step="500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#D09A40] cursor-pointer h-2 bg-neutral-200 rounded-lg appearance-none"
                  aria-label="Price range filter slider"
                />
                <div className="flex items-center justify-between text-[10px] text-[#4A4A4A] font-mono">
                  <span>Min: ₹1,499 (Haircut/Wash)</span>
                  <span>₹7,500</span>
                  <span>₹15,000</span>
                  <span>₹35,000</span>
                  <span>Max: ₹50,000+</span>
                </div>
              </div>
            </div>

            {/* Right: Quick Budget Chips & Reset Button */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 lg:pt-0 lg:border-l lg:border-[#0F172A]/10 lg:pl-6">
              <span className="text-[11px] font-semibold text-[#4A4A4A] uppercase tracking-wider block w-full sm:w-auto mr-1">
                Quick Budget:
              </span>
              {pricePresetBrackets.map((bracket) => {
                const isSelected = maxPrice === bracket.max;
                return (
                  <button
                    key={bracket.label}
                    onClick={() => setMaxPrice(bracket.max)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                      isSelected
                        ? 'bg-[#0F172A] text-white'
                        : 'bg-white hover:bg-neutral-100 text-[#0F172A] border border-[#0F172A]/15'
                    }`}
                  >
                    {bracket.label}
                  </button>
                );
              })}

              {maxPrice < 50000 && (
                <button
                  onClick={() => setMaxPrice(50000)}
                  className="px-2 py-1 text-xs text-[#D09A40] hover:text-[#0F172A] font-bold flex items-center gap-1 transition-colors cursor-pointer ml-1"
                  title="Reset price filter to show all services"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Price</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Search Trending Tags Strip */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 text-xs text-[#4A4A4A]">
          <span className="font-semibold text-[11px] text-[#0F172A] whitespace-nowrap uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3 h-3 text-[#D09A40]" />
            <span>Popular:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {quickSearchKeywords.map((kw) => (
              <button
                key={kw}
                onClick={() => setSearchQuery(kw)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                  searchQuery.toLowerCase() === kw.toLowerCase()
                    ? 'bg-[#0F172A] text-white font-medium'
                    : 'bg-white/80 hover:bg-white text-[#4A4A4A] hover:text-[#0F172A] border border-[#0F172A]/10'
                }`}
              >
                {kw}
              </button>
            ))}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-2 py-1 text-[11px] text-[#D09A40] hover:underline font-semibold cursor-pointer whitespace-nowrap"
              >
                Reset Search
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs with Active Indicators and Counts */}
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Filter by Service Category:
            </span>
            <span className="text-xs text-[#4A4A4A] font-mono">
              Showing {filteredAndSortedServices.length} {filteredAndSortedServices.length === 1 ? 'Service' : 'Services'} 
              {maxPrice < 50000 && ` (under ₹${maxPrice.toLocaleString('en-IN')})`}
            </span>
          </div>

          <div 
            role="tablist" 
            aria-label="Beauty Service Categories" 
            className="flex items-center gap-2 p-1.5 bg-[#FAF5E5] rounded-2xl border border-[#0F172A]/10 w-full overflow-x-auto scrollbar-none shadow-2xs"
          >
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  role="tab"
                  id={`tab-${cat.id}`}
                  aria-selected={isSelected}
                  aria-controls={`panel-${cat.id}`}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 relative ${
                    isSelected
                      ? 'bg-[#0F172A] text-white shadow-md'
                      : 'text-[#4A4A4A] hover:text-[#0F172A] hover:bg-white/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[#D09A40]' : 'text-[#4A4A4A]'}`} />
                  <span>{cat.label}</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-md font-mono ${isSelected ? 'bg-white/20 text-[#FAF5E5]' : 'bg-neutral-200/80 text-[#4A4A4A]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Category Hero Spotlight Banner with High-Quality Imagery */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              id={`panel-${activeCategory}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeCategory}`}
              className="mt-6 rounded-2xl overflow-hidden border border-[#D09A40]/30 bg-white shadow-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 items-center">
                {/* Visual Imagery Carrier */}
                <div className="md:col-span-5 relative aspect-[16/10] md:aspect-[4/3] overflow-hidden bg-neutral-100 group">
                  <img
                    src={activeCategoryMeta.image}
                    alt={activeCategoryMeta.altText}
                    referrerPolicy="no-referrer"
                    onError={() => handleImageError(`cat-${activeCategory}`)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#FAF5E5] bg-[#0F172A]/70 px-2 py-0.5 rounded backdrop-blur-xs">
                      {activeCategoryMeta.label}
                    </span>
                    <p className="text-xs font-serif font-bold mt-1 text-white/95">
                      Beauty Zone Signature Quality
                    </p>
                  </div>
                </div>

                {/* Text & Feature Highlights */}
                <div className="md:col-span-7 p-6 sm:p-8 space-y-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#D09A40]">
                      {activeCategoryMeta.tagline}
                    </span>
                    <h3 
                      className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight mt-1"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {activeCategoryMeta.id === 'all' ? 'All Beauty Zone Services' : `Special ${activeCategoryMeta.label} Services`}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-[#4A4A4A] leading-relaxed font-light">
                    {activeCategoryMeta.description}
                  </p>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    {activeCategoryMeta.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#0F172A]/90">
                        <Check className="w-3.5 h-3.5 text-[#D09A40] shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Active Search & Price Context Indicator */}
                  <div className="pt-2 text-[11px] text-[#4A4A4A] flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-700 font-medium">✓ Done by certified senior specialists</span>
                      {maxPrice < 50000 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#0F172A] font-semibold">
                            Budget limit: ≤ ₹{maxPrice.toLocaleString('en-IN')}
                          </span>
                        </>
                      )}
                      {searchQuery && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#0F172A] font-semibold">
                            Filtered by: "{searchQuery}"
                          </span>
                        </>
                      )}
                    </div>
                    <span className="font-mono text-neutral-500 tabular-nums">
                      {filteredAndSortedServices.length} {filteredAndSortedServices.length === 1 ? 'treatment listed' : 'treatments listed'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global Match Assist Prompt */}
        {filteredAndSortedServices.length === 0 && globalMatchesCount > 0 && activeCategory !== 'all' && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold">No results in {activeCategoryMeta.label}, </span>
              <span>but found <strong className="tabular-nums">{globalMatchesCount}</strong> matching services in other categories.</span>
            </div>
            <button
              onClick={() => {
                setActiveCategory('all');
                setMaxPrice(50000);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-amber-800 text-white font-semibold text-xs hover:bg-amber-900 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              View in All Services
            </button>
          </div>
        )}

        {/* Dynamic Services Bento Grid with Aggregate Star Ratings */}
        {filteredAndSortedServices.length > 0 ? (
          <motion.div 
            layout
            className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredAndSortedServices.map((service, index) => {
                const hasFailed = failedImages[service.id];
                const ratingData = serviceRatingsMap[service.id] || { rating: 4.9, count: 25 };

                return (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ 
                      duration: 0.24, 
                      delay: Math.min(index * 0.04, 0.2),
                      ease: [0.16, 1, 0.3, 1] 
                    }}
                    className="bg-white rounded-2xl border border-[#0F172A]/10 p-5 sm:p-6 flex flex-col justify-between hover:border-[#D09A40] luxe-card-hover group overflow-hidden"
                  >
                    <div>
                      {/* High-Resolution Service Image with Strict Fallback Container */}
                      <div className="relative aspect-[16/10] -mx-5 -mt-5 sm:-mx-6 sm:-mt-6 mb-4 overflow-hidden rounded-t-2xl bg-[#FAF5E5]/70">
                        {!hasFailed && service.image ? (
                          <img
                            src={service.image}
                            alt={`${service.title} - Beauty Zone Jaipur ${service.category} service`}
                            referrerPolicy="no-referrer"
                            onError={() => handleImageError(service.id)}
                            className="w-full h-full object-cover luxe-img-zoom"
                          />
                        ) : (
                          /* Resilient Stylized Fallback Container */
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#FAF5E5] to-[#EBECEF] text-center">
                            <Sparkles className="w-8 h-8 text-[#D09A40] mb-1.5 opacity-80" />
                            <span className="font-serif text-sm font-bold text-[#0F172A]">{service.title}</span>
                            <span className="text-[10px] text-[#4A4A4A] uppercase tracking-wider mt-0.5">Beauty Zone Signature Service</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 pointer-events-none" />
                        
                        {service.popular && (
                          <span className="absolute top-3 left-3 text-[10px] font-bold text-[#0F172A] bg-[#FAF5E5] px-2.5 py-1 rounded-md shadow-xs uppercase tracking-wider">
                            ★ Most Requested
                          </span>
                        )}
                        
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs">
                          <span className="font-semibold text-[11px] text-[#FAF5E5] capitalize">
                            {service.category === 'skin' ? 'Skincare' : service.category === 'hair' ? 'Hair Care' : service.category === 'bridal' ? 'Bridal' : service.category}
                          </span>
                          <span className="font-mono text-[11px] bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded">
                            {service.duration}
                          </span>
                        </div>
                      </div>

                      {/* Card Header Row */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#0F172A] group-hover:text-[#D09A40] transition-colors leading-snug">
                            {service.title}
                          </h3>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-lg sm:text-xl font-bold text-[#0F172A] tabular-nums">
                            ₹{service.price.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Aggregate Star Rating & Reviews Trigger */}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewModalService(service)}
                          className="inline-flex items-center gap-1.5 text-xs text-[#0F172A] hover:text-[#D09A40] transition-colors cursor-pointer group/rate py-0.5"
                          title={`Click to view ${ratingData.count} client reviews and rate`}
                        >
                          <Star className="w-3.5 h-3.5 fill-[#D09A40] text-[#D09A40]" />
                          <span className="font-bold tabular-nums text-xs">{ratingData.rating.toFixed(1)}</span>
                          <span className="text-[#4A4A4A] text-[11px] group-hover/rate:underline underline-offset-2">
                            ({ratingData.count} reviews)
                          </span>
                          <span className="text-[10px] text-[#D09A40] font-semibold ml-0.5">· Feedback</span>
                        </button>
                      </div>

                      {/* Description */}
                      <p className="mt-2.5 text-xs sm:text-sm text-[#4A4A4A] leading-relaxed font-light">
                        {service.description}
                      </p>

                      {/* Highlights List */}
                      <ul className="mt-4 space-y-1.5">
                        {service.highlights.map((h, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-[#0F172A]/85">
                            <Check className="w-3.5 h-3.5 text-[#D09A40] shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Card Action Row with Review and Booking Actions */}
                    <div className="pt-5 mt-5 border-t border-[#0F172A]/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewModalService(service)}
                        className="px-2.5 py-1.5 text-xs font-medium text-[#4A4A4A] hover:text-[#0F172A] hover:bg-[#FAF5E5] rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-[#0F172A]/10 shrink-0"
                        title="Read verified reviews or leave feedback"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#D09A40]" />
                        <span>Rate & Reviews</span>
                      </button>

                      <button
                        onClick={() => onSelectService(service)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] bg-[#FAF5E5] hover:bg-[#D09A40] hover:text-white rounded-lg luxe-btn flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      >
                        <span>Select & Book</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* Empty Search / Budget State */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="mt-12 text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-[#0F172A]/20 max-w-md mx-auto"
          >
            <IndianRupee className="w-8 h-8 text-[#D09A40] mx-auto mb-3 opacity-70" />
            <h3 className="font-serif text-lg font-bold text-[#0F172A]">No Treatments Found in this Budget</h3>
            <p className="text-xs text-[#4A4A4A] mt-1 leading-relaxed">
              No services match under ₹{maxPrice.toLocaleString('en-IN')} in {activeCategoryMeta.label}.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setMaxPrice(50000)}
                className="px-4 py-2 text-xs font-semibold text-[#0F172A] bg-[#FAF5E5] hover:bg-[#D09A40] hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Reset Budget Filter
              </button>
              {activeCategory !== 'all' && (
                <button
                  onClick={() => {
                    setActiveCategory('all');
                    setMaxPrice(50000);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-lg transition-colors cursor-pointer"
                >
                  View All Services
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Verified Star Rating & Review Submission Modal */}
      {reviewModalService && (
        <ServiceReviewModal
          service={reviewModalService}
          reviews={reviews.filter((r) => r.serviceId === reviewModalService.id)}
          aggregateRating={serviceRatingsMap[reviewModalService.id]?.rating || 5.0}
          reviewCount={serviceRatingsMap[reviewModalService.id]?.count || 1}
          onClose={() => setReviewModalService(null)}
          onSubmitReview={handleSaveReview}
        />
      )}
    </section>
  );
};
