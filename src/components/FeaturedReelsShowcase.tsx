import React, { useMemo, useState } from 'react';
import { VideoItem } from '../types';
import { RevealOnScroll } from './RevealOnScroll';
import { InstagramIcon, FacebookIcon, YouTubeIcon } from './SocialIcons';
import { useBrand } from '../context/BrandContext';
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
  Flame,
  Sparkles,
} from 'lucide-react';

interface FeaturedReelsShowcaseProps {
  videos: VideoItem[];
  onBookService: (serviceName: string) => void;
  onExploreAllVideos?: () => void;
  onOpenManagement?: () => void;
  /** Persists the full video catalog after an inline create / edit / delete. */
  onUpdateVideos?: (videos: VideoItem[]) => void;
}

type LuxuryFeature = {
  id: string;
  title: string;
  description: string;
  serviceName: string;
  category: string;
  thumbnail: string;
  video?: VideoItem;
};

const LUXURY_FEATURES: Omit<LuxuryFeature, 'video'>[] = [
  {
    id: 'bridal',
    title: 'Signature Bridal Makeup',
    description: 'A refined bridal finish with camera-ready skin, softly defined eyes and every detail styled for your big day.',
    serviceName: 'Signature Bridal Makeup',
    category: 'BRIDAL TRANSFORMATION',
    thumbnail: '/images/bridal_makeup_jaipur_1790672008691.jpg',
  },
  {
    id: 'nanoplastia',
    title: 'Moroccan Nanoplastia Hair Botox',
    description: 'A sleek, glossy hair transformation focused on smoother texture, frizz control and a polished finish.',
    serviceName: 'Moroccan Nanoplastia Hair Botox',
    category: 'HAIR TRANSFORMATION',
    thumbnail: '/images/luxury_hair_nanoplastia_1792647835332.jpg',
  },
  {
    id: 'hydra',
    title: 'Hydra-Facial Glow',
    description: 'A refreshing facial ritual designed to leave skin looking hydrated, luminous and beautifully renewed.',
    serviceName: 'Hydra-Facial Glow',
    category: 'SKIN & FACIAL GLOW',
    thumbnail: '/images/skin_spa_treatment_1790672037475.jpg',
  },
];

const getPlatform = (video?: VideoItem) => {
  if (!video) return { label: 'Video coming soon', icon: Film, className: 'bg-white/10 text-white/75' };
  if (video.platform === 'youtube') return { label: 'YouTube', icon: YouTubeIcon, className: 'bg-red-600 text-white' };
  if (video.platform === 'instagram') return { label: 'Instagram Reel', icon: InstagramIcon, className: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' };
  return { label: 'Facebook Video', icon: FacebookIcon, className: 'bg-blue-600 text-white' };
};

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

  const featuredVideos = useMemo(
    () => videos.filter((video) => video.active || manager.isManaging)
      .sort((a, b) => Number(b.featured) - Number(a.featured)),
    [videos, manager.isManaging],
  );

  // Match only by reliable category/title hints. Unrelated reels are not
  // silently presented as bridal, hair or facial treatment footage.
  const featureCards = useMemo<LuxuryFeature[]>(() => {
    const hints: Record<string, RegExp> = {
      bridal: /bridal|bride|makeup/i,
      nanoplastia: /nano|botox|hair|smooth/i,
      hydra: /hydra|facial|skin|glow/i,
    };
    return LUXURY_FEATURES.map((feature) => ({
      ...feature,
      video: featuredVideos.find((video) =>
        hints[feature.id].test(`${video.title} ${video.category} ${video.description}`),
      ),
    }));
  }, [featuredVideos]);

  const closePlayer = () => setActivePlayVideo(null);

  return (
    <section
      id="featured-reels"
      aria-labelledby="featured-reels-title"
      className="relative w-full max-w-full overflow-hidden border-y border-amber-300/10 bg-neutral-950 py-12 text-white sm:py-16 lg:py-20"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-yellow-700/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealOnScroll duration={0.6}>
          <div className="mb-7 flex flex-col gap-5 border-b border-white/10 pb-6 md:mb-9 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 sm:text-xs">
                <Flame className="h-3.5 w-3.5" />
                <span>Trending at the salon</span>
              </div>
              <h2
                id="featured-reels-title"
                className="font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl"
              >
                Trending Reels <span className="text-amber-300">&amp;</span> Transformations
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/60 sm:text-base">
                Explore signature beauty looks, real treatment inspiration and the details behind every transformation.
              </p>
            </div>

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
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:border-amber-300/50 hover:bg-amber-300/10 hover:text-amber-200"
                >
                  <Film className="h-3.5 w-3.5" />
                  View all videos
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
              {onOpenManagement && (
                <button
                  type="button"
                  onClick={onOpenManagement}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition-colors hover:border-amber-300/50 hover:text-amber-200"
                  title="Manage videos"
                  aria-label="Manage videos"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </RevealOnScroll>

        <ManageHint isManaging={manager.isManaging} noun="reel" />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {featureCards.map((feature, index) => {
            const platform = getPlatform(feature.video);
            const PlatformIcon = platform.icon;
            return (
              <RevealOnScroll key={feature.id} duration={0.55 + index * 0.08}>
                <article className="group relative mx-auto flex w-full max-w-[390px] flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-neutral-900/80 shadow-[0_18px_55px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/40 hover:shadow-[0_24px_65px_rgba(0,0,0,0.45)] sm:max-w-none">
                  {feature.video && manager.canManage && (
                    <ItemActions
                      itemLabel="reel"
                      alwaysVisible={manager.isManaging}
                      onEdit={() => manager.openEdit(feature.video!)}
                      onReplace={() => manager.openReplace(feature.video!)}
                      onDelete={() => removeReel(feature.video!.id)}
                    />
                  )}

                  <div className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-900">
                    <img
                      src={feature.video?.thumbnail || feature.thumbnail}
                      alt={feature.title}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/35" />
                    <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-lg ${platform.className}`}>
                        <PlatformIcon className="h-3 w-3" />
                        {platform.label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/35 bg-black/45 px-2.5 py-1 text-[10px] font-bold text-amber-200 backdrop-blur-sm">
                        <Sparkles className="h-3 w-3" />
                        Featured look
                      </span>
                    </div>

                    {feature.video ? (
                      <button
                        type="button"
                        onClick={() => setActivePlayVideo(feature.video!)}
                        className="absolute inset-0 flex items-center justify-center"
                        aria-label={`Play ${feature.title}`}
                      >
                        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-black/45 text-white shadow-xl backdrop-blur-sm transition-all group-hover:scale-110 group-hover:border-amber-200 group-hover:bg-amber-400 group-hover:text-neutral-950">
                          <Play className="ml-0.5 h-5 w-5 fill-current" />
                        </span>
                      </button>
                    ) : (
                      <div className="absolute inset-x-3 bottom-24 rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-center text-[11px] font-medium text-white/75 backdrop-blur-sm">
                        Video coming soon — add the official reel in Manage Videos.
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                      <p className="mb-2 text-[9px] font-bold tracking-[0.2em] text-amber-200 sm:text-[10px]">{feature.category}</p>
                      <h3 className="font-serif text-xl font-semibold leading-tight text-white sm:text-2xl">{feature.title}</h3>
                      {feature.video?.viewsCount && (
                        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-white/65">
                          <Eye className="h-3 w-3" /> {feature.video.viewsCount}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <p className="min-h-[4.5rem] text-xs leading-6 text-white/60 sm:text-sm">{feature.description}</p>
                    <button
                      type="button"
                      onClick={() => onBookService(feature.serviceName)}
                      className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 px-4 py-3 text-xs font-extrabold text-neutral-950 shadow-lg shadow-amber-950/20 transition-all hover:from-yellow-200 hover:to-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 sm:text-sm"
                    >
                      <CalendarCheck className="h-4 w-4" />
                      Book This Look
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              </RevealOnScroll>
            );
          })}
        </div>

        {activePlayVideo && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={activePlayVideo.title}
            onClick={closePlayer}
          >
            <div
              className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-neutral-950 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Now playing</p>
                  <h3 className="truncate font-serif text-base font-semibold text-white sm:text-lg">{activePlayVideo.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={closePlayer}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  aria-label="Close video"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black">
                {activePlayVideo.platform === 'youtube' && activePlayVideo.embedUrl ? (
                  <div className="aspect-[9/16] max-h-[72vh] w-full max-w-[405px]">
                    <iframe
                      src={`${activePlayVideo.embedUrl}${activePlayVideo.embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
                      title={activePlayVideo.title}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                ) : activePlayVideo.platform === 'facebook' && activePlayVideo.embedUrl ? (
                  <iframe
                    src={activePlayVideo.embedUrl}
                    title={activePlayVideo.title}
                    className="aspect-video max-h-[72vh] w-full border-0"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex max-w-md flex-col items-center p-8 text-center">
                    <InstagramIcon className="mb-4 h-12 w-12 text-pink-400" />
                    <p className="text-sm leading-6 text-white/70">
                      Instagram controls playback in its own embed. Open the reel to watch it on Instagram.
                    </p>
                    <a
                      href={activePlayVideo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-xs font-bold text-white"
                    >
                      Open Instagram Reel <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="line-clamp-2 text-xs leading-5 text-white/60">{activePlayVideo.description}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={activePlayVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-xs font-semibold text-white/80 hover:bg-white/10"
                  >
                    Open video <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const title = activePlayVideo.title;
                      closePlayer();
                      onBookService(title);
                    }}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-amber-400 px-4 text-xs font-bold text-neutral-950 hover:bg-amber-300"
                  >
                    <CalendarCheck className="h-3.5 w-3.5" /> Book this look
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
                ? `Update “${manager.editorState.item?.title || 'this reel'}”.`
                : 'Paste an official YouTube, Instagram or Facebook video link. The platform, embed URL and cover image are detected automatically.'
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
