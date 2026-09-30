import { VideoItem, VideoPlatform } from '../types';

export const VIDEO_CATEGORIES = [
  'Bridal Reels',
  'Nail Art Tutorials',
  'Hair Transformation',
  'Client Reviews',
  'Skin & Facial Glow',
  'Salon Tour & Ambience',
  'Academy Masterclass'
] as const;

export const VIDEO_PRESET_THUMBNAILS = [
  {
    label: 'Bridal Makeover Reel',
    url: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
    category: 'Bridal Reels'
  },
  {
    label: 'Hair Botox Smoothening',
    url: '/src/assets/images/hair_styling_luxe_1790672021591.jpg',
    category: 'Hair Transformation'
  },
  {
    label: 'Nail Art Extensions',
    url: '/src/assets/images/nail_art_luxe_1790676094903.jpg',
    category: 'Nail Art Tutorials'
  },
  {
    label: '24K Gold Hydra Facial',
    url: '/src/assets/images/skin_spa_treatment_1790672037475.jpg',
    category: 'Skin & Facial Glow'
  },
  {
    label: 'Jaipur Salon Ambience',
    url: '/src/assets/images/hero_jaipur_salon_1790671992521.jpg',
    category: 'Salon Tour & Ambience'
  },
  {
    label: 'Academy Masterclass',
    url: '/src/assets/images/academy_training_jaipur_1790676136151.jpg',
    category: 'Academy Masterclass'
  }
];

export interface ParsedVideoResult {
  platform: VideoPlatform;
  embedUrl: string;
  autoThumbnail?: string;
  videoId?: string;
  isValid: boolean;
  platformLabel: string;
}

export function parseVideoUrl(inputUrl: string): ParsedVideoResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return {
      platform: 'other',
      embedUrl: '',
      isValid: false,
      platformLabel: 'Unknown Platform'
    };
  }

  const url = inputUrl.trim();

  // 1. YouTube Detection
  // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
  const ytWatchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/i);
  const ytShortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);

  if (ytWatchMatch || ytShortsMatch) {
    const videoId = (ytWatchMatch && ytWatchMatch[1]) || (ytShortsMatch && ytShortsMatch[1]);
    if (videoId) {
      return {
        platform: 'youtube',
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=0`,
        autoThumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        isValid: true,
        platformLabel: 'YouTube Video'
      };
    }
  }

  // 2. Instagram Detection
  // Matches: instagram.com/reel/ID, instagram.com/p/ID, instagram.com/tv/ID, instagram.com/reels/ID
  const igMatch = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch && igMatch[1]) {
    const reelCode = igMatch[1];
    return {
      platform: 'instagram',
      videoId: reelCode,
      embedUrl: `https://www.instagram.com/reel/${reelCode}/embed/captioned/`,
      autoThumbnail: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
      isValid: true,
      platformLabel: 'Instagram Reel'
    };
  }

  // 3. Facebook Video Detection
  // Matches: facebook.com/.../videos/ID, fb.watch/ID, facebook.com/watch/?v=ID, facebook.com/reel/ID
  const isFacebook = /facebook\.com|fb\.watch|fb\.gg/i.test(url);
  if (isFacebook) {
    const encoded = encodeURIComponent(url);
    return {
      platform: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&width=500`,
      autoThumbnail: '/src/assets/images/home_salon_service_1790676110547.jpg',
      isValid: true,
      platformLabel: 'Facebook Video'
    };
  }

  // Fallback for custom / other video links
  return {
    platform: 'other',
    embedUrl: url,
    isValid: url.startsWith('http://') || url.startsWith('https://'),
    platformLabel: 'Web Video'
  };
}

export const INITIAL_VIDEOS: VideoItem[] = [
  {
    id: 'vid-bridal-transformation-reel',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0',
    platform: 'youtube',
    title: 'Royal Rajasthani HD Bridal Makeover & Draping Process',
    description: 'Step-by-step airbrush HD makeup, real Kundan jewellery setting, and rose water hydration glow on our real bride Pooja Sharma.',
    category: 'Bridal Reels',
    thumbnail: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
    featured: true,
    active: true,
    viewsCount: '48.2K views',
    viewsNumeric: 48200,
    pinCount: 14,
    clicksCount: 3820,
    engagementScore: 94,
    duration: '0:58',
    created_at: '2 days ago',
    author: 'Sunita Meena (Senior Bridal Director)'
  },
  {
    id: 'vid-nanoplastia-hair-reel',
    url: 'https://www.instagram.com/reel/C8xYz123ABC/',
    embedUrl: 'https://www.instagram.com/reel/C8xYz123ABC/embed/captioned/',
    platform: 'instagram',
    title: 'Chemical-Free Moroccan Nanoplastia Smoothening Transformation',
    description: 'Watch the dramatic frizz-to-glass transformation using our 0% formaldehyde nanoplastia formula at our C-Scheme Salon.',
    category: 'Hair Transformation',
    thumbnail: '/src/assets/images/hair_styling_luxe_1790672021591.jpg',
    featured: true,
    active: true,
    viewsCount: '124K views',
    viewsNumeric: 124000,
    pinCount: 28,
    clicksCount: 11450,
    engagementScore: 98,
    duration: '0:45',
    created_at: '5 days ago',
    author: 'Vikram Singh (Senior Hair Specialist)'
  },
  {
    id: 'vid-nail-art-swarovski-tutorial',
    url: 'https://www.youtube.com/watch?v=kXYiU_JCYtU',
    embedUrl: 'https://www.youtube.com/embed/kXYiU_JCYtU?rel=0',
    platform: 'youtube',
    title: 'Bridal Gel Extensions with Swarovski Stones & 24K Gold Foil',
    description: 'Detailed tutorial of our Russian builder gel technique with genuine Swarovski crystals and hand-painted gold leaf art.',
    category: 'Nail Art Tutorials',
    thumbnail: '/src/assets/images/nail_art_luxe_1790676094903.jpg',
    featured: true,
    active: true,
    viewsCount: '32.6K views',
    viewsNumeric: 32600,
    pinCount: 9,
    clicksCount: 2410,
    engagementScore: 88,
    duration: '1:15',
    created_at: '1 week ago',
    author: 'Meenakshi Rathore (Nail Lead)'
  },
  {
    id: 'vid-client-review-gold-facial',
    url: 'https://www.facebook.com/beautyzonejaipur/videos/1029384756',
    embedUrl: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fbeautyzonejaipur%2Fvideos%2F1029384756&show_text=false&width=500',
    platform: 'facebook',
    title: 'Client Review & Before-After Glow: 24K Gold Leaf Facial',
    description: 'Ananya Verma shares her honest experience after getting our signature ultrasound firming 24K gold facial before her sangeet ceremony.',
    category: 'Client Reviews',
    thumbnail: '/src/assets/images/skin_spa_treatment_1790672037475.jpg',
    featured: false,
    active: true,
    viewsCount: '18.9K views',
    viewsNumeric: 18900,
    pinCount: 4,
    clicksCount: 1250,
    engagementScore: 82,
    duration: '1:30',
    created_at: '2 weeks ago',
    author: 'Pooja Sharma (Jaipur Client)'
  },
  {
    id: 'vid-salon-tour-c-scheme',
    url: 'https://www.instagram.com/reel/D9yAbc456DEF/',
    embedUrl: 'https://www.instagram.com/reel/D9yAbc456DEF/embed/captioned/',
    platform: 'instagram',
    title: 'Walkthrough of our Private Bridal Suite & Luxury Salon in C-Scheme',
    description: 'Explore our newly renovated flagship salon featuring private dressing rooms, Italian spa chairs, and sterilized beauty stations.',
    category: 'Salon Tour & Ambience',
    thumbnail: '/src/assets/images/hero_jaipur_salon_1790671992521.jpg',
    featured: true,
    active: true,
    viewsCount: '95.4K views',
    viewsNumeric: 95400,
    pinCount: 21,
    clicksCount: 7890,
    engagementScore: 96,
    duration: '0:50',
    created_at: '3 weeks ago',
    author: 'Beauty Zone Jaipur Official'
  },
  {
    id: 'vid-academy-bridal-masterclass',
    url: 'https://www.youtube.com/watch?v=7NOSDKb0HlU',
    embedUrl: 'https://www.youtube.com/embed/7NOSDKb0HlU?rel=0',
    platform: 'youtube',
    title: 'Bridal Makeup Masterclass: Eye Contouring & 16-Hour Waterproof Base',
    description: 'Highlights from our 15-day professional bridal certification academy class held at the Vaishali Nagar academy branch.',
    category: 'Academy Masterclass',
    thumbnail: '/src/assets/images/academy_training_jaipur_1790676136151.jpg',
    featured: false,
    active: true,
    viewsCount: '62.1K views',
    viewsNumeric: 62100,
    pinCount: 7,
    clicksCount: 4620,
    engagementScore: 91,
    duration: '2:10',
    created_at: '1 month ago',
    author: 'Beauty Zone Academy Jaipur'
  }
];

const VIDEOS_STORAGE_KEY = 'beautyzone_jaipur_videos_v1';

export function getStoredVideos(): VideoItem[] {
  if (typeof window === 'undefined') return INITIAL_VIDEOS;
  try {
    const raw = localStorage.getItem(VIDEOS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(INITIAL_VIDEOS));
      return INITIAL_VIDEOS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_VIDEOS;
  } catch (err) {
    console.error('Failed reading videos from localStorage', err);
    return INITIAL_VIDEOS;
  }
}

export function saveStoredVideos(videos: VideoItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(videos));
  } catch (err) {
    console.error('Failed saving videos to localStorage', err);
  }
}
