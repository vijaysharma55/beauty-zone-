import { LoyaltyCustomer, RewardOffer, LoyaltyTierLevel } from '../types';

export const LOYALTY_TIERS: Record<
  LoyaltyTierLevel,
  {
    name: string;
    minPoints: number;
    maxPoints: number;
    color: string;
    badgeBg: string;
    perks: string[];
    multiplier: number;
  }
> = {
  silver: {
    name: 'Silver Glow Member',
    minPoints: 0,
    maxPoints: 499,
    color: '#94A3B8',
    badgeBg: 'bg-slate-700/60 text-slate-200 border-slate-500/40',
    multiplier: 1.0,
    perks: [
      'Earn 1 point for every ₹10 spent',
      'Complimentary herbal tea & scalp consultation',
      'Special 10% birthday week voucher',
    ],
  },
  gold: {
    name: 'Gold Radiance VIP',
    minPoints: 500,
    maxPoints: 1499,
    color: '#D09A40',
    badgeBg: 'bg-[#D09A40]/20 text-[#FAF5E5] border-[#D09A40]/50',
    multiplier: 1.25,
    perks: [
      '1.25x Points Multiplier on all services',
      'Free Moroccan Hair Spa on visits above ₹2,500',
      'Priority slot reservations during wedding peak season',
      'Complimentary gel nail polish change',
    ],
  },
  platinum: {
    name: 'Platinum Royal Crown',
    minPoints: 1500,
    maxPoints: 99999,
    color: '#E2E8F0',
    badgeBg: 'bg-amber-500/25 text-amber-200 border-amber-400/50',
    multiplier: 1.5,
    perks: [
      '1.5x Points Multiplier on bridal & salon packages',
      'Free private VIP bridal suite reservation',
      'Zero travel charge on home salon visits in Jaipur (up to 10 km)',
      'Direct personal stylist consultation anytime',
      'Complimentary 24K Gold Facial on wedding anniversary',
    ],
  },
};

export const REWARD_OFFERS: RewardOffer[] = [
  {
    id: 'rew-1',
    title: '₹500 Instant Salon Voucher',
    description: 'Use on any salon service or hair spa bill of ₹1,500 or more across Jaipur branches.',
    pointsCost: 500,
    discountValue: '₹500 Flat Off',
    category: 'discount',
    badge: 'Popular',
  },
  {
    id: 'rew-2',
    title: 'Free Moroccan Scalp & Hair Spa',
    description: 'Deep nourishing argan oil hair spa with hot towel steam and relaxing head massage.',
    pointsCost: 750,
    discountValue: '100% Free Service (Worth ₹1,800)',
    category: 'free_service',
    badge: 'Best Value',
  },
  {
    id: 'rew-3',
    title: '24K Gold Foil Facial Upgrade',
    description: 'Upgrade any regular facial to our signature real 24K Gold Leaf facial with ultrasound glow treatment.',
    pointsCost: 1000,
    discountValue: 'Free Luxury Upgrade (Worth ₹2,500)',
    category: 'upgrade',
    badge: 'Royal Favorite',
  },
  {
    id: 'rew-4',
    title: 'Complimentary Gel Nail Art Set',
    description: 'Free gel extension nail art with crystal stone accents and chrome finish.',
    pointsCost: 650,
    discountValue: '100% Free Service (Worth ₹1,499)',
    category: 'free_service',
  },
  {
    id: 'rew-5',
    title: '₹1,500 Royal Bridal Booking Discount',
    description: 'Instant reduction on any Rajasthani HD or Airbrush bridal makeup package.',
    pointsCost: 1500,
    discountValue: '₹1,500 Off Bridal',
    category: 'bridal',
    badge: 'Bridal Special',
  },
  {
    id: 'rew-6',
    title: 'Free Home Salon Travel Pass',
    description: 'Zero distance travel fee on home salon visits anywhere in Jaipur up to 15 km.',
    pointsCost: 400,
    discountValue: 'Free Home Travel (Worth ₹600)',
    category: 'discount',
  },
];

export const DEMO_CUSTOMERS: LoyaltyCustomer[] = [
  {
    phone: '9829011223',
    name: 'Pooja Sharma',
    memberId: 'BZ-GOLD-7429',
    tier: 'gold',
    totalPoints: 1180,
    lifetimePoints: 2450,
    visitsCount: 7,
    joinedDate: 'August 2025',
    activities: [
      {
        id: 'act-1',
        date: '24 Sep 2026',
        branch: 'C-Scheme Flagship Salon',
        serviceTitle: '24K Gold Leaf Glow Facial + Blowout',
        billAmount: 5800,
        pointsEarned: 580,
        type: 'visit',
      },
      {
        id: 'act-2',
        date: '12 Aug 2026',
        branch: 'Malviya Nagar Studio',
        serviceTitle: 'Moroccan Nanoplastia Hair Treatment',
        billAmount: 6999,
        pointsEarned: 450,
        type: 'visit',
      },
      {
        id: 'act-3',
        date: '15 Jul 2026',
        branch: 'Vaishali Nagar Salon',
        serviceTitle: 'Spa Gel Manicure & Pedicure',
        billAmount: 2200,
        pointsEarned: 150,
        type: 'visit',
      },
      {
        id: 'act-4',
        date: '01 Jun 2026',
        branch: 'Jaipur Head Office',
        serviceTitle: 'Friend Bridal Booking Referral Bonus',
        billAmount: 0,
        pointsEarned: 300,
        type: 'referral',
      },
    ],
    redeemedRewards: [
      {
        id: 'red-1',
        rewardTitle: '₹500 Instant Salon Voucher',
        voucherCode: 'BZ-GLOW-500-POOJA',
        pointsCost: 500,
        dateRedeemed: '20 Aug 2026',
        validTill: '20 Nov 2026',
        status: 'used',
        discountValue: '₹500 Flat Off',
      },
    ],
  },
  {
    phone: '9829033445',
    name: 'Simran Rathore',
    memberId: 'BZ-PLAT-9012',
    tier: 'platinum',
    totalPoints: 2150,
    lifetimePoints: 4800,
    visitsCount: 14,
    joinedDate: 'November 2024',
    activities: [
      {
        id: 'act-5',
        date: '18 Sep 2026',
        branch: 'C-Scheme Flagship Salon',
        serviceTitle: 'Royal Rajasthani HD Bridal Makeover',
        billAmount: 24999,
        pointsEarned: 1250,
        type: 'visit',
      },
      {
        id: 'act-6',
        date: '05 Aug 2026',
        branch: 'Home Visit (Civil Lines)',
        serviceTitle: 'Pre-Bridal 7-Day Complete Glow Spa',
        billAmount: 28500,
        pointsEarned: 900,
        type: 'visit',
      },
    ],
    redeemedRewards: [
      {
        id: 'red-2',
        rewardTitle: '₹1,500 Royal Bridal Booking Discount',
        voucherCode: 'ROYAL-1500-SIMRAN',
        pointsCost: 1500,
        dateRedeemed: '18 Sep 2026',
        validTill: '18 Dec 2026',
        status: 'active',
        discountValue: '₹1,500 Off Bridal',
      },
    ],
  },
  {
    phone: '9829055667',
    name: 'Ananya Verma',
    memberId: 'BZ-SILV-3180',
    tier: 'silver',
    totalPoints: 340,
    lifetimePoints: 340,
    visitsCount: 2,
    joinedDate: 'February 2026',
    activities: [
      {
        id: 'act-7',
        date: '10 Sep 2026',
        branch: 'Vaishali Nagar Salon',
        serviceTitle: 'Keratin Hair Smoothening + Haircut',
        billAmount: 4200,
        pointsEarned: 240,
        type: 'visit',
      },
      {
        id: 'act-8',
        date: '02 Feb 2026',
        branch: 'Malviya Nagar Studio',
        serviceTitle: 'Welcome Salon Visit - HydraFacial',
        billAmount: 1800,
        pointsEarned: 100,
        type: 'visit',
      },
    ],
    redeemedRewards: [],
  },
];

const LOYALTY_STORAGE_KEY = 'beauty_zone_loyalty_customer_v1';

export const getStoredLoyaltyCustomer = (): LoyaltyCustomer => {
  try {
    const raw = localStorage.getItem(LOYALTY_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load loyalty data from localStorage', e);
  }
  return DEMO_CUSTOMERS[0];
};

export const saveStoredLoyaltyCustomer = (customer: LoyaltyCustomer): void => {
  try {
    localStorage.setItem(LOYALTY_STORAGE_KEY, JSON.stringify(customer));
  } catch (e) {
    console.error('Failed to save loyalty data', e);
  }
};
