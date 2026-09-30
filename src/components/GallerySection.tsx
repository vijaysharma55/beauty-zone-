import React, { useState, useMemo } from 'react';
import { GalleryItem, GalleryUploadType } from '../types';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { RevealOnScroll } from './RevealOnScroll';
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
  Briefcase
} from 'lucide-react';

interface GallerySectionProps {
  galleryItems: GalleryItem[];
  onBookService: (serviceName: string) => void;
  onOpenManagement?: () => void;
}

export const GallerySection: React.FC<GallerySectionProps> = ({
  galleryItems,
  onBookService,
  onOpenManagement,
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeModalItem, setActiveModalItem] = useState<GalleryItem | null>(null);

  // Filter only active items for the public gallery, sorted by sort_order
  const activeItems = useMemo(() => {
    return galleryItems
      .filter((item) => item.active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [galleryItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    activeItems.forEach((i) => set.add(i.category));
    return ['all', ...Array.from(set)];
  }, [activeItems]);

  const filteredItems = useMemo(() => {
    return activeItems.filter((item) => {
      const matchType = selectedType === 'all' || item.type === selectedType;
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      return matchType && matchCat;
    });
  }, [activeItems, selectedType, selectedCategory]);

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
        {/* Section Header in Simple Indian English */}
        <RevealOnScroll duration={0.6}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#0F172A]/10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Customer Photos & Makeover Results</span>
                <span aria-hidden="true">·</span>
                <span>Before & After Photos</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Customer Photos & Makeover Results
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#4A4A4A] leading-relaxed font-light">
                See unedited photos of our Jaipur brides, hair botox smoothening, glowing facials, 
                and designer nail art done by our senior salon artists.
              </p>
            </div>

            {/* Admin Quick Action Button */}
            {onOpenManagement && (
              <div className="self-start md:self-auto shrink-0">
                <button
                  onClick={onOpenManagement}
                  className="px-4 py-2 text-xs font-bold text-[#0F172A] bg-white border border-[#D09A40]/40 hover:border-[#D09A40] hover:bg-[#FAF5E5] rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#D09A40]" />
                  <span>Manage Photos</span>
                </button>
              </div>
            )}
          </div>
        </RevealOnScroll>

        {/* Filter Controls Bar */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Upload Type Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#0F172A]/10 overflow-x-auto scrollbar-none shadow-xs">
            {typeTabs.map((tab) => {
              const Icon = tab.icon;
              const count = tab.id === 'all' 
                ? activeItems.length 
                : activeItems.filter((i) => i.type === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedType(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    selectedType === tab.id
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'text-[#4A4A4A] hover:text-[#0F172A]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${selectedType === tab.id ? 'text-[#D09A40]' : 'text-[#4A4A4A]'}`} />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedType === tab.id ? 'bg-white/20 text-white' : 'bg-neutral-100 text-[#4A4A4A]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#D09A40] text-white font-semibold shadow-xs'
                    : 'bg-white/80 border border-[#0F172A]/10 text-[#4A4A4A] hover:border-[#D09A40]'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
            <RevealOnScroll key={item.id} delay={index * 0.08} duration={0.55}>
              <div className="bg-white rounded-2xl border border-[#0F172A]/10 overflow-hidden hover:border-[#D09A40] luxe-card-hover flex flex-col justify-between group h-full">
                <div>
                  {/* Photo or Interactive Before/After Frame */}
                  {item.type === 'before_after' && item.before_image ? (
                    <div className="p-3 pb-0">
                      <BeforeAfterSlider
                        beforeImage={item.before_image}
                        afterImage={item.image}
                        aspectRatio="aspect-[4/3]"
                      />
                    </div>
                  ) : (
                    <div 
                      onClick={() => setActiveModalItem(item)}
                      className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100 cursor-pointer"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover luxe-img-zoom"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                      {/* Top Badges */}
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

                      {/* Hover Overlay with Inspect Icon */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-[#0F172A]">
                          <Maximize2 className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Body Content */}
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

                {/* Footer Action Strip */}
                <div className="p-4 pt-3 bg-[#FAF5E5]/50 border-t border-[#0F172A]/10 flex items-center justify-between gap-3 text-xs">
                  <div className="truncate">
                    <span className="text-[10px] text-neutral-400 block uppercase font-mono">Service Name:</span>
                    <span className="font-semibold text-[#0F172A] truncate block text-[11px]">{item.service}</span>
                  </div>

                  <button
                    onClick={() => onBookService(item.service)}
                    className="px-3.5 py-2 text-[11px] font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl luxe-btn shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <span>Book This Look</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        {/* Empty Search Result */}
        {filteredItems.length === 0 && (
          <div className="mt-12 text-center py-16 bg-white rounded-2xl border border-dashed border-[#0F172A]/20">
            <ImageIcon className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <h4 className="font-serif text-lg font-bold text-[#0F172A]">No Photos Found</h4>
            <p className="text-xs text-[#4A4A4A] mt-1 max-w-sm mx-auto">
              There are no photos under this filter. Try selecting "All Photos" above.
            </p>
            <button
              onClick={() => { setSelectedType('all'); setSelectedCategory('all'); }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] rounded-xl hover:bg-[#D09A40] transition-colors cursor-pointer"
            >
              Show All Photos
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col animate-modal-enter">
            <button
              onClick={() => setActiveModalItem(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Media Area */}
            <div className="relative bg-neutral-950 flex items-center justify-center overflow-hidden">
              {activeModalItem.type === 'before_after' && activeModalItem.before_image ? (
                <div className="w-full max-h-[55vh]">
                  <BeforeAfterSlider
                    beforeImage={activeModalItem.before_image}
                    afterImage={activeModalItem.image}
                    aspectRatio="aspect-[16/10]"
                  />
                </div>
              ) : (
                <img
                  src={activeModalItem.image}
                  alt={activeModalItem.title}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-[55vh] object-contain"
                />
              )}
            </div>

            {/* Detail Pane */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0F172A]/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#D09A40] text-white">
                    {activeModalItem.category}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono uppercase">
                    Type: {activeModalItem.type.replace('_', ' ')}
                  </span>
                </div>
                {activeModalItem.artist && (
                  <span className="text-xs font-semibold text-[#0F172A]">
                    Styled by {activeModalItem.artist}
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-serif text-2xl font-bold text-[#0F172A]">
                  {activeModalItem.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#4A4A4A] leading-relaxed">
                  {activeModalItem.description}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#0F172A]/10">
                <div>
                  <span className="text-[11px] text-neutral-400 uppercase font-mono block">Associated Service:</span>
                  <span className="text-sm font-bold text-[#0F172A]">{activeModalItem.service}</span>
                </div>

                <button
                  onClick={() => {
                    const serv = activeModalItem.service;
                    setActiveModalItem(null);
                    onBookService(serv);
                  }}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Book This Service</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
