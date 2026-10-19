import React, { useState, useEffect } from 'react';
import {
  X,
  Palette,
  Building2,
  Sparkles,
  Phone,
  MapPin,
  LayoutGrid,
  Download,
  Upload,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Crown,
  Gem,
  Scissors,
  Flower2,
  Heart,
  Star,
  Copy,
  FileText,
  Eye,
  EyeOff,
  Globe,
  Languages,
} from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import {
  WHITE_LABEL_PRESETS,
  THEME_PRESETS,
  FONT_PAIRINGS,
} from '../data/whiteLabelConfig';
import { BrandLogoIcon, SalonBranch, LocalityZone, FAQItem } from '../types';
import { LanguagesTab } from './customizer/LanguagesTab';
import { DomainSeoTab } from './customizer/DomainSeoTab';

export const BrandEmblemIcon: React.FC<{
  icon: BrandLogoIcon;
  className?: string;
}> = ({ icon, className = 'w-5 h-5' }) => {
  switch (icon) {
    case 'crown':
      return <Crown className={className} />;
    case 'gem':
      return <Gem className={className} />;
    case 'scissors':
      return <Scissors className={className} />;
    case 'flower':
      return <Flower2 className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'sparkles':
    default:
      return <Sparkles className={className} />;
  }
};

type CustomizerTab =
  | 'presets'
  | 'identity'
  | 'theme'
  | 'content'
  | 'contact'
  | 'locations'
  | 'sections'
  | 'languages'
  | 'domain'
  | 'export';

export const WhiteLabelCustomizer: React.FC = () => {
  const {
    brand,
    updateBrand,
    updateTheme,
    updateSections,
    applyPreset,
    resetToDefault,
    exportConfigJson,
    importConfigJson,
    isCustomizerOpen,
    setIsCustomizerOpen,
    customizerInitialTab,
  } = useBrand();

  const [activeTab, setActiveTab] = useState<CustomizerTab>('presets');
  const [copiedJson, setCopiedJson] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isCustomizerOpen && customizerInitialTab) {
      setActiveTab(customizerInitialTab as CustomizerTab);
    }
  }, [isCustomizerOpen, customizerInitialTab]);

  if (!isCustomizerOpen) return null;

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoaded: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onLoaded(reader.result);
        triggerToast('Image uploaded and applied!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBranchChange = (
    idx: number,
    field: keyof SalonBranch,
    value: any
  ) => {
    const updated = [...brand.branches];
    updated[idx] = { ...updated[idx], [field]: value };
    updateBrand({ branches: updated });
  };

  const handleAddBranch = () => {
    const newBranch: SalonBranch = {
      id: `branch-${Date.now()}`,
      name: `${brand.cityName} New Studio Branch`,
      locality: 'Central Avenue',
      address: `Plot 21, Main Boulevard, ${brand.cityName}`,
      phone: brand.phoneDisplay,
      whatsapp: brand.phoneDisplay,
      timings: '10:00 AM – 8:30 PM (Open All 7 Days)',
      googleRating: 4.9,
      reviewCount: 450,
      amenities: ['Private Bridal Room', 'Valet Parking', 'Refreshment Lounge'],
      isFlagship: false,
    };
    updateBrand({ branches: [...brand.branches, newBranch] });
    triggerToast('New salon branch added!');
  };

  const handleRemoveBranch = (idx: number) => {
    if (brand.branches.length <= 1) return;
    const updated = brand.branches.filter((_, i) => i !== idx);
    updateBrand({ branches: updated });
  };

  const handleLocalityChange = (
    idx: number,
    field: keyof LocalityZone,
    value: any
  ) => {
    const updated = [...brand.localities];
    updated[idx] = { ...updated[idx], [field]: value };
    updateBrand({ localities: updated });
  };

  const handleAddLocality = () => {
    updateBrand({
      localities: [
        ...brand.localities,
        { name: 'New Service Locality', distanceKm: 5, zone: 'City Zone' },
      ],
    });
  };

  const handleRemoveLocality = (idx: number) => {
    if (brand.localities.length <= 1) return;
    updateBrand({
      localities: brand.localities.filter((_, i) => i !== idx),
    });
  };

  const handleFaqChange = (idx: number, field: keyof FAQItem, value: string) => {
    const updated = [...brand.faqs];
    updated[idx] = { ...updated[idx], [field]: value };
    updateBrand({ faqs: updated });
  };

  const handleAddFaq = () => {
    updateBrand({
      faqs: [
        ...brand.faqs,
        {
          question: 'How do I book an appointment?',
          answer: 'Use our online booking calculator or message us on WhatsApp for instant confirmation.',
          category: 'Booking',
        },
      ],
    });
  };

  const handleRemoveFaq = (idx: number) => {
    if (brand.faqs.length <= 1) return;
    updateBrand({
      faqs: brand.faqs.filter((_, i) => i !== idx),
    });
  };

  const handleDownloadJson = () => {
    const json = exportConfigJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brand.brandName.toLowerCase().replace(/\s+/g, '-')}-whitelabel-config.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('White-label configuration JSON downloaded!');
  };

  const TABS: { id: CustomizerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'presets', label: '1-Click Brand Presets', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'identity', label: 'Brand & Logo', icon: <Building2 className="w-4 h-4" /> },
    { id: 'theme', label: 'Colors & Fonts', icon: <Palette className="w-4 h-4" /> },
    { id: 'content', label: 'Hero, Bridal & Founder', icon: <FileText className="w-4 h-4" /> },
    { id: 'contact', label: 'Contact, UPI & Pricing', icon: <Phone className="w-4 h-4" /> },
    { id: 'locations', label: 'Branches, Zones & FAQs', icon: <MapPin className="w-4 h-4" /> },
    { id: 'sections', label: 'Section Toggles', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'languages', label: 'Languages (i18n)', icon: <Languages className="w-4 h-4" /> },
    { id: 'domain', label: 'Domain & SEO', icon: <Globe className="w-4 h-4" /> },
    { id: 'export', label: 'Export / Import JSON', icon: <Download className="w-4 h-4" /> },
  ];

  const LOGO_ICONS: { id: BrandLogoIcon; label: string }[] = [
    { id: 'sparkles', label: 'Sparkles' },
    { id: 'crown', label: 'Royal Crown' },
    { id: 'gem', label: 'Diamond Gem' },
    { id: 'scissors', label: 'Salon Scissors' },
    { id: 'flower', label: 'Botanical Lotus' },
    { id: 'heart', label: 'Wellness Heart' },
    { id: 'star', label: 'Luxury Star' },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200">
        {/* Top Header */}
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D09A40] text-[#0F172A] flex items-center justify-center font-bold shadow-md">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold tracking-wide text-white">
                  White-Label Brand Studio
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#D09A40]/20 text-[#D09A40] border border-[#D09A40]/40 rounded-full">
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Active Brand: <strong className="text-white">{brand.brandName}</strong> ({brand.cityName} · {brand.currencySymbol} {brand.currencyCode})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetToDefault();
                triggerToast('Reset to default White-Label configuration');
              }}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset to default white-label config"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Default</span>
            </button>
            <button
              onClick={() => setIsCustomizerOpen(false)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Close White-Label Customizer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast feedback */}
        {toastMsg && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm">
            <Check className="w-4 h-4" />
            {toastMsg}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {/* TAB 1: 1-CLICK BRAND PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Instant 1-Click Salon Brand Presets
                </h3>
                <p className="text-xs text-slate-600 mb-4">
                  Test how this white-label platform adapts to any salon brand, city, currency, color palette, and branch network in a single click.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {WHITE_LABEL_PRESETS.map((preset) => {
                    const isSelected = brand.presetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => {
                          applyPreset(preset.id);
                          triggerToast(`Activated "${preset.label}" brand preset!`);
                        }}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#D09A40] bg-[#FAF5E5]/60 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                              {preset.badge}
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <Check className="w-3.5 h-3.5" /> Active
                              </span>
                            )}
                          </div>

                          <h4 className="font-serif text-lg font-bold text-slate-900">
                            {preset.label}
                          </h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {preset.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs"
                              style={{ backgroundColor: preset.config.theme.primaryColor }}
                              title="Primary Color"
                            />
                            <span
                              className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs"
                              style={{ backgroundColor: preset.config.theme.accentColor }}
                              title="Accent Color"
                            />
                            <span
                              className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs"
                              style={{ backgroundColor: preset.config.theme.bgColor }}
                              title="Canvas Color"
                            />
                            <span className="text-[11px] text-slate-500 ml-1 font-medium">
                              {preset.config.cityName} · {preset.config.currencySymbol}
                            </span>
                          </div>

                          <span className="text-xs font-bold text-[#D09A40] hover:underline">
                            {isSelected ? 'Selected' : 'Apply Preset →'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRAND IDENTITY & LOGO */}
          {activeTab === 'identity' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Brand Name & Positioning
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Salon / Brand Name
                    </label>
                    <input
                      type="text"
                      value={brand.brandName}
                      onChange={(e) => updateBrand({ brandName: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#D09A40]"
                      placeholder="e.g. Lumina Luxe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Brand Subtitle (Under Logo)
                    </label>
                    <input
                      type="text"
                      value={brand.brandSubtext}
                      onChange={(e) => updateBrand({ brandSubtext: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#D09A40]"
                      placeholder="e.g. Luxury Salon & Bridal Studio"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Brand Tagline
                    </label>
                    <input
                      type="text"
                      value={brand.tagline}
                      onChange={(e) => updateBrand({ tagline: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#D09A40]"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Emblem or Custom Logo Upload */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Logo Icon or Custom Image Logo
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Choose Vector Emblem Icon
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LOGO_ICONS.map((item) => {
                      const active = brand.logoIcon === item.id && !brand.logoUrl;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => updateBrand({ logoIcon: item.id, logoUrl: '' })}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                            active
                              ? 'bg-[#0F172A] text-white border-[#0F172A]'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <BrandEmblemIcon icon={item.id} className="w-4 h-4 text-[#D09A40]" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Custom Logo Image URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={brand.logoUrl}
                      onChange={(e) => updateBrand({ logoUrl: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#D09A40]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Or Upload Logo File (PNG/JPG/SVG)
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        Upload Logo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleImageUpload(e, (dataUrl) => updateBrand({ logoUrl: dataUrl }))
                          }
                          className="hidden"
                        />
                      </label>
                      {brand.logoUrl && (
                        <button
                          type="button"
                          onClick={() => updateBrand({ logoUrl: '' })}
                          className="text-xs text-rose-600 hover:underline font-medium cursor-pointer"
                        >
                          Remove Image Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Currency */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#D09A40]" />
                  City, Region & Multi-Currency Settings
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Primary City Name
                    </label>
                    <input
                      type="text"
                      value={brand.cityName}
                      onChange={(e) => updateBrand({ cityName: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                      placeholder="e.g. Mumbai / New Delhi / London"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      State / Region
                    </label>
                    <input
                      type="text"
                      value={brand.stateName}
                      onChange={(e) => updateBrand({ stateName: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Established Year
                    </label>
                    <input
                      type="text"
                      value={brand.establishedYear}
                      onChange={(e) => updateBrand({ establishedYear: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Currency Preset
                    </label>
                    <select
                      value={brand.currencyCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        const map: Record<string, string> = {
                          INR: '₹',
                          USD: '$',
                          EUR: '€',
                          GBP: '£',
                          AED: 'AED ',
                        };
                        updateBrand({
                          currencyCode: code,
                          currencySymbol: map[code] || '₹',
                        });
                      }}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    >
                      <option value="INR">INR (₹ Indian Rupee)</option>
                      <option value="USD">USD ($ US Dollar)</option>
                      <option value="EUR">EUR (€ Euro)</option>
                      <option value="GBP">GBP (£ British Pound)</option>
                      <option value="AED">AED (UAE Dirham)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Custom Currency Symbol
                    </label>
                    <input
                      type="text"
                      value={brand.currencySymbol}
                      onChange={(e) => updateBrand({ currencySymbol: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COLORS & FONTS */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Curated Color Palettes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {THEME_PRESETS.map((theme) => {
                    const isCurrent = brand.theme.id === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          updateTheme(theme);
                          triggerToast(`Applied "${theme.name}" color palette!`);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isCurrent
                            ? 'border-[#D09A40] bg-amber-50/40 ring-2 ring-[#D09A40]/30'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="w-6 h-6 rounded-full border border-black/10"
                            style={{ backgroundColor: theme.primaryColor }}
                          />
                          <span
                            className="w-6 h-6 rounded-full border border-black/10"
                            style={{ backgroundColor: theme.accentColor }}
                          />
                          <span
                            className="w-6 h-6 rounded-full border border-black/10"
                            style={{ backgroundColor: theme.bgColor }}
                          />
                        </div>
                        <div className="text-xs font-bold text-slate-900">{theme.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Hex Color Pickers */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Fine-Tune Custom Brand Colors
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Primary Dark / Header (`--wl-primary`)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brand.theme.primaryColor}
                        onChange={(e) =>
                          updateTheme({ id: 'custom', primaryColor: e.target.value })
                        }
                        className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={brand.theme.primaryColor}
                        onChange={(e) =>
                          updateTheme({ id: 'custom', primaryColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Brand Accent / CTA (`--wl-accent`)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brand.theme.accentColor}
                        onChange={(e) =>
                          updateTheme({ id: 'custom', accentColor: e.target.value })
                        }
                        className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={brand.theme.accentColor}
                        onChange={(e) =>
                          updateTheme({ id: 'custom', accentColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Accent Hover (`--wl-accent-hover`)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brand.theme.accentHoverColor}
                        onChange={(e) =>
                          updateTheme({ id: 'custom', accentHoverColor: e.target.value })
                        }
                        className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={brand.theme.accentHoverColor}
                        onChange={(e) =>
                          updateTheme({ id: 'custom', accentHoverColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Page Background Canvas (`--wl-bg`)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brand.theme.bgColor}
                        onChange={(e) =>
                          updateTheme({ id: 'custom', bgColor: e.target.value })
                        }
                        className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={brand.theme.bgColor}
                        onChange={(e) =>
                          updateTheme({ id: 'custom', bgColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Body Text Color (`--wl-text-muted`)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brand.theme.textMutedColor}
                        onChange={(e) =>
                          updateTheme({ id: 'custom', textMutedColor: e.target.value })
                        }
                        className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={brand.theme.textMutedColor}
                        onChange={(e) =>
                          updateTheme({ id: 'custom', textMutedColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography Pairings */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Typography Font Pairing
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {FONT_PAIRINGS.map((fp) => {
                    const active = brand.theme.fontHeading === fp.fontHeading;
                    return (
                      <button
                        key={fp.id}
                        type="button"
                        onClick={() =>
                          updateTheme({
                            fontHeading: fp.fontHeading,
                            fontBody: fp.fontBody,
                          })
                        }
                        className={`p-4 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                          active
                            ? 'border-[#D09A40] bg-amber-50/30'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div
                            className="text-base font-bold text-slate-900"
                            style={{ fontFamily: fp.fontHeading }}
                          >
                            {fp.label}
                          </div>
                          <div
                            className="text-xs text-slate-500 mt-0.5"
                            style={{ fontFamily: fp.fontBody }}
                          >
                            The quick brown fox jumps over the lazy dog — 100% Authentic Luxury Care
                          </div>
                        </div>
                        {active && <Check className="w-4 h-4 text-[#D09A40]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HERO, BRIDAL & FOUNDER COPY */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Hero Content */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Hero Spotlight Content
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Top Trust Pill Text
                    </label>
                    <input
                      type="text"
                      value={brand.heroBadgeText}
                      onChange={(e) => updateBrand({ heroBadgeText: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Headline Line 1
                    </label>
                    <input
                      type="text"
                      value={brand.heroHeadlineLine1}
                      onChange={(e) => updateBrand({ heroHeadlineLine1: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Highlighted Italic Word(s)
                    </label>
                    <input
                      type="text"
                      value={brand.heroHeadlineHighlight}
                      onChange={(e) => updateBrand({ heroHeadlineHighlight: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Headline Line 2
                    </label>
                    <input
                      type="text"
                      value={brand.heroHeadlineLine2}
                      onChange={(e) => updateBrand({ heroHeadlineLine2: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hero Description Paragraph
                    </label>
                    <textarea
                      rows={2}
                      value={brand.heroDescription}
                      onChange={(e) => updateBrand({ heroDescription: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hero Image URL
                    </label>
                    <input
                      type="text"
                      value={brand.heroImage}
                      onChange={(e) => updateBrand({ heroImage: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Upload Hero Photo
                    </label>
                    <label className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      Choose Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleImageUpload(e, (url) => updateBrand({ heroImage: url }))
                        }
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hero Promo Banner Pill
                    </label>
                    <input
                      type="text"
                      value={brand.heroPromoPillText}
                      onChange={(e) => updateBrand({ heroPromoPillText: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Founder Section */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Founder / Creative Director Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Founder Name
                    </label>
                    <input
                      type="text"
                      value={brand.founderName}
                      onChange={(e) => updateBrand({ founderName: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Founder Role / Title
                    </label>
                    <input
                      type="text"
                      value={brand.founderRole}
                      onChange={(e) => updateBrand({ founderRole: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Experience Badge
                    </label>
                    <input
                      type="text"
                      value={brand.founderExperienceBadge}
                      onChange={(e) => updateBrand({ founderExperienceBadge: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Founder Quote Headline
                    </label>
                    <input
                      type="text"
                      value={brand.founderQuoteHeadline}
                      onChange={(e) => updateBrand({ founderQuoteHeadline: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Founder Bio Paragraph 1
                    </label>
                    <textarea
                      rows={2}
                      value={brand.founderBioParagraph1}
                      onChange={(e) => updateBrand({ founderBioParagraph1: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Loyalty, Gift Card & Footer */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Loyalty Club, Gift Cards & Footer Copy
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Loyalty Club Name
                    </label>
                    <input
                      type="text"
                      value={brand.loyaltyClubName}
                      onChange={(e) => updateBrand({ loyaltyClubName: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Digital Gift Card Section Title
                    </label>
                    <input
                      type="text"
                      value={brand.giftCardTitle}
                      onChange={(e) => updateBrand({ giftCardTitle: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Footer Brand Description
                    </label>
                    <input
                      type="text"
                      value={brand.footerDescription}
                      onChange={(e) => updateBrand({ footerDescription: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Footer Copyright Notice
                    </label>
                    <input
                      type="text"
                      value={brand.copyrightText}
                      onChange={(e) => updateBrand({ copyrightText: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CONTACT, SOCIALS, UPI & BOOKING RULES */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Phone, WhatsApp, Email & Social Links
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Display Phone Number
                    </label>
                    <input
                      type="text"
                      value={brand.phoneDisplay}
                      onChange={(e) =>
                        updateBrand({
                          phoneDisplay: e.target.value,
                          phoneRaw: e.target.value.replace(/[^0-9]/g, ''),
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      WhatsApp Booking Number (with country code, digits only)
                    </label>
                    <input
                      type="text"
                      value={brand.whatsappNumber}
                      onChange={(e) =>
                        updateBrand({ whatsappNumber: e.target.value.replace(/[^0-9]/g, '') })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Concierge / Support Email
                    </label>
                    <input
                      type="email"
                      value={brand.email}
                      onChange={(e) => updateBrand({ email: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Instagram Handle
                    </label>
                    <input
                      type="text"
                      value={brand.instagramHandle}
                      onChange={(e) => updateBrand({ instagramHandle: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Instagram Profile URL
                    </label>
                    <input
                      type="text"
                      value={brand.instagramUrl}
                      onChange={(e) => updateBrand({ instagramUrl: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      YouTube Channel URL
                    </label>
                    <input
                      type="text"
                      value={brand.youtubeUrl}
                      onChange={(e) => updateBrand({ youtubeUrl: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Payments, Voucher Prefixes & Doorstep Travel Calculator
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Merchant UPI ID / Payment Handle
                    </label>
                    <input
                      type="text"
                      value={brand.upiId}
                      onChange={(e) => updateBrand({ upiId: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Booking Code Prefix
                    </label>
                    <input
                      type="text"
                      value={brand.bookingPrefix}
                      onChange={(e) => updateBrand({ bookingPrefix: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Gift Card Code Prefix
                    </label>
                    <input
                      type="text"
                      value={brand.giftCardPrefix}
                      onChange={(e) => updateBrand({ giftCardPrefix: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Home Visit Base Fee ({brand.currencySymbol})
                    </label>
                    <input
                      type="number"
                      value={brand.homeServiceBaseFee}
                      onChange={(e) =>
                        updateBrand({ homeServiceBaseFee: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Per-KM Travel Charge ({brand.currencySymbol}/km)
                    </label>
                    <input
                      type="number"
                      value={brand.homeServicePerKmRate}
                      onChange={(e) =>
                        updateBrand({ homeServicePerKmRate: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Advance Deposit Required (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={brand.advancePercentage}
                      onChange={(e) =>
                        updateBrand({ advancePercentage: Number(e.target.value) || 25 })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BRANCHES, LOCALITIES & FAQS */}
          {activeTab === 'locations' && (
            <div className="space-y-6">
              {/* Salon Branches */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Salon Studio Branches ({brand.branches.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Manage branches shown in Locations, Navbar, Packages, and Booking selectors.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBranch}
                    className="px-3 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Branch
                  </button>
                </div>

                <div className="space-y-4">
                  {brand.branches.map((branch, idx) => (
                    <div
                      key={branch.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Branch #{idx + 1}: {branch.name}
                        </span>
                        {brand.branches.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBranch(idx)}
                            className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={branch.name}
                          onChange={(e) => handleBranchChange(idx, 'name', e.target.value)}
                          placeholder="Branch Name"
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={branch.locality}
                          onChange={(e) => handleBranchChange(idx, 'locality', e.target.value)}
                          placeholder="Locality / Neighborhood"
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={branch.address}
                          onChange={(e) => handleBranchChange(idx, 'address', e.target.value)}
                          placeholder="Full Street Address"
                          className="sm:col-span-2 px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={branch.phone}
                          onChange={(e) => handleBranchChange(idx, 'phone', e.target.value)}
                          placeholder="Branch Phone"
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={branch.timings}
                          onChange={(e) => handleBranchChange(idx, 'timings', e.target.value)}
                          placeholder="Timings"
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doorstep Localities */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Doorstep Home Service Localities & Distance Zones ({brand.localities.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Used by the Home Service Travel Fee Calculator in the Booking section.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLocality}
                    className="px-3 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Zone
                  </button>
                </div>

                <div className="space-y-2">
                  {brand.localities.map((loc, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={loc.name}
                        onChange={(e) => handleLocalityChange(idx, 'name', e.target.value)}
                        className="col-span-6 px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                        placeholder="Locality Name"
                      />
                      <input
                        type="text"
                        value={loc.zone}
                        onChange={(e) => handleLocalityChange(idx, 'zone', e.target.value)}
                        className="col-span-3 px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                        placeholder="Zone"
                      />
                      <div className="col-span-2 flex items-center gap-1">
                        <input
                          type="number"
                          value={loc.distanceKm}
                          onChange={(e) =>
                            handleLocalityChange(idx, 'distanceKm', Number(e.target.value) || 1)
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                        />
                        <span className="text-[10px] text-slate-500">km</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLocality(idx)}
                        className="col-span-1 text-rose-500 hover:text-rose-700 flex justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQs */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    Frequently Asked Questions ({brand.faqs.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddFaq}
                    className="px-3 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add FAQ
                  </button>
                </div>

                <div className="space-y-3">
                  {brand.faqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => handleFaqChange(idx, 'question', e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFaq(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => handleFaqChange(idx, 'answer', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: MODULAR SECTION TOGGLES */}
          {activeTab === 'sections' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Modular Landing Page Section Visibility
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Turn individual modules on or off depending on what your client’s salon offers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    { key: 'showTrustBar', label: 'Trust Highlights Bar' },
                    { key: 'showReels', label: 'Video Reels & Watch Showcase' },
                    { key: 'showPackages', label: 'Curated Combo Packages' },
                    { key: 'showServices', label: 'Services & Pricing Catalog' },
                    { key: 'showBridalSpotlight', label: 'Bridal Studio Spotlight Banner' },
                    { key: 'showGallery', label: 'Before/After Lookbook Gallery' },
                    { key: 'showBooking', label: 'Online Appointment & Price Calculator' },
                    { key: 'showRewards', label: 'VIP Loyalty & Rewards Club' },
                    { key: 'showGiftCards', label: 'Digital Gift Card Studio' },
                    { key: 'showStylists', label: 'Master Stylists & Artists' },
                    { key: 'showFoundersNote', label: 'Founder’s Note & Story' },
                    { key: 'showTestimonials', label: 'Client Reviews & Testimonials' },
                    { key: 'showLocations', label: 'Salon Branches & Map' },
                    { key: 'showFAQ', label: 'FAQ Accordion Section' },
                    { key: 'showFloatingActions', label: 'Floating WhatsApp & Quick Actions' },
                  ] as const
                ).map((item) => {
                  const enabled = brand.sections[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => updateSections({ [item.key]: !enabled })}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        enabled
                          ? 'border-emerald-200 bg-emerald-50/40 text-slate-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      <span className="text-xs font-semibold">{item.label}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          enabled
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {enabled ? (
                          <>
                            <Eye className="w-3 h-3" /> Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Hidden
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 8: LANGUAGES (i18n) */}
          {activeTab === 'languages' && <LanguagesTab />}

          {/* TAB 9: CUSTOM DOMAIN & SEO */}
          {activeTab === 'domain' && <DomainSeoTab />}

          {/* TAB 10: EXPORT / IMPORT JSON */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Export White-Label Configuration (JSON)
                </h3>
                <p className="text-xs text-slate-600">
                  Download or copy your complete white-label brand setup (colors, fonts, branches, copy, pricing rules, and FAQs) to deploy for a client.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="px-4 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-bold flex items-center gap-2 hover:bg-slate-800 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#D09A40]" />
                    Download Brand JSON File
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(exportConfigJson());
                      setCopiedJson(true);
                      setTimeout(() => setCopiedJson(false), 2500);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" /> Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy JSON to Clipboard
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Import Brand Configuration JSON
                </h3>
                <textarea
                  rows={6}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste your exported WhiteLabelConfig JSON here..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono bg-slate-50"
                />
                {importFeedback && (
                  <div
                    className={`p-3 rounded-lg text-xs font-semibold ${
                      importFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {importFeedback.message}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const res = importConfigJson(importText);
                    if (res.success) {
                      setImportFeedback({
                        type: 'success',
                        message: 'Brand configuration imported and applied!',
                      });
                      setImportText('');
                    } else {
                      setImportFeedback({
                        type: 'error',
                        message: res.error || 'Invalid JSON configuration.',
                      });
                    }
                  }}
                  disabled={!importText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#D09A40] text-[#0F172A] text-xs font-bold flex items-center gap-2 hover:bg-[#DCA54A] disabled:opacity-50 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Apply Imported Configuration
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            All changes auto-save to browser storage & update live across the app.
          </div>
          <button
            type="button"
            onClick={() => setIsCustomizerOpen(false)}
            className="px-5 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Done & Preview Site
          </button>
        </div>
      </div>
    </div>
  );
};
