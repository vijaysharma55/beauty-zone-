import { VideoItem, VideoPlatform } from '../../types';
import { VIDEO_CATEGORIES, parseVideoUrl } from '../../data/videosData';
import type { EditorField } from './CardEditorModal';

export const VIDEO_PLATFORM_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram Reel' },
  { value: 'facebook', label: 'Facebook Video' },
  { value: 'other', label: 'Other web video' },
];

const FALLBACK_THUMBNAIL = '/images/bridal_makeup_jaipur_1790672008691.jpg';

export const videoEditorFields: EditorField[] = [
  {
    key: 'thumbnail',
    type: 'image',
    label: 'Reel cover / thumbnail',
    span: 2,
    aspect: 'aspect-[9/12]',
    help: 'Upload a portrait cover or paste an image URL. Every card renders it inside a fixed frame with object-fit: cover.',
  },
  { key: 'title', type: 'text', label: 'Reel title', span: 2, required: true },
  { key: 'description', type: 'textarea', label: 'Description', span: 2, rows: 3 },
  {
    key: 'category',
    type: 'select',
    label: 'Category',
    options: VIDEO_CATEGORIES.map((category) => ({ value: category, label: category })),
  },
  { key: 'platform', type: 'select', label: 'Platform', options: VIDEO_PLATFORM_OPTIONS },
  {
    key: 'url',
    type: 'url',
    label: 'Original video URL',
    span: 2,
    placeholder: 'https://www.youtube.com/watch?v=… or https://www.instagram.com/reel/…',
    help: 'Paste a YouTube, Instagram or Facebook link. The embed URL and platform are detected automatically.',
  },
  {
    key: 'embedUrl',
    type: 'url',
    label: 'Embed URL (optional override)',
    span: 2,
    help: 'Leave blank to use the auto-generated embed URL.',
  },
  {
    key: 'videoUrl',
    type: 'url',
    label: 'Hover preview MP4 (optional)',
    span: 2,
    help: 'Short muted MP4 used for the hover preview. Falls back to the sample clip.',
  },
  { key: 'author', type: 'text', label: 'Artist / author', placeholder: 'e.g. Senior Bridal Director' },
  { key: 'viewsCount', type: 'text', label: 'Views label', placeholder: 'e.g. 48.2K views' },
  { key: 'duration', type: 'text', label: 'Duration', placeholder: 'e.g. 0:45' },
  { key: 'featured', type: 'checkbox', label: 'Feature in the homepage showcase' },
  { key: 'active', type: 'checkbox', label: 'Visible on the website' },
];

export const emptyVideoValues = (): Record<string, unknown> => ({
  thumbnail: '',
  title: '',
  description: '',
  category: 'Bridal Reels',
  platform: 'instagram',
  url: '',
  embedUrl: '',
  videoUrl: '',
  author: '',
  viewsCount: 'Trending',
  duration: '0:45',
  featured: false,
  active: true,
});

export const videoToEditorValues = (video?: VideoItem): Record<string, unknown> => {
  if (!video) return emptyVideoValues();
  return {
    thumbnail: video.thumbnail || '',
    title: video.title,
    description: video.description,
    category: video.category,
    platform: video.platform,
    url: video.url,
    embedUrl: video.embedUrl,
    videoUrl: video.videoUrl || '',
    author: video.author || '',
    viewsCount: video.viewsCount || '',
    duration: video.duration || '',
    featured: !!video.featured,
    active: !!video.active,
  };
};

function parseViews(value: unknown): number {
  const text = String(value || '').trim().toLowerCase();
  const match = text.match(/([\d.]+)\s*([km])?/);
  if (!match) return 0;
  const base = Number.parseFloat(match[1]);
  if (!Number.isFinite(base)) return 0;
  if (match[2] === 'k') return Math.round(base * 1000);
  if (match[2] === 'm') return Math.round(base * 1000000);
  return Math.round(base);
}

export function normalizeVideo(
  values: Record<string, unknown>,
  base?: VideoItem
): VideoItem {
  const originalUrl = String(values.url || '').trim();
  const embedOverride = String(values.embedUrl || '').trim();
  const parsed = parseVideoUrl(originalUrl || embedOverride);

  const fallback: VideoItem = {
    id: `reel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url: '',
    embedUrl: '',
    platform: 'instagram',
    title: '',
    description: '',
    category: String(values.category || 'Bridal Reels'),
    thumbnail: '',
    videoUrl: '',
    featured: false,
    active: true,
    author: '',
    viewsCount: '',
    duration: '',
    created_at: new Date().toISOString().slice(0, 10),
    viewsNumeric: 0,
    pinCount: 0,
    clicksCount: 0,
    engagementScore: 0,
  };

  const source = base || fallback;
  const viewsCount = String(values.viewsCount || '').trim();
  const chosenPlatform = (String(values.platform || '') as VideoPlatform) || 'other';

  return {
    ...source,
    id: source.id,
    url: originalUrl || embedOverride,
    embedUrl: embedOverride || parsed.embedUrl || originalUrl,
    // A recognised link always wins so the lightbox picks the right player.
    platform: parsed.isValid ? parsed.platform : chosenPlatform,
    title: String(values.title || '').trim(),
    description: String(values.description || '').trim(),
    category: String(values.category || 'Bridal Reels'),
    thumbnail: String(values.thumbnail || '').trim() || parsed.autoThumbnail || FALLBACK_THUMBNAIL,
    videoUrl: String(values.videoUrl || '').trim(),
    featured: !!values.featured,
    active: !!values.active,
    viewsCount,
    viewsNumeric: parseViews(viewsCount) || source.viewsNumeric,
    duration: String(values.duration || '').trim(),
    author: String(values.author || '').trim(),
    created_at: source.created_at || new Date().toISOString().slice(0, 10),
  };
}

export function validateVideoValues(values: Record<string, unknown>): string | null {
  if (!String(values.title || '').trim()) return 'A reel title is required.';

  const url = String(values.url || '').trim();
  const embedUrl = String(values.embedUrl || '').trim();
  if (!url && !embedUrl) {
    return 'Add a YouTube, Instagram or Facebook video URL, or an embed URL.';
  }
  if (url && !embedUrl && !parseVideoUrl(url).isValid) {
    return 'That link is not a recognised YouTube, Instagram or Facebook video URL. Add an embed URL instead.';
  }
  return null;
}
