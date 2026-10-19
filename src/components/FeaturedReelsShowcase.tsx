import React, { useState, useMemo } from 'react';
import { VideoItem } from '../types';
import { RevealOnScroll } from './RevealOnScroll';
import { InstagramIcon, FacebookIcon, YouTubeIcon } from './SocialIcons';
import { useBrand } from '../context/BrandContext';
import { SmartImage } from './crud/SmartImage';
import { ItemActions } from './crud/ItemActions';
import { CardEditorModal } from './crud/CardEditorModal';
import { CrudToast, ManageControls, ManageHint } from './crud/ManageControls';
import { useCardCollection } from './crud/useCardCollection';
import {
  emptyVideoValues,
  normalizeVideo,
  validateVideoValues,
  videoEditorFields,
  videoToEditorValues,
} from './crud/videoEditorConfig';
import { 
  Film, 
  Play, 
  ArrowRight, 
  Star, 
  Eye, 
  CalendarCheck, 
  X, 
  ExternalLink,
  SlidersHorizontal,
  Flame
} from 'lucide-react';

interface FeaturedReelsShowcaseProps {
  videos: VideoItem[];
  onBookService: (serviceName: string) => void;
  onExploreAllVideos?: () => void;
  onOpenManagement?: () => void;
  /** Persists the full video catalog after an inline create / edit / delete. */
  onUpdateVideos?: (videos: VideoItem[]) => void;
}

export const FeaturedReelsShowcase: React.FC<FeaturedReelsShowcaseProps> = ({
  videos,
  onBookService,
  onExploreAllVideos,
  onOpenManagement,
  onUpdateVideos,
}) => {
  const { t } = useBrand();
  const [activePlayVideo, setActivePlayVideo] = useState<VideoItem | null>(null);
  const manager = useCardCollection<VideoItem>(videos, onUpdateVideos, 'Reel');

  const removeReel = (id: string) => {
    setActivePlayVideo((current) => (current?.id === id ? null : current));
    manager.removeItem(id);
  };

  // Show every active reel (featured first) so newly added or edited cards are
  // always visible without hunting through carousels.
  const featuredVideos = useMemo(() => {
    return videos
      // Hidden items stay visible while editing so they can be switched back on.
      .filter((video) => video.active || manager.isManaging)
      .sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [videos, manager.isManaging]);

  return (
    <section id="featured-reels" className="py-8 sm:py-16 md:py-20 bg-white border-t border-[#0F172A]/10 overflow-hidden w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <RevealOnScroll duration={0.6}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#0F172A]/10">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-1.5">
                <Flame className="w-3.5 h-3.5 text-[#D09A40]" />
                <span>{t('reelsOverline')}</span>
              </div>
              <h2
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A] tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t('reelsTitle')}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#4A4A4A] max-w-2xl font-light leading-relaxed">
                {t('reelsSubtitle')}
              </p>
            </div>

            {/* Actions: manage, view-all & dashboard shortcut */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              {onUpdateVideos && (
                <ManageControls
                  isManaging={manager.isManaging}
                  onToggle={manager.toggleManaging}
                  onAdd={manager.openCreate}
                  addLabel="Add Reel"
                />
              )}

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
                  title="Admin dashboard: manage videos & reels"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </RevealOnScroll>

        <ManageHint isManaging={manager.isManaging} noun="reel" />

        {featuredVideos.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#0F172A]/20 bg-[#FAF5E5]/40 px-6 py-14 text-center">
            <Film className="h-10 w-10 text-neutral-300" />
            <h3 className="mt-3 font-serif text-lg font-bold text-[#0F172A]">
              No reels in the showcase yet
            </h3>
            <p className="mt-1 max-w-md text-xs text-[#4A4A4A]">
              Add a YouTube, Instagram or Facebook reel to feature it on the homepage. Every card
              uses a fixed media frame, so any thumbnail stays perfectly cropped.
            </p>
            {manager.canManage && (
              <button
                type="button"
                onClick={manager.openCreate}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#D09A40] hover:text-[#0F172A] cursor-pointer"
              >
                Add your first reel
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
            {featuredVideos.map((video) => {
              const platformBadge =
                video.platform === 'youtube'
                  ? { label: 'YouTube', color: 'bg-red-600 text-white', icon: YouTubeIcon }
                  : video.platform === 'instagram'
                  ? { label: 'Instagram Reel', color: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white', icon: InstagramIcon }
                  : { label: 'Facebook Video', color: 'bg-[#1877F2] text-white', icon: FacebookIcon };

              return (
                <FeaturedReelCard
                  key={video.id}
                  video={video}
                  platformBadge={platformBadge}
                  onPlay={(v) => setActivePlayVideo(v)}
                  onBook={onBookService}
                  actions={
                    manager.canManage ? (
                      <ItemActions
                        itemLabel="reel"
                        alwaysVisible={manager.isManaging}
                        onEdit={() => manager.openEdit(video)}
                        onReplace={() => manager.openReplace(video)}
                        onDelete={() => removeReel(video.id)}
                      />
                    ) : null
                  }
                />
              );
            })}
          </div>
        )}

        {/* Video Lightbox Player Modal */}
        {activePlayVideo && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/85 animate-fade-in">
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

        {manager.editorState && (
          <CardEditorModal
            key={manager.editorState.mode === 'edit' ? manager.editorState.item?.id : 'new-reel'}
            title={manager.editorState.mode === 'edit' ? 'Edit reel' : 'Add a new reel'}
            description={
              manager.editorState.mode === 'edit'
                ? `Update “${manager.editorState.item?.title || 'this reel'}”. The cover is cropped to the card frame with object-fit: cover.`
                : 'Paste a YouTube, Instagram or Facebook link. The platform, embed URL and cover image are detected automatically.'
            }
            fields={videoEditorFields}
            initialValues={
              manager.editorState.mode === 'edit'
                ? videoToEditorValues(manager.editorState.item)
                : emptyVideoValues()
            }
            submitLabel={manager.editorState.mode === 'edit' ? 'Save reel' : 'Add reel'}
            focusImage={manager.editorState.focusImage}
            onClose={manager.closeEditor}
            onSubmit={(values) => manager.saveItem(normalizeVideo(values, manager.editorState?.item))}
            validate={validateVideoValues}
          />
        )}
        <CrudToast message={manager.notice} />
      </div>
    </section>
  );
};

interface FeaturedReelCardProps {
  video: VideoItem;
  platformBadge: { label: string; color: string; icon: React.ElementType };
  onPlay: (video: VideoItem) => void;
  onBook: (title: string) => void;
  actions?: React.ReactNode;
}

const FeaturedReelCard: React.FC<FeaturedReelCardProps> = ({ video, platformBadge, onPlay, onBook, actions }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const handleMouseEnter = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch((err) => {
        console.log('Autoplay prevented or failed:', err);
      });
    }
  };

  const handleMouseLeave = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className="relative w-full h-full bg-white rounded-2xl border border-[#0F172A]/10 hover:border-[#D09A40] shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {actions}
      <div>
        {/* Video Thumbnail / Hover Play Container — fixed height, object-cover */}
        <div 
          className="relative h-64 sm:h-72 w-full bg-neutral-900 overflow-hidden cursor-pointer"
          onClick={() => onPlay(video)}
        >
          {/* Video element for hover playback */}
          <video
            ref={videoRef}
            src={video.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
            muted
            playsInline
            loop
            preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? 'opacity-100 z-5' : 'opacity-0 z-0 pointer-events-none'}`}
          />

          <SmartImage
            src={video.thumbnail || '/images/bridal_makeup_jaipur_1790672008691.jpg'}
            alt={video.title}
            className={`h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ${isPlaying ? 'opacity-0' : 'opacity-90'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20 pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-12 flex items-center justify-between z-10">
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

          {/* Center Play Button (hidden when hovering/playing) */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-black/60 border border-white/50 group-hover:bg-[#D09A40] group-hover:scale-110 group-hover:border-[#D09A40] text-white flex items-center justify-center transition-all duration-300 shadow-xl">
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </div>
            </div>
          )}

          {/* Live Playing Indicator */}
          {isPlaying && (
            <div className="absolute top-12 left-3 z-10 bg-black/70 text-[#D09A40] border border-[#D09A40]/40 px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D09A40]" />
              <span>Playing (Muted)</span>
            </div>
          )}

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
          onClick={() => onPlay(video)}
          className="text-[11px] font-bold text-[#0F172A] hover:text-[#D09A40] flex items-center gap-1 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-[#D09A40]" />
          <span>Watch Reel</span>
        </button>

        <button
          type="button"
          onClick={() => onBook(video.title)}
          className="px-3 py-1.5 text-[11px] font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-colors shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>Book Look</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
