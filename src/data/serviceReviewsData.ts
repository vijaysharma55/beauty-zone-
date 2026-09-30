import { ServiceReview } from '../types';

export const INITIAL_SERVICE_REVIEWS: ServiceReview[] = [
  // b1: Royal Rajasthani HD Bridal Makeover
  {
    id: 'rev-b1-1',
    serviceId: 'b1',
    authorName: 'Priyal Rathore',
    location: 'Civil Lines, Jaipur',
    rating: 5,
    date: '2026-08-14',
    comment: 'Booked for my destination wedding at Rambagh Palace. The HD makeup stayed fresh through 7 hours of ceremonies, pheras, and photos without any smudging!',
    verifiedBooking: true,
  },
  {
    id: 'rev-b1-2',
    serviceId: 'b1',
    authorName: 'Meenakshi Shekhawat',
    location: 'C-Scheme, Jaipur',
    rating: 5,
    date: '2026-07-28',
    comment: 'The Kundan jewelry setting and poshaak draping were done so neatly. Everyone complimented how glowing and natural my skin looked in the wedding videos.',
    verifiedBooking: true,
  },
  {
    id: 'rev-b1-3',
    serviceId: 'b1',
    authorName: 'Aishwarya Mathur',
    location: 'Vaishali Nagar, Jaipur',
    rating: 5,
    date: '2026-06-19',
    comment: 'Senior artist arrived right on time for our morning wedding prep. Beautiful eye makeup and perfect lash application.',
    verifiedBooking: true,
  },

  // h1: Moroccan Nanoplastia & Botox Hair Therapy
  {
    id: 'rev-h1-1',
    serviceId: 'h1',
    authorName: 'Dr. Tanvi Sharma',
    location: 'Malviya Nagar, Jaipur',
    rating: 5,
    date: '2026-09-02',
    comment: 'Chemical-free with zero strong smell. Jaipur’s hard water had made my hair rough and dry; after this treatment, it is shiny, soft, and completely frizz-free.',
    verifiedBooking: true,
  },
  {
    id: 'rev-h1-2',
    serviceId: 'h1',
    authorName: 'Kavita Joshi',
    location: 'Raja Park, Jaipur',
    rating: 5,
    date: '2026-08-21',
    comment: 'Saved me an hour of daily hair straightening. Best hair botox treatment in Jaipur.',
    verifiedBooking: true,
  },

  // s1: 24K Gold Leaf Radiance Luxury Facial
  {
    id: 'rev-s1-1',
    serviceId: 's1',
    authorName: 'Sunita Singhania',
    location: 'Bani Park, Jaipur',
    rating: 5,
    date: '2026-08-30',
    comment: 'Real 24K gold leaves massaged into the skin with soothing ultrasound therapy. The gold glow lasted for almost a month.',
    verifiedBooking: true,
  },
  {
    id: 'rev-s1-2',
    serviceId: 's1',
    authorName: 'Divya Khurana',
    location: 'Mansarovar, Jaipur',
    rating: 5,
    date: '2026-07-15',
    comment: 'Super relaxing face massage and clean, comfortable salon rooms. Worth every rupee.',
    verifiedBooking: true,
  },

  // s2: Hydra-Dermabrasion Deep Oxygen Infusion
  {
    id: 'rev-s2-1',
    serviceId: 's2',
    authorName: 'Ritika Agarwal',
    location: 'C-Scheme, Jaipur',
    rating: 5,
    date: '2026-09-10',
    comment: 'The machine facial cleared all stubborn blackheads without any redness. The cooling ice globes tightened my pores instantly.',
    verifiedBooking: true,
  },

  // n1: Bridal Gel Extensions
  {
    id: 'rev-n1-1',
    serviceId: 'n1',
    authorName: 'Ananya Saxena',
    location: 'Vidhyadhar Nagar, Jaipur',
    rating: 5,
    date: '2026-08-04',
    comment: 'The gel nail extensions with gold foil and Swarovski crystals lasted over 4 weeks without a single chip during all our family wedding functions.',
    verifiedBooking: true,
  },

  // sp1: Royal Rose & Milk Bath
  {
    id: 'rev-sp1-1',
    serviceId: 'sp1',
    authorName: 'Geetanjali Devi',
    location: 'Civil Lines, Jaipur',
    rating: 5,
    date: '2026-07-22',
    comment: 'Pure sensory heaven. Fresh Damascus rose petals, organic warm goat milk soak, and relaxing Swedish strokes. Felt like true Jaipur royalty.',
    verifiedBooking: true,
  },
];

// Baseline catalog rating scores & initial counts for all services
export const BASELINE_SERVICE_RATINGS: { [serviceId: string]: { rating: number; count: number } } = {
  b1: { rating: 5.0, count: 42 },
  b2: { rating: 4.9, count: 38 },
  b3: { rating: 4.8, count: 26 },
  b4: { rating: 4.9, count: 19 },
  h1: { rating: 4.9, count: 64 },
  h2: { rating: 4.8, count: 31 },
  h3: { rating: 4.7, count: 28 },
  h4: { rating: 4.8, count: 52 },
  s1: { rating: 5.0, count: 57 },
  s2: { rating: 4.9, count: 44 },
  s3: { rating: 4.8, count: 33 },
  n1: { rating: 4.9, count: 39 },
  n2: { rating: 4.8, count: 27 },
  sp1: { rating: 5.0, count: 22 },
  sp2: { rating: 4.8, count: 18 },
  a1: { rating: 4.9, count: 46 },
  a2: { rating: 4.8, count: 29 },
};
