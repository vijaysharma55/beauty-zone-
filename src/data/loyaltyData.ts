import { LoyaltyTierLevel } from '../types';

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
      '1x points multiplier on eligible completed bookings',
      'Membership tier is based on lifetime earned points',
      'Redeem points for rewards shown in the live catalogue',
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
      '1.25x points multiplier on eligible completed bookings',
      'Unlocked at 500 lifetime earned points',
      'Redeem points for rewards shown in the live catalogue',
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
      '1.5x points multiplier on eligible completed bookings',
      'Unlocked at 1,500 lifetime earned points',
      'Redeeming points does not reduce your lifetime tier total',
    ],
  },
};
