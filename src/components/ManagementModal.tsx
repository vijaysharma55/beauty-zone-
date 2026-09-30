import React, { useState, useMemo } from 'react';
import { SalonPackage, GalleryItem, GalleryUploadType } from '../types';
import { 
  OUTLET_OPTIONS, 
  VALIDITY_OPTIONS, 
  DEFAULT_USAGE_RULES, 
  calculateSavings 
} from '../data/packagesData';
import { 
  GALLERY_TYPES, 
  GALLERY_CATEGORIES, 
  GALLERY_SERVICES 
} from '../data/galleryData';
import { 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  Archive, 
  RotateCcw, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Sparkles, 
  Package, 
  Image as ImageIcon, 
  SlidersHorizontal, 
  AlertCircle,
  Clock,
  MapPin,
  CheckCircle2,
  ExternalLink,
  Tag,
  Star,
  Layers,
  FolderHeart,
  Briefcase
} from 'lucide-react';

interface ManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  packages: SalonPackage[];
  galleryItems: GalleryItem[];
  onUpdatePackages: (packages: SalonPackage[]) => void;
  onUpdateGallery: (items: GalleryItem[]) => void;
  initialTab?: 'packages' | 'gallery';
}

export const ManagementModal: React.FC<ManagementModalProps> = ({
  isOpen,
  onClose,
  packages,
  galleryItems,
  onUpdatePackages,
  onUpdateGallery,
  initialTab = 'packages',
}) => {
  const [activeTab, setActiveTab] = useState<'packages' | 'gallery'>(initialTab);

  // ==========================================
  // PACKAGE MANAGEMENT STATE (31)
  // ==========================================
  const [isPackageFormOpen, setIsPackageFormOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  // Form fields for package
  const [pkgName, setPkgName] = useState('');
  const [pkgDescription, setPkgDescription] = useState('');
  const [pkgServices, setPkgServices] = useState<string[]>([]);
  const [newServiceInput, setNewServiceInput] = useState('');
  const [pkgDuration, setPkgDuration] = useState('180 mins');
  const [pkgRegularPrice, setPkgRegularPrice] = useState<number>(15000);
  const [pkgPackagePrice, setPkgPackagePrice] = useState<number>(11999);
  const [pkgValidity, setPkgValidity] = useState('60 Days from purchase');
  const [pkgUsageRules, setPkgUsageRules] = useState<string[]>(DEFAULT_USAGE_RULES.slice(0, 3));
  const [newRuleInput, setNewRuleInput] = useState('');
  const [pkgOutlets, setPkgOutlets] = useState<string[]>(['All Jaipur Outlets']);
  const [pkgImage, setPkgImage] = useState('/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg');
  const [pkgActive, setPkgActive] = useState(true);
  const [pkgFeatured, setPkgFeatured] = useState(false);
  const [pkgFormError, setPkgFormError] = useState<string | null>(null);

  // Live savings calculation
  const calculatedSavings = useMemo(() => {
    return calculateSavings(pkgRegularPrice, pkgPackagePrice);
  }, [pkgRegularPrice, pkgPackagePrice]);

  // Open Add Package Form
  const handleOpenAddPackage = () => {
    setEditingPackageId(null);
    setPkgName('');
    setPkgDescription('');
    setPkgServices([
      'Moroccan Nanoplastia Hair Treatment',
      '24K Gold Leaf Radiance Luxury Facial',
      'Bridal Gel Extensions with Crystal Art'
    ]);
    setPkgDuration('240 mins');
    setPkgRegularPrice(18000);
    setPkgPackagePrice(13999);
    setPkgValidity('60 Days from purchase');
    setPkgUsageRules([
      'Prior appointment mandatory (at least 24 hours in advance)',
      'Valid across selected Jaipur studio locations',
      'Non-transferable to other clients once commenced'
    ]);
    setPkgOutlets(['All Jaipur Outlets']);
    setPkgImage('/src/assets/images/hair_styling_luxe_1790672021591.jpg');
    setPkgActive(true);
    setPkgFeatured(false);
    setPkgFormError(null);
    setIsPackageFormOpen(true);
  };

  // Open Edit Package Form
  const handleOpenEditPackage = (pkg: SalonPackage) => {
    setEditingPackageId(pkg.id);
    setPkgName(pkg.name);
    setPkgDescription(pkg.description);
    setPkgServices([...pkg.services]);
    setPkgDuration(pkg.duration);
    setPkgRegularPrice(pkg.regular_price);
    setPkgPackagePrice(pkg.package_price);
    setPkgValidity(pkg.validity);
    setPkgUsageRules([...pkg.usage_rules]);
    setPkgOutlets([...pkg.outlets]);
    setPkgImage(pkg.image);
    setPkgActive(pkg.active);
    setPkgFeatured(!!pkg.featured);
    setPkgFormError(null);
    setIsPackageFormOpen(true);
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim()) {
      setPkgFormError('Package name is required.');
      return;
    }
    if (pkgServices.length === 0) {
      setPkgFormError('Please add at least one service to the package.');
      return;
    }
    if (pkgPackagePrice <= 0 || pkgRegularPrice <= 0) {
      setPkgFormError('Regular price and package price must be greater than zero.');
      return;
    }
    if (pkgPackagePrice >= pkgRegularPrice) {
      setPkgFormError('Package price must be lower than regular price to provide savings.');
      return;
    }

    const { savings, discountPercent } = calculateSavings(pkgRegularPrice, pkgPackagePrice);

    if (editingPackageId) {
      // Update existing
      const updated = packages.map((p) => {
        if (p.id === editingPackageId) {
          return {
            ...p,
            name: pkgName.trim(),
            description: pkgDescription.trim(),
            services: pkgServices,
            duration: pkgDuration,
            regular_price: pkgRegularPrice,
            package_price: pkgPackagePrice,
            discount: discountPercent,
            savings: savings,
            validity: pkgValidity,
            usage_rules: pkgUsageRules,
            outlets: pkgOutlets,
            image: pkgImage,
            active: pkgActive,
            featured: pkgFeatured,
          };
        }
        return p;
      });
      onUpdatePackages(updated);
    } else {
      // Create new
      const newPkg: SalonPackage = {
        id: `pkg-${Date.now()}`,
        name: pkgName.trim(),
        description: pkgDescription.trim(),
        services: pkgServices,
        duration: pkgDuration,
        regular_price: pkgRegularPrice,
        package_price: pkgPackagePrice,
        discount: discountPercent,
        savings: savings,
        validity: pkgValidity,
        usage_rules: pkgUsageRules,
        outlets: pkgOutlets,
        image: pkgImage,
        active: pkgActive,
        featured: pkgFeatured,
      };
      onUpdatePackages([newPkg, ...packages]);
    }

    setIsPackageFormOpen(false);
  };

  const handleTogglePackageActive = (id: string) => {
    const updated = packages.map((p) => (p.id === id ? { ...p, active: !p.active } : p));
    onUpdatePackages(updated);
  };

  const handleDeletePackage = (id: string) => {
    if (confirm('Are you sure you want to delete this package?')) {
      const updated = packages.filter((p) => p.id !== id);
      onUpdatePackages(updated);
    }
  };

  // Add service pill to package
  const handleAddServicePill = () => {
    if (newServiceInput.trim()) {
      setPkgServices([...pkgServices, newServiceInput.trim()]);
      setNewServiceInput('');
    }
  };

  // Remove service pill
  const handleRemoveServicePill = (idx: number) => {
    setPkgServices(pkgServices.filter((_, i) => i !== idx));
  };

  // Add rule pill
  const handleAddRulePill = () => {
    if (newRuleInput.trim()) {
      setPkgUsageRules([...pkgUsageRules, newRuleInput.trim()]);
      setNewRuleInput('');
    }
  };

  const handleRemoveRulePill = (idx: number) => {
    setPkgUsageRules(pkgUsageRules.filter((_, i) => i !== idx));
  };

  // ==========================================
  // GALLERY MANAGEMENT STATE (32)
  // ==========================================
  const [gallerySubTab, setGallerySubTab] = useState<'active' | 'archived'>('active');
  const [isGalleryFormOpen, setIsGalleryFormOpen] = useState(false);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);

  // Gallery item form fields
  const [galType, setGalType] = useState<GalleryUploadType>('photo');
  const [galTitle, setGalTitle] = useState('');
  const [galDescription, setGalDescription] = useState('');
  const [galCategory, setGalCategory] = useState(GALLERY_CATEGORIES[0]);
  const [galService, setGalService] = useState(GALLERY_SERVICES[0]);
  const [galImage, setGalImage] = useState('/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg');
  const [galBeforeImage, setGalBeforeImage] = useState('/src/assets/images/home_salon_service_1790676110547.jpg');
  const [galSortOrder, setGalSortOrder] = useState<number>(galleryItems.length + 1);
  const [galFeatured, setGalFeatured] = useState(false);
  const [galActive, setGalActive] = useState(true);
  const [galArtist, setGalArtist] = useState('Ananya Sharma (Creative Bridal Director)');
  const [galFormError, setGalFormError] = useState<string | null>(null);

  // Active vs Archived items
  const activeGalleryList = useMemo(() => {
    return galleryItems
      .filter((i) => i.active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [galleryItems]);

  const archivedGalleryList = useMemo(() => {
    return galleryItems
      .filter((i) => !i.active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [galleryItems]);

  // Open Add Gallery Form
  const handleOpenAddGallery = () => {
    setEditingGalleryId(null);
    setGalType('photo');
    setGalTitle('');
    setGalDescription('');
    setGalCategory(GALLERY_CATEGORIES[0]);
    setGalService(GALLERY_SERVICES[0]);
    setGalImage('/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg');
    setGalBeforeImage('/src/assets/images/home_salon_service_1790676110547.jpg');
    setGalSortOrder(activeGalleryList.length + 1);
    setGalFeatured(false);
    setGalActive(true);
    setGalArtist('Ananya Sharma (Creative Bridal Director)');
    setGalFormError(null);
    setIsGalleryFormOpen(true);
  };

  // Open Edit Gallery Form
  const handleOpenEditGallery = (item: GalleryItem) => {
    setEditingGalleryId(item.id);
    setGalType(item.type);
    setGalTitle(item.title);
    setGalDescription(item.description);
    setGalCategory(item.category);
    setGalService(item.service);
    setGalImage(item.image);
    setGalBeforeImage(item.before_image || '/src/assets/images/home_salon_service_1790676110547.jpg');
    setGalSortOrder(item.sort_order);
    setGalFeatured(item.featured);
    setGalActive(item.active);
    setGalArtist(item.artist || 'Beauty Zone Master Artist');
    setGalFormError(null);
    setIsGalleryFormOpen(true);
  };

  // Save Gallery Item (Add / Edit)
  const handleSaveGallery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!galTitle.trim()) {
      setGalFormError('Title is required.');
      return;
    }
    if (!galImage.trim()) {
      setGalFormError('Image URL or preset path is required.');
      return;
    }
    if (galType === 'before_after' && !galBeforeImage.trim()) {
      setGalFormError('Before image is required for Before/After comparison.');
      return;
    }

    if (editingGalleryId) {
      // Edit Action
      const updated = galleryItems.map((g) => {
        if (g.id === editingGalleryId) {
          return {
            ...g,
            type: galType,
            title: galTitle.trim(),
            description: galDescription.trim(),
            category: galCategory,
            service: galService,
            image: galImage.trim(),
            before_image: galType === 'before_after' ? galBeforeImage.trim() : undefined,
            sort_order: Number(galSortOrder),
            featured: galFeatured,
            active: galActive,
            artist: galArtist,
          };
        }
        return g;
      });
      onUpdateGallery(updated);
    } else {
      // Add Action
      const newItem: GalleryItem = {
        id: `gal-${Date.now()}`,
        type: galType,
        title: galTitle.trim(),
        description: galDescription.trim(),
        category: galCategory,
        service: galService,
        image: galImage.trim(),
        before_image: galType === 'before_after' ? galBeforeImage.trim() : undefined,
        sort_order: Number(galSortOrder),
        featured: galFeatured,
        active: galActive,
        artist: galArtist,
        created_at: new Date().toISOString().split('T')[0],
      };
      onUpdateGallery([...galleryItems, newItem]);
    }

    setIsGalleryFormOpen(false);
  };

  // Archive Action (Action: Archive)
  const handleArchiveGalleryItem = (id: string) => {
    const updated = galleryItems.map((g) => {
      if (g.id === id) {
        return { ...g, active: false };
      }
      return g;
    });
    onUpdateGallery(updated);
  };

  // Restore Action (Action: Restore)
  const handleRestoreGalleryItem = (id: string) => {
    const updated = galleryItems.map((g) => {
      if (g.id === id) {
        return { ...g, active: true };
      }
      return g;
    });
    onUpdateGallery(updated);
  };

  // Permanent Delete
  const handleDeletePermanent = (id: string) => {
    if (confirm('Permanently delete this gallery entry?')) {
      const updated = galleryItems.filter((g) => g.id !== id);
      onUpdateGallery(updated);
    }
  };

  // Reorder Actions (Action: Reorder)
  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const list = [...activeGalleryList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap positions
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Reassign normalized sort_order: 1, 2, 3...
    const reorderedActive = list.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));

    // Merge with archived items
    const merged = galleryItems.map((item) => {
      const found = reorderedActive.find((r) => r.id === item.id);
      return found || item;
    });

    onUpdateGallery(merged);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF5E5] rounded-3xl max-w-6xl w-full h-[92vh] flex flex-col shadow-2xl border border-white/40 overflow-hidden text-[#0F172A]">
        {/* Modal Header */}
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D09A40] text-[#0F172A] flex items-center justify-center font-bold shadow-sm">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight">
                  Beauty Zone Admin Dashboard
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D09A40]/20 text-[#D09A40] font-bold border border-[#D09A40]/30">
                  Manager Mode
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                Manage salon packages, combo prices, and real customer photos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher in Header */}
            <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10">
              <button
                onClick={() => setActiveTab('packages')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'packages'
                    ? 'bg-[#D09A40] text-[#0F172A] shadow-sm font-bold'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Packages & Combos ({packages.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('gallery')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'gallery'
                    ? 'bg-[#D09A40] text-[#0F172A] shadow-sm font-bold'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Real Photos ({galleryItems.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white/60">
          {/* ========================================================
              TAB 31: PACKAGE MANAGEMENT
          ======================================================== */}
          {activeTab === 'packages' && (
            <div className="space-y-6">
              {/* Header Strip & Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#0F172A]/10 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase text-[#D09A40]">Packages</span>
                    <h3 className="font-serif text-xl font-bold text-[#0F172A]">Package & Combo Management</h3>
                  </div>
                  <p className="text-xs text-[#4A4A4A] mt-0.5">
                    Add and manage combo packages, durations, validity, salon branches, and discount savings.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden lg:flex items-center gap-4 text-xs font-mono pr-2 border-r border-neutral-200">
                    <div className="text-right">
                      <span className="text-neutral-400 block text-[10px]">ACTIVE PACKAGES</span>
                      <span className="font-bold text-[#0F172A]">{packages.filter(p => p.active).length} / {packages.length}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-neutral-400 block text-[10px]">AVG DISCOUNT</span>
                      <span className="font-bold text-emerald-700">
                        {Math.round(packages.reduce((acc, p) => acc + p.discount, 0) / (packages.length || 1))}% OFF
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenAddPackage}
                    className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Package</span>
                  </button>
                </div>
              </div>

              {/* Package Table / Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                      pkg.active
                        ? 'bg-white border-[#0F172A]/10 shadow-sm hover:border-[#D09A40]'
                        : 'bg-neutral-50 border-neutral-200 opacity-60'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Top status & image row */}
                      <div className="flex items-start gap-4">
                        <img
                          src={pkg.image}
                          alt={pkg.name}
                          referrerPolicy="no-referrer"
                          className="w-20 h-20 rounded-xl object-cover border border-neutral-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                              pkg.active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                            }`}>
                              {pkg.active ? '● Active in Store' : '○ Disabled'}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditPackage(pkg)}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-[#0F172A] hover:bg-neutral-100 transition-colors cursor-pointer"
                                title="Edit Package"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePackage(pkg.id)}
                                className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete Package"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h4 className="font-serif font-bold text-base text-[#0F172A] mt-1 leading-snug truncate">
                            {pkg.name}
                          </h4>
                          <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                            {pkg.description}
                          </p>
                        </div>
                      </div>

                      {/* Pricing Breakdown & Savings Verification */}
                      <div className="bg-[#FAF5E5] rounded-xl p-3 border border-[#D09A40]/30 grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-neutral-500 block">Regular Price</span>
                          <span className="font-mono font-bold text-neutral-400 line-through">
                            ₹{pkg.regular_price.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 block">Package Price</span>
                          <span className="font-mono font-bold text-[#0F172A] text-sm">
                            ₹{pkg.package_price.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-700 font-bold block">Calculated Savings</span>
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded inline-block text-[11px]">
                            ₹{pkg.savings.toLocaleString('en-IN')} ({pkg.discount}%)
                          </span>
                        </div>
                      </div>

                      {/* Services Included */}
                      <div>
                        <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                          Services Included ({pkg.services.length}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {pkg.services.map((srv, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] bg-neutral-100 text-[#0F172A] px-2 py-0.5 rounded-md border border-neutral-200"
                            >
                              {srv}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Validity, Duration & Outlets Metadata */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600 pt-2 border-t border-neutral-100">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#D09A40] shrink-0" />
                          <span className="truncate">Duration: <b>{pkg.duration}</b></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-[#D09A40] shrink-0" />
                          <span className="truncate">Validity: <b>{pkg.validity}</b></span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#D09A40] shrink-0" />
                          <span className="truncate">Outlets: {pkg.outlets.join(', ')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pkg.active}
                          onChange={() => handleTogglePackageActive(pkg.id)}
                          className="rounded text-[#D09A40] focus:ring-[#D09A40]"
                        />
                        <span className="text-[11px] font-medium text-[#4A4A4A]">Active in Booking Store</span>
                      </label>

                      <button
                        onClick={() => handleOpenEditPackage(pkg)}
                        className="text-xs font-bold text-[#D09A40] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Edit Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 32: GALLERY MANAGEMENT
          ======================================================== */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              {/* Header Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#0F172A]/10 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase text-[#D09A40]">Real Photos</span>
                    <h3 className="font-serif text-xl font-bold text-[#0F172A]">Photo & Makeover Gallery Management</h3>
                  </div>
                  <p className="text-xs text-[#4A4A4A] mt-0.5">
                    Manage customer photos, before & after sliders, and artist portfolios. Add, edit, remove, and reorder.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Active / Archived sub-tabs */}
                  <div className="flex items-center bg-[#FAF5E5] p-1 rounded-xl border border-[#0F172A]/10 text-xs">
                    <button
                      onClick={() => setGallerySubTab('active')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        gallerySubTab === 'active'
                          ? 'bg-[#0F172A] text-white shadow-xs'
                          : 'text-[#4A4A4A] hover:text-[#0F172A]'
                      }`}
                    >
                      Active Photos ({activeGalleryList.length})
                    </button>
                    <button
                      onClick={() => setGallerySubTab('archived')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        gallerySubTab === 'archived'
                          ? 'bg-[#0F172A] text-white shadow-xs'
                          : 'text-[#4A4A4A] hover:text-[#0F172A]'
                      }`}
                    >
                      Archived ({archivedGalleryList.length})
                    </button>
                  </div>

                  <button
                    onClick={handleOpenAddGallery}
                    className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Photo</span>
                  </button>
                </div>
              </div>

              {/* Active Gallery Table / List with Reordering */}
              {gallerySubTab === 'active' && (
                <div className="bg-white rounded-2xl border border-[#0F172A]/10 overflow-hidden shadow-xs">
                  <div className="p-4 bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-500 font-mono uppercase tracking-wider flex items-center justify-between">
                    <span>Reorder & Manage Active Portfolio ({activeGalleryList.length} items)</span>
                    <span className="text-[11px] normal-case text-neutral-400">Use arrows to adjust public display order</span>
                  </div>

                  <div className="divide-y divide-neutral-100">
                    {activeGalleryList.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-4 hover:bg-neutral-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          {/* Reorder Buttons (Action: Reorder) */}
                          <div className="flex flex-col items-center gap-0.5 shrink-0 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
                            <button
                              onClick={() => handleMoveOrder(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-white text-neutral-600 hover:text-[#0F172A] disabled:opacity-20 rounded cursor-pointer disabled:cursor-not-allowed"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-mono font-bold text-neutral-500">
                              #{item.sort_order}
                            </span>
                            <button
                              onClick={() => handleMoveOrder(idx, 'down')}
                              disabled={idx === activeGalleryList.length - 1}
                              className="p-1 hover:bg-white text-neutral-600 hover:text-[#0F172A] disabled:opacity-20 rounded cursor-pointer disabled:cursor-not-allowed"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Media Preview Thumbnail */}
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                            <img
                              src={item.image}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            {item.type === 'before_after' && (
                              <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] font-mono text-center font-bold">
                                B/A
                              </span>
                            )}
                          </div>

                          {/* Item Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-neutral-100 text-[#0F172A] border border-neutral-200">
                                {item.type.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-[#D09A40] font-semibold">
                                {item.category}
                              </span>
                              {item.featured && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                  <span>Featured</span>
                                </span>
                              )}
                            </div>

                            <h4 className="font-serif font-bold text-sm text-[#0F172A] mt-0.5 truncate">
                              {item.title}
                            </h4>
                            <p className="text-xs text-neutral-500 truncate">
                              Associated Service: <b>{item.service}</b> · {item.description}
                            </p>
                          </div>
                        </div>

                        {/* Actions Strip: Edit, Archive (Soft Delete) */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleOpenEditGallery(item)}
                            className="px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-neutral-200 hover:border-[#D09A40] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#D09A40]" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleArchiveGalleryItem(item.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-red-700 bg-neutral-100 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Move to Archived Tab"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span>Archive</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Archived Gallery List (Action: Restore) */}
              {gallerySubTab === 'archived' && (
                <div className="bg-white rounded-2xl border border-[#0F172A]/10 overflow-hidden shadow-xs">
                  <div className="p-4 bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-500 font-mono uppercase tracking-wider">
                    Archived Gallery Records ({archivedGalleryList.length} items)
                  </div>

                  {archivedGalleryList.length === 0 ? (
                    <div className="p-12 text-center text-neutral-400">
                      <Archive className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">No items currently in archive.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {archivedGalleryList.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 flex items-center justify-between gap-4 bg-neutral-50/50"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <img
                              src={item.image}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-lg object-cover grayscale border border-neutral-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="font-serif font-bold text-sm text-neutral-700 truncate">
                                {item.title}
                              </h4>
                              <p className="text-xs text-neutral-400 truncate">
                                {item.type} · {item.category}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRestoreGalleryItem(item.id)}
                              className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore to Live</span>
                            </button>

                            <button
                              onClick={() => handleDeletePermanent(item.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          PACKAGE MODAL FORM (31)
      ======================================================== */}
      {isPackageFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-neutral-200 relative text-[#0F172A]">
            <button
              onClick={() => setIsPackageFormOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-black p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 pb-4 border-b border-neutral-200">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#D09A40]">
                {editingPackageId ? 'Edit Package Record' : 'Create New Salon Package'}
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#0F172A]">
                {editingPackageId ? 'Update Package Details' : 'Package Builder & Savings Calculator'}
              </h3>
            </div>

            {pkgFormError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pkgFormError}</span>
              </div>
            )}

            <form onSubmit={handleSavePackage} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  placeholder="e.g. Royal Rajasthani Poshaak & Glow Suite"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={pkgDescription}
                  onChange={(e) => setPkgDescription(e.target.value)}
                  placeholder="Detailed value proposition and transformative rituals..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40]"
                />
              </div>

              {/* Pricing & Automatic Savings Calculation Card */}
              <div className="p-4 bg-[#FAF5E5] rounded-2xl border border-[#D09A40]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D09A40]" />
                    <span>Price & Savings Verification</span>
                  </span>
                  <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    {calculatedSavings.discountPercent}% OFF Total
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      Regular Ala-Carte Price (₹) *
                    </label>
                    <input
                      type="number"
                      min={100}
                      required
                      value={pkgRegularPrice}
                      onChange={(e) => setPkgRegularPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      Discounted Package Price (₹) *
                    </label>
                    <input
                      type="number"
                      min={100}
                      required
                      value={pkgPackagePrice}
                      onChange={(e) => setPkgPackagePrice(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono font-bold text-[#0F172A] border border-[#D09A40] rounded-xl bg-white"
                    />
                  </div>
                </div>

                {/* Live Correct Savings Banner */}
                <div className="p-3 bg-white rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
                  <span className="text-neutral-600">Calculated Client Savings:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    ₹{calculatedSavings.savings.toLocaleString('en-IN')} (Saved by Customer)
                  </span>
                </div>
              </div>

              {/* Services List Tag Builder */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Services Included ({pkgServices.length}) *
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newServiceInput}
                    onChange={(e) => setNewServiceInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddServicePill(); } }}
                    placeholder="Type service name and click Add..."
                    className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddServicePill}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl cursor-pointer"
                  >
                    Add Service
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-neutral-50 rounded-xl border border-neutral-200">
                  {pkgServices.map((srv, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 text-xs bg-white text-[#0F172A] px-2.5 py-1 rounded-lg border border-neutral-200 shadow-2xs"
                    >
                      <span>{srv}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveServicePill(idx)}
                        className="text-neutral-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Duration & Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Duration *
                  </label>
                  <input
                    type="text"
                    required
                    value={pkgDuration}
                    onChange={(e) => setPkgDuration(e.target.value)}
                    placeholder="e.g. 2 Sessions (300 mins)"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Validity Window *
                  </label>
                  <select
                    value={pkgValidity}
                    onChange={(e) => setPkgValidity(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
                  >
                    {VALIDITY_OPTIONS.map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Outlets (Multi-Select) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Applicable Outlets / Locations *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {OUTLET_OPTIONS.map((outlet) => (
                    <label key={outlet} className="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg border border-neutral-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pkgOutlets.includes(outlet)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPkgOutlets([...pkgOutlets, outlet]);
                          } else {
                            setPkgOutlets(pkgOutlets.filter(o => o !== outlet));
                          }
                        }}
                        className="rounded text-[#D09A40]"
                      />
                      <span>{outlet}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Usage Rules Tag Builder */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Usage Rules / Conditions
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newRuleInput}
                    onChange={(e) => setNewRuleInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRulePill(); } }}
                    placeholder="e.g. Prior appointment mandatory 24h prior..."
                    className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddRulePill}
                    className="px-3 py-2 text-xs font-bold text-white bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    Add Rule
                  </button>
                </div>
                <div className="space-y-1">
                  {pkgUsageRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                      <span>• {rule}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRulePill(idx)}
                        className="text-neutral-400 hover:text-red-600 px-1 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image URL & Preset Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Package Banner Image *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={pkgImage}
                    onChange={(e) => setPkgImage(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-xl font-mono"
                  />
                </div>
                {/* Presets */}
                <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1 text-xs">
                  <span className="text-[10px] text-neutral-400 uppercase font-mono">Presets:</span>
                  {[
                    { label: 'Bridal', url: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg' },
                    { label: 'Hair Botox', url: '/src/assets/images/hair_styling_luxe_1790672021591.jpg' },
                    { label: 'Skin Spa', url: '/src/assets/images/skin_spa_treatment_1790672037475.jpg' },
                    { label: 'Nails', url: '/src/assets/images/nail_art_luxe_1790676094903.jpg' },
                    { label: 'Palace Spa', url: '/src/assets/images/prebridal_spa_ritual_1790676123541.jpg' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPkgImage(preset.url)}
                      className={`px-2 py-1 rounded border text-[11px] whitespace-nowrap cursor-pointer ${
                        pkgImage === preset.url ? 'bg-[#D09A40] text-white border-[#D09A40]' : 'bg-white border-neutral-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status & Featured */}
              <div className="flex items-center gap-6 pt-2 border-t border-neutral-200">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pkgActive}
                    onChange={(e) => setPkgActive(e.target.checked)}
                    className="rounded text-[#D09A40]"
                  />
                  <span>Active in Store Catalog</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pkgFeatured}
                    onChange={(e) => setPkgFeatured(e.target.checked)}
                    className="rounded text-[#D09A40]"
                  />
                  <span>Highlight as Featured Look</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsPackageFormOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  {editingPackageId ? 'Save Package Changes' : 'Publish New Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          GALLERY MODAL FORM (32)
      ======================================================== */}
      {isGalleryFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-neutral-200 relative text-[#0F172A]">
            <button
              onClick={() => setIsGalleryFormOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-black p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 pb-4 border-b border-neutral-200">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#D09A40]">
                {editingGalleryId ? 'Edit Gallery Record' : 'Upload to Portfolio Archive'}
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#0F172A]">
                {editingGalleryId ? 'Update Gallery Item' : 'New Gallery Upload'}
              </h3>
            </div>

            {galFormError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{galFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveGallery} className="space-y-5">
              {/* Upload Type Selector: Photo, Before/After, Portfolio, Work Showcase */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                  Upload Type *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GALLERY_TYPES.map((typeObj) => (
                    <button
                      key={typeObj.id}
                      type="button"
                      onClick={() => setGalType(typeObj.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        galType === typeObj.id
                          ? 'border-[#D09A40] bg-[#FAF5E5] ring-2 ring-[#D09A40]/40'
                          : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <div className="font-bold text-xs text-[#0F172A]">{typeObj.label}</div>
                      <div className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">{typeObj.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={galTitle}
                  onChange={(e) => setGalTitle(e.target.value)}
                  placeholder="e.g. Royal Rajputi Kundan Destination Bridal Glam"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={galDescription}
                  onChange={(e) => setGalDescription(e.target.value)}
                  placeholder="Details about client requirements, techniques, products used..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40]"
                />
              </div>

              {/* Category & Associated Service */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={galCategory}
                    onChange={(e) => setGalCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
                  >
                    {GALLERY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Associated Service *
                  </label>
                  <select
                    value={galService}
                    onChange={(e) => setGalService(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
                  >
                    {GALLERY_SERVICES.map((srv) => (
                      <option key={srv} value={srv}>{srv}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Main Image (or "After" Image) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  {galType === 'before_after' ? 'After (Final Result) Image *' : 'High-Res Photo Image *'}
                </label>
                <input
                  type="text"
                  required
                  value={galImage}
                  onChange={(e) => setGalImage(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl font-mono mb-2"
                />

                {/* Presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-[10px] text-neutral-400 uppercase font-mono">Quick:</span>
                  {[
                    { label: 'Bridal', url: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg' },
                    { label: 'Hair Balayage', url: '/src/assets/images/hair_styling_luxe_1790672021591.jpg' },
                    { label: 'Skin Facial', url: '/src/assets/images/skin_spa_treatment_1790672037475.jpg' },
                    { label: 'Nails', url: '/src/assets/images/nail_art_luxe_1790676094903.jpg' },
                    { label: 'Mobile Troupe', url: '/src/assets/images/home_salon_service_1790676110547.jpg' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setGalImage(p.url)}
                      className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-[11px] border border-neutral-200 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Before Image (Conditional for Before/After) */}
              {galType === 'before_after' && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Before Image (Initial State) *
                  </label>
                  <input
                    type="text"
                    required
                    value={galBeforeImage}
                    onChange={(e) => setGalBeforeImage(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl font-mono bg-white"
                  />
                  <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                    <span className="text-[10px] text-neutral-400 uppercase font-mono">Before Presets:</span>
                    {[
                      { label: 'Frizzy / Natural', url: '/src/assets/images/home_salon_service_1790676110547.jpg' },
                      { label: 'Tanned Skin', url: '/src/assets/images/prebridal_spa_ritual_1790676123541.jpg' },
                      { label: 'Pre-Styling', url: '/src/assets/images/skin_spa_treatment_1790672037475.jpg' },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setGalBeforeImage(p.url)}
                        className="px-2 py-0.5 rounded bg-white hover:bg-neutral-200 text-[11px] border border-neutral-200 cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Artist and Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Artist / Director Credit
                  </label>
                  <input
                    type="text"
                    value={galArtist}
                    onChange={(e) => setGalArtist(e.target.value)}
                    placeholder="e.g. Ananya Sharma (Creative Director)"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Sort Order Sequence #
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={galSortOrder}
                    onChange={(e) => setGalSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Featured & Active checkboxes */}
              <div className="flex items-center gap-6 pt-2 border-t border-neutral-200">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={galFeatured}
                    onChange={(e) => setGalFeatured(e.target.checked)}
                    className="rounded text-[#D09A40]"
                  />
                  <span>Mark as Featured Look</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={galActive}
                    onChange={(e) => setGalActive(e.target.checked)}
                    className="rounded text-[#D09A40]"
                  />
                  <span>Active in Live Public Lookbook</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsGalleryFormOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  {editingGalleryId ? 'Update Gallery Item' : 'Upload to Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
