import React, { useMemo, useState } from 'react';
import { Stylist, GalleryItem } from '../types';
import type { SalonStaff, StaffWorkPhoto } from '../types/auth';
import { DEMO_SALON_STAFF } from '../data/demoStaffData';
import { StylistProfileModal, type StylistProfile } from './StylistProfileModal';
import {
  Award,
  Star,
  MapPin,
  Calendar,
  Sparkles,
  Eye,
  Plus,
  Camera,
  Loader2,
  MessageCircle,
  Heart,
  UserPlus,
  Lock,
} from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { SmartImage } from './crud/SmartImage';
import { ItemActions } from './crud/ItemActions';
import { CardEditorModal, type EditorField } from './crud/CardEditorModal';
import { CrudToast, ManageControls, ManageHint } from './crud/ManageControls';
import { useCardCollection } from './crud/useCardCollection';
import { optimizeImageFile } from '../lib/imageUtils';
import { StylistChatModal } from './StylistChatModal';

interface StylistsSectionProps {
  onBookWithStylist: (stylistName: string, branchName: string) => void;
  galleryItems?: GalleryItem[];
  onUpdateGallery?: (items: GalleryItem[]) => void;
  liveStaff?: SalonStaff[] | null;
  websitePublished?: boolean;
}

interface DisplayStylist extends Stylist {
  isDemo?: boolean;
  bookingEnabled?: boolean;
  workPhotos?: StaffWorkPhoto[];
  workPhotosConsent?: boolean;
}

const inferCategory = (member: SalonStaff): Stylist['category'] => {
  const haystack = `${member.roleTitle} ${(member.specialties || []).join(' ')}`.toLowerCase();
  if (haystack.includes('nail')) return 'nails';
  if (haystack.includes('skin') || haystack.includes('facial') || haystack.includes('aesthetic')) return 'skin';
  if (haystack.includes('hair') || haystack.includes('color') || haystack.includes('balayage')) return 'hair';
  return 'bridal';
};

const salonStaffToDisplay = (member: SalonStaff, defaultBranch: string): DisplayStylist => {
  const consented = Boolean(member.workPhotosConsent);
  const workPhotos = consented && Array.isArray(member.workPhotos) ? member.workPhotos : [];
  return {
    id: member.id,
    name: member.name,
    role: member.roleTitle || '',
    category: inferCategory(member),
    branch: defaultBranch,
    experience: member.experience || '',
    ratings:
      member.rating !== null && member.rating !== undefined && Number(member.rating) > 0
        ? Number(member.rating)
        : 0,
    reviewCount: Number(member.reviewCount) || 0,
    bio: member.bio || '',
    avatar: member.photoUrl || '',
    specialties: Array.isArray(member.specialties) ? member.specialties : [],
    certifications: Array.isArray(member.qualifications) ? member.qualifications : [],
    portfolio: workPhotos.map((p) => ({
      image: p.url,
      title: p.caption || `${member.name} work`,
      description: '',
    })),
    workPhotos,
    workPhotosConsent: consented,
    isDemo: Boolean(member.isDemo),
    bookingEnabled: member.bookingEnabled !== false && !member.isDemo,
  };
};

const STYLIST_CATEGORY_OPTIONS = [
  { value: 'bridal', label: 'Bridal makeup' },
  { value: 'hair', label: 'Hair & color' },
  { value: 'skin', label: 'Skin & facials' },
  { value: 'nails', label: 'Nail art' },
];

const buildStylistEditorFields = (branches: string[]): EditorField[] => [
  {
    key: 'avatar',
    type: 'image',
    label: 'Portrait',
    span: 2,
    aspect: 'aspect-[3/4]',
    help: 'Portrait cards crop with object-fit: cover and object-top, so faces stay in frame at every width.',
  },
  { key: 'name', type: 'text', label: 'Full name', span: 2, required: true },
  { key: 'role', type: 'text', label: 'Designation / job title', span: 2, required: true },
  { key: 'category', type: 'select', label: 'Specialty', options: STYLIST_CATEGORY_OPTIONS, required: true },
  {
    key: 'branch',
    type: 'select',
    label: 'Home branch',
    options: Array.from(new Set([...branches, 'All Salon Outlets'])),
    required: true,
  },
  { key: 'experience', type: 'text', label: 'Experience', placeholder: 'e.g. 14+ Years' },
  { key: 'ratings', type: 'number', label: 'Rating (0–5)', min: 0, max: 5, step: 0.1 },
  { key: 'reviewCount', type: 'number', label: 'Review count', min: 0 },
  { key: 'bio', type: 'textarea', label: 'Bio', span: 2, rows: 4 },
  {
    key: 'specialties',
    type: 'tags',
    label: 'Skills & specialties',
    span: 2,
    rows: 3,
    separator: 'comma',
    help: 'Separate specialties with commas.',
  },
  {
    key: 'certifications',
    type: 'tags',
    label: 'Qualifications & certifications',
    span: 2,
    rows: 3,
    separator: 'newline',
    help: 'One qualification per line.',
  },
];

const emptyStylistValues = (branch: string): Record<string, any> => ({
  avatar: '',
  name: '',
  role: '',
  category: 'bridal',
  branch,
  experience: '',
  ratings: 0,
  reviewCount: 0,
  bio: '',
  specialties: [],
  certifications: [],
});

const stylistToEditorValues = (stylist?: Stylist, branch = ''): Record<string, any> => {
  if (!stylist) return emptyStylistValues(branch);
  return {
    avatar: stylist.avatar || '',
    name: stylist.name,
    role: stylist.role,
    category: stylist.category,
    branch: stylist.branch,
    experience: stylist.experience,
    ratings: stylist.ratings,
    reviewCount: stylist.reviewCount,
    bio: stylist.bio,
    specialties: stylist.specialties || [],
    certifications: stylist.certifications || [],
  };
};

const normalizeStylistValues = (values: Record<string, any>, base?: Stylist): Stylist => ({
  ...(base || {
    id: `stylist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    role: '',
    category: 'bridal',
    branch: '',
    experience: '',
    ratings: 0,
    reviewCount: 0,
    bio: '',
    avatar: '',
    specialties: [],
    certifications: [],
    portfolio: [],
  }),
  avatar: String(values.avatar || '').trim(),
  name: String(values.name || '').trim(),
  role: String(values.role || '').trim(),
  category: String(values.category || 'bridal') as Stylist['category'],
  branch: String(values.branch || '').trim(),
  experience: String(values.experience || '').trim(),
  ratings: Math.min(5, Math.max(0, Number(values.ratings ?? values.rating) || 0)),
  reviewCount: Math.max(0, Math.round(Number(values.reviewCount ?? values.review_count) || 0)),
  bio: String(values.bio || '').trim(),
  specialties: Array.isArray(values.specialties) ? values.specialties : [],
  certifications: Array.isArray(values.certifications) ? values.certifications : [],
  portfolio: base?.portfolio || [],
});

export const StylistsSection: React.FC<StylistsSectionProps> = ({
  onBookWithStylist,
  liveStaff = null,
  websitePublished = true,
}) => {
  const { brand, t, updateBrand } = useBrand();
  // Full Profile Modal is strictly closed by default on page load.
  const [selectedStylist, setSelectedStylist] = useState<DisplayStylist | null>(null);
  const [chatWithStylist, setChatWithStylist] = useState<Stylist | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'bridal' | 'hair' | 'skin' | 'nails'>('all');
  const [followedStylists, setFollowedStylists] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('followed_stylists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const defaultBranch = brand.branches[0]?.name || `${brand.cityName} Flagship Salon`;

  const manager = useCardCollection<Stylist>(
    brand.stylists,
    (next) => updateBrand({ stylists: next }),
    'Stylist'
  );

  const sourceStylists: DisplayStylist[] = useMemo(() => {
    if (!websitePublished) {
      return DEMO_SALON_STAFF.map((member) => salonStaffToDisplay(member, defaultBranch));
    }
    if (liveStaff !== null) {
      return liveStaff
        .filter((member) => member.active && !member.isDemo)
        .map((member) => salonStaffToDisplay(member, defaultBranch));
    }
    return brand.stylists.map((s) => ({
      ...s,
      workPhotos: (s.portfolio || []).map((p) => ({ url: p.image, caption: p.title })),
      workPhotosConsent: Boolean(s.portfolio && s.portfolio.length > 0),
      bookingEnabled: true,
      isDemo: false,
    }));
  }, [websitePublished, liveStaff, brand.stylists, defaultBranch]);

  const usingDbStaff = !websitePublished || liveStaff !== null;

  const toggleFollow = (stylistId: string, name: string) => {
    setFollowedStylists((prev) => {
      const isFollowing = prev.includes(stylistId);
      const next = isFollowing ? prev.filter((id) => id !== stylistId) : [...prev, stylistId];
      localStorage.setItem('followed_stylists', JSON.stringify(next));
      if (!isFollowing) {
        manager.notify(`You're now following ${name.split(' ')[0]} for special offers!`);
      }
      return next;
    });
  };

  const filteredStylists =
    activeFilter === 'all' ? sourceStylists : sourceStylists.filter((s) => s.category === activeFilter);

  const [uploadingStylistId, setUploadingStylistId] = useState<string | null>(null);

  const handleQuickImageUpload = async (stylistId: string, file: File | undefined) => {
    if (!file || usingDbStaff) return;
    setUploadingStylistId(stylistId);
    try {
      const dataUrl = await optimizeImageFile(file);
      const updatedStylists = brand.stylists.map((s) => (s.id === stylistId ? { ...s, avatar: dataUrl } : s));
      updateBrand({ stylists: updatedStylists });
      manager.notify('Stylist profile photo updated!');
    } catch (err) {
      console.error('[stylist photo upload]', err);
    } finally {
      setUploadingStylistId(null);
    }
  };

  const removeStylist = (id: string) => {
    setSelectedStylist((current) => (current?.id === id ? null : current));
    manager.removeItem(id);
  };

  const modalProfile: StylistProfile | null = useMemo(() => {
    if (!selectedStylist) return null;
    return {
      id: selectedStylist.id,
      name: selectedStylist.name,
      role: selectedStylist.role,
      branch: selectedStylist.branch,
      experience: selectedStylist.experience,
      rating: Number(selectedStylist.ratings) > 0 ? Number(selectedStylist.ratings) : null,
      reviewCount: Number(selectedStylist.reviewCount) || 0,
      bio: selectedStylist.bio,
      avatar: selectedStylist.avatar,
      specialties: selectedStylist.specialties,
      qualifications: selectedStylist.certifications,
      workPhotos: selectedStylist.workPhotos || [],
      workPhotosConsent: Boolean(selectedStylist.workPhotosConsent),
      bookingEnabled: selectedStylist.bookingEnabled !== false && !selectedStylist.isDemo,
      isDemo: Boolean(selectedStylist.isDemo),
    };
  }, [selectedStylist]);

  return (
    <section id="stylists" className="py-20 lg:py-28 bg-[#FAF5E5] border-t border-[#0F172A]/10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D09A40]/15 text-[#0F172A] text-xs font-semibold uppercase tracking-widest border border-[#D09A40]/30">
            <Sparkles className="w-3.5 h-3.5 text-[#D09A40]" />
            <span>{!websitePublished ? 'Sample Specialists Preview' : t('stylistsOverline')}</span>
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] tracking-tight">
            {t('stylistsTitle')}
          </h2>
          <p className="text-base text-[#4A4A4A]">{t('stylistsSubtitle')}</p>

          {!websitePublished && (
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-900">
              <Lock className="h-3.5 w-3.5" />
              Showing sample demo profiles while website is unpublished (not bookable).
            </p>
          )}

          {!usingDbStaff && (
            <>
              <div className="flex justify-center pt-1">
                <ManageControls
                  isManaging={manager.isManaging}
                  onToggle={manager.toggleManaging}
                  onAdd={manager.openCreate}
                  addLabel="Add Stylist"
                />
              </div>
              <ManageHint isManaging={manager.isManaging} noun="stylist" />
            </>
          )}
        </div>

        {/* Specialty Filter Pills */}
        <div className="flex items-center justify-center flex-wrap gap-2 mb-12">
          {[
            { id: 'all', label: 'All Specialists' },
            { id: 'bridal', label: 'Bridal Makeup' },
            { id: 'hair', label: 'Hair & Color' },
            { id: 'skin', label: 'Skin & Facials' },
            { id: 'nails', label: 'Nail Art' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-[#0F172A] text-[#FAF5E5] shadow-md border border-[#D09A40]'
                  : 'bg-white text-[#4A4A4A] hover:text-[#0F172A] border border-[#0F172A]/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stylists Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {filteredStylists.map((stylist) => {
            const hasGenuineRating = Number(stylist.ratings) > 0;
            const canBook = websitePublished && !stylist.isDemo && stylist.bookingEnabled !== false;

            return (
              <div
                key={stylist.id}
                className="relative w-full bg-white rounded-3xl overflow-hidden border border-[#0F172A]/10 elevation-subtle flex flex-col justify-between group h-full transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:border-[#D09A40]/40"
              >
                {!usingDbStaff && manager.canManage && (
                  <ItemActions
                    itemLabel="stylist"
                    alwaysVisible={manager.isManaging}
                    onEdit={() => manager.openEdit(stylist)}
                    onReplace={() => manager.openReplace(stylist)}
                    onDelete={() => removeStylist(stylist.id)}
                  />
                )}
                <div className="relative z-30 flex flex-col h-full pointer-events-none">
                  {/* Portrait Header */}
                  <div className="relative h-80 w-full overflow-hidden bg-[#0F172A] pointer-events-auto">
                    <SmartImage
                      src={stylist.avatar}
                      alt={stylist.name}
                      className="h-full w-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-85" />

                    {/* Top Left Pill: Demo or Experience */}
                    <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-1.5">
                      {stylist.isDemo && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                          Demo Profile
                        </span>
                      )}
                      {stylist.experience && (
                        <div className="bg-[#0F172A]/85 backdrop-blur-md text-[#FAF5E5] border border-[#D09A40]/40 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                          <Award className="w-3 h-3 text-[#D09A40]" />
                          <span>{stylist.experience}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Photo Upload Button (local brand mode only) */}
                    {!usingDbStaff && (
                      <div className="absolute top-3.5 right-3 z-10">
                        <input
                          type="file"
                          accept="image/*"
                          id={`card-upload-stylist-${stylist.id}`}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQuickImageUpload(stylist.id, file);
                            e.target.value = '';
                          }}
                        />
                        <label
                          htmlFor={`card-upload-stylist-${stylist.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 hover:bg-white text-[#0F172A] text-[11px] font-bold border border-[#D09A40]/40 shadow-md transition-all cursor-pointer hover:scale-105"
                          title="Upload / Change Photo for this specialist"
                        >
                          {uploadingStylistId === stylist.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D09A40]" />
                          ) : (
                            <Camera className="w-3.5 h-3.5 text-[#D09A40]" />
                          )}
                          <span className="hidden sm:inline">
                            {uploadingStylistId === stylist.id ? 'Uploading…' : 'Photo'}
                          </span>
                        </label>
                      </div>
                    )}

                    {/* Name & Title Overlay */}
                    <div className="absolute bottom-3.5 left-4 right-4 text-[#FAF5E5]">
                      <div className="flex items-center justify-between gap-2">
                        {stylist.role ? (
                          <p className="text-[11px] uppercase tracking-wider text-[#D09A40] font-bold">
                            {stylist.role}
                          </p>
                        ) : (
                          <span />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFollow(stylist.id, stylist.name);
                          }}
                          className={`p-1.5 rounded-full backdrop-blur-md border transition-all ${
                            followedStylists.includes(stylist.id)
                              ? 'bg-red-500 border-red-500 text-white scale-110'
                              : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105'
                          }`}
                          title={followedStylists.includes(stylist.id) ? 'Unfollow' : 'Follow for updates'}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${followedStylists.includes(stylist.id) ? 'fill-current' : ''}`}
                          />
                        </button>
                      </div>
                      <h3 className="font-serif text-xl font-bold leading-snug mt-0.5">{stylist.name}</h3>
                      {stylist.branch && (
                        <p className="text-[11px] text-[#FAF5E5]/80 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-[#D09A40]" />
                          <span>{stylist.branch}</span>
                        </p>
                      )}

                      {/* Genuine Star Rating ONLY */}
                      {hasGenuineRating && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.floor(stylist.ratings)
                                    ? 'fill-[#D09A40] text-[#D09A40]'
                                    : i < stylist.ratings
                                      ? 'fill-[#D09A40]/50 text-[#D09A40]'
                                      : 'text-white/30'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-[#FAF5E5]">{stylist.ratings.toFixed(1)}</span>
                          {stylist.reviewCount > 0 && (
                            <span className="text-[9px] text-[#FAF5E5]/60 font-medium">({stylist.reviewCount})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bio & Specialties (rendered only when non-empty) */}
                  {(stylist.bio || stylist.specialties.length > 0) && (
                    <div className="p-5 space-y-4 pointer-events-auto">
                      {stylist.bio && (
                        <p className="text-xs text-[#4A4A4A] leading-relaxed line-clamp-3">{stylist.bio}</p>
                      )}

                      {stylist.specialties.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-[#0F172A]/60 mb-1.5">
                            Skills & specialties
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {stylist.specialties.slice(0, 3).map((spec, i) => (
                              <span
                                key={i}
                                className="text-[11px] bg-[#FAF5E5] text-[#0F172A] px-2.5 py-1 rounded-lg border border-[#D09A40]/25 font-medium"
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer CTAs */}
                <div className="px-5 pb-5 pt-2 space-y-2 relative z-30">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStylist(stylist)}
                      className="py-2.5 px-3 rounded-xl border border-[#0F172A]/15 bg-[#FAF5E5]/60 hover:bg-[#0F172A]/5 text-[#0F172A] font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#D09A40]" />
                      <span>View Full Profile</span>
                    </button>
                    <button
                      type="button"
                      disabled={!canBook}
                      onClick={() => {
                        if (canBook) setChatWithStylist(stylist);
                      }}
                      className="py-2.5 px-3 rounded-xl border border-[#D09A40]/30 bg-[#D09A40]/5 hover:bg-[#D09A40]/10 text-[#0F172A] font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#D09A40]" />
                      <span>Inquiry</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFollow(stylist.id, stylist.name)}
                      className={`py-2.5 px-3 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        followedStylists.includes(stylist.id)
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : 'bg-[#0F172A]/5 border-[#0F172A]/10 text-[#0F172A] hover:bg-[#0F172A]/10'
                      }`}
                    >
                      {followedStylists.includes(stylist.id) ? (
                        <>
                          <Heart className="w-3.5 h-3.5 fill-current" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={!canBook}
                      onClick={() => {
                        if (canBook) onBookWithStylist(stylist.name, stylist.branch);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-[#0F172A] hover:bg-[#D09A40] text-[#FAF5E5] hover:text-[#0F172A] font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {canBook ? <Calendar className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{canBook ? 'Book Now' : 'Preview Only'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredStylists.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#0F172A]/20 bg-white/70 px-6 py-14 text-center">
            <Sparkles className="h-10 w-10 text-neutral-300" />
            <h3 className="mt-3 font-serif text-lg font-bold text-[#0F172A]">No specialists in this view</h3>
            <p className="mt-1 max-w-md text-xs text-[#4A4A4A]">
              Choose another specialty filter to browse available salon artists.
            </p>
            {!usingDbStaff && manager.canManage && (
              <button
                type="button"
                onClick={manager.openCreate}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#D09A40] hover:text-[#0F172A] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add a stylist
              </button>
            )}
          </div>
        )}
      </div>

      {/* Shared Full Profile Modal (closed by default on page load) */}
      <StylistProfileModal
        profile={modalProfile}
        websitePublished={websitePublished}
        onClose={() => setSelectedStylist(null)}
        onSelect={(profile) => {
          if (!websitePublished || profile.isDemo) return;
          const branch = selectedStylist?.branch || defaultBranch;
          setSelectedStylist(null);
          onBookWithStylist(profile.name, branch);
        }}
      />

      {!usingDbStaff && manager.editorState && (
        <CardEditorModal
          key={manager.editorState.mode === 'edit' ? manager.editorState.item?.id : 'new-stylist'}
          title={manager.editorState.mode === 'edit' ? 'Edit stylist' : 'Add a stylist'}
          description={
            manager.editorState.mode === 'edit'
              ? `Update “${manager.editorState.item?.name || 'this stylist'}”.`
              : 'Add a specialist with a portrait, role, branch and specialties.'
          }
          fields={buildStylistEditorFields([
            ...brand.branches.map((branch) => branch.name),
            ...(manager.editorState.item?.branch ? [manager.editorState.item.branch] : []),
          ])}
          initialValues={
            manager.editorState.mode === 'edit'
              ? stylistToEditorValues(manager.editorState.item)
              : {
                  ...emptyStylistValues(brand.branches[0]?.name || 'All Salon Outlets'),
                  category: activeFilter === 'all' ? 'bridal' : activeFilter,
                }
          }
          submitLabel={manager.editorState.mode === 'edit' ? 'Save stylist' : 'Add stylist'}
          focusImage={manager.editorState.focusImage}
          onClose={manager.closeEditor}
          onSubmit={(values) => manager.saveItem(normalizeStylistValues(values, manager.editorState?.item))}
        />
      )}
      {chatWithStylist && <StylistChatModal stylist={chatWithStylist} onClose={() => setChatWithStylist(null)} />}
      <CrudToast message={manager.notice} />
    </section>
  );
};
