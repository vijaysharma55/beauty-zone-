import type { ServiceItem, SalonBranch, Testimonial } from '../types';
import { LUXURY_SERVICE_CATALOG } from './luxuryServiceCatalog';

/**
 * Public master catalog. The full editorial record for each treatment lives in
 * ./luxuryServiceCatalog.ts so that the booking picker, comparison modal,
 * recommendations, owner dashboard and tenant site all share one source of
 * comprehensive, product-accurate copy.
 */
export const SALON_SERVICES: ServiceItem[] = LUXURY_SERVICE_CATALOG;

export const SALON_BRANCHES: SalonBranch[] = [
  {
    id: 'flagship-central',
    name: 'Downtown Flagship Salon & Bridal Suite',
    locality: 'Central Luxury District',
    address: 'Plot 14, Grand Avenue, Central Luxury District',
    phone: '+91 98000 12345',
    whatsapp: '+91 98000 12345',
    timings: '10:00 AM – 8:30 PM (Open All 7 Days)',
    googleRating: 4.9,
    reviewCount: 1420,
    amenities: ['Private Bridal Suites', 'Valet Car Parking', 'Artisan Beverage Lounge', 'VIP Waiting Area', 'Climate Controlled Suites'],
    isFlagship: true,
  },
  {
    id: 'studio-academy',
    name: 'South Avenue Studio & Academy',
    locality: 'South Avenue / Metro Plaza',
    address: 'D-12, Boulevard Road, Near Metro Plaza, South Avenue',
    phone: '+91 98000 54321',
    whatsapp: '+91 98000 54321',
    timings: '10:30 AM – 8:00 PM (Open All 7 Days)',
    googleRating: 4.8,
    reviewCount: 980,
    amenities: ['Makeup Academy Lab', 'Clinical HydraFacial Suite', 'Dedicated Parking', 'High-Speed Wi-Fi'],
  },
  {
    id: 'westside-luxe',
    name: 'Westside Luxury Salon & Nail Bar',
    locality: 'Westside Promenade',
    address: 'B-4, Promenade Circle, Westside Enclave',
    phone: '+91 98000 67890',
    whatsapp: '+91 98000 67890',
    timings: '10:00 AM – 8:30 PM (Open All 7 Days)',
    googleRating: 4.9,
    reviewCount: 1150,
    amenities: ['Express Hair Styling', 'Bespoke Nail Art Studio', 'Valet Parking', 'Private Spa Rooms'],
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    clientName: 'Aarohi Singhania',
    location: 'Downtown Central',
    service: 'Signature Royal HD Bridal Makeover',
    date: 'February 2026',
    weddingVenue: 'The Grand Palace Resort',
    comment: 'The team did my bridal makeup for all 3 wedding functions. The makeup looked so fresh from morning ceremonies until the night reception without needing any touch-ups. My heavy jewelry and veil were set comfortably and stayed in place throughout.',
    rating: 5,
  },
  {
    id: 't2',
    clientName: 'Dr. Shruti Khandelwal',
    location: 'South Avenue',
    service: 'Hydra-Facial & Hair Botox Treatment',
    date: 'January 2026',
    comment: 'I booked the Hydra-Facial and Hair Botox before a family function. My skin was glowing and my dry hair became super soft and shiny. Very clean salon, polite staff, and genuine branded products used.',
    rating: 5,
  },
  {
    id: 't3',
    clientName: 'Pooja Agarwal',
    location: 'Westside Enclave',
    service: 'Bridal Gel Nail Extensions & Nail Art',
    date: 'February 2026',
    comment: 'The senior nail artist did such neat nail extensions for my wedding. The crystal stone work and gold foil lasted for more than a month without any chipping. Highly recommended for all brides!',
    rating: 5,
  },
];

export const DESIGN_TOKENS = {
  colors: [
    { hex: '#0F172A', role: 'Primary Brand Dark' },
    { hex: '#D09A40', role: 'Brand Accent Gold' },
    { hex: '#DCA54A', role: 'Accent Hover Highlight' },
    { hex: '#FAF5E5', role: 'Soft Canvas Background' },
    { hex: '#FFFFFF', role: 'Clean Surface White' },
    { hex: '#4A4A4A', role: 'Neutral Body Text' },
    { hex: '#10B981', role: 'Emerald Confirmation' },
    { hex: '#F59E0B', role: 'Amber Notice Badge' },
  ],
  typography: {
    fonts: [
      { name: 'Playfair Display', role: 'Editorial Display Headlines', weights: 'Bold 700' },
      { name: 'Inter Tight', role: 'Modern UI Titles & Subheadings', weights: 'Semibold 600' },
      { name: 'Inter / Source Sans 3', role: 'Body Copy & Specs', weights: 'Light 300, Regular 400' },
    ],
    sizes: [
      { token: 'display', sizePx: '56px' },
      { token: 'h1', sizePx: '40px' },
      { token: 'h2', sizePx: '32px' },
      { token: 'h3', sizePx: '24px' },
      { token: 'body', sizePx: '15px' },
      { token: 'caption', sizePx: '12px' },
    ],
  },
  spacing: {
    tokens: [
      { token: 'space-1', value: '4px', widthPercent: 8 },
      { token: 'space-2', value: '8px', widthPercent: 16 },
      { token: 'space-3', value: '12px', widthPercent: 24 },
      { token: 'space-4', value: '16px', widthPercent: 32 },
      { token: 'space-5', value: '20px', widthPercent: 40 },
      { token: 'space-6', value: '24px', widthPercent: 48 },
      { token: 'space-8', value: '32px', widthPercent: 64 },
      { token: 'space-10', value: '40px', widthPercent: 80 },
      { token: 'space-12', value: '48px', widthPercent: 96 },
      { token: 'space-16', value: '64px', widthPercent: 100 },
    ],
  },
  shadows: [
    { name: 'Elevation Soft (Card Hover)', value: '0 18px 45px rgba(0, 0, 0, 0.12)' },
    { name: 'Elevation Subtle', value: '0 4px 20px rgba(15, 23, 42, 0.06)' },
  ],
  motionTokens: [
    { token: 'card-lift', rule: 'transform: scale(1.03); box-shadow: 0 18px 45px rgba(0,0,0,0.12)' },
    { token: 'logo-scale', rule: 'transform: scale(1.05); transition: 0.3s cubic-bezier' },
    { token: 'btn-hover', rule: 'transform: translateY(-2px); box-shadow: 0 8px 20px rgba(208,154,64,0.3)' },
    { token: 'img-zoom', rule: 'transform: scale(1.06); transition: 0.7s ease' },
    { token: 'nav-underline', rule: 'width: 100%; transition: width 0.3s ease' },
    { token: 'modal-enter', rule: 'opacity: 1; transform: scale(1); cubic-bezier(0.16, 1, 0.3, 1)' },
    { token: 'float-subtle', rule: 'translateY(-4px); 4s ease-in-out infinite' },
  ],
  componentsInventory: {
    totalDetected: 18,
    items: [
      { name: 'White-Label Brand Engine', count: 1 },
      { name: 'Navbar & Dynamic Emblem', count: 1 },
      { name: 'Hero Spotlight', count: 1 },
      { name: 'Service Cards', count: 14 },
      { name: 'Bridal Studio Banner', count: 1 },
      { name: 'Stylist Bios & Portfolios', count: 4 },
      { name: 'Founder’s Note & Bio', count: 1 },
      { name: 'Real Photo Lookbook & Sliders', count: 12 },
      { name: 'Combo Package Builder', count: 5 },
      { name: 'Booking & Price Calculator', count: 1 },
      { name: 'Branch Locations Manager', count: 3 },
      { name: 'Reviews & Ratings Modal', count: 3 },
      { name: 'Studio Management Console', count: 2 },
    ],
  },
  websiteProfile: {
    surface: 'White-Label Luxury Salon, Bridal Studio, Spa & Academy Platform',
    audience: 'Salon Owners, Multi-Branch Beauty Chains, Bridal Studios, Wellness Spas & Academies',
    brandCharacter: '100% customizable white-label architecture with live theme tokens, multi-currency support, and modular section toggles.',
  },
};
