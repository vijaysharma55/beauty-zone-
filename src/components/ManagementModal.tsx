import React, { useState, useMemo, useRef } from 'react';
import { SalonPackage, GalleryItem, GalleryUploadType, ServiceItem, VideoItem, VideoPlatform } from '../types';
import { 
  OUTLET_OPTIONS, 
  VALIDITY_OPTIONS, 
  DEFAULT_USAGE_RULES, 
  calculateSavings,
  PACKAGE_PRESET_TEMPLATES,
  PACKAGE_PRESET_IMAGES,
  generateTaglineIdeas,
  PackagePresetTemplate
} from '../data/packagesData';
import { 
  GALLERY_TYPES, 
  GALLERY_CATEGORIES, 
  GALLERY_SERVICES 
} from '../data/galleryData';
import { 
  VIDEO_CATEGORIES, 
  VIDEO_PRESET_THUMBNAILS, 
  parseVideoUrl 
} from '../data/videosData';
import { InstagramIcon, FacebookIcon, YouTubeIcon } from './SocialIcons';
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
  Briefcase,
  Scissors,
  Search,
  Copy,
  IndianRupee,
  Crown,
  Droplet,
  Sparkle,
  Heart,
  GraduationCap,
  Upload,
  Wand2,
  Calendar,
  Percent,
  Flame,
  Gift,
  CheckCheck,
  Video,
  Play,
  Film,
  Eye,
  Share2,
  BarChart3,
  TrendingUp,
  Award,
  Pin,
  PinOff,
  Zap,
  Users
} from 'lucide-react';

interface ManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: ServiceItem[];
  packages: SalonPackage[];
  galleryItems: GalleryItem[];
  videos?: VideoItem[];
  onUpdateServices: (services: ServiceItem[]) => void;
  onUpdatePackages: (packages: SalonPackage[]) => void;
  onUpdateGallery: (items: GalleryItem[]) => void;
  onUpdateVideos?: (videos: VideoItem[]) => void;
  initialTab?: 'services' | 'packages' | 'gallery' | 'videos';
}

const SERVICE_CATEGORY_OPTIONS = [
  { value: 'bridal', label: 'Bridal Makeup', icon: Crown, badge: 'bg-rose-100 text-rose-800 border-rose-200' },
  { value: 'hair', label: 'Hair Care & Styling', icon: Scissors, badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'skin', label: 'Skincare & Facials', icon: Droplet, badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'nails', label: 'Nails & Art', icon: Sparkle, badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'spa', label: 'Spa & Body Care', icon: Heart, badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'academy', label: 'Makeup Academy', icon: GraduationCap, badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
] as const;

const FESTIVAL_SUGGESTION_CHIPS = [
  'Wedding Season Discount',
  'Diwali Special Offer',
  'Karwa Chauth Special',
  'Navratri Glow Deal',
  'Summer Hydration Sale',
  'New Year Glow Offer',
  'Holi Special Makeover'
];

const PRESET_SERVICE_IMAGES = [
  { label: 'Bridal Makeup', url: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg' },
  { label: 'Hair Styling & Color', url: '/src/assets/images/hair_styling_luxe_1790672021591.jpg' },
  { label: 'Skin & Facial Treatment', url: '/src/assets/images/skin_spa_treatment_1790672037475.jpg' },
  { label: 'Nail Extensions & Art', url: '/src/assets/images/nail_art_luxe_1790676094903.jpg' },
  { label: 'Body Spa & Ubtan', url: '/src/assets/images/prebridal_spa_ritual_1790676123541.jpg' },
  { label: 'Home Salon Visits', url: '/src/assets/images/home_salon_service_1790676110547.jpg' },
  { label: 'Academy & Masterclass', url: '/src/assets/images/academy_makeup_class_1790676134907.jpg' },
  { label: 'Salon Ambience', url: '/src/assets/images/hero_jaipur_salon_1790671992521.jpg' },
];

export const ManagementModal: React.FC<ManagementModalProps> = ({
  isOpen,
  onClose,
  services,
  packages,
  galleryItems,
  videos = [],
  onUpdateServices,
  onUpdatePackages,
  onUpdateGallery,
  onUpdateVideos,
  initialTab = 'services',
}) => {
  const [activeTab, setActiveTab] = useState<'services' | 'packages' | 'gallery'>(initialTab === 'videos' ? 'gallery' : initialTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // ==========================================
  // 1. SERVICES MANAGEMENT STATE
  // ==========================================
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>('all');
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null);

  // Form fields for Service
  const [srvTitle, setSrvTitle] = useState('');
  const [srvCategory, setSrvCategory] = useState<'bridal' | 'hair' | 'skin' | 'nails' | 'spa' | 'academy'>('bridal');
  const [srvPrice, setSrvPrice] = useState<number>(4999);
  const [srvDuration, setSrvDuration] = useState('90 mins');
  const [srvDescription, setSrvDescription] = useState('');
  const [srvHighlights, setSrvHighlights] = useState<string[]>([]);
  const [newHighlightInput, setNewHighlightInput] = useState('');
  const [srvImage, setSrvImage] = useState('/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg');
  const [srvPopular, setSrvPopular] = useState(false);
  const [srvFormError, setSrvFormError] = useState<string | null>(null);

  const handleOpenAddService = () => {
    setEditingServiceId(null);
    setSrvTitle('');
    setSrvCategory('bridal');
    setSrvPrice(4999);
    setSrvDuration('90 mins');
    setSrvDescription('');
    setSrvHighlights([
      'Done by certified senior specialist',
      '100% Genuine branded international products',
      'Free consultation & aftercare advice'
    ]);
    setSrvImage('/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg');
    setSrvPopular(false);
    setSrvFormError(null);
    setIsServiceFormOpen(true);
  };

  const handleOpenEditService = (service: ServiceItem) => {
    setEditingServiceId(service.id);
    setSrvTitle(service.title);
    setSrvCategory(service.category);
    setSrvPrice(service.price);
    setSrvDuration(service.duration);
    setSrvDescription(service.description);
    setSrvHighlights([...service.highlights]);
    setSrvImage(service.image || '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg');
    setSrvPopular(!!service.popular);
    setSrvFormError(null);
    setIsServiceFormOpen(true);
  };

  const handleAddHighlight = () => {
    if (newHighlightInput.trim()) {
      setSrvHighlights([...srvHighlights, newHighlightInput.trim()]);
      setNewHighlightInput('');
    }
  };

  const handleRemoveHighlight = (index: number) => {
    setSrvHighlights(srvHighlights.filter((_, i) => i !== index));
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvTitle.trim()) {
      setSrvFormError('Service name is required.');
      return;
    }
    if (srvPrice <= 0 || isNaN(srvPrice)) {
      setSrvFormError('Please enter a valid price in ₹.');
      return;
    }
    if (!srvDuration.trim()) {
      setSrvFormError('Duration is required (e.g. 90 mins).');
      return;
    }

    if (editingServiceId) {
      // Update existing
      const updated = services.map((s) => {
        if (s.id === editingServiceId) {
          return {
            ...s,
            title: srvTitle.trim(),
            category: srvCategory,
            price: Number(srvPrice),
            duration: srvDuration.trim(),
            description: srvDescription.trim(),
            highlights: srvHighlights.length > 0 ? srvHighlights : ['Certified salon care', 'Genuine products'],
            image: srvImage,
            popular: srvPopular,
          };
        }
        return s;
      });
      onUpdateServices(updated);
      showToast(`Service "${srvTitle.trim()}" updated successfully!`);
    } else {
      // Create new
      const newService: ServiceItem = {
        id: `srv-${Date.now()}`,
        title: srvTitle.trim(),
        category: srvCategory,
        price: Number(srvPrice),
        duration: srvDuration.trim(),
        description: srvDescription.trim(),
        highlights: srvHighlights.length > 0 ? srvHighlights : ['Certified salon care', 'Genuine products'],
        image: srvImage,
        popular: srvPopular,
        rating: 5.0,
        reviewCount: 1,
      };
      onUpdateServices([newService, ...services]);
      showToast(`New service "${srvTitle.trim()}" added to live menu!`);
    }

    setIsServiceFormOpen(false);
  };

  const handleConfirmDeleteService = () => {
    if (!serviceToDelete) return;
    const filtered = services.filter((s) => s.id !== serviceToDelete.id);
    onUpdateServices(filtered);
    showToast(`Service "${serviceToDelete.title}" removed from catalog.`);
    setServiceToDelete(null);
  };

  const handleDuplicateService = (service: ServiceItem) => {
    const duplicated: ServiceItem = {
      ...service,
      id: `srv-copy-${Date.now()}`,
      title: `${service.title} (Copy)`,
    };
    onUpdateServices([duplicated, ...services]);
    showToast(`Duplicated "${service.title}" successfully!`);
  };

  // Filtered services for admin table
  const adminFilteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchCat = serviceCategoryFilter === 'all' || s.category === serviceCategoryFilter;
      const matchSearch =
        !serviceSearch.trim() ||
        s.title.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.description.toLowerCase().includes(serviceSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [services, serviceCategoryFilter, serviceSearch]);

  // ==========================================
  // 2. PACKAGE MANAGEMENT STATE
  // ==========================================
  const [isPackageFormOpen, setIsPackageFormOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  // Form fields for package
  const [pkgName, setPkgName] = useState('');
  const [pkgTagline, setPkgTagline] = useState('');
  const [pkgOfferName, setPkgOfferName] = useState('');
  const [pkgValidFrom, setPkgValidFrom] = useState('');
  const [pkgValidUntil, setPkgValidUntil] = useState('');
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

  // Auto tagline generator state
  const [taglineIdeas, setTaglineIdeas] = useState<string[]>([]);
  const [showImagePresets, setShowImagePresets] = useState(false);

  // Service picker filtering inside package form
  const [pkgServiceMenuSearch, setPkgServiceMenuSearch] = useState('');
  const [pkgServiceMenuCat, setPkgServiceMenuCat] = useState<string>('all');

  // Live savings calculation
  const calculatedSavings = useMemo(() => {
    return calculateSavings(pkgRegularPrice, pkgPackagePrice);
  }, [pkgRegularPrice, pkgPackagePrice]);

  // Offer Date status preview calculation
  const offerDateBadge = useMemo(() => {
    if (!pkgValidUntil && !pkgValidFrom) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (pkgValidUntil) {
      const untilDate = new Date(pkgValidUntil);
      untilDate.setHours(23, 59, 59, 999);
      if (untilDate < now) {
        return { status: 'expired', text: 'Offer Expired', color: 'bg-red-100 text-red-800 border-red-200' };
      }
      const diffDays = Math.ceil((untilDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (pkgValidFrom) {
        const fromDate = new Date(pkgValidFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (fromDate > now) {
          return { 
            status: 'upcoming', 
            text: `Upcoming Deal • Starts ${fromDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, 
            color: 'bg-amber-100 text-amber-800 border-amber-200' 
          };
        }
      }
      return { 
        status: 'active', 
        text: diffDays <= 7 ? `Limited Time Deal: Ends in ${diffDays} Day${diffDays > 1 ? 's' : ''}` : `Active Deal • Valid till ${new Date(pkgValidUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, 
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200' 
      };
    }

    if (pkgValidFrom) {
      const fromDate = new Date(pkgValidFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (fromDate > now) {
        return { 
          status: 'upcoming', 
          text: `Upcoming Offer • Starts ${fromDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, 
          color: 'bg-amber-100 text-amber-800 border-amber-200' 
        };
      }
      return { status: 'active', text: 'Active Festive Offer', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }

    return null;
  }, [pkgValidFrom, pkgValidUntil]);

  // Filter available salon services in the package service picker
  const filteredCatalogServices = useMemo(() => {
    return services.filter((s) => {
      const matchCat = pkgServiceMenuCat === 'all' || s.category === pkgServiceMenuCat;
      const matchSearch =
        !pkgServiceMenuSearch.trim() ||
        s.title.toLowerCase().includes(pkgServiceMenuSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [services, pkgServiceMenuCat, pkgServiceMenuSearch]);

  const handleOpenAddPackage = () => {
    setEditingPackageId(null);
    setPkgName('');
    setPkgTagline('');
    setPkgOfferName('Festival Special Offer');
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setPkgValidFrom(today);
    setPkgValidUntil(nextMonth);
    setPkgDescription('');
    setPkgServices([
      'Moroccan Nanoplastia & Hair Botox Treatment (Chemical-Free)',
      '24K Gold Leaf Glow Facial with Ultrasound Skin Firming',
      'Bridal Gel Nail Extensions with Swarovski Stones & Gold Foil Art'
    ]);
    setPkgDuration('210 mins');
    setPkgRegularPrice(18000);
    setPkgPackagePrice(13500);
    setPkgValidity('60 Days from purchase');
    setPkgUsageRules([
      'Prior appointment mandatory (at least 24 hours in advance)',
      'Valid across selected Jaipur studio locations',
      'Non-transferable to other clients once commenced'
    ]);
    setPkgOutlets(['All Jaipur Outlets']);
    setPkgImage('/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg');
    setPkgActive(true);
    setPkgFeatured(false);
    setPkgFormError(null);
    setTaglineIdeas(generateTaglineIdeas('Festival Bridal Package'));
    setIsPackageFormOpen(true);
  };

  const handleOpenEditPackage = (pkg: SalonPackage) => {
    setEditingPackageId(pkg.id);
    setPkgName(pkg.name);
    setPkgTagline(pkg.tagline || '');
    setPkgOfferName(pkg.offer_name || 'Festive Offer');
    setPkgValidFrom(pkg.valid_from || '');
    setPkgValidUntil(pkg.valid_until || '');
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
    setTaglineIdeas(generateTaglineIdeas(pkg.name));
    setIsPackageFormOpen(true);
  };

  // 1. Template Presets Handler
  const handleApplyPresetTemplate = (tpl: PackagePresetTemplate) => {
    setPkgName(tpl.name);
    setPkgOfferName(tpl.festivalName);
    setPkgTagline(tpl.tagline);
    setTaglineIdeas(tpl.taglineIdeas);
    setPkgDescription(tpl.description);
    setPkgDuration(tpl.duration);
    setPkgRegularPrice(tpl.regularPrice);
    setPkgPackagePrice(tpl.packagePrice);
    setPkgValidity(tpl.validity);
    setPkgImage(tpl.image);
    setPkgServices([...tpl.services]);
    showToast(`Applied "${tpl.name}" template!`);
  };

  // 2. Tagline Generator Handler
  const handleGenerateTaglines = () => {
    const ideas = generateTaglineIdeas(pkgName || 'Festive Beauty Package');
    setTaglineIdeas(ideas);
    if (!pkgTagline) {
      setPkgTagline(ideas[0]);
    }
    showToast('Generated 3 fresh tagline ideas!');
  };

  // 3. Image Upload via Device File
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 6 * 1024 * 1024) {
        setPkgFormError('Image size exceeds 6MB. Please upload a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (typeof uploadEvent.target?.result === 'string') {
          setPkgImage(uploadEvent.target.result);
          showToast('Package cover photo uploaded from device!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 4. Quick Discount Presets
  const handleApplyDiscountPercentage = (percent: number) => {
    if (pkgRegularPrice > 0) {
      const discounted = Math.round(pkgRegularPrice * (1 - percent / 100));
      setPkgPackagePrice(discounted);
    }
  };

  // 5. Auto Calculate Regular Price from Included Services
  const handleAutoCalculateRegularPrice = () => {
    let total = 0;
    pkgServices.forEach((serviceTitle) => {
      const match = services.find(
        (s) => s.title.toLowerCase() === serviceTitle.toLowerCase() ||
               serviceTitle.toLowerCase().includes(s.title.toLowerCase()) ||
               s.title.toLowerCase().includes(serviceTitle.toLowerCase())
      );
      if (match) {
        total += match.price;
      } else {
        total += 2999; // Default estimate
      }
    });

    if (total > 0) {
      setPkgRegularPrice(total);
      // default 20% package price
      setPkgPackagePrice(Math.round(total * 0.8));
      showToast(`Regular price updated to ₹${total.toLocaleString('en-IN')} based on ${pkgServices.length} services!`);
    } else {
      showToast('Select services to calculate combined price.');
    }
  };

  const handleToggleCatalogService = (service: ServiceItem) => {
    const alreadyIn = pkgServices.some(
      (s) => s.toLowerCase() === service.title.toLowerCase()
    );
    if (alreadyIn) {
      setPkgServices(pkgServices.filter((s) => s.toLowerCase() !== service.title.toLowerCase()));
    } else {
      setPkgServices([...pkgServices, service.title]);
    }
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim()) {
      setPkgFormError('Package name is required.');
      return;
    }
    if (pkgPackagePrice >= pkgRegularPrice) {
      setPkgFormError('Package bundle price must be lower than total regular price to offer a discount.');
      return;
    }
    if (pkgServices.length === 0) {
      setPkgFormError('Please include at least one service item in the package.');
      return;
    }

    const { discountPercent, savings } = calculatedSavings;

    if (editingPackageId) {
      const updated = packages.map((p) => {
        if (p.id === editingPackageId) {
          return {
            ...p,
            name: pkgName.trim(),
            tagline: pkgTagline.trim(),
            offer_name: pkgOfferName.trim(),
            valid_from: pkgValidFrom,
            valid_until: pkgValidUntil,
            description: pkgDescription.trim(),
            services: pkgServices,
            duration: pkgDuration,
            regular_price: pkgRegularPrice,
            package_price: pkgPackagePrice,
            discount: discountPercent,
            savings,
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
      showToast(`Festive Combo Package "${pkgName.trim()}" published successfully!`);
    } else {
      const newPkg: SalonPackage = {
        id: `pkg-${Date.now()}`,
        name: pkgName.trim(),
        tagline: pkgTagline.trim(),
        offer_name: pkgOfferName.trim(),
        valid_from: pkgValidFrom,
        valid_until: pkgValidUntil,
        description: pkgDescription.trim(),
        services: pkgServices,
        duration: pkgDuration,
        regular_price: pkgRegularPrice,
        package_price: pkgPackagePrice,
        discount: discountPercent,
        savings,
        validity: pkgValidity,
        usage_rules: pkgUsageRules,
        outlets: pkgOutlets,
        image: pkgImage,
        active: pkgActive,
        featured: pkgFeatured,
      };
      onUpdatePackages([newPkg, ...packages]);
      showToast(`Festive Combo Package "${pkgName.trim()}" published successfully!`);
    }

    setIsPackageFormOpen(false);
  };

  const handleDeletePackage = (id: string) => {
    if (window.confirm('Are you sure you want to remove this combo package?')) {
      const filtered = packages.filter((p) => p.id !== id);
      onUpdatePackages(filtered);
      showToast('Package removed successfully.');
    }
  };

  // ==========================================
  // 3. GALLERY MANAGEMENT STATE
  // ==========================================
  const [isGalleryFormOpen, setIsGalleryFormOpen] = useState(false);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [galTitle, setGalTitle] = useState('');
  const [galDescription, setGalDescription] = useState('');
  const [galType, setGalType] = useState<GalleryUploadType>('photo');
  const [galCategory, setGalCategory] = useState(GALLERY_CATEGORIES[0]);
  const [galService, setGalService] = useState(GALLERY_SERVICES[0]);
  const [galImage, setGalImage] = useState('/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg');
  const [galBeforeImage, setGalBeforeImage] = useState('');
  const [galFeatured, setGalFeatured] = useState(false);
  const [galActive, setGalActive] = useState(true);
  const [galArtist, setGalArtist] = useState('Senior Bridal Master');
  const [galFormError, setGalFormError] = useState<string | null>(null);

  const handleOpenAddGallery = () => {
    setEditingGalleryId(null);
    setGalTitle('');
    setGalDescription('');
    setGalType('photo');
    setGalCategory(GALLERY_CATEGORIES[0]);
    setGalService(GALLERY_SERVICES[0]);
    setGalImage('/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg');
    setGalBeforeImage('');
    setGalFeatured(false);
    setGalActive(true);
    setGalArtist('Senior Bridal Master');
    setGalFormError(null);
    setIsGalleryFormOpen(true);
  };

  const handleOpenEditGallery = (item: GalleryItem) => {
    setEditingGalleryId(item.id);
    setGalTitle(item.title);
    setGalDescription(item.description);
    setGalType(item.type);
    setGalCategory(item.category);
    setGalService(item.service);
    setGalImage(item.image);
    setGalBeforeImage(item.before_image || '');
    setGalFeatured(item.featured);
    setGalActive(item.active);
    setGalArtist(item.artist || 'Beauty Zone Master Artist');
    setGalFormError(null);
    setIsGalleryFormOpen(true);
  };

  const handleSaveGalleryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!galTitle.trim()) {
      setGalFormError('Look title is required.');
      return;
    }
    if (!galImage.trim()) {
      setGalFormError('Main image is required.');
      return;
    }

    if (editingGalleryId) {
      const updated = galleryItems.map((item) => {
        if (item.id === editingGalleryId) {
          return {
            ...item,
            title: galTitle.trim(),
            description: galDescription.trim(),
            type: galType,
            category: galCategory,
            service: galService,
            image: galImage.trim(),
            before_image: galBeforeImage.trim() || undefined,
            featured: galFeatured,
            active: galActive,
            artist: galArtist.trim(),
          };
        }
        return item;
      });
      onUpdateGallery(updated);
      showToast('Gallery item updated successfully!');
    } else {
      const newItem: GalleryItem = {
        id: `gal-${Date.now()}`,
        title: galTitle.trim(),
        description: galDescription.trim(),
        type: galType,
        category: galCategory,
        service: galService,
        image: galImage.trim(),
        before_image: galBeforeImage.trim() || undefined,
        sort_order: galleryItems.length + 1,
        featured: galFeatured,
        active: galActive,
        artist: galArtist.trim(),
        created_at: 'Just now'
      };
      onUpdateGallery([newItem, ...galleryItems]);
      showToast('New photo look added to gallery!');
    }

    setIsGalleryFormOpen(false);
  };

  const handleDeleteGalleryItem = (id: string) => {
    if (window.confirm('Are you sure you want to remove this photo look?')) {
      const filtered = galleryItems.filter((i) => i.id !== id);
      onUpdateGallery(filtered);
      showToast('Gallery look removed.');
    }
  };

  // ==========================================
  // 4. VIDEO & REELS MANAGEMENT STATE
  // ==========================================
  const videoList = useMemo(() => videos || [], [videos]);
  const [gallerySubTab, setGallerySubTab] = useState<'reels' | 'insights' | 'photos'>('reels');
  const [insightsSortBy, setInsightsSortBy] = useState<'views' | 'pins' | 'clicks' | 'score'>('views');
  const [isVideoFormOpen, setIsVideoFormOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [activeWatchVideo, setActiveWatchVideo] = useState<VideoItem | null>(null);

  // Filter toolbar for videos
  const [videoSearch, setVideoSearch] = useState('');
  const [videoPlatformFilter, setVideoPlatformFilter] = useState<'all' | 'youtube' | 'instagram' | 'facebook'>('all');
  const [videoCategoryFilter, setVideoCategoryFilter] = useState<string>('all');

  // Video Form inputs
  const [vidUrl, setVidUrl] = useState('');
  const [vidTitle, setVidTitle] = useState('');
  const [vidDescription, setVidDescription] = useState('');
  const [vidCategory, setVidCategory] = useState<string>(VIDEO_CATEGORIES[0]);
  const [vidThumbnail, setVidThumbnail] = useState('');
  const [vidFeatured, setVidFeatured] = useState(true);
  const [vidActive, setVidActive] = useState(true);
  const [vidAuthor, setVidAuthor] = useState('Beauty Zone Master Stylist');
  const [vidDuration, setVidDuration] = useState('0:50');
  const [vidViewsCount, setVidViewsCount] = useState('45K views');
  const [vidFormError, setVidFormError] = useState<string | null>(null);

  // Auto-parsed URL info
  const parsedVideoInfo = useMemo(() => {
    return parseVideoUrl(vidUrl);
  }, [vidUrl]);

  // Engagement Insights Analytics Metrics
  const insightsMetrics = useMemo(() => {
    const totalViews = videoList.reduce((sum, v) => sum + (v.viewsNumeric || 30000), 0);
    const totalClicks = videoList.reduce((sum, v) => sum + (v.clicksCount || 2000), 0);
    const activePinsCount = videoList.filter(v => v.featured).length;
    const sortedByViews = [...videoList].sort((a, b) => (b.viewsNumeric || 0) - (a.viewsNumeric || 0));
    const mostViral = sortedByViews[0] || null;

    // Recommendations: High engagement videos not yet pinned to homepage
    const recommendedToPin = videoList
      .filter(v => !v.featured)
      .sort((a, b) => ((b.viewsNumeric || 0) + (b.engagementScore || 0) * 1000) - ((a.viewsNumeric || 0) + (a.engagementScore || 0) * 1000))
      .slice(0, 3);

    return {
      totalViews,
      totalClicks,
      activePinsCount,
      mostViral,
      recommendedToPin,
    };
  }, [videoList]);

  // Sorted insights table
  const sortedInsightsVideos = useMemo(() => {
    return [...videoList].sort((a, b) => {
      if (insightsSortBy === 'views') {
        return (b.viewsNumeric || 0) - (a.viewsNumeric || 0);
      }
      if (insightsSortBy === 'pins') {
        return (b.pinCount || 0) - (a.pinCount || 0);
      }
      if (insightsSortBy === 'clicks') {
        return (b.clicksCount || 0) - (a.clicksCount || 0);
      }
      if (insightsSortBy === 'score') {
        return (b.engagementScore || 0) - (a.engagementScore || 0);
      }
      return 0;
    });
  }, [videoList, insightsSortBy]);

  const handleOpenAddVideo = () => {
    setEditingVideoId(null);
    setVidUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    setVidTitle('Bridal Nail Art & Swarovski Crystal Transformation');
    setVidDescription('Watch our senior nail artist create custom crystal bridal nail extensions with 24K gold foil.');
    setVidCategory('Nail Art Tutorials');
    setVidThumbnail('/src/assets/images/nail_art_luxe_1790676094903.jpg');
    setVidFeatured(true);
    setVidActive(true);
    setVidAuthor('Meenakshi Rathore (Nail Lead)');
    setVidDuration('1:10');
    setVidViewsCount('38.5K views');
    setVidFormError(null);
    setIsVideoFormOpen(true);
  };

  const handleOpenEditVideo = (item: VideoItem) => {
    setEditingVideoId(item.id);
    setVidUrl(item.url);
    setVidTitle(item.title);
    setVidDescription(item.description);
    setVidCategory(item.category);
    setVidThumbnail(item.thumbnail || '');
    setVidFeatured(item.featured);
    setVidActive(item.active);
    setVidAuthor(item.author || 'Beauty Zone Stylist');
    setVidDuration(item.duration || '0:45');
    setVidViewsCount(item.viewsCount || '25K views');
    setVidFormError(null);
    setIsVideoFormOpen(true);
  };

  const handleToggleFeaturedVideo = (id: string) => {
    if (!onUpdateVideos) return;
    const updated = videoList.map((v) => {
      if (v.id === id) {
        const nextState = !v.featured;
        const newPinCount = nextState ? (v.pinCount || 0) + 1 : (v.pinCount || 0);
        showToast(nextState ? 'Video pinned & featured on Homepage!' : 'Video unpinned from Homepage.');
        return { ...v, featured: nextState, pinCount: newPinCount };
      }
      return v;
    });
    onUpdateVideos(updated);
  };

  const handleSaveVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vidUrl.trim()) {
      setVidFormError('Video / Reel URL is required.');
      return;
    }
    if (!vidTitle.trim()) {
      setVidFormError('Video title is required.');
      return;
    }

    const parsed = parseVideoUrl(vidUrl.trim());
    if (!parsed.isValid) {
      setVidFormError('Please enter a valid YouTube, Instagram Reel, or Facebook video URL.');
      return;
    }

    const thumbnailFinal = vidThumbnail.trim() || parsed.autoThumbnail || '/src/assets/images/hero_jaipur_salon_1790671992521.jpg';

    if (editingVideoId) {
      const updated = videoList.map((item) => {
        if (item.id === editingVideoId) {
          return {
            ...item,
            url: vidUrl.trim(),
            embedUrl: parsed.embedUrl,
            platform: parsed.platform,
            title: vidTitle.trim(),
            description: vidDescription.trim(),
            category: vidCategory,
            thumbnail: thumbnailFinal,
            featured: vidFeatured,
            active: vidActive,
            author: vidAuthor.trim(),
            duration: vidDuration.trim(),
            viewsCount: vidViewsCount.trim(),
          };
        }
        return item;
      });
      if (onUpdateVideos) {
        onUpdateVideos(updated);
      }
      showToast(`${parsed.platformLabel} updated successfully!`);
    } else {
      const newVideo: VideoItem = {
        id: `vid-${Date.now()}`,
        url: vidUrl.trim(),
        embedUrl: parsed.embedUrl,
        platform: parsed.platform,
        title: vidTitle.trim(),
        description: vidDescription.trim(),
        category: vidCategory,
        thumbnail: thumbnailFinal,
        featured: vidFeatured,
        active: vidActive,
        author: vidAuthor.trim(),
        duration: vidDuration.trim(),
        viewsCount: vidViewsCount.trim(),
        created_at: 'Just now',
      };
      if (onUpdateVideos) {
        onUpdateVideos([newVideo, ...videoList]);
      }
      showToast(`${parsed.platformLabel} added successfully!`);
    }

    setIsVideoFormOpen(false);
  };

  const handleDeleteVideo = (id: string) => {
    if (window.confirm('Are you sure you want to remove this video / reel from the gallery?')) {
      const filtered = videoList.filter((v) => v.id !== id);
      if (onUpdateVideos) {
        onUpdateVideos(filtered);
      }
      showToast('Video removed from salon gallery.');
    }
  };

  // Filtered videos for admin view
  const filteredVideos = useMemo(() => {
    return videoList.filter((v) => {
      const matchPlatform = videoPlatformFilter === 'all' || v.platform === videoPlatformFilter;
      const matchCat = videoCategoryFilter === 'all' || v.category === videoCategoryFilter;
      const matchSearch =
        !videoSearch.trim() ||
        v.title.toLowerCase().includes(videoSearch.toLowerCase()) ||
        v.description.toLowerCase().includes(videoSearch.toLowerCase()) ||
        (v.author && v.author.toLowerCase().includes(videoSearch.toLowerCase()));
      return matchPlatform && matchCat && matchSearch;
    });
  }, [videoList, videoPlatformFilter, videoCategoryFilter, videoSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-fade-in">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-70 bg-[#0F172A] text-[#FAF5E5] px-5 py-3 rounded-2xl shadow-2xl border border-[#D09A40] flex items-center gap-2.5 animate-bounce-short text-xs sm:text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4 text-[#D09A40] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Admin Console Container */}
      <div className="w-full max-w-6xl max-h-[94vh] bg-[#FAF5E5] rounded-3xl shadow-2xl border border-[#D09A40]/40 overflow-hidden flex flex-col text-[#0F172A]">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between border-b border-[#D09A40]/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D09A40]/20 border border-[#D09A40]/50 flex items-center justify-center text-[#D09A40]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-white tracking-wide">
                  Beauty Zone Management Console
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#D09A40] text-[#0F172A] uppercase">
                  Admin Real-Time
                </span>
              </div>
              <p className="text-xs text-[#FAF5E5]/70 hidden sm:block">
                Manage live services, festive combo packages, and real portfolio gallery looks across all Jaipur branches.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#FAF5E5] flex items-center justify-center transition-colors cursor-pointer"
            title="Close Management Console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Navigation Tabs */}
        <div className="bg-white border-b border-[#0F172A]/10 px-6 pt-3 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'services'
                ? 'bg-[#FAF5E5] text-[#0F172A] border-t-2 border-[#D09A40] font-bold shadow-xs'
                : 'text-neutral-500 hover:text-[#0F172A]'
            }`}
          >
            <Scissors className="w-4 h-4 text-[#D09A40]" />
            <span>Manage Services ({services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('packages')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'packages'
                ? 'bg-[#FAF5E5] text-[#0F172A] border-t-2 border-[#D09A40] font-bold shadow-xs'
                : 'text-neutral-500 hover:text-[#0F172A]'
            }`}
          >
            <Package className="w-4 h-4 text-[#D09A40]" />
            <span>Combo Packages & Festive Deals ({packages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'gallery'
                ? 'bg-[#FAF5E5] text-[#0F172A] border-t-2 border-[#D09A40] font-bold shadow-xs'
                : 'text-neutral-500 hover:text-[#0F172A]'
            }`}
          >
            <Film className="w-4 h-4 text-[#D09A40]" />
            <span>Gallery & Reels ({galleryItems.length + videoList.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* ========================================================
              TAB 1: SERVICES MANAGEMENT
          ======================================================== */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              {/* Header Strip & Action Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#0F172A]/10 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase text-[#D09A40]">Live Catalog</span>
                    <h3 className="font-serif text-xl font-bold text-[#0F172A]">Service & Treatment Management</h3>
                  </div>
                  <p className="text-xs text-[#4A4A4A] mt-0.5">
                    Add new beauty treatments, modify pricing/durations, or remove discontinued services in real-time.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden lg:flex items-center gap-4 text-xs font-mono pr-2 border-r border-neutral-200">
                    <div className="text-right">
                      <span className="text-neutral-400 block text-[10px]">TOTAL SERVICES</span>
                      <span className="font-bold text-[#0F172A]">{services.length} Active</span>
                    </div>
                    <div className="text-right">
                      <span className="text-neutral-400 block text-[10px]">FEATURED</span>
                      <span className="font-bold text-[#D09A40]">{services.filter(s => s.popular).length} Badged</span>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenAddService}
                    className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Service</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-[#0F172A]/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search services by name or details..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:border-[#D09A40] bg-neutral-50"
                  />
                  {serviceSearch && (
                    <button
                      onClick={() => setServiceSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setServiceCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      serviceCategoryFilter === 'all'
                        ? 'bg-[#0F172A] text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    All ({services.length})
                  </button>
                  {SERVICE_CATEGORY_OPTIONS.map((cat) => {
                    const count = services.filter((s) => s.category === cat.value).length;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setServiceCategoryFilter(cat.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                          serviceCategoryFilter === cat.value
                            ? 'bg-[#D09A40] text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        <cat.icon className="w-3 h-3" />
                        <span>{cat.label} ({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Services Table & Cards */}
              {adminFilteredServices.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#0F172A]/10 p-10 text-center">
                  <Scissors className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                  <h4 className="font-serif text-base font-bold text-[#0F172A]">No services match your filter</h4>
                  <p className="text-xs text-neutral-500 mt-1">Try clearing your search query or select another category.</p>
                  <button
                    onClick={() => { setServiceSearch(''); setServiceCategoryFilter('all'); }}
                    className="mt-4 px-4 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-xl hover:bg-[#D09A40] cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#0F172A]/10 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-mono uppercase text-[10px]">
                          <th className="py-3 px-4">Service Details</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Price (₹)</th>
                          <th className="py-3 px-4">Duration</th>
                          <th className="py-3 px-4">Highlights</th>
                          <th className="py-3 px-4">Badge</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {adminFilteredServices.map((service) => {
                          const categoryMeta = SERVICE_CATEGORY_OPTIONS.find((c) => c.value === service.category);
                          return (
                            <tr key={service.id} className="hover:bg-[#FAF5E5]/40 transition-colors group">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={service.image || '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg'}
                                    alt={service.title}
                                    referrerPolicy="no-referrer"
                                    className="w-12 h-12 rounded-xl object-cover border border-neutral-200 shrink-0"
                                  />
                                  <div className="min-w-0 max-w-xs sm:max-w-sm">
                                    <div className="font-serif font-bold text-[#0F172A] text-sm truncate">
                                      {service.title}
                                    </div>
                                    <p className="text-[11px] text-[#4A4A4A] line-clamp-1 font-light mt-0.5">
                                      {service.description}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  categoryMeta?.badge || 'bg-neutral-100 text-neutral-800'
                                }`}>
                                  {categoryMeta && <categoryMeta.icon className="w-3 h-3" />}
                                  <span>{categoryMeta?.label || service.category}</span>
                                </span>
                              </td>

                              <td className="py-3.5 px-4 font-mono font-bold text-[#0F172A] text-sm whitespace-nowrap">
                                ₹{service.price.toLocaleString('en-IN')}
                              </td>

                              <td className="py-3.5 px-4 text-neutral-600 font-mono whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 bg-neutral-100 px-2 py-0.5 rounded text-[11px]">
                                  <Clock className="w-3 h-3 text-[#D09A40]" />
                                  <span>{service.duration}</span>
                                </span>
                              </td>

                              <td className="py-3.5 px-4 max-w-[200px]">
                                <div className="text-[11px] text-neutral-600 truncate">
                                  {service.highlights && service.highlights.length > 0
                                    ? service.highlights.join(' • ')
                                    : 'Standard salon care'}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {service.popular ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    <span>Most Requested</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-neutral-400">Regular</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleDuplicateService(service)}
                                    className="p-1.5 rounded-lg text-neutral-500 hover:text-[#0F172A] hover:bg-neutral-100 transition-colors cursor-pointer"
                                    title="Duplicate Service"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditService(service)}
                                    className="p-1.5 rounded-lg text-neutral-500 hover:text-[#0F172A] hover:bg-neutral-100 transition-colors cursor-pointer"
                                    title="Edit Service"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setServiceToDelete(service)}
                                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Delete Service"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 2: PACKAGE MANAGEMENT (UPGRADED)
          ======================================================== */}
          {activeTab === 'packages' && (
            <div className="space-y-6">
              {/* Header Strip & Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#0F172A]/10 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase text-[#D09A40]">Festival & Combos</span>
                    <h3 className="font-serif text-xl font-bold text-[#0F172A]">Package & Deal Management</h3>
                  </div>
                  <p className="text-xs text-[#4A4A4A] mt-0.5">
                    Create luxury multi-service packages, festival discounts, auto-taglines, validity dates, and savings badges.
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
                    <span>Create Combo Package</span>
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
                          className="w-22 h-22 rounded-xl object-cover border border-neutral-200 shrink-0"
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

                          <div className="mt-1">
                            {pkg.offer_name && (
                              <span className="inline-block text-[10px] font-bold text-[#D09A40] bg-[#FAF5E5] px-2 py-0.5 rounded mb-0.5">
                                {pkg.offer_name}
                              </span>
                            )}
                            <h4 className="font-serif text-base font-bold text-[#0F172A] truncate">
                              {pkg.name}
                            </h4>
                          </div>
                          
                          {pkg.tagline && (
                            <p className="text-[11px] text-[#D09A40] font-medium line-clamp-1 italic">
                              "{pkg.tagline}"
                            </p>
                          )}
                          <p className="text-xs text-[#4A4A4A] line-clamp-1 mt-0.5">
                            {pkg.description}
                          </p>
                        </div>
                      </div>

                      {/* Pricing badge row */}
                      <div className="p-3 rounded-xl bg-[#FAF5E5] border border-[#0F172A]/10 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-neutral-500 block">Package Price</span>
                          <span className="text-base font-bold text-[#0F172A] font-mono">
                            ₹{pkg.package_price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-neutral-400 line-through ml-1.5">
                            ₹{pkg.regular_price.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="inline-block px-2 py-0.5 rounded bg-[#D09A40] text-[#0F172A] text-xs font-bold font-mono">
                            Save {pkg.discount}% | ₹{pkg.savings.toLocaleString('en-IN')} Off
                          </span>
                          <span className="text-[10px] text-neutral-500 block mt-0.5">
                            {pkg.validity}
                          </span>
                        </div>
                      </div>

                      {/* Services Included */}
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-1.5">
                          Services Included ({pkg.services.length}):
                        </span>
                        <ul className="space-y-1">
                          {pkg.services.map((srv, idx) => (
                            <li key={idx} className="text-xs text-[#4A4A4A] flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-[#D09A40] shrink-0" />
                              <span className="truncate">{srv}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Footer Outlets */}
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#D09A40]" />
                        <span>{pkg.duration}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#D09A40]" />
                        <span>{pkg.outlets.join(', ')}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: GALLERY & VIDEO REELS MANAGEMENT
          ======================================================== */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              {/* Subtabs Switcher: Reels vs Insights vs Photos */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#0F172A]/10 shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setGallerySubTab('reels')}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      gallerySubTab === 'reels'
                        ? 'bg-[#0F172A] text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    <Film className="w-4 h-4 text-[#D09A40]" />
                    <span>Videos & Reels ({videoList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGallerySubTab('insights')}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      gallerySubTab === 'insights'
                        ? 'bg-[#D09A40] text-[#0F172A] shadow-sm font-extrabold'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-[#0F172A]" />
                    <span>Engagement Insights</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 font-mono">
                      Analytics
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGallerySubTab('photos')}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      gallerySubTab === 'photos'
                        ? 'bg-[#0F172A] text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4 text-[#D09A40]" />
                    <span>Photos & Looks ({galleryItems.length})</span>
                  </button>
                </div>

                {gallerySubTab === 'photos' ? (
                  <button
                    onClick={handleOpenAddGallery}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload New Photo</span>
                  </button>
                ) : (
                  <button
                    onClick={handleOpenAddVideo}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#D09A40] hover:bg-[#b8832e] rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Embed New Video / Reel</span>
                  </button>
                )}
              </div>

              {/* ========================================================
                  SUBTAB A: VIDEO & REELS GRID & FILTERS
              ======================================================== */}
              {gallerySubTab === 'reels' && (
                <div className="space-y-5">
                  {/* Platform & Search Filters Toolbar */}
                  <div className="bg-white p-4 rounded-2xl border border-[#0F172A]/10 space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      {/* Search */}
                      <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search videos by title, caption, stylist..."
                          value={videoSearch}
                          onChange={(e) => setVideoSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:border-[#D09A40] bg-neutral-50"
                        />
                        {videoSearch && (
                          <button
                            onClick={() => setVideoSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Platform Pills with Official Logos */}
                      <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                        <button
                          type="button"
                          onClick={() => setVideoPlatformFilter('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                            videoPlatformFilter === 'all'
                              ? 'bg-[#0F172A] text-white'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                        >
                          All Platforms ({videoList.length})
                        </button>

                        <button
                          type="button"
                          onClick={() => setVideoPlatformFilter('youtube')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                            videoPlatformFilter === 'youtube'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                          }`}
                        >
                          <YouTubeIcon className="w-3.5 h-3.5 text-red-500 group-hover:text-white" />
                          <span>YouTube ({videoList.filter(v => v.platform === 'youtube').length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setVideoPlatformFilter('instagram')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                            videoPlatformFilter === 'instagram'
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xs'
                              : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
                          }`}
                        >
                          <InstagramIcon className="w-3.5 h-3.5 text-pink-600" />
                          <span>Instagram Reels ({videoList.filter(v => v.platform === 'instagram').length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setVideoPlatformFilter('facebook')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                            videoPlatformFilter === 'facebook'
                              ? 'bg-[#1877F2] text-white shadow-xs'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                          }`}
                        >
                          <FacebookIcon className="w-3.5 h-3.5 text-[#1877F2]" />
                          <span>Facebook ({videoList.filter(v => v.platform === 'facebook').length})</span>
                        </button>
                      </div>
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-neutral-100">
                      <span className="text-[10px] font-mono uppercase text-neutral-400 shrink-0">Category:</span>
                      <button
                        type="button"
                        onClick={() => setVideoCategoryFilter('all')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          videoCategoryFilter === 'all'
                            ? 'bg-[#D09A40] text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        All Categories
                      </button>
                      {VIDEO_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setVideoCategoryFilter(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                            videoCategoryFilter === cat
                              ? 'bg-[#D09A40] text-white shadow-2xs'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Video Cards Grid */}
                  {filteredVideos.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#0F172A]/10 p-10 text-center">
                      <Film className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                      <h4 className="font-serif text-base font-bold text-[#0F172A]">No videos match your filter</h4>
                      <p className="text-xs text-neutral-500 mt-1">Try resetting the search or embed a new video.</p>
                      <button
                        onClick={() => { setVideoSearch(''); setVideoPlatformFilter('all'); setVideoCategoryFilter('all'); }}
                        className="mt-4 px-4 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-xl hover:bg-[#D09A40] cursor-pointer"
                      >
                        Reset Video Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredVideos.map((video) => {
                        const platformBadge = 
                          video.platform === 'youtube'
                            ? { label: 'YouTube', color: 'bg-red-600 text-white', icon: YouTubeIcon }
                            : video.platform === 'instagram'
                            ? { label: 'Instagram Reel', color: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white', icon: InstagramIcon }
                            : { label: 'Facebook Video', color: 'bg-[#1877F2] text-white', icon: FacebookIcon };

                        return (
                          <div
                            key={video.id}
                            className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-xs group ${
                              video.featured ? 'border-[#D09A40] ring-1 ring-[#D09A40]/30' : 'border-[#0F172A]/10 hover:border-[#D09A40]'
                            }`}
                          >
                            <div>
                              {/* Video Preview / Embed Thumbnail Carrier */}
                              <div className="relative aspect-video w-full bg-neutral-900 overflow-hidden">
                                {video.thumbnail ? (
                                  <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-white/50">
                                    <Film className="w-8 h-8" />
                                  </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                                {/* Top Badges */}
                                <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${platformBadge.color}`}>
                                    <platformBadge.icon className="w-3 h-3 text-white" />
                                    <span>{platformBadge.label}</span>
                                  </span>

                                  {video.featured && (
                                    <span className="px-2 py-0.5 rounded-full bg-[#D09A40] text-[#0F172A] text-[10px] font-bold flex items-center gap-1 shadow-sm">
                                      <Star className="w-3 h-3 fill-[#0F172A]" />
                                      <span>Featured</span>
                                    </span>
                                  )}
                                </div>

                                {/* Center Play Action Trigger */}
                                <button
                                  type="button"
                                  onClick={() => setActiveWatchVideo(video)}
                                  className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-[#D09A40] text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs border border-white/30 hover:scale-110 shadow-lg group-hover:bg-[#D09A40]"
                                  title="Play Video"
                                >
                                  <Play className="w-5 h-5 fill-white ml-0.5" />
                                </button>

                                {/* Bottom Duration & Views in Scrim */}
                                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white text-[11px] font-mono">
                                  <span>{video.category}</span>
                                  <span className="bg-black/60 px-2 py-0.5 rounded text-[10px]">
                                    {video.viewsCount || 'Trending'} • {video.duration || '0:45'}
                                  </span>
                                </div>
                              </div>

                              {/* Card Body */}
                              <div className="p-4 space-y-2">
                                <h4 className="font-serif text-base font-bold text-[#0F172A] line-clamp-2 leading-snug">
                                  {video.title}
                                </h4>
                                <p className="text-xs text-[#4A4A4A] line-clamp-2 font-light leading-relaxed">
                                  {video.description}
                                </p>
                                {video.author && (
                                  <p className="text-[10px] text-neutral-400 font-mono">
                                    Artist / Credit: {video.author}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="p-4 pt-2 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                              <button
                                type="button"
                                onClick={() => handleToggleFeaturedVideo(video.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                  video.featured
                                    ? 'bg-[#FAF5E5] text-[#D09A40] border border-[#D09A40]/40 font-bold'
                                    : 'bg-white text-neutral-500 hover:text-[#0F172A] border border-neutral-200'
                                }`}
                                title="Toggle Featured status on homepage"
                              >
                                <Star className={`w-3 h-3 ${video.featured ? 'fill-[#D09A40] text-[#D09A40]' : 'text-neutral-400'}`} />
                                <span>{video.featured ? 'Featured' : 'Feature'}</span>
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setActiveWatchVideo(video)}
                                  className="p-1.5 rounded-lg text-neutral-500 hover:text-[#0F172A] hover:bg-neutral-200 transition-colors cursor-pointer"
                                  title="Test & Preview Live Player"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditVideo(video)}
                                  className="p-1.5 rounded-lg text-neutral-500 hover:text-[#0F172A] hover:bg-neutral-200 transition-colors cursor-pointer"
                                  title="Edit Video Details"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVideo(video.id)}
                                  className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Delete Video"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================
                  SUBTAB B: ENGAGEMENT INSIGHTS & PINNING ADVISOR
              ======================================================== */}
              {gallerySubTab === 'insights' && (
                <div className="space-y-6">
                  {/* KPI Analytics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-[#0F172A]/10 shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Total Video Views</span>
                        <div className="w-7 h-7 rounded-xl bg-amber-50 text-[#D09A40] flex items-center justify-center">
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-mono text-[#0F172A]">
                          {(insightsMetrics.totalViews / 1000).toFixed(1)}K
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center">
                          <TrendingUp className="w-3 h-3 mr-0.5" /> +18.4%
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Across YouTube, Reels & Facebook
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#0F172A]/10 shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Client Interactions</span>
                        <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Zap className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-mono text-[#0F172A]">
                          {(insightsMetrics.totalClicks / 1000).toFixed(1)}K
                        </span>
                        <span className="text-[10px] font-semibold text-blue-600">
                          9.2% CTR
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Plays, shares & booking clicks
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#0F172A]/10 shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Homepage Pinned</span>
                        <div className="w-7 h-7 rounded-xl bg-amber-50 text-[#D09A40] flex items-center justify-center">
                          <Pin className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-mono text-[#0F172A]">
                          {insightsMetrics.activePinsCount} <span className="text-sm font-normal text-neutral-400">/ {videoList.length}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          Active Reels
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Currently featured on customer page
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#0F172A]/10 shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Top Viral Reel</span>
                        <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Flame className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm font-bold text-[#0F172A] line-clamp-1">
                          {insightsMetrics.mostViral?.title || 'Moroccan Nanoplastia'}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs font-mono font-bold text-[#D09A40]">
                            {insightsMetrics.mostViral?.viewsCount || '124K views'}
                          </span>
                          <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded">
                            {insightsMetrics.mostViral?.engagementScore || 98}% Score
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Smart Homepage Pinning Recommendations */}
                  {insightsMetrics.recommendedToPin.length > 0 && (
                    <div className="bg-gradient-to-r from-[#FAF5E5] via-amber-50 to-[#FAF5E5] p-5 rounded-2xl border border-[#D09A40]/30 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#D09A40]" />
                            <h4 className="font-serif text-base font-bold text-[#0F172A]">
                              Smart Homepage Pinning Advisor
                            </h4>
                            <span className="text-[10px] font-bold bg-[#D09A40] text-white px-2 py-0.5 rounded-full uppercase">
                              High Viral Potential
                            </span>
                          </div>
                          <p className="text-xs text-[#4A4A4A] mt-0.5">
                            These high-performing reels have top engagement metrics but are not yet pinned to your Homepage showcase.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {insightsMetrics.recommendedToPin.map((recVideo) => {
                          const PlatformIcon = 
                            recVideo.platform === 'youtube' ? YouTubeIcon :
                            recVideo.platform === 'instagram' ? InstagramIcon : FacebookIcon;
                          
                          return (
                            <div 
                              key={recVideo.id}
                              className="bg-white p-3.5 rounded-xl border border-[#D09A40]/30 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all"
                            >
                              <div className="flex items-start gap-3">
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-neutral-900 shrink-0">
                                  {recVideo.thumbnail ? (
                                    <img 
                                      src={recVideo.thumbnail} 
                                      alt={recVideo.title} 
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover" 
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/50">
                                      <Film className="w-6 h-6" />
                                    </div>
                                  )}
                                  <div className="absolute top-1 left-1">
                                    <PlatformIcon className="w-3 h-3 text-white drop-shadow" />
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-mono mb-0.5">
                                    <span className="font-bold text-[#D09A40]">{recVideo.viewsCount || `${((recVideo.viewsNumeric || 30000)/1000).toFixed(1)}K views`}</span>
                                    <span>•</span>
                                    <span>{recVideo.category}</span>
                                  </div>
                                  <h5 className="font-semibold text-xs text-[#0F172A] line-clamp-2 leading-tight">
                                    {recVideo.title}
                                  </h5>
                                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                                    <Award className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>{recVideo.engagementScore || 85}% engagement score</span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  {(recVideo.clicksCount || 1500).toLocaleString('en-IN')} user clicks
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleToggleFeaturedVideo(recVideo.id)}
                                  className="px-3 py-1 bg-[#0F172A] hover:bg-[#D09A40] text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Pin className="w-3 h-3" />
                                  <span>Pin to Homepage</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Leaderboard Table & Detailed Video Metrics */}
                  <div className="bg-white rounded-2xl border border-[#0F172A]/10 overflow-hidden shadow-xs">
                    {/* Leaderboard Header & Sorters */}
                    <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/50">
                      <div>
                        <h4 className="font-serif text-base font-bold text-[#0F172A] flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-[#D09A40]" />
                          <span>Video Performance Leaderboard</span>
                        </h4>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Compare views, client engagement, and total pin frequency to optimize your homepage showcase.
                        </p>
                      </div>

                      {/* Sort Controls */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        <span className="text-[10px] font-mono uppercase text-neutral-400 shrink-0">Sort By:</span>
                        <button
                          type="button"
                          onClick={() => setInsightsSortBy('views')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                            insightsSortBy === 'views'
                              ? 'bg-[#0F172A] text-white shadow-2xs'
                              : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                          }`}
                        >
                          <Eye className="w-3 h-3 text-[#D09A40]" />
                          <span>Most Viewed</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInsightsSortBy('pins')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                            insightsSortBy === 'pins'
                              ? 'bg-[#0F172A] text-white shadow-2xs'
                              : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                          }`}
                        >
                          <Star className="w-3 h-3 text-[#D09A40]" />
                          <span>Featured / Pins</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInsightsSortBy('clicks')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                            insightsSortBy === 'clicks'
                              ? 'bg-[#0F172A] text-white shadow-2xs'
                              : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                          }`}
                        >
                          <Zap className="w-3 h-3 text-[#D09A40]" />
                          <span>Clicks & Bookings</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInsightsSortBy('score')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                            insightsSortBy === 'score'
                              ? 'bg-[#0F172A] text-white shadow-2xs'
                              : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                          }`}
                        >
                          <Award className="w-3 h-3 text-[#D09A40]" />
                          <span>Engagement Score</span>
                        </button>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-mono uppercase text-[10px]">
                            <th className="py-3 px-4 w-12 text-center">Rank</th>
                            <th className="py-3 px-4">Video & Platform</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4 text-right">Views Count</th>
                            <th className="py-3 px-4 text-center">Featured / Pin Frequency</th>
                            <th className="py-3 px-4 text-right">Client Clicks</th>
                            <th className="py-3 px-4">Engagement Index</th>
                            <th className="py-3 px-4 text-center">Homepage Status & Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {sortedInsightsVideos.map((video, idx) => {
                            const platformBadge = 
                              video.platform === 'youtube'
                                ? { label: 'YouTube', color: 'bg-red-50 text-red-700 border-red-200', icon: YouTubeIcon }
                                : video.platform === 'instagram'
                                ? { label: 'Instagram', color: 'bg-pink-50 text-pink-700 border-pink-200', icon: InstagramIcon }
                                : { label: 'Facebook', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: FacebookIcon };

                            const rankColor = 
                              idx === 0 ? 'bg-amber-400 text-[#0F172A] font-bold' :
                              idx === 1 ? 'bg-neutral-300 text-[#0F172A] font-bold' :
                              idx === 2 ? 'bg-amber-700 text-white font-bold' :
                              'bg-neutral-100 text-neutral-600';

                            const score = video.engagementScore || Math.min(99, Math.round(((video.viewsNumeric || 30000) / 130000) * 40 + 60));
                            const pinTimes = video.pinCount || (video.featured ? 12 : 3);
                            const clicks = video.clicksCount || Math.round((video.viewsNumeric || 30000) * 0.08);

                            return (
                              <tr key={video.id} className="hover:bg-[#FAF5E5]/40 transition-colors">
                                <td className="py-3.5 px-4 text-center">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-mono ${rankColor}`}>
                                    {idx + 1}
                                  </span>
                                </td>

                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3 min-w-[240px]">
                                    <div className="relative w-14 h-10 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-neutral-200">
                                      {video.thumbnail ? (
                                        <img
                                          src={video.thumbnail}
                                          alt={video.title}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/40">
                                          <Film className="w-4 h-4" />
                                        </div>
                                      )}
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/10 cursor-pointer"
                                        onClick={() => setActiveWatchVideo(video)}>
                                        <Play className="w-3.5 h-3.5 fill-white text-white" />
                                      </div>
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border ${platformBadge.color}`}>
                                          <platformBadge.icon className="w-2.5 h-2.5" />
                                          <span>{platformBadge.label}</span>
                                        </span>
                                        {video.duration && (
                                          <span className="text-[10px] font-mono text-neutral-400">
                                            {video.duration}
                                          </span>
                                        )}
                                      </div>
                                      <h5 
                                        onClick={() => setActiveWatchVideo(video)}
                                        className="font-serif text-xs font-bold text-[#0F172A] truncate max-w-xs hover:text-[#D09A40] cursor-pointer"
                                        title={video.title}
                                      >
                                        {video.title}
                                      </h5>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4">
                                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[11px] font-medium whitespace-nowrap">
                                    {video.category}
                                  </span>
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  <div className="font-mono font-bold text-xs text-[#0F172A]">
                                    {video.viewsCount || `${((video.viewsNumeric || 30000)/1000).toFixed(1)}K views`}
                                  </div>
                                  <span className="text-[10px] text-neutral-400 font-mono">
                                    {(video.viewsNumeric || 30000).toLocaleString('en-IN')} total
                                  </span>
                                </td>

                                <td className="py-3.5 px-4 text-center">
                                  <div className="inline-flex flex-col items-center">
                                    <span className="font-mono font-bold text-xs text-[#0F172A] flex items-center gap-1">
                                      <Star className="w-3 h-3 text-[#D09A40] fill-[#D09A40]" />
                                      <span>Featured {pinTimes}x</span>
                                    </span>
                                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded mt-0.5 ${
                                      video.featured 
                                        ? 'bg-emerald-100 text-emerald-800 font-bold' 
                                        : 'text-neutral-400'
                                    }`}>
                                      {video.featured ? '● Live on Homepage' : '○ Not pinned'}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  <div className="font-mono font-bold text-xs text-blue-700">
                                    {clicks.toLocaleString('en-IN')}
                                  </div>
                                  <span className="text-[10px] text-neutral-400 font-mono">
                                    {((clicks / (video.viewsNumeric || 30000)) * 100).toFixed(1)}% conv.
                                  </span>
                                </td>

                                <td className="py-3.5 px-4">
                                  <div className="w-28 space-y-1">
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-neutral-500">Score</span>
                                      <span className="font-bold text-[#D09A40]">{score}%</span>
                                    </div>
                                    <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-gradient-to-r from-[#D09A40] to-amber-500 h-full rounded-full transition-all"
                                        style={{ width: `${score}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleFeaturedVideo(video.id)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${
                                        video.featured
                                          ? 'bg-[#FAF5E5] text-[#D09A40] border border-[#D09A40]/40 hover:bg-amber-100'
                                          : 'bg-[#0F172A] text-white hover:bg-[#D09A40]'
                                      }`}
                                      title={video.featured ? 'Unpin from Homepage' : 'Pin Reel to Homepage'}
                                    >
                                      <Pin className={`w-3 h-3 ${video.featured ? 'fill-[#D09A40]' : ''}`} />
                                      <span>{video.featured ? 'Pinned' : 'Pin Reel'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setActiveWatchVideo(video)}
                                      className="p-1.5 rounded-lg text-neutral-500 hover:text-[#0F172A] hover:bg-neutral-100 transition-colors cursor-pointer"
                                      title="Preview Video Player"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditVideo(video)}
                                      className="p-1.5 rounded-lg text-neutral-500 hover:text-[#0F172A] hover:bg-neutral-100 transition-colors cursor-pointer"
                                      title="Edit Video"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                  SUBTAB C: PHOTO LOOKS & GALLERY
              ======================================================== */}
              {gallerySubTab === 'photos' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {galleryItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl border border-[#0F172A]/10 overflow-hidden shadow-xs hover:border-[#D09A40] flex flex-col justify-between group"
                      >
                        <div>
                          <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
                            <img
                              src={item.image}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono rounded-md uppercase">
                                {item.category}
                              </span>
                              {item.type === 'before_after' && (
                                <span className="px-2 py-0.5 bg-[#D09A40] text-[#0F172A] text-[10px] font-bold rounded-md uppercase">
                                  Before/After
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono text-neutral-400">By {item.artist}</span>
                              <span className="text-[10px] text-neutral-400">{item.created_at}</span>
                            </div>
                            <h4 className="font-serif text-base font-bold text-[#0F172A] mt-1 truncate">
                              {item.title}
                            </h4>
                            <p className="text-xs text-[#4A4A4A] line-clamp-2 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="p-4 pt-0 flex items-center justify-between border-t border-neutral-100 mt-2">
                          <span className="text-[10px] text-neutral-500 truncate">
                            Service: {item.service}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditGallery(item)}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-[#0F172A] hover:bg-neutral-100"
                              title="Edit Photo"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteGalleryItem(item.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Delete Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ========================================================
          SERVICE FORM MODAL (ADD / EDIT)
      ======================================================== */}
      {isServiceFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-300 overflow-hidden text-[#0F172A] max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-[#D09A40]" />
                <h3 className="font-serif text-lg font-bold">
                  {editingServiceId ? 'Edit Service Details' : 'Add New Salon Treatment'}
                </h3>
              </div>
              <button
                onClick={() => setIsServiceFormOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-6 space-y-4 overflow-y-auto flex-1">
              {srvFormError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{srvFormError}</span>
                </div>
              )}

              {/* Service Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 24K Pure Gold Radiance Facial"
                  value={srvTitle}
                  onChange={(e) => setSrvTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40] bg-neutral-50"
                />
              </div>

              {/* Category & Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={srvCategory}
                    onChange={(e) => setSrvCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40] bg-neutral-50"
                  >
                    {SERVICE_CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Price in ₹ *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-mono">₹</span>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="4999"
                      value={srvPrice}
                      onChange={(e) => setSrvPrice(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40] font-mono bg-neutral-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Duration *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 90 mins"
                    value={srvDuration}
                    onChange={(e) => setSrvDuration(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40] font-mono bg-neutral-50"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Service Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the treatment steps, skin/hair benefits, and premium products used..."
                  value={srvDescription}
                  onChange={(e) => setSrvDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40] bg-neutral-50"
                />
              </div>

              {/* Highlights */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Key Highlights / Features
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. 100% Formaldehyde-Free Moroccan formula"
                    value={newHighlightInput}
                    onChange={(e) => setNewHighlightInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddHighlight();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs border border-neutral-300 rounded-xl bg-neutral-50"
                  />
                  <button
                    type="button"
                    onClick={handleAddHighlight}
                    className="px-3 py-1.5 bg-[#0F172A] text-white text-xs font-semibold rounded-xl hover:bg-[#D09A40] cursor-pointer"
                  >
                    Add Highlight
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {srvHighlights.map((h, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF5E5] border border-[#D09A40]/30 text-xs text-[#0F172A]"
                    >
                      <span>{h}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHighlight(i)}
                        className="text-neutral-400 hover:text-red-600 cursor-pointer ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Image URL & Quick Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Service Cover Image URL
                </label>
                <input
                  type="text"
                  value={srvImage}
                  onChange={(e) => setSrvImage(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl font-mono bg-neutral-50 mb-2"
                />

                <p className="text-[10px] text-neutral-500 mb-1">Or pick from preset high-res salon photo assets:</p>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_SERVICE_IMAGES.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSrvImage(img.url)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        srvImage === img.url ? 'border-[#D09A40] ring-2 ring-[#D09A40]/30' : 'border-neutral-200 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] py-0.5 text-center truncate px-1">
                        {img.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Badges / Toggle */}
              <div className="pt-2 border-t border-neutral-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={srvPopular}
                    onChange={(e) => setSrvPopular(e.target.checked)}
                    className="rounded text-[#D09A40] focus:ring-[#D09A40] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#0F172A]">
                    Mark as "Most Requested" (Featured badge on main website)
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsServiceFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  {editingServiceId ? 'Update Service' : 'Save & Publish Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          DELETE SERVICE CONFIRMATION MODAL
      ======================================================== */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-neutral-200 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-serif text-lg font-bold text-[#0F172A]">
              Delete Service?
            </h3>
            <p className="text-xs text-[#4A4A4A] mt-1.5 leading-relaxed">
              Are you sure you want to remove <strong className="text-[#0F172A]">"{serviceToDelete.title}"</strong> from the live salon menu?
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setServiceToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteService}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-sm"
              >
                Yes, Delete Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          UPGRADED COMBO PACKAGE FORM MODAL
      ======================================================== */}
      {isPackageFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-neutral-300 overflow-hidden text-[#0F172A] max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#D09A40]" />
                <div>
                  <h3 className="font-serif text-lg font-bold">
                    {editingPackageId ? 'Edit Combo Package' : 'Create & Publish Festive Combo Package'}
                  </h3>
                  <span className="text-[11px] text-[#FAF5E5]/70">
                    Smart auto-suggestions, tagline generator & real-time discount calculation
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsPackageFormOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="p-6 space-y-5 overflow-y-auto flex-1">
              {pkgFormError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pkgFormError}</span>
                </div>
              )}

              {/* 1. Quick Preset Templates Selector */}
              <div className="p-4 bg-[#FAF5E5]/80 rounded-2xl border border-[#D09A40]/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-[#D09A40]" />
                    <span>Quick Preset Templates (1-Tap Auto Fill)</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">5 Popular Templates</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {PACKAGE_PRESET_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleApplyPresetTemplate(tpl)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        pkgName === tpl.name
                          ? 'bg-[#0F172A] text-[#FAF5E5] shadow-sm ring-2 ring-[#D09A40]'
                          : 'bg-white hover:bg-[#FAF5E5] text-[#0F172A] border border-[#0F172A]/15 hover:border-[#D09A40]'
                      }`}
                    >
                      <Gift className="w-3 h-3 text-[#D09A40]" />
                      <span>{tpl.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Package Name & Festival/Offer Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Rajasthani Bridal Package"
                    value={pkgName}
                    onChange={(e) => {
                      setPkgName(e.target.value);
                      if (e.target.value.length > 3) {
                        setTaglineIdeas(generateTaglineIdeas(e.target.value));
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40] bg-neutral-50 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Festival / Offer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Diwali Special Offer / Wedding Season Discount"
                    value={pkgOfferName}
                    onChange={(e) => setPkgOfferName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40] bg-neutral-50"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {FESTIVAL_SUGGESTION_CHIPS.slice(0, 4).map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPkgOfferName(chip)}
                        className="text-[10px] px-2 py-0.5 bg-neutral-100 hover:bg-[#FAF5E5] hover:text-[#D09A40] text-neutral-600 rounded-md border border-neutral-200 transition-colors cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Tagline with Smart Auto Generator */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-[#D09A40]" />
                    <span>Package Tagline & Catchphrase</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateTaglines}
                    className="px-2.5 py-1 bg-white hover:bg-[#FAF5E5] border border-[#D09A40]/40 rounded-lg text-xs font-semibold text-[#D09A40] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#D09A40]" />
                    <span>Generate Tagline Ideas</span>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="e.g. Complete head-to-toe makeover for your big day"
                  value={pkgTagline}
                  onChange={(e) => setPkgTagline(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40] bg-white"
                />

                {/* Tagline Ideas Chips */}
                {taglineIdeas.length > 0 && (
                  <div>
                    <span className="text-[10px] text-neutral-500 block mb-1">
                      💡 Click any catchphrase to set as tagline:
                    </span>
                    <div className="space-y-1.5">
                      {taglineIdeas.map((idea, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPkgTagline(idea);
                            showToast('Applied tagline!');
                          }}
                          className={`w-full text-left p-2 rounded-xl text-xs transition-all flex items-center justify-between gap-2 border cursor-pointer ${
                            pkgTagline === idea
                              ? 'bg-[#FAF5E5] border-[#D09A40] text-[#0F172A] font-semibold'
                              : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-600'
                          }`}
                        >
                          <span className="truncate">"{idea}"</span>
                          {pkgTagline === idea ? (
                            <Check className="w-3.5 h-3.5 text-[#D09A40] shrink-0" />
                          ) : (
                            <span className="text-[10px] text-neutral-400 shrink-0">Select</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Pricing, Discount & Auto-Calculated Savings */}
              <div className="p-4 bg-white rounded-2xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pricing & Discount Calculator</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoCalculateRegularPrice}
                    className="text-[11px] font-semibold text-[#D09A40] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>⚡ Auto-sum regular price from {pkgServices.length} selected services</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Regular Combined Price (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-mono">₹</span>
                      <input
                        type="number"
                        min={1}
                        value={pkgRegularPrice}
                        onChange={(e) => setPkgRegularPrice(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 text-xs border border-neutral-300 rounded-xl font-mono bg-neutral-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Special Combo Package Price (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-mono">₹</span>
                      <input
                        type="number"
                        min={1}
                        value={pkgPackagePrice}
                        onChange={(e) => setPkgPackagePrice(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 text-xs border border-neutral-300 rounded-xl font-mono bg-neutral-50 font-bold text-[#0F172A]"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Discount Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">Quick Discounts:</span>
                  {[10, 15, 20, 25, 30, 35, 40, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleApplyDiscountPercentage(pct)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        calculatedSavings.discountPercent === pct
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-neutral-100 hover:bg-emerald-50 text-neutral-700 border border-neutral-200'
                      }`}
                    >
                      {pct}% OFF
                    </button>
                  ))}
                </div>

                {/* Prominent Live Savings Badge */}
                <div className="p-3 bg-[#FAF5E5] rounded-xl border border-[#D09A40]/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#D09A40] text-[#0F172A] text-xs font-bold font-mono">
                      Save {calculatedSavings.discountPercent}% | ₹{calculatedSavings.savings.toLocaleString('en-IN')} Off
                    </span>
                    <span className="text-xs text-[#4A4A4A]">
                      (Client pays <strong className="text-[#0F172A]">₹{pkgPackagePrice.toLocaleString('en-IN')}</strong>)
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
                    Live Auto-Calculated
                  </span>
                </div>
              </div>

              {/* 4. Offer Time Validity Range */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#D09A40]" />
                    <span>Offer Time Validity Range & Duration</span>
                  </span>

                  {offerDateBadge && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${offerDateBadge.color}`}>
                      {offerDateBadge.text}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Offer Valid From (Start Date)
                    </label>
                    <input
                      type="date"
                      value={pkgValidFrom}
                      onChange={(e) => setPkgValidFrom(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Offer Valid Until (End Date)
                    </label>
                    <input
                      type="date"
                      value={pkgValidUntil}
                      onChange={(e) => setPkgValidUntil(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Total Service Duration
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 210 mins / 2 Sessions"
                      value={pkgDuration}
                      onChange={(e) => setPkgDuration(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-xl bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Package Redemption Validity
                    </label>
                    <select
                      value={pkgValidity}
                      onChange={(e) => setPkgValidity(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-xl bg-white"
                    >
                      {VALIDITY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Package Description
                    </label>
                    <input
                      type="text"
                      placeholder="Summary of services and perks included..."
                      value={pkgDescription}
                      onChange={(e) => setPkgDescription(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-xl bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Cover Image Upload & Gallery Presets */}
              <div className="p-4 bg-white rounded-2xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#D09A40]" />
                    <span>Package Cover Image</span>
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1 bg-[#0F172A] hover:bg-[#D09A40] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Custom Image</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <img
                    src={pkgImage}
                    alt="Package cover preview"
                    referrerPolicy="no-referrer"
                    className="w-24 h-16 rounded-xl object-cover border border-neutral-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={pkgImage}
                      onChange={(e) => setPkgImage(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-xl font-mono bg-neutral-50"
                      placeholder="Image URL..."
                    />
                    <span className="text-[10px] text-neutral-400 block mt-1">
                      Upload directly from your device or pick a preset photo below:
                    </span>
                  </div>
                </div>

                {/* Preset Photo Selector Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                  {PACKAGE_PRESET_IMAGES.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPkgImage(img.url)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        pkgImage === img.url
                          ? 'border-[#D09A40] ring-2 ring-[#D09A40]/40'
                          : 'border-neutral-200 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] py-0.5 text-center truncate px-0.5">
                        {img.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Enhanced Service Multi-Picker & Selected Services */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-[#D09A40]" />
                    <span>Included Services in Package ({pkgServices.length})</span>
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    Pick from active salon menu or type custom service
                  </span>
                </div>

                {/* Active Services Chips */}
                <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2.5 bg-white rounded-xl border border-neutral-200">
                  {pkgServices.length === 0 ? (
                    <span className="text-xs text-neutral-400 italic">No services included yet. Choose from the catalog below.</span>
                  ) : (
                    pkgServices.map((srv, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FAF5E5] text-[#0F172A] border border-[#D09A40]/30 text-xs font-medium"
                      >
                        <Check className="w-3 h-3 text-[#D09A40]" />
                        <span>{srv}</span>
                        <button
                          type="button"
                          onClick={() => setPkgServices(pkgServices.filter((_, i) => i !== idx))}
                          className="text-neutral-400 hover:text-red-600 cursor-pointer ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Custom Manual Service Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type custom service title (e.g. Free Consultation & Welcome Drink)..."
                    value={newServiceInput}
                    onChange={(e) => setNewServiceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newServiceInput.trim()) {
                          setPkgServices([...pkgServices, newServiceInput.trim()]);
                          setNewServiceInput('');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs border border-neutral-300 rounded-xl bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newServiceInput.trim()) {
                        setPkgServices([...pkgServices, newServiceInput.trim()]);
                        setNewServiceInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-[#0F172A] text-white text-xs font-semibold rounded-xl hover:bg-[#D09A40] cursor-pointer"
                  >
                    Add Service
                  </button>
                </div>

                {/* Live Menu Picker Selector Drawer */}
                <div className="pt-2 border-t border-neutral-200">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-neutral-600">
                      Quick 1-Tap Add from Live Salon Catalog:
                    </span>
                    <input
                      type="text"
                      placeholder="Filter treatments..."
                      value={pkgServiceMenuSearch}
                      onChange={(e) => setPkgServiceMenuSearch(e.target.value)}
                      className="px-2.5 py-1 text-[11px] border border-neutral-300 rounded-lg w-40 bg-white"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {filteredCatalogServices.map((service) => {
                      const isSelected = pkgServices.some(
                        (s) => s.toLowerCase() === service.title.toLowerCase()
                      );
                      return (
                        <div
                          key={service.id}
                          onClick={() => handleToggleCatalogService(service)}
                          className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                              : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                              isSelected ? 'bg-emerald-600 text-white' : 'border border-neutral-300 text-transparent'
                            }`}>
                              ✓
                            </div>
                            <span className="truncate">{service.title}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-500 uppercase font-mono">
                              {service.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                            <span className="text-neutral-500">{service.duration}</span>
                            <span className="font-bold text-[#0F172A]">₹{service.price}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Package Status & Features */}
              <div className="flex items-center gap-6 pt-2 border-t border-neutral-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pkgActive}
                    onChange={(e) => setPkgActive(e.target.checked)}
                    className="rounded text-[#D09A40] focus:ring-[#D09A40] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#0F172A]">
                    Active (Show in main packages & deals section)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pkgFeatured}
                    onChange={(e) => setPkgFeatured(e.target.checked)}
                    className="rounded text-[#D09A40] focus:ring-[#D09A40] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#0F172A]">
                    Featured Deal Badge
                  </span>
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsPackageFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#D09A40]" />
                  <span>{editingPackageId ? 'Update Combo Package' : 'Publish Festive Combo Package'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          GALLERY FORM MODAL
      ======================================================== */}
      {isGalleryFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-300 overflow-hidden text-[#0F172A] max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#D09A40]" />
                <h3 className="font-serif text-lg font-bold">
                  {editingGalleryId ? 'Edit Gallery Photo' : 'Upload New Photo Look'}
                </h3>
              </div>
              <button
                onClick={() => setIsGalleryFormOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGalleryItem} className="p-6 space-y-4 overflow-y-auto flex-1">
              {galFormError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{galFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Look Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Rajasthani HD Bridal Look"
                  value={galTitle}
                  onChange={(e) => setGalTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Display Type
                  </label>
                  <select
                    value={galType}
                    onChange={(e) => setGalType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl"
                  >
                    <option value="photo">Single High-Res Photo</option>
                    <option value="before_after">Before & After Slider</option>
                    <option value="portfolio">Masterclass Portfolio</option>
                    <option value="work_showcase">Client Showcase</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={galCategory}
                    onChange={(e) => setGalCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Primary Image URL *
                </label>
                <input
                  type="text"
                  required
                  value={galImage}
                  onChange={(e) => setGalImage(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-xl font-mono"
                />
              </div>

              {galType === 'before_after' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Before Image URL
                  </label>
                  <input
                    type="text"
                    value={galBeforeImage}
                    onChange={(e) => setGalBeforeImage(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-xl font-mono"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsGalleryFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-colors cursor-pointer"
                >
                  {editingGalleryId ? 'Update Photo' : 'Upload Look'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          VIDEO FORM MODAL (ADD / EDIT REEL OR VIDEO)
      ======================================================== */}
      {isVideoFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-300 overflow-hidden text-[#0F172A] max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#D09A40]/20 flex items-center justify-center text-[#D09A40]">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold">
                    {editingVideoId ? 'Edit Video Details' : 'Embed Video / Instagram Reel'}
                  </h3>
                  <span className="text-[11px] text-[#FAF5E5]/70">
                    Supports YouTube Videos & Shorts, Instagram Reels, and Facebook Videos
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsVideoFormOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="p-6 space-y-4 overflow-y-auto flex-1">
              {vidFormError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{vidFormError}</span>
                </div>
              )}

              {/* 1. Video URL & Auto Platform Detection Badge */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Video / Reel URL *
                  </label>

                  {/* Auto Detected Platform Badge */}
                  {parsedVideoInfo.isValid && (
                    <div className="flex items-center gap-1.5">
                      {parsedVideoInfo.platform === 'youtube' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-600 text-white shadow-2xs">
                          <YouTubeIcon className="w-3 h-3 text-white" />
                          <span>YouTube Detected</span>
                        </span>
                      )}
                      {parsedVideoInfo.platform === 'instagram' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-2xs">
                          <InstagramIcon className="w-3 h-3 text-white" />
                          <span>Instagram Reel Detected</span>
                        </span>
                      )}
                      {parsedVideoInfo.platform === 'facebook' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1877F2] text-white shadow-2xs">
                          <FacebookIcon className="w-3 h-3 text-white" />
                          <span>Facebook Video Detected</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <input
                  type="url"
                  required
                  placeholder="Paste YouTube, Instagram Reel, or Facebook video URL..."
                  value={vidUrl}
                  onChange={(e) => setVidUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-xl font-mono focus:outline-none focus:border-[#D09A40] bg-white"
                />

                {/* Quick Example Links */}
                <div className="flex items-center gap-1 flex-wrap text-[10px] text-neutral-500 pt-1">
                  <span>Quick Templates:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setVidUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
                      setVidTitle('Royal Rajasthani HD Bridal Makeover Reel');
                    }}
                    className="px-1.5 py-0.5 bg-neutral-200 hover:bg-neutral-300 rounded text-neutral-700"
                  >
                    YouTube Video
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVidUrl('https://www.instagram.com/reel/C8xYz123ABC/');
                      setVidTitle('Moroccan Nanoplastia Hair Smoothening Reel');
                    }}
                    className="px-1.5 py-0.5 bg-pink-100 hover:bg-pink-200 rounded text-pink-800"
                  >
                    Instagram Reel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVidUrl('https://www.facebook.com/beautyzonejaipur/videos/1029384756');
                      setVidTitle('Client Review & Before-After Glow Story');
                    }}
                    className="px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 rounded text-blue-800"
                  >
                    Facebook Video
                  </button>
                </div>
              </div>

              {/* 2. Live Embed Preview Box */}
              {parsedVideoInfo.isValid && parsedVideoInfo.embedUrl && (
                <div className="p-3 bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-300 text-white">
                  <span className="text-[10px] font-mono text-neutral-400 block mb-2">
                    Live Video Embed Preview:
                  </span>
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                    {parsedVideoInfo.platform === 'youtube' ? (
                      <iframe
                        src={parsedVideoInfo.embedUrl}
                        title="YouTube video preview"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-neutral-800 to-neutral-950 text-center">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2 text-[#D09A40]">
                          <Play className="w-6 h-6 fill-[#D09A40]" />
                        </div>
                        <span className="text-xs font-semibold text-white">
                          {parsedVideoInfo.platformLabel}
                        </span>
                        <span className="text-[11px] text-neutral-400 max-w-xs mt-0.5 truncate">
                          {vidUrl}
                        </span>
                        <span className="text-[10px] text-emerald-400 mt-2 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                          ✓ Embed URL Verified for Customer View
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Title & Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Video Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bridal Nail Art Transformation with Swarovski Crystals"
                  value={vidTitle}
                  onChange={(e) => setVidTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40] bg-neutral-50 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Category Tag *
                  </label>
                  <select
                    value={vidCategory}
                    onChange={(e) => setVidCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40] bg-neutral-50"
                  >
                    {VIDEO_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Artist / Stylist Credit
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sunita Meena (Bridal Specialist)"
                    value={vidAuthor}
                    onChange={(e) => setVidAuthor(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40] bg-neutral-50"
                  />
                </div>
              </div>

              {/* Description / Caption */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Description / Caption & Hashtags
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the makeover steps, products used, and client feedback..."
                  value={vidDescription}
                  onChange={(e) => setVidDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-[#D09A40] bg-neutral-50"
                />
              </div>

              {/* Views & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0:58 / 2:15"
                    value={vidDuration}
                    onChange={(e) => setVidDuration(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl font-mono bg-neutral-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Views Count Display
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 48.2K views"
                    value={vidViewsCount}
                    onChange={(e) => setVidViewsCount(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl font-mono bg-neutral-50"
                  />
                </div>
              </div>

              {/* Custom Cover Thumbnail & Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Video Thumbnail / Cover Image URL
                </label>
                <input
                  type="text"
                  placeholder="Thumbnail image URL (leave empty for auto)..."
                  value={vidThumbnail}
                  onChange={(e) => setVidThumbnail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl font-mono bg-neutral-50 mb-2"
                />

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {VIDEO_PRESET_THUMBNAILS.map((thumb, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setVidThumbnail(thumb.url)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        vidThumbnail === thumb.url ? 'border-[#D09A40] ring-2 ring-[#D09A40]/40' : 'border-neutral-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={thumb.url} alt={thumb.label} className="w-full h-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] py-0.5 text-center truncate px-0.5">
                        {thumb.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Featured & Active Toggles */}
              <div className="flex items-center gap-6 pt-2 border-t border-neutral-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vidFeatured}
                    onChange={(e) => setVidFeatured(e.target.checked)}
                    className="rounded text-[#D09A40] focus:ring-[#D09A40] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#0F172A]">
                    Featured on Customer Homepage & Reels Carousel
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vidActive}
                    onChange={(e) => setVidActive(e.target.checked)}
                    className="rounded text-[#D09A40] focus:ring-[#D09A40] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#0F172A]">
                    Active in Live Video Showcase
                  </span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsVideoFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
                >
                  <Film className="w-4 h-4 text-[#D09A40]" />
                  <span>{editingVideoId ? 'Update Video Details' : 'Publish Video / Reel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          WATCH VIDEO LIGHTBOX PREVIEW MODAL
      ======================================================== */}
      {activeWatchVideo && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl bg-[#0F172A] rounded-3xl shadow-2xl border border-white/20 overflow-hidden text-white flex flex-col">
            <div className="px-6 py-3.5 bg-black/50 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#D09A40]" />
                <span className="text-xs font-bold font-mono text-[#D09A40] uppercase">
                  {activeWatchVideo.platform} Player Preview
                </span>
                <span className="text-xs text-white/50">• {activeWatchVideo.category}</span>
              </div>
              <button
                onClick={() => setActiveWatchVideo(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black">
              {activeWatchVideo.platform === 'youtube' ? (
                <iframe
                  src={activeWatchVideo.embedUrl}
                  title={activeWatchVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : activeWatchVideo.platform === 'facebook' ? (
                <iframe
                  src={activeWatchVideo.embedUrl}
                  title={activeWatchVideo.title}
                  className="w-full h-full border-0"
                  allow="encrypted-media"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-neutral-900 to-black">
                  <InstagramIcon className="w-12 h-12 text-pink-500 mb-3" />
                  <h4 className="font-serif text-lg font-bold text-white max-w-md">
                    {activeWatchVideo.title}
                  </h4>
                  <p className="text-xs text-white/70 max-w-sm mt-1">
                    {activeWatchVideo.description}
                  </p>
                  <a
                    href={activeWatchVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-xl shadow-md hover:scale-105 transition-transform flex items-center gap-2"
                  >
                    <span>Open Reel on Instagram App</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-5 bg-[#0F172A] border-t border-white/10 flex items-center justify-between">
              <div>
                <h4 className="font-serif text-base font-bold text-white">{activeWatchVideo.title}</h4>
                <p className="text-xs text-white/70 mt-0.5 line-clamp-1">{activeWatchVideo.description}</p>
              </div>

              <a
                href={activeWatchVideo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 ml-4"
              >
                <span>Open Original Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
