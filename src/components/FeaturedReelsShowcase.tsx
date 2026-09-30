import React, { useState, useMemo } from 'react';
import { VideoItem } from '../types';
import { RevealOnScroll } from './RevealOnScroll';
import { InstagramIcon, FacebookIcon, YouTubeIcon } from './SocialIcons';
import { 
  Sparkles, 
  Film, 
  Play, 
  ArrowRight, 
  Star, 
  Eye, 
  CalendarCheck, 
  X, 
  ExternalLink,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Flame
} from 'lucide-react';

interface FeaturedReelsShowcaseProps {
  videos: VideoItem[];
  onBookService: (serviceName: string) => void;
  onExploreAllVideos?: () => void;
  onOpenManagement?: () => void;
}

export const FeaturedReelsShowcase: React.FC<FeaturedReelsShowcaseProps> = ({
  videos,
  onBookService,
  onExploreAllVideos,
  onOpenManagement,
}) => {
  const [activePlayVideo, setActivePlayVideo] = useState<VideoItem | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Filter only active & featured videos
  const featuredVideos = useMemo(() => {
    const active = videos.filter((v) => v.active);
    const featured = active.filter((v) => v.featured);
    // If no featured are explicitly marked, fallback to top active videos
    return featured.length > 0 ? featured : active.slice(0, 6);
  }, [videos]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (featuredVideos.length === 0) return null;

  return (
    <section id="featured-reels" className="py-14 md:py-20 bg-white border-t border-[#0F172A]/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <RevealOnScroll duration={0.6}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#0F172A]/10">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-1.5">
                <Flame className="w-3.5 h-3.5 text-[#D09A40]" />
                <span>Trending on Instagram & YouTube</span>
                <span aria-hidden="true">·</span>
                <span>Real Jaipur Transformations</span>
              </div>
              <h2
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A] tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Trending Reels & Client Transformations
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#4A4A4A] max-w-2xl font-light leading-relaxed">
                Watch viral bridal transformations, Morrocan hair spa results, nail art tutorials, and client reviews captured live at our Jaipur salons.
              </p>
            </div>

            {/* Actions & Carousel Nav */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleScroll('left')}
                  className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-[#FAF5E5] text-[#0F172A] hover:text-[#D09A40] border border-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll('right')}
                  className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-[#FAF5E5] text-[#0F172A] hover:text-[#D09A40] border border-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {onExploreAllVideos && (
                <button
                  type="button"
                  onClick={onExploreAllVideos}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-[#D09A40] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>View All Reels ({videos.filter(v => v.active).length})</span>
                </button>
              )}

              {onOpenManagement && (
                <button
                  type="button"
                  onClick={onOpenManagement}
                  className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-[#0F172A] border border-neutral-200 transition-colors cursor-pointer"
                  title="Admin: Manage Videos & Reels"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </RevealOnScroll>

        {/* Horizontal Reels Carousel / Grid */}
        <div 
          ref={scrollContainerRef}
          className="mt-6 flex gap-5 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {featuredVideos.map((video, idx) => {
            const platformBadge = 
              video.platform === 'youtube'
                ? { label: 'YouTube', color: 'bg-red-600 text-white', icon: YouTubeIcon }
                : video.platform === 'instagram'
                ? { label: 'Instagram Reel', color: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white', icon: InstagramIcon }
                : { label: 'Facebook Video', color: 'bg-[#1877F2] text-white', icon: FacebookIcon };

            return (
              <div
                key={video.id}
                className="w-[280px] sm:w-[320px] shrink-0 snap-start bg-white rounded-2xl border border-[#0F172A]/10 hover:border-[#D09A40] shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Video Thumbnail with Play Button */}
                  <div 
                    className="relative aspect-[9/14] sm:aspect-[9/13] w-full bg-neutral-900 overflow-hidden cursor-pointer"
                    onClick={() => setActivePlayVideo(video)}
                  >
                    <img
                      src={video.thumbnail || '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg'}
                      alt={video.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${platformBadge.color}`}>
                        <platformBadge.icon className="w-3 h-3 text-white" />
                        <span>{platformBadge.label}</span>
                      </span>

                      {video.featured && (
                        <span className="px-2 py-0.5 rounded-full bg-[#D09A40] text-[#0F172A] text-[10px] font-bold flex items-center gap-1 shadow-sm">
                          <Star className="w-3 h-3 fill-[#0F172A]" />
                          <span>Trending</span>
                        </span>
                      )}
                    </div>

                    {/* Center Animated Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/40 group-hover:bg-[#D09A40] group-hover:scale-110 group-hover:border-[#D09A40] text-white flex items-center justify-center transition-all duration-300 shadow-xl">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Bottom Metadata in Scrim */}
                    <div className="absolute bottom-3 left-3 right-3 z-10 text-white space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-[#FAF5E5] font-semibold bg-black/60 px-2 py-0.5 rounded text-[10px] uppercase">
                          {video.category}
                        </span>
                        <span className="bg-black/60 px-2 py-0.5 rounded text-[10px]">
                          {video.viewsCount || 'Trending'}
                        </span>
                      </div>
                      <h4 className="font-serif text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-sm group-hover:text-[#FAF5E5]">
                        {video.title}
                      </h4>
                    </div>
                  </div>

                  {/* Card Description */}
                  <div className="p-3.5 space-y-1.5">
                    <p className="text-xs text-[#4A4A4A] line-clamp-2 font-light leading-relaxed">
                      {video.description}
                    </p>
                    {video.author && (
                      <p className="text-[10px] text-neutral-400 font-mono truncate">
                        By {video.author}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-3.5 pt-2 border-t border-neutral-100 flex items-center justify-between gap-2 bg-[#FAF5E5]/40">
                  <button
                    type="button"
                    onClick={() => setActivePlayVideo(video)}
                    className="text-[11px] font-bold text-[#0F172A] hover:text-[#D09A40] flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#D09A40]" />
                    <span>Watch Reel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onBookService(video.title)}
                    className="px-3 py-1.5 text-[11px] font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-colors shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Book Look</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Video Lightbox Player Modal */}
        {activePlayVideo && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-4xl bg-[#0F172A] rounded-3xl shadow-2xl border border-white/20 overflow-hidden text-white flex flex-col max-h-[92vh]">
              {/* Header */}
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

              {/* Player Body */}
              <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                {activePlayVideo.platform === 'youtube' ? (
                  <iframe
                    src={`${activePlayVideo.embedUrl}&autoplay=1`}
                    title={activePlayVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : activePlayVideo.platform === 'facebook' ? (
                  <iframe
                    src={activePlayVideo.embedUrl}
                    title={activePlayVideo.title}
                    className="w-full h-full border-0"
                    allow="encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-neutral-900 to-black">
                    <InstagramIcon className="w-12 h-12 text-pink-500 mb-3" />
                    <h4 className="font-serif text-lg font-bold text-white max-w-md">
                      {activePlayVideo.title}
                    </h4>
                    <p className="text-xs text-white/70 max-w-sm mt-1">
                      {activePlayVideo.description}
                    </p>
                    <div className="mt-5 flex items-center gap-3">
                      <a
                        href={activePlayVideo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-xl shadow-md hover:scale-105 transition-transform flex items-center gap-2"
                      >
                        <span>Watch on Instagram App</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 bg-[#0F172A] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-serif text-base font-bold text-white">{activePlayVideo.title}</h4>
                  <p className="text-xs text-white/70 mt-0.5 line-clamp-1">{activePlayVideo.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={activePlayVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
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
                    className="px-4 py-2 bg-[#D09A40] hover:bg-[#b8832e] text-[#0F172A] font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
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
