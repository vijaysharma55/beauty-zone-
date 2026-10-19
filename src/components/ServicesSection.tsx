import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SALON_SERVICES } from '../data/salonData';
import { ServiceCategory, ServiceItem, ServiceReview } from '../types';
import { INITIAL_SERVICE_REVIEWS, BASELINE_SERVICE_RATINGS } from '../data/serviceReviewsData';
import { ServiceReviewModal } from './ServiceReviewModal';
import { ServiceCompareModal } from './ServiceCompareModal';
import { RevealOnScroll } from './RevealOnScroll';
import { useBrand } from '../context/BrandContext';
import { SmartImage } from './crud/SmartImage';
import { ItemActions } from './crud/ItemActions';
import { CardEditorModal, type EditorField } from './crud/CardEditorModal';
import { CrudToast, ManageControls, ManageHint } from './crud/ManageControls';
import { useCardCollection } from './crud/useCardCollection';
import { 
  Check, 
  Sparkles, 
  ArrowUpRight, 
  Search, 
  Plus,
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
  Tag,
  ArrowLeftRight,
  LayoutGrid,
  List,
  Filter,
  ArrowRight
} from 'lucide-react';

interface ServicesSectionProps {
  services?: ServiceItem[];
  onSelectService: (service: ServiceItem) => void;
  /** Persists the full service catalog after an inline create / edit / delete. */
  onUpdateServices?: (services: ServiceItem[]) => void;
}

export type ServiceFilterCategory = 'all' | 'hair' | 'skin' | 'bridal' | 'nails' | 'makeup' | 'spa' | 'academy';

const SERVICE_CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: 'bridal', label: 'Bridal makeup' },
  { value: 'hair', label: 'Hair care & styling' },
  { value: 'skin', label: 'Skin & facials' },
  { value: 'nails', label: 'Nail art' },
  { value: 'spa', label: 'Spa & body care' },
  { value: 'academy', label: 'Academy & masterclass' },
];

const SERVICE_EDITOR_FIELDS: EditorField[] = [
  {
    key: 'image',
    type: 'image',
    label: 'Service image',
    span: 2,
    aspect: 'aspect-[16/10]',
    help: 'Shown in a fixed-height card frame with object-fit: cover on every card.',
  },
  { key: 'title', type: 'text', label: 'Service title', span: 2, required: true },
  { key: 'category', type: 'select', label: 'Category', options: SERVICE_CATEGORY_OPTIONS, required: true },
  { key: 'duration', type: 'text', label: 'Duration', placeholder: 'e.g. 90 mins', required: true },
  { key: 'price', type: 'number', label: 'Starting price (₹)', min: 0, required: true },
  { key: 'description', type: 'textarea', label: 'Description', span: 2, rows: 3 },
  {
    key: 'highlights',
    type: 'tags',
    label: 'Highlights',
    span: 2,
    rows: 3,
    separator: 'comma',
    help: 'Separate highlights with commas. The first one is shown on the card.',
  },
  { key: 'popular', type: 'checkbox', label: 'Mark as a popular treatment' },
];

const emptyServiceValues = (category: ServiceCategory = 'hair'): Record<string, any> => ({
  image: '/images/skin_spa_treatment_1790672037475.jpg',
  title: '',
  category,
  duration: '60 mins',
  price: 0,
  description: '',
  highlights: [],
  popular: false,
});

const serviceToEditorValues = (service?: ServiceItem): Record<string, any> => {
  if (!service) return emptyServiceValues();
  return {
    image: service.image || '',
    title: service.title,
    category: service.category,
    duration: service.duration,
    price: service.price,
    description: service.description,
    highlights: service.highlights || [],
    popular: !!service.popular,
  };
};

const normalizeServiceValues = (
  values: Record<string, any>,
  base?: ServiceItem
): ServiceItem => ({
  ...(base || {
    id: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    category: 'hair' as ServiceCategory,
    price: 0,
    duration: '',
    description: '',
    highlights: [],
    popular: false,
    image: '',
  }),
  image: String(values.image || '').trim() || undefined,
  title: String(values.title || '').trim(),
  category: String(values.category || 'hair') as ServiceCategory,
  duration: String(values.duration || '').trim(),
  price: Math.max(0, Math.round(Number(values.price) || 0)),
  description: String(values.description || '').trim(),
  highlights: Array.isArray(values.highlights) ? values.highlights : [],
  popular: !!values.popular,
});

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

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  services,
  onSelectService,
  onUpdateServices,
}) => {
  const { brand, t } = useBrand();
  // Deduplicate raw services by unique id or normalized title. An intentionally
  // empty catalog must stay empty (so deleting every service is reversible
  // only through the Add action).
  const rawServices = services ?? SALON_SERVICES;
  
  const allServices = useMemo(() => {
    const seen = new Set<string>();
    return rawServices.filter((s) => {
      const key = `${s.id}-${s.title.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawServices]);

  const manager = useCardCollection<ServiceItem>(allServices, onUpdateServices, 'Service');

  const [activeCategory, setActiveCategory] = useState<ServiceFilterCategory>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number>(50000);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating-desc' | 'duration-asc'>('featured');
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

  // Comparison Feature State
  const [selectedForCompare, setSelectedForCompare] = useState<ServiceItem[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  const selectedCompareIds = useMemo(() => new Set(selectedForCompare.map((s) => s.id)), [selectedForCompare]);

  const handleToggleCompare = (service: ServiceItem) => {
    setSelectedForCompare((prev) => {
      if (prev.some((s) => s.id === service.id)) {
        return prev.filter((s) => s.id !== service.id);
      } else {
        if (prev.length >= 4) {
          return [...prev.slice(1), service];
        }
        return [...prev, service];
      }
    });
  };

  const handleAddToCompare = (service: ServiceItem) => {
    setSelectedForCompare((prev) => {
      if (prev.some((s) => s.id === service.id)) return prev;
      if (prev.length >= 4) return [...prev.slice(1), service];
      return [...prev, service];
    });
  };

  const handleRemoveFromCompare = (serviceId: string) => {
    setSelectedForCompare((prev) => prev.filter((s) => s.id !== serviceId));
  };

  const handleRemoveService = (serviceId: string) => {
    setReviewModalService((current) => (current?.id === serviceId ? null : current));
    handleRemoveFromCompare(serviceId);
    manager.removeItem(serviceId);
  };

  const handleClearCompare = () => {
    setSelectedForCompare([]);
  };

  const handleOpenCompareModal = () => {
    if (selectedForCompare.length === 0) {
      const popular = allServices.filter((s) => s.popular);
      const defaults = popular.length >= 2 ? popular.slice(0, 2) : allServices.slice(0, 2);
      setSelectedForCompare(defaults);
    }
    setIsCompareModalOpen(true);
  };

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
      description: 'Waterproof HD airbrush makeup, fine jewelry setting, and couture outfit & veil draping.', 
      image: '/images/bridal_makeup_jaipur_1790672008691.jpg',
      altText: 'Bride wearing fine gold jewelry and couture lehenga with HD makeup',
      features: ['Temptu HD Airbrush', 'Jewelry Setting', 'Couture Draping', 'Wedding Visits'],
    },
    { 
      id: 'hair', 
      label: 'Hair Care & Styling', 
      shortLabel: 'Hair',
      icon: Scissors, 
      tagline: 'Chemical-Free Hair Botox & Balayage',
      description: '100% safe formaldehyde-free hair smoothening, Olaplex balayage coloring, and haircuts.', 
      image: '/images/hair_styling_luxe_1790672021591.jpg',
      altText: 'Client with sleek balayage hair styled at luxury salon',
      features: ['Nanoplastia', 'Olaplex Protection', 'Custom Hair Colors', 'Wash & Blowout'],
    },
    { 
      id: 'skin', 
      label: 'Skin & Facials', 
      shortLabel: 'Skin',
      icon: Droplet, 
      tagline: '24K Gold Leaf Glow & Hydra-Facials',
      description: 'Deep-cleansing HydraFacials, signature 24K real gold leaf facials, and herbal de-tan.', 
      image: '/images/skin_spa_treatment_1790672037475.jpg',
      altText: 'Client getting a relaxing 24K gold facial at luxury salon',
      features: ['Real 24K Gold', 'Extraction Care', 'Cooling Ice Globes', 'Herbal De-Tan'],
    },
    { 
      id: 'nails', 
      label: 'Nails & Art', 
      shortLabel: 'Nails',
      icon: Sparkle, 
      tagline: 'Gel Extensions & Swarovski Art',
      description: 'Chip-proof gel nail extensions, chrome finishes, Swarovski crystal art, and Russian manicures.', 
      image: '/images/nail_art_luxe_1790676094903.jpg',
      altText: 'Bridal gel nail extensions with stone art',
      features: ['4-Week Gel', 'Swarovski Stones', 'Russian Manicure', 'Paraffin Spa'],
    },
    { 
      id: 'makeup', 
      label: 'Makeup & Makeovers', 
      shortLabel: 'Makeup',
      icon: Sparkles, 
      tagline: 'HD Airbrush & Sangeet Party Glam Makeovers',
      description: 'Waterproof HD airbrush makeup, party glam, smokey eyes, and professional bridal makeup artistry.', 
      image: '/images/bridal_makeup_jaipur_1790672008691.jpg',
      altText: 'Bridal and party makeup artistry',
      features: ['Temptu HD Airbrush', 'Smokey & Cut-Crease Eyes', 'Full Touchup Kit', 'Lashes & Draping'],
    },
    { 
      id: 'spa', 
      label: 'Spa & Body Care', 
      shortLabel: 'Spa',
      icon: Heart, 
      tagline: 'Rose Petal Milk Baths & Body Polishing',
      description: 'Indulgent body spa rituals featuring organic milk baths, fresh rose petals, and almond oil massages.', 
      image: '/images/prebridal_spa_ritual_1790676123541.jpg',
      altText: 'Relaxing rose petal body spa treatment',
      features: ['Rose Milk Soak', 'Herbal Scrub', 'Steam Therapy', 'Essential Oils'],
    },
    { 
      id: 'academy', 
      label: 'Makeup Academy', 
      shortLabel: 'Academy',
      icon: GraduationCap, 
      tagline: 'Govt Certified Professional Courses',
      description: 'Diploma in bridal makeup and advanced hair chemical treatments with practice on live models.', 
      image: '/images/academy_makeup_class_1790676134907.jpg',
      altText: 'Students practicing makeup in professional Academy class',
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
    const parseDurationMinutes = (durationStr: string): number => {
      if (!durationStr) return 999;
      const lower = durationStr.toLowerCase();
      const numMatch = lower.match(/(\d+)/);
      const num = numMatch ? parseInt(numMatch[1], 10) : 60;
      if (lower.includes('day') || lower.includes('days')) return num * 1440;
      if (lower.includes('session') || lower.includes('sessions')) return num * 90;
      if (lower.includes('hour') || lower.includes('hours') || lower.includes('hr')) return num * 60;
      return num;
    };

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
    } else if (sortBy === 'duration-asc') {
      result.sort((a, b) => parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration));
    }

    return result;
  }, [allServices, searchQuery, maxPrice, sortBy, serviceRatingsMap]);

  // Check if a service belongs to makeup
  const isMakeupService = (service: ServiceItem) => {
    return (
      service.category === 'bridal' ||
      service.title.toLowerCase().includes('makeup') ||
      service.title.toLowerCase().includes('makeover') ||
      service.description.toLowerCase().includes('makeup') ||
      service.highlights.some((h) => h.toLowerCase().includes('makeup'))
    );
  };

  // Group filtered services by category
  const categorizedFilteredServices = useMemo(() => {
    const map: { [catId: string]: ServiceItem[] } = {};
    categories.forEach((cat) => {
      map[cat.id] = [];
    });
    map['makeup'] = [];

    filteredServices.forEach((service) => {
      if (map[service.category]) {
        map[service.category].push(service);
      } else {
        map[service.category] = [service];
      }
      if (isMakeupService(service)) {
        if (!map['makeup'].some((s) => s.id === service.id)) {
          map['makeup'].push(service);
        }
      }
    });

    return map;
  }, [filteredServices, categories]);

  // Determine active display categories based on tab filter
  const displayCategories = useMemo(() => {
    if (activeCategory === 'all') {
      return categories.filter((cat) => cat.id !== 'makeup' && (categorizedFilteredServices[cat.id] || []).length > 0);
    }
    if (activeCategory === 'makeup') {
      return categories.filter((cat) => cat.id === 'makeup');
    }
    return categories.filter((cat) => cat.id === activeCategory);
  }, [activeCategory, categories, categorizedFilteredServices]);

  // Tag-based filter component tags: Hair, Skin, Bridal, Nails, Makeup (plus All and Spa)
  const filterTags = useMemo(() => [
    { id: 'all' as ServiceFilterCategory, label: 'All Services', shortLabel: 'All', icon: Layers, count: filteredServices.length },
    { id: 'hair' as ServiceFilterCategory, label: 'Hair', shortLabel: 'Hair', icon: Scissors, count: (categorizedFilteredServices['hair'] || []).length },
    { id: 'skin' as ServiceFilterCategory, label: 'Skin', shortLabel: 'Skin', icon: Droplet, count: (categorizedFilteredServices['skin'] || []).length },
    { id: 'bridal' as ServiceFilterCategory, label: 'Bridal', shortLabel: 'Bridal', icon: Crown, count: (categorizedFilteredServices['bridal'] || []).length },
    { id: 'nails' as ServiceFilterCategory, label: 'Nails', shortLabel: 'Nails', icon: Sparkle, count: (categorizedFilteredServices['nails'] || []).length },
    { id: 'makeup' as ServiceFilterCategory, label: 'Makeup', shortLabel: 'Makeup', icon: Sparkles, count: (categorizedFilteredServices['makeup'] || []).length },
    { id: 'spa' as ServiceFilterCategory, label: 'Spa', shortLabel: 'Spa', icon: Heart, count: (categorizedFilteredServices['spa'] || []).length },
  ], [filteredServices, categorizedFilteredServices]);

  return (
    <section id="services" className="py-6 sm:py-10 md:py-14 bg-white/80 border-y border-[#0F172A]/10 w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Compact Header & Controls */}
        <RevealOnScroll duration={0.5}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#0F172A]/10">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-1">
                <span>{t('servicesOverline')}</span>
                <span aria-hidden="true">·</span>
                <span>{brand.cityName}</span>
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t('servicesTitle')}
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
                  placeholder={t('servicesSearchPlaceholder')}
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
                  <option value="duration-asc">Shortest Duration</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating-desc">Highest Rated</option>
                </select>
              </div>

              {onUpdateServices && (
                <ManageControls
                  isManaging={manager.isManaging}
                  onToggle={manager.toggleManaging}
                  onAdd={manager.openCreate}
                  addLabel="Add Service"
                />
              )}

              {/* Compare Button */}
              <button
                type="button"
                onClick={handleOpenCompareModal}
                className="flex items-center gap-1.5 bg-white hover:bg-[#FAF5E5] border border-[#0F172A]/15 hover:border-[#D09A40] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] font-bold cursor-pointer transition-colors shadow-2xs shrink-0"
                title="Compare treatments side-by-side"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#D09A40]" />
                <span>Compare</span>
                {selectedForCompare.length > 0 && (
                  <span className="bg-[#D09A40] text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                    {selectedForCompare.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </RevealOnScroll>

        <ManageHint isManaging={manager.isManaging} noun="service" />

        {/* ========================================================
            PRIMARY CATEGORY FILTER NAVIGATION SYSTEM
        ======================================================== */}
        <div className="mt-4 pb-2 border-b border-[#0F172A]/10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              <Filter className="w-3.5 h-3.5 text-[#D09A40]" />
              <span>Filter by Category</span>
            </div>
            {activeCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className="text-xs font-bold text-[#D09A40] hover:text-[#0F172A] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Reset to All Categories</span>
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Filter services by category"
            className="flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar py-1 -mx-1 px-1"
          >
            {/* 'All' Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
                activeCategory === 'all'
                  ? 'bg-[#0F172A] text-white shadow-md ring-2 ring-[#0F172A]/10'
                  : 'bg-white text-[#4A4A4A] border border-[#0F172A]/12 hover:border-[#D09A40] hover:text-[#0F172A]'
              }`}
            >
              <Layers className={`w-4 h-4 ${activeCategory === 'all' ? 'text-[#D09A40]' : 'text-[#4A4A4A]'}`} />
              <span>All Treatments</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeCategory === 'all' ? 'bg-[#D09A40] text-white' : 'bg-neutral-100 text-[#4A4A4A]'
              }`}>
                {filteredServices.length}
              </span>
            </button>

            {/* Individual Category Tabs: Bridal, Hair, Skin, Nails, Spa, Academy */}
            {categories.map((cat) => {
              const Icon = cat.icon;
              const count = (categorizedFilteredServices[cat.id] || []).length;
              const isSelected = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? 'bg-[#0F172A] text-white shadow-md ring-2 ring-[#0F172A]/10'
                      : 'bg-white text-[#4A4A4A] border border-[#0F172A]/12 hover:border-[#D09A40] hover:text-[#0F172A]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[#D09A40]' : 'text-[#4A4A4A]'}`} />
                  <span>{cat.shortLabel}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isSelected ? 'bg-[#D09A40] text-white' : 'bg-neutral-100 text-[#4A4A4A]'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Category Spotlight Overview Banner */}
        {activeCategory !== 'all' && (
          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FAF5E5] via-[#FFFDF5] to-[#FAF5E5] border border-[#D09A40]/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-[#0F172A] text-[#D09A40] shrink-0 shadow-xs">
                {React.createElement(categories.find((c) => c.id === activeCategory)?.icon || Sparkles, { className: 'w-5 h-5' })}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight">
                    {categories.find((c) => c.id === activeCategory)?.label}
                  </h3>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#0F172A] text-white">
                    {(categorizedFilteredServices[activeCategory] || []).length} Services Available
                  </span>
                </div>
                <p className="text-xs text-[#4A4A4A] mt-0.5">
                  {categories.find((c) => c.id === activeCategory)?.description}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {categories.find((c) => c.id === activeCategory)?.features.map((feature, idx) => (
                    <span key={idx} className="text-[10px] font-medium text-[#0F172A] bg-white px-2 py-0.5 rounded-md border border-[#D09A40]/25 shadow-2xs">
                      ✓ {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Layout Mode Toggle (Grid vs Carousel) & View All Button */}
            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <div className="flex items-center bg-white border border-[#0F172A]/15 rounded-xl p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'grid' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-[#4A4A4A] hover:text-[#0F172A]'
                  }`}
                  title="Grid View (All services visible)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('carousel')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'carousel' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-[#4A4A4A] hover:text-[#0F172A]'
                  }`}
                  title="Carousel Row View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Row</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#0F172A]/15 hover:border-[#D09A40] text-xs font-bold text-[#0F172A] hover:bg-[#FAF5E5] transition-colors cursor-pointer"
              >
                All Categories
              </button>
            </div>
          </div>
        )}

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

        {/* ========================================================
            TAG-BASED FILTER COMPONENT ABOVE SERVICES GRID
            Instantly toggle between 'Hair', 'Skin', 'Bridal', 'Nails', and 'Makeup' views
        ======================================================== */}
        <div className="mt-8 pt-6 border-t border-[#0F172A]/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF5E5] border border-[#D09A40]/30 text-xs font-bold text-[#0F172A] shadow-2xs">
                <Tag className="w-3.5 h-3.5 text-[#D09A40]" />
                <span>Service Category Views:</span>
              </div>
              <span className="text-xs text-[#4A4A4A] hidden sm:inline">
                Click any tag to toggle treatments instantly
              </span>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <span className="text-xs font-medium text-[#4A4A4A]">
                Showing <strong className="text-[#0F172A] font-mono">{activeCategory === 'all' ? filteredServices.length : (categorizedFilteredServices[activeCategory] || []).length}</strong> treatments
              </span>

              {/* View Mode Toggle (Grid vs Row) */}
              <div className="flex items-center bg-white border border-[#0F172A]/15 rounded-xl p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'grid' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-[#4A4A4A] hover:text-[#0F172A]'
                  }`}
                  title="Grid View (All services in columns)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('carousel')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'carousel' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-[#4A4A4A] hover:text-[#0F172A]'
                  }`}
                  title="Row Carousel View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Rows</span>
                </button>
              </div>

              {activeCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className="text-xs font-bold text-[#D09A40] hover:text-[#0F172A] flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg bg-white border border-[#D09A40]/30 hover:bg-[#FAF5E5]"
                  title="Reset to all treatments"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Show All</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Tag Chips Bar */}
          <div
            role="toolbar"
            aria-label="Filter services by tag"
            className="flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar pb-1 -mx-1 px-1"
          >
            {filterTags.map((tag) => {
              const TagIcon = tag.icon;
              const isSelected = activeCategory === tag.id;

              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(tag.id);
                    setViewMode('grid');
                  }}
                  aria-pressed={isSelected}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? 'bg-[#0F172A] text-white shadow-md ring-2 ring-[#D09A40]'
                      : 'bg-white text-[#0F172A] border border-[#0F172A]/15 hover:border-[#D09A40] hover:bg-[#FAF5E5]'
                  }`}
                >
                  <TagIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#D09A40]' : 'text-[#4A4A4A]'}`} />
                  <span>{tag.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected
                        ? 'bg-[#D09A40] text-white'
                        : 'bg-neutral-100 text-[#4A4A4A]'
                    }`}
                  >
                    {tag.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================
            SERVICES RENDERING: Grid View vs Carousel Rows
        ======================================================== */}
        {/* Case 1: Grid View — uniform 3-column cards */}
        {viewMode === 'grid' && filteredServices.length > 0 && (
          <div className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              {(activeCategory === 'all'
                ? filteredServices
                : categorizedFilteredServices[activeCategory] || []
              ).map((service) => (
                <ServiceCardItem
                  key={service.id}
                  service={service}
                  ratingData={serviceRatingsMap[service.id] || { rating: 4.8, count: 18 }}
                  hasFailed={failedImages[service.id]}
                  isCompared={selectedCompareIds.has(service.id)}
                  onToggleCompare={handleToggleCompare}
                  onSelectService={onSelectService}
                  onImageError={handleImageError}
                  layout="grid"
                  actions={
                    manager.canManage ? (
                      <ItemActions
                        itemLabel="service"
                        alwaysVisible={manager.isManaging}
                        onEdit={() => manager.openEdit(service)}
                        onReplace={() => manager.openReplace(service)}
                        onDelete={() => handleRemoveService(service.id)}
                      />
                    ) : null
                  }
                />
              ))}
            </div>
          </div>
        )}

        {filteredServices.length === 0 && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#0F172A]/20 bg-[#FAF5E5]/40 px-6 py-14 text-center">
            <Scissors className="h-10 w-10 text-neutral-300" />
            <h3 className="mt-3 font-serif text-lg font-bold text-[#0F172A]">
              No treatments match this view
            </h3>
            <p className="mt-1 max-w-md text-xs text-[#4A4A4A]">
              Clear the search or category filter, or add a new service to the catalog.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setMaxPrice(50000);
                  setActiveCategory('all');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F172A]/15 bg-white px-4 py-2.5 text-xs font-bold text-[#0F172A] transition-colors hover:border-[#D09A40] hover:bg-[#FAF5E5] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset filters
              </button>
              {manager.canManage && (
                <button
                  type="button"
                  onClick={manager.openCreate}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#D09A40] hover:text-[#0F172A] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add a service
                </button>
              )}
            </div>
          </div>
        )}

        {/* Case 2: Carousel Rows View (Active when viewMode === 'carousel') */}
        {viewMode === 'carousel' && filteredServices.length > 0 && (
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
                  selectedCompareIds={selectedCompareIds}
                  onToggleCompare={handleToggleCompare}
                  onSelectService={onSelectService}
                  onOpenReviewModal={(svc) => setReviewModalService(svc)}
                  onImageError={handleImageError}
                  onFilterCategory={(id) => {
                    setActiveCategory(id);
                    setViewMode('grid');
                  }}
                  actionsForService={(service) =>
                    manager.canManage ? (
                      <ItemActions
                        itemLabel="service"
                        alwaysVisible={manager.isManaging}
                        onEdit={() => manager.openEdit(service)}
                        onReplace={() => manager.openReplace(service)}
                        onDelete={() => handleRemoveService(service.id)}
                      />
                    ) : null
                  }
                />
              );
            })}
          </div>
        )}

      </div>

      {/* Floating Comparison Tray */}
      {selectedForCompare.length > 0 && (
        <aside 
          aria-label="Service comparison tray"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[94vw] sm:w-auto bg-[#0F172A] text-white rounded-2xl shadow-2xl border border-white/20 p-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 sm:gap-6 animate-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#D09A40] text-white flex items-center justify-center shrink-0 shadow-xs">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{selectedForCompare.length} {selectedForCompare.length === 1 ? 'Service' : 'Services'} Selected</span>
                <span className="text-neutral-400 font-normal hidden sm:inline">· Max 4</span>
              </div>
              <div className="text-[11px] text-neutral-300 truncate max-w-[180px] sm:max-w-xs">
                {selectedForCompare.map((s) => s.title).join(' · ')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleClearCompare}
              className="text-[11px] text-neutral-400 hover:text-white px-2 py-1 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsCompareModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#D09A40] hover:bg-[#b88533] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <span>Compare ({selectedForCompare.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

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

      {/* Service Comparison Modal */}
      <ServiceCompareModal
        isOpen={isCompareModalOpen}
        services={allServices}
        comparedServices={selectedForCompare}
        serviceRatingsMap={serviceRatingsMap}
        onClose={() => setIsCompareModalOpen(false)}
        onSelectService={(service) => {
          setIsCompareModalOpen(false);
          onSelectService(service);
        }}
        onRemoveService={handleRemoveFromCompare}
        onAddService={handleAddToCompare}
        onClearAll={handleClearCompare}
      />

      {manager.editorState && (
        <CardEditorModal
          key={manager.editorState.mode === 'edit' ? manager.editorState.item?.id : 'new-service'}
          title={manager.editorState.mode === 'edit' ? 'Edit service' : 'Add a new service'}
          description={
            manager.editorState.mode === 'edit'
              ? `Update “${manager.editorState.item?.title || 'this service'}”. The image stays cropped inside the fixed card frame.`
              : 'Add a treatment with pricing, duration, highlights and a card image.'
          }
          fields={SERVICE_EDITOR_FIELDS}
          initialValues={
            manager.editorState.mode === 'edit'
              ? serviceToEditorValues(manager.editorState.item)
              : emptyServiceValues(
                  activeCategory !== 'all' &&
                    SERVICE_CATEGORY_OPTIONS.some((option) => option.value === activeCategory)
                    ? (activeCategory as ServiceCategory)
                    : 'hair'
                )
          }
          submitLabel={manager.editorState.mode === 'edit' ? 'Save service' : 'Add service'}
          focusImage={manager.editorState.focusImage}
          onClose={manager.closeEditor}
          onSubmit={(values) =>
            manager.saveItem(normalizeServiceValues(values, manager.editorState?.item))
          }
        />
      )}
      <CrudToast message={manager.notice} />
    </section>
  );
};

// Sub-Component: Reusable Service Card Item (supporting both Grid and Carousel layouts)
interface ServiceCardItemProps {
  service: ServiceItem;
  ratingData: { rating: number; count: number };
  hasFailed?: boolean;
  isCompared: boolean;
  onToggleCompare: (service: ServiceItem) => void;
  onSelectService: (service: ServiceItem) => void;
  onImageError: (id: string) => void;
  layout?: 'grid' | 'carousel';
  actions?: React.ReactNode;
}

const ServiceCardItem: React.FC<ServiceCardItemProps> = ({
  service,
  ratingData,
  hasFailed,
  isCompared,
  onToggleCompare,
  onSelectService,
  onImageError,
  layout = 'carousel',
  actions,
}) => {
  const { t } = useBrand();
  return (
    <div
      className={`${
        layout === 'grid'
          ? 'w-full h-full'
          : 'w-[185px] sm:w-[215px] min-w-[175px] max-w-[225px] shrink-0 snap-start'
      } relative rounded-xl border p-3 flex flex-col justify-between transition-all group group/card shadow-2xs hover:shadow-md ${
        isCompared
          ? 'bg-amber-50/50 border-[#D09A40] ring-1 ring-[#D09A40]'
          : 'bg-[#FAF5E5]/40 hover:bg-white border-[#0F172A]/10 hover:border-[#D09A40]'
      }`}
    >
      {actions}
      <div>
        {/* Compact Service Image Header — fixed height, object-fit: cover */}
        <div className="relative h-48 w-full -mx-3 -mt-3 mb-2.5 overflow-hidden rounded-t-xl bg-neutral-200">
          {!hasFailed && service.image ? (
            <SmartImage
              src={service.image}
              alt={service.title}
              className="h-full w-full object-cover group-hover/card:scale-105 transition-transform duration-500"
              fallbackClassName="rounded-t-xl"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#FAF5E5] text-[#D09A40]">
              <Sparkles className="w-6 h-6 opacity-60" />
            </div>
          )}

          {/* Rating Tag */}
          <div className="absolute top-1.5 left-1.5 bg-[#0F172A] text-white px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            <span>{ratingData.rating}</span>
          </div>

          {service.popular && (
            <div className="absolute top-1.5 right-10 bg-[#D09A40] text-white px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">
              Popular
            </div>
          )}
        </div>

        {/* Service Title with Duration Badge */}
        <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] leading-snug group-hover/card:text-[#D09A40] transition-colors flex items-start gap-1">
          <span className="line-clamp-2">{service.title}</span>
          <span className="inline-flex items-center gap-0.5 bg-[#FAF5E5] px-1.5 py-0.5 rounded-full text-[9px] text-[#D09A40] font-bold border border-[#D09A40]/20 mt-0.5 shrink-0">
            <Clock className="w-2.5 h-2.5" />
            {service.duration}
          </span>
        </h4>

        {service.highlights && service.highlights.length > 0 && (
          <p className="text-[10px] text-neutral-500 mt-1 line-clamp-1 italic">
            ✓ {service.highlights[0]}
          </p>
        )}
      </div>

      {/* Card Footer: Price & Quick Book & Compare */}
      <div className="mt-3 pt-2 border-t border-[#0F172A]/10 flex items-center justify-between gap-1">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-neutral-400 block leading-none">Starting</span>
          <span className="text-xs sm:text-sm font-bold font-mono text-[#0F172A]">
            ₹{service.price.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare(service);
            }}
            className={`px-1.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-0.5 ${
              isCompared
                ? 'bg-[#D09A40] text-white border-[#D09A40]'
                : 'bg-white text-[#4A4A4A] border-[#0F172A]/15 hover:border-[#D09A40] hover:text-[#0F172A]'
            }`}
            title={isCompared ? 'Remove from comparison' : 'Compare service side-by-side'}
            aria-label={isCompared ? `Remove ${service.title} from comparison` : `Compare ${service.title}`}
          >
            <ArrowLeftRight className="w-2.5 h-2.5" />
            <span>{isCompared ? 'Added' : 'Compare'}</span>
          </button>

          <button
            onClick={() => onSelectService(service)}
            className="px-2 py-1 text-[11px] font-bold bg-[#0F172A] hover:bg-[#D09A40] text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
          >
            {t('servicesBookNow')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Sub-Component: Single-Line Horizontal Row for a Category
interface CategoryHorizontalRowProps {
  category: CategoryMetadata;
  services: ServiceItem[];
  serviceRatingsMap: { [serviceId: string]: { rating: number; count: number } };
  failedImages: { [key: string]: boolean };
  selectedCompareIds: Set<string>;
  onToggleCompare: (service: ServiceItem) => void;
  onSelectService: (service: ServiceItem) => void;
  onOpenReviewModal: (service: ServiceItem) => void;
  onImageError: (id: string) => void;
  onFilterCategory?: (id: ServiceFilterCategory) => void;
  actionsForService?: (service: ServiceItem) => React.ReactNode;
}

const CategoryHorizontalRow: React.FC<CategoryHorizontalRowProps> = ({
  category,
  services,
  serviceRatingsMap,
  failedImages,
  selectedCompareIds,
  onToggleCompare,
  onSelectService,
  onOpenReviewModal,
  onImageError,
  onFilterCategory,
  actionsForService,
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

        {/* Sleek Overlay Navigation Arrow Controls & Category Jump */}
        <div className="flex items-center gap-1.5">
          {onFilterCategory && (
            <button
              type="button"
              onClick={() => onFilterCategory(category.id)}
              className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-[#D09A40] hover:text-[#0F172A] px-2.5 py-1 rounded-lg border border-[#D09A40]/30 hover:border-[#D09A40] bg-[#FAF5E5]/60 hover:bg-[#FAF5E5] transition-all cursor-pointer mr-1"
            >
              <span>Explore {category.shortLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

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
          {services.map((service) => (
            <ServiceCardItem
              key={service.id}
              service={service}
              ratingData={serviceRatingsMap[service.id] || { rating: 4.8, count: 18 }}
              hasFailed={failedImages[service.id]}
              isCompared={selectedCompareIds.has(service.id)}
              onToggleCompare={onToggleCompare}
              onSelectService={onSelectService}
              onImageError={onImageError}
              layout="carousel"
              actions={actionsForService?.(service)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
