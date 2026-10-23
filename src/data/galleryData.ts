import { GalleryItem, GalleryUploadType } from '../types';

export const GALLERY_TYPES: { id: GalleryUploadType; label: string; description: string }[] = [
  { id: 'photo', label: 'Photo', description: 'High-quality photos of bridal makeup, haircuts, and nail art' },
  { id: 'before_after', label: 'Before / After', description: 'Interactive sliders showing real client results' },
  { id: 'portfolio', label: 'Portfolio', description: 'Curated photo collections by our senior salon artists' },
  { id: 'work_showcase', label: 'Work Showcase', description: 'Destination weddings, backstage, and event styling' }
];

export const GALLERY_CATEGORIES = [
  'Bridal Makeup',
  'Hair Care & Color',
  'Skin & Facials',
  'Nail Art & Extensions',
  'Destination Weddings',
  'Body Spa & Care'
];

export const GALLERY_SERVICES = [
  'Signature Royal HD Bridal Makeover',
  'Moroccan Nanoplastia & Hair Botox Treatment',
  'French Balayage & Ombre Hair Color',
  '24K Gold Leaf Glow Facial',
  'Bridal Gel Nail Extensions with Nail Art',
  'Hydra-Facial Deep Clean & Glow',
  'Sangeet & Party Glam Makeup',
  'Rose Petal & Milk Bath Body Spa'
];

export const INITIAL_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gal-1',
    type: 'before_after',
    title: 'Frizzy Dry Hair to Smooth Glass Hair Botox',
    description: 'Transforming rough, dry, and frizzy hair into super smooth, shiny hair using our chemical-free Moroccan treatment.',
    category: 'Hair Care & Color',
    service: 'Moroccan Nanoplastia & Hair Botox Treatment',
    image: '/images/luxury_hair_nanoplastia_1792647835332.jpg',
    before_image: '/images/home_salon_service_1790676110547.jpg',
    sort_order: 1,
    featured: true,
    active: true,
    artist: 'Vikramaditya Sen (Senior Hair Specialist)',
    created_at: '2026-09-15'
  },
  {
    id: 'gal-2',
    type: 'photo',
    title: 'Signature Royal Couture & Fine Bridal Look',
    description: 'Complete royal bridal makeover done at a luxury palace resort with sweatproof HD airbrush base and bespoke jewelry setting.',
    category: 'Bridal Makeup',
    service: 'Signature Royal HD Bridal Makeover',
    image: '/images/jaipur_royal_bride_1792647664582.jpg',
    sort_order: 2,
    featured: true,
    active: true,
    artist: 'Ananya Rathore (Chief Bridal Specialist)',
    created_at: '2026-09-18'
  },
  {
    id: 'gal-3',
    type: 'before_after',
    title: 'Sun-Tanned Skin to 24K Gold Leaf Glow',
    description: 'Removing heavy sun tan and dullness with our 7-step gold facial to give skin an instant, bright natural glow.',
    category: 'Skin & Facials',
    service: '24K Gold Leaf Glow Facial',
    image: '/images/skin_spa_treatment_1790672037475.jpg',
    before_image: '/images/prebridal_spa_ritual_1790676123541.jpg',
    sort_order: 3,
    featured: true,
    active: true,
    artist: 'Dr. Meera Pareek (Skin Specialist)',
    created_at: '2026-09-20'
  },
  {
    id: 'gal-4',
    type: 'portfolio',
    title: 'Ananya Rathore: Luxury Destination Bridal Lookbook',
    description: 'A photo collection of 12 real destination brides styled with fine jewelry, veil setting, and couture draping.',
    category: 'Destination Weddings',
    service: 'Signature Royal HD Bridal Makeover',
    image: '/images/bridal_makeup_jaipur_1790672008691.jpg',
    sort_order: 4,
    featured: true,
    active: true,
    artist: 'Ananya Rathore (Chief Bridal Specialist)',
    created_at: '2026-09-22'
  },
  {
    id: 'gal-5',
    type: 'photo',
    title: 'Bridal Gel Nail Extensions with Swarovski Stones',
    description: 'Neat almond-shaped gel nail extensions with real Swarovski crystals and hand-painted gold foil art.',
    category: 'Nail Art & Extensions',
    service: 'Bridal Gel Nail Extensions with Nail Art',
    image: '/images/bridal_nail_art_1792647953738.jpg',
    sort_order: 5,
    featured: true,
    active: true,
    artist: 'Zoya Khan (Senior Nail Artist)',
    created_at: '2026-09-23'
  },
  {
    id: 'gal-6',
    type: 'work_showcase',
    title: 'Luxury Resort Sangeet & Family Styling',
    description: 'Our mobile team of 8 senior stylists doing makeup and hair for the bride, sisters, and family for a grand sangeet night.',
    category: 'Destination Weddings',
    service: 'Sangeet & Party Glam Makeup',
    image: '/images/home_salon_service_1790676110547.jpg',
    sort_order: 6,
    featured: true,
    active: true,
    artist: 'Senior Bridal & Mobile Salon Team',
    created_at: '2026-09-24'
  },
  {
    id: 'gal-7',
    type: 'portfolio',
    title: 'Vikramaditya: Modern Balayage & Haircuts',
    description: 'Natural honey-caramel balayage hair color and precision cuts designed to look great in natural sunlight.',
    category: 'Hair Care & Color',
    service: 'French Balayage & Ombre Hair Color',
    image: '/images/hair_styling_luxe_1790672021591.jpg',
    sort_order: 7,
    featured: false,
    active: true,
    artist: 'Vikramaditya Sen (Senior Hair Specialist)',
    created_at: '2026-09-25'
  },
  {
    id: 'gal-8',
    type: 'work_showcase',
    title: 'Makeup Academy: Hands-on Bridal Workshop',
    description: 'Live practical training on airbrush makeup, long-lasting primers, and couture draping for academy diploma students.',
    category: 'Destination Weddings',
    service: 'Signature Royal HD Bridal Makeover',
    image: '/images/makeup_academy_class_1792648280089.jpg',
    sort_order: 8,
    featured: true,
    active: true,
    artist: 'Master Academy Educators',
    created_at: '2026-09-26'
  },
  {
    id: 'gal-9',
    type: 'work_showcase',
    title: 'Flagship Jaipur Luxury Studio Ambience',
    description: 'Bespoke Rajasthani gold arch aesthetics, velvet styling chairs, illuminated vanity mirrors, and luxury beauty product galleries.',
    category: 'Destination Weddings',
    service: 'Signature Royal HD Bridal Makeover',
    image: '/images/jaipur_luxury_salon_1792644552318.jpg',
    sort_order: 9,
    featured: true,
    active: true,
    artist: 'Lumina Luxe Flagship Architecture Team',
    created_at: '2026-10-22'
  }
];

const GALLERY_STORAGE_KEY = 'whitelabel_salon_gallery_v3';

export function getStoredGallery(): GalleryItem[] {
  if (typeof window === 'undefined') return INITIAL_GALLERY_ITEMS;
  try {
    localStorage.removeItem('whitelabel_salon_gallery_v2');
    const raw = localStorage.getItem(GALLERY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(INITIAL_GALLERY_ITEMS));
      return INITIAL_GALLERY_ITEMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a: GalleryItem, b: GalleryItem) => a.sort_order - b.sort_order);
    }
    return INITIAL_GALLERY_ITEMS;
  } catch (err) {
    console.error('Failed reading gallery from localStorage', err);
    return INITIAL_GALLERY_ITEMS;
  }
}

export function saveStoredGallery(items: GalleryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed writing gallery to localStorage', err);
  }
}
