import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SALON_SERVICES } from '../data/salonData';
import { ServiceItem, ServiceReview } from '../types';
import { INITIAL_SERVICE_REVIEWS, BASELINE_SERVICE_RATINGS } from '../data/serviceReviewsData';
import { ServiceReviewModal } from './ServiceReviewModal';
import { RevealOnScroll } from './RevealOnScroll';
import { 
  Check, 
  Clock, 
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
  MessageSquare
} from 'lucide-react';

interface ServicesSectionProps {
  onSelectService: (service: ServiceItem) => void;
}

export type ServiceFilterCategory = 'bridal' | 'hair' | 'skin' | 'all';

interface CategoryMetadata {
  id: ServiceFilterCategory;
  label: string;
  icon: React.ElementType;
  description: string;
  image: string;
  altText: string;
  tagline: string;
  features: string[];
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onSelectService }) => {
  const [activeCategory, setActiveCategory] = useState<ServiceFilterCategory>('bridal');
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  // Calculate live aggregate rating and review count per service
  const serviceRatingsMap = useMemo(() => {
    const map: { [serviceId: string]: { rating: number; count: number } } = {};

    SALON_SERVICES.forEach((service) => {
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
  }, [reviews]);

  // Quick trending search recommendations
  const quickSearchKeywords = [
    'Temptu Airbrush',
    'Hair Botox',
    'Balayage',
    '24K Gold Facial',
    'HydraFacial',
    'Gel Nails',
    'Pre-Bridal'
  ];

  // High-quality imagery for each category meeting the design system's aesthetic guidelines
  const categories: CategoryMetadata[] = [
    { 
      id: 'bridal', 
      label: 'Bridal Makeup', 
      icon: Crown, 
      tagline: 'Bridal Makeup & Draping for Weddings',
      description: 'Long-lasting HD airbrush makeup, Kundan jewelry setting, and lehenga & dupatta draping for brides and family.', 
      image: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
      altText: 'Indian bride wearing heavy gold jewelry and red lehenga with HD makeup at Beauty Zone Jaipur',
      features: ['HD Airbrush Makeup', 'Kundan & Borla Setting', 'Lehenga Draping', 'Hotel & Venue Visits'],
    },
    { 
      id: 'hair', 
      label: 'Hair Care', 
      icon: Scissors, 
      tagline: 'Hair Botox, Nanoplastia & Hair Color',
      description: 'Chemical-free hair smoothening, Olaplex balayage hair color, and precision haircuts for soft, shiny hair.', 
      image: '/src/assets/images/hair_styling_luxe_1790672021591.jpg',
      altText: 'Client with sleek balayage hair styled at Beauty Zone Jaipur salon',
      features: ['Chemical-Free Botox', 'Olaplex Hair Repair', 'Custom Hair Colors', 'Haircut & Blowdry'],
    },
    { 
      id: 'skin', 
      label: 'Skin & Facials', 
      icon: Droplet, 
      tagline: 'Hydra-Facials & 24K Gold Glow',
      description: '7-step deep clean machine facials, real 24K gold leaf facials, and herbal kesar de-tan treatments.', 
      image: '/src/assets/images/skin_spa_treatment_1790672037475.jpg',
      altText: 'Client getting a relaxing 24K gold facial at Beauty Zone Jaipur salon',
      features: ['Real 24K Gold Leaf', 'Deep Pore Cleansing', 'Cooling Ice Globes', 'Natural Kesar De-Tan'],
    },
    { 
      id: 'all', 
      label: 'All Services', 
      icon: Layers, 
      tagline: 'Complete Beauty Zone Jaipur Service List',
      description: 'Browse all our salon services including bridal makeup, hair smoothening, skin facials, nail extensions, body spa, and beauty academy courses.', 
      image: '/src/assets/images/hero_jaipur_salon_1790671992521.jpg',
      altText: 'Interior view of Beauty Zone Jaipur salon',
      features: ['3 Jaipur Salons', 'Private Bridal Rooms', '100% Genuine Products', 'Home Salon Service'],
    },
  ];

  // Calculate item counts per category
  const categoryCounts = useMemo(() => {
    const counts: { [key: string]: number } = { all: SALON_SERVICES.length };
    SALON_SERVICES.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, []);

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
    return SALON_SERVICES.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.category === 'skin' && (q.includes('skin') || q.includes('facial'))) ||
        (s.category === 'hair' && (q.includes('hair') || q.includes('cut'))) ||
        (s.category === 'bridal' && (q.includes('bride') || q.includes('bridal') || q.includes('wedding'))) ||
        s.description.toLowerCase().includes(q) ||
        s.highlights.some((h) => h.toLowerCase().includes(q))
    ).length;
  }, [searchQuery]);

  // Dynamic filter & search logic
  const filteredAndSortedServices = useMemo(() => {
    let result = activeCategory === 'all'
      ? [...SALON_SERVICES]
      : SALON_SERVICES.filter((s) => s.category === activeCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.category === 'skin' && (q.includes('skin') || q.includes('facial'))) ||
          (s.category === 'hair' && (q.includes('hair') || q.includes('cut'))) ||
          (s.category === 'bridal' && (q.includes('bride') || q.includes('bridal') || q.includes('wedding'))) ||
          s.description.toLowerCase().includes(q) ||
          s.highlights.some((h) => h.toLowerCase().includes(q))
      );
    }

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
  }, [activeCategory, searchQuery, sortBy, serviceRatingsMap]);

  return (
    <section id="services" className="py-16 md:py-24 bg-white/70 border-y border-[#0F172A]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Editorial Section Header */}
        <RevealOnScroll duration={0.6}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#0F172A]/10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-2">
                <span>Salon Services & Pricing</span>
                <span aria-hidden="true">·</span>
                <span>Jaipur Rate Card & Verified Reviews</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Our Best Beauty & Hair Services
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#4A4A4A] leading-relaxed font-light">
                All services are done using top-quality branded products by certified professionals.
                Choose from bridal makeup, hair smoothening, glowing facials, nail extensions, and body spa.
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

        {/* Quick Search Trending Tags Strip */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 text-xs text-[#4A4A4A]">
          <span className="font-semibold text-[11px] text-[#0F172A] whitespace-nowrap uppercase tracking-wider">
            Popular Searches:
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
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Tabbed Filter Controls */}
        <div className="mt-6">
          <div 
            role="tablist" 
            aria-label="Service Categories" 
            className="flex items-center gap-2 p-1.5 bg-[#FAF5E5] rounded-2xl border border-[#0F172A]/10 w-fit max-w-full overflow-x-auto scrollbar-none"
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
                  className={`px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 relative ${
                    isSelected
                      ? 'bg-[#0F172A] text-white shadow-md'
                      : 'text-[#4A4A4A] hover:text-[#0F172A] hover:bg-white/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[#D09A40]' : 'text-[#4A4A4A]'}`} />
                  <span>{cat.label}</span>
                  <span className={`text-[11px] tabular-nums ${isSelected ? 'text-white/70' : 'text-[#4A4A4A]/60'}`}>
                    ({count})
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
                      {activeCategoryMeta.label} Showcase
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
                      Special {activeCategoryMeta.label} Services
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

                  {/* Active Search Context Indicator */}
                  <div className="pt-2 text-[11px] text-[#4A4A4A] flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-700 font-medium">✓ Certified salon artists & experts</span>
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
                      {filteredAndSortedServices.length} {filteredAndSortedServices.length === 1 ? 'service shown' : 'services shown'}
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
              <span>but found <strong className="tabular-nums">{globalMatchesCount}</strong> matching services across our full catalog.</span>
            </div>
            <button
              onClick={() => setActiveCategory('all')}
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
                            {service.category === 'skin' ? 'Skincare' : service.category}
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
          /* Empty Search State */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="mt-12 text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-[#0F172A]/20 max-w-md mx-auto"
          >
            <Search className="w-8 h-8 text-[#D09A40] mx-auto mb-3 opacity-60" />
            <h3 className="font-serif text-lg font-bold text-[#0F172A]">No Treatments Found</h3>
            <p className="text-xs text-[#4A4A4A] mt-1 leading-relaxed">
              No services match "{searchQuery}" in {activeCategoryMeta.label}.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 text-xs font-semibold text-[#0F172A] bg-[#FAF5E5] hover:bg-[#D09A40] hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Clear Search Query
              </button>
              {activeCategory !== 'all' && (
                <button
                  onClick={() => setActiveCategory('all')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-lg transition-colors cursor-pointer"
                >
                  Search in All Services
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
