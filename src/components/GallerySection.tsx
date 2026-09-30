import React, { useState, useMemo, useEffect } from 'react';
import { GalleryItem, GalleryUploadType, VideoItem } from '../types';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { RevealOnScroll } from './RevealOnScroll';
import { InstagramIcon, FacebookIcon, YouTubeIcon } from './SocialIcons';
import { 
  Sparkles, 
  Layers, 
  Image as ImageIcon, 
  ArrowRight, 
  Star, 
  Maximize2, 
  X, 
  CalendarCheck, 
  SlidersHorizontal,
  FolderHeart,
  Briefcase,
  Film,
  Play,
  ExternalLink,
  Eye,
  CheckCircle2
} from 'lucide-react';

interface GallerySectionProps {
  galleryItems: GalleryItem[];
  videos?: VideoItem[];
  onBookService: (serviceName: string) => void;
  onOpenManagement?: () => void;
  initialView?: 'photos' | 'videos';
}

export const GallerySection: React.FC<GallerySectionProps> = ({
  galleryItems,
  videos = [],
  onBookService,
  onOpenManagement,
  initialView = 'photos',
}) => {
  const [mainView, setMainView] = useState<'photos' | 'videos'>(initialView);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeModalItem, setActiveModalItem] = useState<GalleryItem | null>(null);

  // Video Filters
  const [selectedVideoPlatform, setSelectedVideoPlatform] = useState<'all' | 'youtube' | 'instagram' | 'facebook'>('all');
  const [selectedVideoCategory, setSelectedVideoCategory] = useState<string>('all');
  const [activePlayVideo, setActivePlayVideo] = useState<VideoItem | null>(null);
  const [embedLoadError, setEmbedLoadError] = useState(false);

  // Keep synced if initialView changes externally
  useEffect(() => {
    if (initialView) {
      setMainView(initialView);
    }
  }, [initialView]);

  // Reset embed load error when video changes
  useEffect(() => {
    setEmbedLoadError(false);
  }, [activePlayVideo]);

  // Filter only active items for the public gallery, sorted by sort_order
  const activeItems = useMemo(() => {
    return galleryItems
      .filter((item) => item.active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [galleryItems]);

  const activeVideos = useMemo(() => {
    return (videos || []).filter((v) => v.active);
  }, [videos]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    activeItems.forEach((i) => set.add(i.category));
    return ['all', ...Array.from(set)];
  }, [activeItems]);

  const videoCategories = useMemo(() => {
    const set = new Set<string>();
    activeVideos.forEach((v) => set.add(v.category));
    return ['all', ...Array.from(set)];
  }, [activeVideos]);

  const filteredItems = useMemo(() => {
    return activeItems.filter((item) => {
      const matchType = selectedType === 'all' || item.type === selectedType;
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      return matchType && matchCat;
    });
  }, [activeItems, selectedType, selectedCategory]);

  const filteredVideos = useMemo(() => {
    return activeVideos.filter((v) => {
      const matchPlatform = selectedVideoPlatform === 'all' || v.platform === selectedVideoPlatform;
      const matchCat = selectedVideoCategory === 'all' || v.category === selectedVideoCategory;
      return matchPlatform && matchCat;
    });
  }, [activeVideos, selectedVideoPlatform, selectedVideoCategory]);

  const typeTabs: { id: string; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'all', label: 'All Photos', icon: Layers },
    { id: 'photo', label: 'Photos', icon: ImageIcon },
    { id: 'before_after', label: 'Before / After', icon: SlidersHorizontal },
    { id: 'portfolio', label: 'Artist Work', icon: FolderHeart },
    { id: 'work_showcase', label: 'Events & Weddings', icon: Briefcase },
  ];

  return (
    <section id="gallery" className="py-16 md:py-24 bg-[#FAF5E5]/60 border-t border-[#0F172A]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <RevealOnScroll duration={0.6}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#0F172A]/10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Customer Photos, Reels & Makeover Results</span>
                <span aria-hidden="true">·</span>
                <span>Real Transformations</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Customer Gallery & Video Reels
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#4A4A4A] leading-relaxed font-light">
                Watch real client makeovers, viral Instagram transformation reels, before-after results, 
                and bridal tutorials created by our senior salon team in Jaipur.
              </p>
            </div>

            {/* View Switcher: Photo Gallery vs Videos & Instagram Reels */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-white p-1.5 rounded-2xl border border-[#0F172A]/15 shadow-xs flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMainView('photos')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    mainView === 'photos'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-neutral-600 hover:text-[#0F172A] hover:bg-neutral-100'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-[#D09A40]" />
                  <span>Photo Gallery ({activeItems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMainView('videos')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    mainView === 'videos'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-neutral-600 hover:text-[#0F172A] hover:bg-neutral-100'
                  }`}
                >
                  <Film className="w-4 h-4 text-[#D09A40]" />
                  <span>Videos & Instagram Reels ({activeVideos.length})</span>
                </button>
              </div>

              {onOpenManagement && (
                <button
                  onClick={onOpenManagement}
                  className="px-3.5 py-2.5 text-xs font-bold text-[#0F172A] bg-white border border-[#D09A40]/40 hover:border-[#D09A40] hover:bg-[#FAF5E5] rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Admin Dashboard: Manage Media"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#D09A40]" />
                  <span>Manage</span>
                </button>
              )}
            </div>
          </div>
        </RevealOnScroll>

        {/* ========================================================
            VIEW 1: PHOTO GALLERY
        ======================================================== */}
        {mainView === 'photos' && (
          <div>
            {/* Filter Tabs */}
            <RevealOnScroll delay={0.1} duration={0.5}>
              <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                  {typeTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = selectedType === tab.id;
                    const count = tab.id === 'all' 
                      ? activeItems.length 
                      : activeItems.filter((i) => i.type === tab.id).length;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedType(tab.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                          isActive
                            ? 'bg-[#0F172A] text-white shadow-sm'
                            : 'bg-white text-[#4A4A4A] border border-[#0F172A]/10 hover:border-[#D09A40]/50'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#D09A40]' : 'text-neutral-400'}`} />
                        <span>{tab.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Category Pills */}
                {categories.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                    <span className="text-xs font-mono uppercase text-[#4A4A4A] mr-1 hidden lg:inline">Category:</span>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-[#D09A40] text-white font-semibold shadow-xs'
                            : 'bg-white/80 text-[#4A4A4A] border border-[#0F172A]/10 hover:bg-white'
                        }`}
                      >
                        {cat === 'all' ? 'All' : cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </RevealOnScroll>

            {/* Photos Grid */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item, index) => (
                <RevealOnScroll key={item.id} delay={index * 0.05} duration={0.5}>
                  <div className="bg-white rounded-2xl border border-[#0F172A]/10 overflow-hidden hover:border-[#D09A40] luxe-card-hover flex flex-col justify-between group h-full">
                    <div>
                      {item.type === 'before_after' && item.before_image ? (
                        <div className="p-3 bg-neutral-100/50">
                          <BeforeAfterSlider
                            beforeImage={item.before_image}
                            afterImage={item.image}
                            beforeLabel="Before Treatment"
                            afterLabel="After Result"
                            className="aspect-[4/3] rounded-xl shadow-xs"
                          />
                        </div>
                      ) : (
                        <div 
                          className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100 cursor-pointer"
                          onClick={() => setActiveModalItem(item)}
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover luxe-img-zoom"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                            <span className="px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono uppercase tracking-wider rounded-md font-bold">
                              {item.type.replace('_', ' ')}
                            </span>
                            {item.featured && (
                              <span className="px-2.5 py-1 bg-[#D09A40] text-white text-[10px] font-bold rounded-md shadow-xs flex items-center gap-1">
                                <Star className="w-3 h-3 fill-white" />
                                <span>Featured</span>
                              </span>
                            )}
                          </div>

                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-[#0F172A]">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D09A40] bg-[#FAF5E5] px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                          {item.artist && (
                            <span className="text-[11px] text-[#4A4A4A] truncate">
                              by {item.artist}
                            </span>
                          )}
                        </div>

                        <h3 
                          onClick={() => setActiveModalItem(item)}
                          className="font-serif text-lg font-bold text-[#0F172A] group-hover:text-[#D09A40] transition-colors leading-snug cursor-pointer"
                        >
                          {item.title}
                        </h3>

                        <p className="mt-1.5 text-xs text-[#4A4A4A] line-clamp-2 font-light leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-3 bg-[#FAF5E5]/50 border-t border-[#0F172A]/10 flex items-center justify-between gap-3 text-xs">
                      <div className="truncate">
                        <span className="text-[10px] text-neutral-400 block uppercase font-mono">Service:</span>
                        <span className="font-semibold text-[#0F172A] truncate block text-[11px]">{item.service}</span>
                      </div>

                      <button
                        onClick={() => onBookService(item.service)}
                        className="px-3.5 py-2 text-[11px] font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl luxe-btn shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <span>Book Look</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </RevealOnScroll>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="mt-12 text-center py-16 bg-white rounded-2xl border border-dashed border-[#0F172A]/20">
                <ImageIcon className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <h4 className="font-serif text-lg font-bold text-[#0F172A]">No Photos Found</h4>
                <p className="text-xs text-neutral-500 mt-1">Try selecting a different filter category above.</p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            VIEW 2: VIDEOS & INSTAGRAM REELS SHOWCASE
        ======================================================== */}
        {mainView === 'videos' && (
          <div>
            {/* Video Filters Toolbar */}
            <RevealOnScroll delay={0.1} duration={0.5}>
              <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Platform Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedVideoPlatform('all')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedVideoPlatform === 'all'
                        ? 'bg-[#0F172A] text-white shadow-sm'
                        : 'bg-white text-[#4A4A4A] border border-[#0F172A]/10 hover:border-[#D09A40]/50'
                    }`}
                  >
                    All Videos ({activeVideos.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVideoPlatform('instagram')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedVideoPlatform === 'instagram'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm'
                        : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-50'
                    }`}
                  >
                    <InstagramIcon className="w-3.5 h-3.5" />
                    <span>Instagram Reels ({activeVideos.filter(v => v.platform === 'instagram').length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVideoPlatform('youtube')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedVideoPlatform === 'youtube'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
                    }`}
                  >
                    <YouTubeIcon className="w-3.5 h-3.5" />
                    <span>YouTube ({activeVideos.filter(v => v.platform === 'youtube').length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVideoPlatform('facebook')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedVideoPlatform === 'facebook'
                        ? 'bg-[#1877F2] text-white shadow-sm'
                        : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <FacebookIcon className="w-3.5 h-3.5" />
                    <span>Facebook ({activeVideos.filter(v => v.platform === 'facebook').length})</span>
                  </button>
                </div>

                {/* Video Category / Topic Pills */}
                {videoCategories.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                    <span className="text-xs font-mono uppercase text-[#4A4A4A] mr-1 hidden lg:inline">Topic:</span>
                    {videoCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedVideoCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                          selectedVideoCategory === cat
                            ? 'bg-[#D09A40] text-white font-semibold shadow-xs'
                            : 'bg-white/80 text-[#4A4A4A] border border-[#0F172A]/10 hover:bg-white'
                        }`}
                      >
                        {cat === 'all' ? 'All Topics' : cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </RevealOnScroll>

            {/* Video Cards Responsive Grid */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video, index) => {
                const platformBadge = 
                  video.platform === 'youtube'
                    ? { label: 'YouTube', color: 'bg-red-600 text-white', icon: YouTubeIcon }
                    : video.platform === 'instagram'
                    ? { label: 'Instagram Reel', color: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white', icon: InstagramIcon }
                    : { label: 'Facebook Video', color: 'bg-[#1877F2] text-white', icon: FacebookIcon };

                return (
                  <RevealOnScroll key={video.id} delay={index * 0.05} duration={0.5}>
                    <div className="bg-white rounded-2xl border border-[#0F172A]/10 overflow-hidden hover:border-[#D09A40] luxe-card-hover flex flex-col justify-between group h-full shadow-xs">
                      <div>
                        {/* Video Thumbnail with Play Button */}
                        <div 
                          className="relative aspect-video w-full bg-neutral-900 overflow-hidden cursor-pointer"
                          onClick={() => setActivePlayVideo(video)}
                        >
                          <img
                            src={video.thumbnail || '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg'}
                            alt={video.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                          {/* Top Badges */}
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
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

                          {/* Center Play Button Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-black/60 hover:bg-[#D09A40] text-white flex items-center justify-center transition-all backdrop-blur-xs border border-white/30 group-hover:scale-110 shadow-lg group-hover:bg-[#D09A40]">
                              <Play className="w-5 h-5 fill-white ml-0.5" />
                            </div>
                          </div>

                          {/* Bottom duration info */}
                          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-mono">
                            <span className="font-semibold truncate max-w-[60%]">{video.category}</span>
                            <span className="bg-black/60 px-2 py-0.5 rounded text-[10px]">
                              {video.viewsCount || 'Trending'} • {video.duration || '0:45'}
                            </span>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D09A40] bg-[#FAF5E5] px-2 py-0.5 rounded">
                              {video.category}
                            </span>
                            {video.author && (
                              <span className="text-[11px] text-[#4A4A4A] truncate">
                                by {video.author}
                              </span>
                            )}
                          </div>

                          <h3 
                            onClick={() => setActivePlayVideo(video)}
                            className="font-serif text-lg font-bold text-[#0F172A] group-hover:text-[#D09A40] transition-colors leading-snug cursor-pointer line-clamp-2"
                          >
                            {video.title}
                          </h3>

                          <p className="mt-1.5 text-xs text-[#4A4A4A] line-clamp-2 font-light leading-relaxed">
                            {video.description}
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-4 pt-3 bg-[#FAF5E5]/50 border-t border-[#0F172A]/10 flex items-center justify-between gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => setActivePlayVideo(video)}
                          className="text-[11px] font-semibold text-[#0F172A] hover:text-[#D09A40] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#D09A40]" />
                          <span>Watch Video</span>
                        </button>

                        <button
                          onClick={() => onBookService(video.title)}
                          className="px-3.5 py-2 text-[11px] font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl luxe-btn shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <span>Book Look</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </RevealOnScroll>
                );
              })}
            </div>

            {filteredVideos.length === 0 && (
              <div className="mt-12 text-center py-16 bg-white rounded-2xl border border-dashed border-[#0F172A]/20">
                <Film className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <h4 className="font-serif text-lg font-bold text-[#0F172A]">No Video Reels Found</h4>
                <p className="text-xs text-neutral-500 mt-1">Try selecting another platform or topic filter.</p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            FULLSCREEN PHOTO LIGHTBOX MODAL
        ======================================================== */}
        {activeModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#0F172A]/20 flex flex-col md:flex-row max-h-[90vh]">
              <button
                onClick={() => setActiveModalItem(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="md:w-3/5 bg-neutral-900 flex items-center justify-center p-4">
                {activeModalItem.type === 'before_after' && activeModalItem.before_image ? (
                  <BeforeAfterSlider
                    beforeImage={activeModalItem.before_image}
                    afterImage={activeModalItem.image}
                    className="aspect-[4/3] w-full rounded-2xl"
                  />
                ) : (
                  <img
                    src={activeModalItem.image}
                    alt={activeModalItem.title}
                    referrerPolicy="no-referrer"
                    className="max-h-[60vh] md:max-h-[75vh] w-auto object-contain rounded-xl"
                  />
                )}
              </div>

              <div className="md:w-2/5 p-6 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FAF5E5] text-[#D09A40] uppercase border border-[#D09A40]/30">
                      {activeModalItem.category}
                    </span>
                    <span className="text-xs text-[#4A4A4A]">by {activeModalItem.artist}</span>
                  </div>

                  <h3 className="font-serif text-2xl font-bold text-[#0F172A] leading-tight">
                    {activeModalItem.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#4A4A4A] leading-relaxed font-light">
                    {activeModalItem.description}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-[#0F172A]/10 space-y-3">
                  <button
                    onClick={() => {
                      const serviceToBook = activeModalItem.service;
                      setActiveModalItem(null);
                      onBookService(serviceToBook);
                    }}
                    className="w-full py-3 text-xs sm:text-sm font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl luxe-btn shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    <span>Book {activeModalItem.service}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            CUSTOMER VIDEO LIGHTBOX PLAYER MODAL (16:9 & 9:16 RESPONSIVE)
        ======================================================== */}
        {activePlayVideo && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-4xl bg-[#0F172A] rounded-3xl shadow-2xl border border-white/20 overflow-hidden text-white flex flex-col max-h-[92vh]">
              {/* Modal Header Bar */}
              <div className="px-6 py-3.5 bg-black/60 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#D09A40]" />
                  <span className="text-xs font-bold font-mono text-[#D09A40] uppercase">
                    {activePlayVideo.platform} Reel Showcase
                  </span>
                  <span className="text-xs text-white/60">• {activePlayVideo.category}</span>
                </div>
                <button
                  onClick={() => setActivePlayVideo(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Video Player Frame with Direct Embed & Fallbacks */}
              <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                {!embedLoadError && activePlayVideo.platform === 'youtube' ? (
                  <iframe
                    src={`${activePlayVideo.embedUrl}${activePlayVideo.embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
                    title={activePlayVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onError={() => setEmbedLoadError(true)}
                  />
                ) : !embedLoadError && activePlayVideo.platform === 'facebook' ? (
                  <iframe
                    src={activePlayVideo.embedUrl}
                    title={activePlayVideo.title}
                    className="w-full h-full border-0"
                    allow="encrypted-media"
                    allowFullScreen
                    onError={() => setEmbedLoadError(true)}
                  />
                ) : (
                  /* Instagram & Universal Direct Player Fallback */
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-neutral-900 via-neutral-950 to-black overflow-hidden">
                    {activePlayVideo.thumbnail && (
                      <img
                        src={activePlayVideo.thumbnail}
                        alt={activePlayVideo.title}
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-25 blur-xs"
                      />
                    )}

                    <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-xl mb-4">
                        <div className="w-full h-full bg-[#0F172A] rounded-2xl flex items-center justify-center">
                          {activePlayVideo.platform === 'instagram' ? (
                            <InstagramIcon className="w-8 h-8 text-pink-500" />
                          ) : (
                            <Film className="w-8 h-8 text-[#D09A40]" />
                          )}
                        </div>
                      </div>

                      <h4 className="font-serif text-xl font-bold text-white leading-snug">
                        {activePlayVideo.title}
                      </h4>
                      <p className="text-xs text-neutral-300 max-w-sm mt-2 leading-relaxed">
                        {activePlayVideo.description}
                      </p>

                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <a
                          href={activePlayVideo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                        >
                          <span>Watch Reel on {activePlayVideo.platform === 'instagram' ? 'Instagram App' : 'Original Platform'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-5 bg-[#0F172A] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="font-serif text-base font-bold text-white truncate">{activePlayVideo.title}</h4>
                  <p className="text-xs text-white/70 mt-0.5 line-clamp-1">
                    {activePlayVideo.category} • {activePlayVideo.viewsCount || 'Trending'} {activePlayVideo.author ? `• By ${activePlayVideo.author}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={activePlayVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Open in App</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => {
                      const title = activePlayVideo.title;
                      setActivePlayVideo(null);
                      onBookService(title);
                    }}
                    className="px-4 py-2.5 bg-[#D09A40] hover:bg-[#b8832e] text-[#0F172A] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Book Featured Service</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
