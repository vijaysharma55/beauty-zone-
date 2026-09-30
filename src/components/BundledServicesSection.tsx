import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CURATED_BUNDLES } from '../data/bundlesData';
import { SALON_SERVICES } from '../data/salonData';
import { SalonPackage, ServiceItem } from '../types';
import { RevealOnScroll } from './RevealOnScroll';
import { 
  Sparkles, 
  Check, 
  Clock, 
  ArrowRight, 
  Gift, 
  Plus, 
  Trash2, 
  Tag, 
  ShieldCheck, 
  ArrowUpRight,
  SlidersHorizontal,
  MapPin,
  CalendarCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface BundledServicesSectionProps {
  packages?: SalonPackage[];
  onBookBundle: (bundleTitle: string, price: number, services: string[]) => void;
  onOpenManagement?: () => void;
}

export const BundledServicesSection: React.FC<BundledServicesSectionProps> = ({ 
  packages,
  onBookBundle,
  onOpenManagement 
}) => {
  const [activeTab, setActiveTab] = useState<'curated' | 'custom'>('curated');
  const [expandedRulesId, setExpandedRulesId] = useState<string | null>(null);
  
  // Custom Bundle Builder state
  const [selectedCustomServiceIds, setSelectedCustomServiceIds] = useState<string[]>([
    'b1', // Royal Rajasthani HD Bridal
    's1', // 24K Gold Leaf Facial
  ]);

  // Active packages from props or fallback to CURATED_BUNDLES
  const displayPackages: SalonPackage[] = useMemo(() => {
    if (packages && packages.length > 0) {
      return packages.filter((p) => p.active);
    }
    return CURATED_BUNDLES.map((cb) => ({
      id: cb.id,
      name: cb.title,
      tagline: cb.tagline,
      offer_name: cb.badge || 'Curated Offer',
      description: cb.description,
      services: cb.servicesIncluded,
      duration: cb.duration,
      regular_price: cb.originalPrice,
      package_price: cb.discountedPrice,
      discount: Math.round(((cb.originalPrice - cb.discountedPrice) / cb.originalPrice) * 100),
      savings: cb.savings,
      validity: '60 Days from purchase',
      usage_rules: [
        'Please book your appointment at least 24 hours in advance',
        'Valid across selected Beauty Zone salons in Jaipur',
        'Cannot be transferred to another person once started'
      ],
      outlets: ['All Jaipur Outlets'],
      image: cb.image,
      active: true,
      featured: cb.popular,
    }));
  }, [packages]);

  // Selected services in Custom Builder
  const selectedCustomServices = useMemo(() => {
    return SALON_SERVICES.filter((s) => selectedCustomServiceIds.includes(s.id));
  }, [selectedCustomServiceIds]);

  // Calculate dynamic custom discount
  const customSubtotal = useMemo(() => {
    return selectedCustomServices.reduce((sum, s) => sum + s.price, 0);
  }, [selectedCustomServices]);

  const discountPercent = useMemo(() => {
    const count = selectedCustomServices.length;
    if (count >= 4) return 20;
    if (count === 3) return 15;
    if (count === 2) return 10;
    return 0;
  }, [selectedCustomServices.length]);

  const customSavings = useMemo(() => {
    return Math.round((customSubtotal * discountPercent) / 100);
  }, [customSubtotal, discountPercent]);

  const customFinalPrice = customSubtotal - customSavings;

  const toggleCustomService = (serviceId: string) => {
    if (selectedCustomServiceIds.includes(serviceId)) {
      if (selectedCustomServiceIds.length <= 1) {
        return;
      }
      setSelectedCustomServiceIds(selectedCustomServiceIds.filter((id) => id !== serviceId));
    } else {
      setSelectedCustomServiceIds([...selectedCustomServiceIds, serviceId]);
    }
  };

  const handleBookCurated = (pkg: SalonPackage) => {
    onBookBundle(pkg.name, pkg.package_price, pkg.services);
  };

  const handleBookCustom = () => {
    const title = `Custom Package (${selectedCustomServices.length} Services)`;
    onBookBundle(title, customFinalPrice, selectedCustomServices.map((s) => s.title));
  };

  return (
    <section id="bundles" className="py-16 md:py-24 bg-[#FAF5E5]/60 border-t border-[#0F172A]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header in Simple Indian English */}
        <RevealOnScroll duration={0.6}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#0F172A]/10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-2">
                <Gift className="w-3.5 h-3.5" />
                <span>Money-Saving Combo Packages</span>
                <span aria-hidden="true">·</span>
                <span>Save Up to 28%</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Special Beauty Packages & Custom Combos
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#4A4A4A] leading-relaxed font-light">
                Combine bridal makeup, hair smoothening, glowing facials, and spa care into discounted 
                combo packages with clear pricing and guaranteed savings.
              </p>
            </div>

            {/* Actions: Tab Selector & Management Trigger */}
            <div className="flex flex-wrap items-center gap-3">
              {onOpenManagement && (
                <button
                  onClick={onOpenManagement}
                  className="px-4 py-2 text-xs font-bold text-[#0F172A] bg-white border border-[#D09A40]/40 hover:border-[#D09A40] hover:bg-[#FAF5E5] rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#D09A40]" />
                  <span>Manage Packages</span>
                </button>
              )}

              {/* Tab Selector: Curated vs Custom Builder */}
              <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#0F172A]/10 shadow-xs">
                <button
                  onClick={() => setActiveTab('curated')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'curated'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-[#4A4A4A] hover:text-[#0F172A]'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'curated' ? 'text-[#D09A40]' : 'text-[#4A4A4A]'}`} />
                  <span>Special Packages ({displayPackages.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('custom')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'custom'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-[#4A4A4A] hover:text-[#0F172A]'
                  }`}
                >
                  <SlidersHorizontal className={`w-3.5 h-3.5 ${activeTab === 'custom' ? 'text-[#D09A40]' : 'text-[#4A4A4A]'}`} />
                  <span>Create Your Own Combo</span>
                  <span className="text-[10px] bg-[#D09A40] text-white px-1.5 py-0.2 rounded font-mono font-bold">
                    Up to 20% OFF
                  </span>
                </button>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* Tab 1: Signature Curated Packages Grid */}
        {activeTab === 'curated' && (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {displayPackages.map((pkg, index) => {
              const isRulesOpen = expandedRulesId === pkg.id;
              return (
                <RevealOnScroll key={pkg.id} delay={index * 0.1} duration={0.6}>
                  <div className="bg-white rounded-2xl border border-[#0F172A]/10 overflow-hidden hover:border-[#D09A40] luxe-card-hover flex flex-col justify-between group h-full">
                    <div>
                      {/* Photo & Badge Carrier */}
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
                        <img
                          src={pkg.image}
                          alt={`${pkg.name} - Beauty Zone Jaipur package`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover luxe-img-zoom"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />

                        {/* Top Savings Badge & Duration */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className="px-3 py-1 bg-[#D09A40] text-white text-xs font-bold rounded-lg shadow-sm">
                            Save ₹{pkg.savings.toLocaleString('en-IN')} ({pkg.discount}% OFF)
                          </span>
                          <span className="px-2.5 py-1 bg-black/60 backdrop-blur-xs text-[#FAF5E5] text-xs font-mono font-medium rounded-lg flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#D09A40]" />
                            <span>{pkg.duration}</span>
                          </span>
                        </div>

                        {/* Bottom Title in Scrim */}
                        <div className="absolute bottom-3 left-4 right-4 text-white">
                          <div className="flex items-center gap-2 text-xs font-mono text-[#FAF5E5]/90 uppercase">
                            {pkg.offer_name && (
                              <span className="px-2 py-0.5 bg-[#D09A40] text-[#0F172A] font-bold rounded text-[10px]">
                                {pkg.offer_name}
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5 text-[#D09A40]" />
                              <span>Validity: {pkg.validity}</span>
                            </div>
                          </div>
                          <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mt-1">
                            {pkg.name}
                          </h3>
                          {pkg.tagline && (
                            <p className="text-xs text-[#FAF5E5]/90 italic line-clamp-1 mt-0.5">
                              "{pkg.tagline}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="p-6">
                        <p className="text-xs sm:text-sm text-[#4A4A4A] leading-relaxed font-light">
                          {pkg.description}
                        </p>

                        {/* Included Services Checklist */}
                        <div className="mt-5 space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                            Services Included in this Package ({pkg.services.length}):
                          </p>
                          <ul className="space-y-2">
                            {pkg.services.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-xs text-[#0F172A]/90">
                                <Check className="w-4 h-4 text-[#D09A40] shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Outlets Tags */}
                        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center gap-2 text-xs text-[#4A4A4A]">
                          <MapPin className="w-3.5 h-3.5 text-[#D09A40] shrink-0" />
                          <span className="truncate">Valid at: {pkg.outlets.join(', ')}</span>
                        </div>

                        {/* Usage Rules Expandable Accordion */}
                        <div className="mt-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setExpandedRulesId(isRulesOpen ? null : pkg.id)}
                            className="text-[11px] font-semibold text-[#D09A40] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isRulesOpen ? 'Hide Terms & Rules' : `View Terms & Rules (${pkg.usage_rules.length})`}</span>
                            {isRulesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isRulesOpen && (
                            <div className="mt-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-[#4A4A4A] space-y-1.5 animate-in fade-in duration-200">
                              {pkg.usage_rules.map((rule, rIdx) => (
                                <div key={rIdx} className="flex items-start gap-1.5">
                                  <span className="text-[#D09A40] font-bold">•</span>
                                  <span>{rule}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pricing & Booking Action Footer */}
                    <div className="p-6 pt-4 bg-[#FAF5E5]/50 border-t border-[#0F172A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl sm:text-3xl font-bold text-[#0F172A] tabular-nums">
                            ₹{pkg.package_price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-sm text-neutral-400 line-through tabular-nums">
                            ₹{pkg.regular_price.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded mt-1 inline-block">
                          Your Savings: ₹{pkg.savings.toLocaleString('en-IN')} ({pkg.discount}% OFF)
                        </span>
                      </div>

                      <button
                        onClick={() => handleBookCurated(pkg)}
                        className="px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl luxe-btn shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        <CalendarCheck className="w-4 h-4" />
                        <span>Book Package</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        )}

        {/* Tab 2: Custom Bundle Builder */}
        {activeTab === 'custom' && (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 Cols: Service Selection Catalog */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-2xl border border-[#0F172A]/10 p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-[#0F172A]/10">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0F172A]">
                      Select Services to Create Your Combo
                    </h3>
                    <p className="text-xs text-[#4A4A4A] mt-0.5">
                      Choose 2 services for 10% off, 3 for 15% off, and 4 or more for 20% off.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#D09A40] bg-[#FAF5E5] px-2.5 py-1 rounded-md">
                    {selectedCustomServiceIds.length} Selected
                  </span>
                </div>

                {/* Services List */}
                <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {SALON_SERVICES.map((service) => {
                    const isSelected = selectedCustomServiceIds.includes(service.id);
                    return (
                      <div
                        key={service.id}
                        onClick={() => toggleCustomService(service.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          isSelected
                            ? 'bg-[#FAF5E5] border-[#D09A40] shadow-xs'
                            : 'bg-white border-[#0F172A]/10 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                            isSelected ? 'bg-[#D09A40] border-[#D09A40] text-white' : 'border-neutral-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-[#D09A40] uppercase tracking-wider">
                                {service.category}
                              </span>
                              <span className="text-[11px] text-neutral-400 font-mono">
                                {service.duration}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs sm:text-sm text-[#0F172A] truncate">
                              {service.title}
                            </h4>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-sm text-[#0F172A] font-mono">
                            ₹{service.price.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Price Estimator */}
            <div className="lg:col-span-5">
              <div className="sticky top-28 bg-white rounded-2xl border border-[#0F172A]/10 p-6 shadow-xl space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] uppercase tracking-wider mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Instant Price Calculation</span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#0F172A]">
                    Your Custom Combo Summary
                  </h3>
                </div>

                {/* Selected Treatments */}
                <div className="space-y-2 border-y border-[#0F172A]/10 py-4 max-h-48 overflow-y-auto">
                  {selectedCustomServices.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span className="text-[#0F172A] font-medium truncate max-w-[200px]">• {s.title}</span>
                      <span className="font-mono text-[#4A4A4A]">₹{s.price.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                {/* Pricing Calculations */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[#4A4A4A]">
                    <span>Total Regular Price:</span>
                    <span className="font-mono">₹{customSubtotal.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-center text-emerald-800 font-semibold bg-emerald-50 px-2 py-1.5 rounded-lg">
                    <span>Combo Discount ({discountPercent}%):</span>
                    <span className="font-mono">- ₹{customSavings.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-[#0F172A]/10 text-base font-bold text-[#0F172A]">
                    <span>Final Package Price:</span>
                    <span className="text-2xl font-mono text-[#0F172A]">
                      ₹{customFinalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBookCustom}
                  className="w-full py-3.5 text-xs sm:text-sm font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Book Custom Package</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
