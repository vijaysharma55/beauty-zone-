import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CURATED_BUNDLES } from '../data/bundlesData';
import { SALON_SERVICES } from '../data/salonData';
import { SalonPackage, ServiceItem } from '../types';
import { RevealOnScroll } from './RevealOnScroll';
import { useBrand } from '../context/BrandContext';
import { SmartImage } from './crud/SmartImage';
import { ItemActions } from './crud/ItemActions';
import { CardEditorModal, type EditorField } from './crud/CardEditorModal';
import { CrudToast, ManageControls, ManageHint } from './crud/ManageControls';
import { useCardCollection } from './crud/useCardCollection';
import {
  DEFAULT_USAGE_RULES,
  OUTLET_OPTIONS,
  PACKAGE_PRESET_IMAGES,
  VALIDITY_OPTIONS,
  calculateSavings,
} from '../data/packagesData';
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
  /** Persists the full package catalog after an inline create / edit / delete. */
  onUpdatePackages?: (packages: SalonPackage[]) => void;
}

const buildPackageEditorFields = (currentValidity?: string): EditorField[] => {
  const validityOptions = Array.from(
    new Set([...(currentValidity ? [currentValidity] : []), ...VALIDITY_OPTIONS])
  ).map((value) => ({ value, label: value }));

  return [
    {
      key: 'image',
      type: 'image',
      label: 'Package cover image',
      span: 2,
      aspect: 'aspect-[16/9]',
      help: 'The cover is rendered in a fixed-height card frame (h-48) with object-fit: cover, so portrait and landscape uploads both look clean.',
    },
    { key: 'name', type: 'text', label: 'Package name', span: 2, required: true },
    { key: 'tagline', type: 'text', label: 'Tagline', span: 2 },
    { key: 'offer_name', type: 'text', label: 'Badge / offer label' },
    { key: 'duration', type: 'text', label: 'Duration', placeholder: 'e.g. 180 mins' },
    { key: 'description', type: 'textarea', label: 'Description', span: 2, rows: 3, required: true },
    { key: 'regular_price', type: 'number', label: 'Regular price (₹)', min: 0, required: true },
    { key: 'package_price', type: 'number', label: 'Package price (₹)', min: 0, required: true },
    { key: 'validity', type: 'select', label: 'Redemption validity', options: validityOptions },
    {
      key: 'services',
      type: 'tags',
      label: 'Services included',
      span: 2,
      rows: 4,
      separator: 'newline',
      help: 'One included service per line.',
    },
    {
      key: 'outlets',
      type: 'tags',
      label: 'Valid at outlets',
      span: 2,
      separator: 'comma',
      help: 'Separate outlets with commas.',
    },
    {
      key: 'usage_rules',
      type: 'tags',
      label: 'Terms & usage rules',
      span: 2,
      rows: 3,
      separator: 'newline',
      help: 'One rule per line.',
    },
    { key: 'active', type: 'checkbox', label: 'Visible on the website' },
    { key: 'featured', type: 'checkbox', label: 'Feature this package' },
  ];
};

const EMPTY_PACKAGE_IMAGE = PACKAGE_PRESET_IMAGES[0]?.url || '/images/bridal_makeup_jaipur_1790672008691.jpg';

const emptyPackageValues = (): Record<string, any> => ({
  image: EMPTY_PACKAGE_IMAGE,
  name: '',
  tagline: '',
  offer_name: 'Special Offer',
  duration: '120 mins',
  description: '',
  regular_price: 0,
  package_price: 0,
  validity: VALIDITY_OPTIONS[0],
  services: [],
  outlets: [OUTLET_OPTIONS[0]],
  usage_rules: DEFAULT_USAGE_RULES.slice(0, 3),
  active: true,
  featured: false,
});

const packageToEditorValues = (pkg?: SalonPackage): Record<string, any> => {
  if (!pkg) return emptyPackageValues();
  return {
    image: pkg.image,
    name: pkg.name,
    tagline: pkg.tagline || '',
    offer_name: pkg.offer_name || '',
    duration: pkg.duration,
    description: pkg.description,
    regular_price: pkg.regular_price,
    package_price: pkg.package_price,
    validity: pkg.validity,
    services: pkg.services,
    outlets: pkg.outlets,
    usage_rules: pkg.usage_rules,
    active: pkg.active,
    featured: !!pkg.featured,
  };
};

const normalizePackageValues = (
  values: Record<string, any>,
  base?: SalonPackage
): SalonPackage => {
  const regularPrice = Math.max(0, Math.round(Number(values.regular_price) || 0));
  const packagePrice = Math.max(0, Math.round(Number(values.package_price) || 0));
  const { savings, discountPercent } = calculateSavings(regularPrice, packagePrice);

  return {
    ...(base || {
      id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: '',
      description: '',
      services: [],
      duration: '',
      regular_price: 0,
      package_price: 0,
      discount: 0,
      savings: 0,
      validity: VALIDITY_OPTIONS[0],
      usage_rules: [],
      outlets: [],
      image: EMPTY_PACKAGE_IMAGE,
      active: true,
    }),
    image: String(values.image || '').trim() || EMPTY_PACKAGE_IMAGE,
    name: String(values.name || '').trim(),
    tagline: String(values.tagline || '').trim(),
    offer_name: String(values.offer_name || '').trim(),
    duration: String(values.duration || '').trim(),
    description: String(values.description || '').trim(),
    regular_price: regularPrice,
    package_price: packagePrice,
    discount: discountPercent,
    savings,
    validity: String(values.validity || VALIDITY_OPTIONS[0]),
    services: Array.isArray(values.services) ? values.services : [],
    outlets: Array.isArray(values.outlets) ? values.outlets : [],
    usage_rules: Array.isArray(values.usage_rules) ? values.usage_rules : [],
    active: values.active !== false,
    featured: !!values.featured,
  };
};

export const BundledServicesSection: React.FC<BundledServicesSectionProps> = ({ 
  packages,
  onBookBundle,
  onOpenManagement,
  onUpdatePackages,
}) => {
  const { t } = useBrand();
  const [activeTab, setActiveTab] = useState<'curated' | 'custom'>('curated');
  const [expandedRulesId, setExpandedRulesId] = useState<string | null>(null);
  
  // Custom Bundle Builder state
  const [selectedCustomServiceIds, setSelectedCustomServiceIds] = useState<string[]>([
    'b1', // Royal Rajasthani HD Bridal
    's1', // 24K Gold Leaf Facial
  ]);

  // Full source list (fallback only when the prop is genuinely absent) and the
  // active subset shown on the public site.
  const sourcePackages: SalonPackage[] = useMemo(() => {
    if (packages) {
      return packages;
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
        'Valid across selected studio branches',
        'Cannot be transferred to another person once started'
      ],
      outlets: ['All Salon Outlets'],
      image: cb.image,
      active: true,
      featured: cb.popular,
    }));
  }, [packages]);

  const manager = useCardCollection<SalonPackage>(sourcePackages, onUpdatePackages, 'Package');

  const displayPackages = useMemo(
    () => sourcePackages.filter((pkg) => pkg.active || manager.isManaging),
    [sourcePackages, manager.isManaging]
  );

  const removePackage = (id: string) => {
    setExpandedRulesId((current) => (current === id ? null : current));
    manager.removeItem(id);
  };

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
    <section id="bundles" className="py-8 sm:py-16 md:py-24 bg-[#FAF5E5]/60 border-t border-[#0F172A]/10 w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Section Header in Simple Indian English */}
        <RevealOnScroll duration={0.6}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#0F172A]/10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-2">
                <Gift className="w-3.5 h-3.5" />
                <span>{t('packagesOverline')}</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t('packagesTitle')}
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#4A4A4A] leading-relaxed font-light">
                {t('packagesSubtitle')} 
              </p>
            </div>

            {/* Actions: inline card management, dashboard shortcut & tab selector */}
            <div className="flex flex-wrap items-center gap-3">
              {onUpdatePackages && (
                <ManageControls
                  isManaging={manager.isManaging}
                  onToggle={manager.toggleManaging}
                  onAdd={manager.openCreate}
                  addLabel="Add Package"
                />
              )}

              {onOpenManagement && (
                <button
                  onClick={onOpenManagement}
                  className="px-4 py-2 text-xs font-bold text-[#0F172A] bg-white border border-[#D09A40]/40 hover:border-[#D09A40] hover:bg-[#FAF5E5] rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#D09A40]" />
                  <span>Admin Dashboard</span>
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

        <ManageHint isManaging={manager.isManaging} noun="package" />

        {/* Tab 1: Signature Curated Packages — uniform 3-column card grid */}
        {activeTab === 'curated' && (
          <div className="mt-6">
            {displayPackages.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#0F172A]/20 bg-white/70 px-6 py-14 text-center">
                <Gift className="h-10 w-10 text-neutral-300" />
                <h3 className="mt-3 font-serif text-lg font-bold text-[#0F172A]">
                  No active packages right now
                </h3>
                <p className="mt-1 max-w-md text-xs text-[#4A4A4A]">
                  Add a curated combo to fill this space. Every card uses the same fixed cover
                  height, so the grid always stays perfectly aligned.
                </p>
                {manager.canManage && (
                  <button
                    type="button"
                    onClick={manager.openCreate}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#D09A40] hover:text-[#0F172A] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add your first package
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
            {displayPackages.map((pkg, index) => {
              const isRulesOpen = expandedRulesId === pkg.id;
              return (
                <RevealOnScroll key={pkg.id} delay={index * 0.1} duration={0.6} className="h-full min-w-0">
                  <div className="relative w-full h-full bg-white rounded-2xl border border-[#0F172A]/10 overflow-hidden hover:border-[#D09A40] transition-shadow hover:shadow-lg flex flex-col justify-between group shadow-2xs">
                    {manager.canManage && (
                      <ItemActions
                        itemLabel="package"
                        alwaysVisible={manager.isManaging}
                        onEdit={() => manager.openEdit(pkg)}
                        onReplace={() => manager.openReplace(pkg)}
                        onDelete={() => removePackage(pkg.id)}
                      />
                    )}
                    {/* Upper Half: Media & Dynamic Included Services */}
                    <div className="flex-1 flex flex-col">
                      {/* Photo & Badge Carrier */}
                      <div className="relative h-48 w-full overflow-hidden bg-neutral-100 shrink-0">
                        <SmartImage
                          src={pkg.image}
                          alt={`${pkg.name} - Curated Salon Package`}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

                        {/* Top Savings Badge & Duration */}
                        <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-12 flex items-center justify-between gap-2">
                          <span className="px-2.5 sm:px-3 py-1 bg-[#D09A40] text-white text-[11px] sm:text-xs font-bold rounded-lg shadow-sm whitespace-nowrap">
                            Save ₹{pkg.savings.toLocaleString('en-IN')} ({pkg.discount}% OFF)
                          </span>
                          <span className="px-2 sm:px-2.5 py-1 bg-black/80 text-[#FAF5E5] text-[11px] sm:text-xs font-mono font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0">
                            <Clock className="w-3.5 h-3.5 text-[#D09A40]" />
                            <span>{pkg.duration}</span>
                          </span>
                        </div>

                        {/* Bottom Title in Scrim */}
                        <div className="absolute bottom-2.5 sm:bottom-3 left-3 sm:left-4 right-3 sm:right-4 text-white">
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs font-mono text-[#FAF5E5]/90 uppercase">
                            {pkg.offer_name && (
                              <span className="px-2 py-0.5 bg-[#D09A40] text-[#0F172A] font-bold rounded text-[10px] shadow-xs shrink-0">
                                {pkg.offer_name}
                              </span>
                            )}
                            <div className="flex items-center gap-1 shrink-0 bg-black/70 px-1.5 py-0.5 rounded">
                              <Tag className="w-3 h-3 text-[#D09A40]" />
                              <span>{pkg.validity}</span>
                            </div>
                            {pkg.valid_until && (
                              <span className="px-2 py-0.5 bg-rose-600/90 text-white font-bold rounded text-[10px] shadow-xs flex items-center gap-1 shrink-0">
                                <Clock className="w-3 h-3 text-white" />
                                <span>Till {pkg.valid_until}</span>
                              </span>
                            )}
                          </div>
                          <h3 className="font-serif text-lg sm:text-xl md:text-2xl font-bold text-white mt-1 line-clamp-1">
                            {pkg.name}
                          </h3>
                          {pkg.tagline && (
                            <p className="text-xs text-[#FAF5E5]/90 italic line-clamp-1 mt-0.5 font-light">
                              "{pkg.tagline}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Body Content - flex-1 flex flex-col justify-between so footer remains aligned */}
                      <div className="p-4 sm:p-5 lg:p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-[#4A4A4A] leading-relaxed font-light min-h-[36px] line-clamp-3">
                            {pkg.description}
                          </p>

                          {/* Included Services Checklist - flex-1 expands dynamically */}
                          <div className="mt-4 pt-3 border-t border-neutral-100">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-2 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#D09A40]" />
                                <span>Services Included ({pkg.services.length})</span>
                              </span>
                            </p>
                            <ul className="max-h-32 space-y-1.5 overflow-y-auto pr-1 sm:space-y-2">
                              {pkg.services.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs text-[#0F172A]/90">
                                  <Check className="w-4 h-4 text-[#D09A40] shrink-0 mt-0.5" />
                                  <span className="leading-snug">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Outlets & Usage Rules Accordion */}
                        <div className="mt-4 pt-3 border-t border-neutral-100">
                          <div className="flex items-center gap-2 text-xs text-[#4A4A4A]">
                            <MapPin className="w-3.5 h-3.5 text-[#D09A40] shrink-0" />
                            <span className="truncate">Valid at: {pkg.outlets.join(', ')}</span>
                          </div>

                          {/* Usage Rules Expandable Accordion */}
                          <div className="mt-2.5">
                            <button
                              type="button"
                              onClick={() => setExpandedRulesId(isRulesOpen ? null : pkg.id)}
                              className="text-[11px] font-semibold text-[#D09A40] hover:text-[#b38232] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>{isRulesOpen ? 'Hide Terms & Rules' : `View Terms & Rules (${pkg.usage_rules.length})`}</span>
                              {isRulesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {isRulesOpen && (
                              <div className="mt-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-[#4A4A4A] space-y-1.5 animate-in fade-in duration-200 max-h-36 overflow-y-auto">
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
                    </div>

                    {/* Pricing & Booking Action Footer - Unified alignment and no clipping */}
                    <div className="p-4 sm:p-5 lg:p-6 bg-[#FAF5E5]/60 border-t border-[#0F172A]/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-4 shrink-0 mt-auto">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-2xl sm:text-3xl font-bold text-[#0F172A] tabular-nums tracking-tight">
                            ₹{pkg.package_price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs sm:text-sm text-neutral-400 line-through tabular-nums">
                            ₹{pkg.regular_price.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] sm:text-xs font-semibold text-emerald-800 bg-emerald-100/90 border border-emerald-200/60 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                            <span>Save ₹{pkg.savings.toLocaleString('en-IN')}</span>
                            <span className="opacity-80">({pkg.discount}% OFF)</span>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleBookCurated(pkg)}
                        className="w-full sm:w-auto shrink-0 px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap"
                      >
                        <CalendarCheck className="w-4 h-4 text-[#D09A40] shrink-0" />
                        <span>{t('packagesBookCombo')}</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                </RevealOnScroll>
              );
            })}
            </div>
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

        {manager.editorState && (
          <CardEditorModal
            key={manager.editorState.mode === 'edit' ? manager.editorState.item?.id : 'new-package'}
            title={manager.editorState.mode === 'edit' ? 'Edit package' : 'Add a new package'}
            description={
              manager.editorState.mode === 'edit'
                ? `Update “${manager.editorState.item?.name || 'this package'}”. Discount and savings are recalculated automatically.`
                : 'Build a curated combo with pricing, badges, included services and a cover image.'
            }
            fields={buildPackageEditorFields(manager.editorState.item?.validity)}
            initialValues={
              manager.editorState.mode === 'edit'
                ? packageToEditorValues(manager.editorState.item)
                : emptyPackageValues()
            }
            submitLabel={manager.editorState.mode === 'edit' ? 'Save package' : 'Add package'}
            focusImage={manager.editorState.focusImage}
            onClose={manager.closeEditor}
            onSubmit={(values) => {
              const saved = normalizePackageValues(values, manager.editorState?.item);
              manager.saveItem(saved);
              if (saved.active) setActiveTab('curated');
            }}
            validate={(values) => {
              if (Number(values.package_price) > Number(values.regular_price)) {
                return 'The package price cannot be higher than the regular price.';
              }
              return null;
            }}
          />
        )}
        <CrudToast message={manager.notice} />
      </div>
    </section>
  );
};
