import React, { useState, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  Gift,
  History,
  Tag,
  CheckCircle2,
  ArrowRight,
  Calculator,
  Copy,
  Check,
  Award,
  ChevronRight,
  Zap,
  TrendingUp,
  MapPin,
  Calendar,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import {
  LOYALTY_TIERS,
  REWARD_OFFERS,
  DEMO_CUSTOMERS,
  getStoredLoyaltyCustomer,
  saveStoredLoyaltyCustomer,
} from '../data/loyaltyData';
import { LoyaltyCustomer, RewardOffer, LoyaltyTierLevel } from '../types';
import { WhatsAppIcon, SOCIAL_LINKS } from './SocialIcons';

interface BeautyRewardsSectionProps {
  onBookAppointment: () => void;
}

export const BeautyRewardsSection: React.FC<BeautyRewardsSectionProps> = ({
  onBookAppointment,
}) => {
  const [customer, setCustomer] = useState<LoyaltyCustomer>(() => getStoredLoyaltyCustomer());
  const [activeTab, setActiveTab] = useState<'rewards' | 'history' | 'redeemed' | 'calculator'>('rewards');
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [recentlyRedeemed, setRecentlyRedeemed] = useState<{
    title: string;
    code: string;
    points: number;
  } | null>(null);
  const [calcBillAmount, setCalcBillAmount] = useState<number>(4500);

  useEffect(() => {
    saveStoredLoyaltyCustomer(customer);
  }, [customer]);

  const currentTierConfig = LOYALTY_TIERS[customer.tier];

  // Calculate tier progress
  const getProgressStats = () => {
    if (customer.tier === 'silver') {
      const current = customer.totalPoints;
      const target = 500;
      const percent = Math.min(100, Math.round((current / target) * 100));
      const remaining = Math.max(0, target - current);
      return {
        percent,
        nextTierName: 'Gold Radiance VIP',
        remaining,
        min: 0,
        max: 500,
      };
    } else if (customer.tier === 'gold') {
      const current = customer.totalPoints - 500;
      const target = 1000; // 1500 - 500
      const percent = Math.min(100, Math.max(0, Math.round((current / target) * 100)));
      const remaining = Math.max(0, 1500 - customer.totalPoints);
      return {
        percent,
        nextTierName: 'Platinum Royal Crown',
        remaining,
        min: 500,
        max: 1500,
      };
    } else {
      return {
        percent: 100,
        nextTierName: 'Top Platinum Tier Achieved!',
        remaining: 0,
        min: 1500,
        max: 1500,
      };
    }
  };

  const progressStats = getProgressStats();

  const handleSelectCustomer = (demoCust: LoyaltyCustomer) => {
    setCustomer(demoCust);
    setPhoneNumberInput('');
    setRecentlyRedeemed(null);
  };

  const handlePhoneLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumberInput.replace(/\D/g, '');
    const found = DEMO_CUSTOMERS.find((c) => c.phone.includes(cleanPhone));
    if (found) {
      setCustomer(found);
    } else if (cleanPhone.length >= 10) {
      // Create fresh member session
      const newCust: LoyaltyCustomer = {
        phone: cleanPhone,
        name: 'New Beauty Guest',
        memberId: `BZ-NEW-${cleanPhone.slice(-4)}`,
        tier: 'silver',
        totalPoints: 100, // welcome bonus points
        lifetimePoints: 100,
        visitsCount: 1,
        joinedDate: 'September 2026',
        activities: [
          {
            id: `act-new-${Date.now()}`,
            date: 'Today',
            branch: 'Jaipur Online Registration',
            serviceTitle: 'Welcome Joining Bonus Points',
            billAmount: 0,
            pointsEarned: 100,
            type: 'bonus',
          },
        ],
        redeemedRewards: [],
      };
      setCustomer(newCust);
    }
  };

  const handleRedeemReward = (offer: RewardOffer) => {
    if (customer.totalPoints < offer.pointsCost) {
      alert(`You need ${offer.pointsCost - customer.totalPoints} more points to redeem this reward.`);
      return;
    }

    const uniqueVoucherCode = `BZ-${offer.category.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const validUntil = new Date(now.setDate(now.getDate() + 60)).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const newRedeemedItem = {
      id: `red-${Date.now()}`,
      rewardTitle: offer.title,
      voucherCode: uniqueVoucherCode,
      pointsCost: offer.pointsCost,
      dateRedeemed: 'Today',
      validTill: validUntil,
      status: 'active' as const,
      discountValue: offer.discountValue,
    };

    const updatedCustomer: LoyaltyCustomer = {
      ...customer,
      totalPoints: customer.totalPoints - offer.pointsCost,
      redeemedRewards: [newRedeemedItem, ...customer.redeemedRewards],
    };

    // Recalculate tier if needed
    if (updatedCustomer.totalPoints < 500 && updatedCustomer.tier === 'gold') {
      // Keep tier if lifetime earned, or update
    }

    setCustomer(updatedCustomer);
    setRecentlyRedeemed({
      title: offer.title,
      code: uniqueVoucherCode,
      points: offer.pointsCost,
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleResetDemo = () => {
    setCustomer(DEMO_CUSTOMERS[0]);
    setRecentlyRedeemed(null);
  };

  // Calculator estimate
  const estimatedPoints = Math.round((calcBillAmount / 10) * currentTierConfig.multiplier);

  return (
    <section id="rewards" className="py-16 md:py-24 bg-[#FAF5E5] relative overflow-hidden border-t border-[#0F172A]/10">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#D09A40]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header in Everyday Indian English */}
        <RevealOnScroll duration={0.6}>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F172A] text-[#FAF5E5] text-xs font-semibold uppercase tracking-wider mb-3 shadow-xs">
              <Crown className="w-4 h-4 text-[#D09A40]" />
              <span>Beauty Zone Jaipur Loyalty Club</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0F172A]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Beauty Rewards & Points Tracker
            </h2>
            <p className="mt-3 text-base sm:text-lg text-[#4A4A4A] leading-relaxed">
              Earn points on every salon visit & home makeover in Jaipur. View your accumulated points, 
              track your membership progress, and redeem instant vouchers for free hair spas, facials, and discounts.
            </p>
          </div>
        </RevealOnScroll>

        {/* Profile Switcher & Lookup Bar */}
        <RevealOnScroll delay={0.1} duration={0.5}>
          <div className="p-4 sm:p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#0F172A]/10 shadow-sm mb-8 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
              <span className="text-xs font-semibold text-[#4A4A4A] whitespace-nowrap uppercase tracking-wider">
                Select Customer Profile:
              </span>
              {DEMO_CUSTOMERS.map((demo) => (
                <button
                  key={demo.phone}
                  onClick={() => handleSelectCustomer(demo)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    customer.phone === demo.phone
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-[#0F172A]'
                  }`}
                >
                  <span>{demo.name}</span>
                  <span className="text-[11px] text-[#D09A40] font-mono">({demo.totalPoints} pts)</span>
                </button>
              ))}
            </div>

            {/* Mobile Lookup Form */}
            <form onSubmit={handlePhoneLookup} className="flex items-center gap-2 w-full lg:w-auto">
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number..."
                value={phoneNumberInput}
                onChange={(e) => setPhoneNumberInput(e.target.value)}
                className="px-3.5 py-2 rounded-xl text-xs bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-[#D09A40] text-[#0F172A] w-full sm:w-56"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] text-xs font-bold whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
              >
                Check Points
              </button>
            </form>
          </div>
        </RevealOnScroll>

        {/* Main Loyalty Grid: Digital Pass & Tier Progress Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          
          {/* Left Column: Digital VIP Pass Card */}
          <div className="lg:col-span-5">
            <RevealOnScroll direction="right" duration={0.6}>
              <div className="rounded-3xl p-7 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white shadow-2xl border border-[#D09A40]/30 relative overflow-hidden flex flex-col justify-between min-h-[340px]">
                {/* Background watermarks */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-[#D09A40]/15 rounded-full blur-2xl pointer-events-none" />
                <Crown className="absolute -bottom-8 -right-8 w-44 h-44 text-white/[0.03] pointer-events-none" />

                <div className="relative z-10">
                  {/* Top Row: Brand & Tier Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-serif text-lg font-bold tracking-tight text-white block">
                        Beauty Zone Jaipur
                      </span>
                      <span className="text-[11px] text-[#FAF5E5]/70 uppercase tracking-widest block">
                        VIP Member Pass
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${currentTierConfig.badgeBg}`}>
                      <Sparkles className="w-3.5 h-3.5 text-[#D09A40]" />
                      <span>{currentTierConfig.name}</span>
                    </span>
                  </div>

                  {/* Member Name & ID */}
                  <div className="mt-6">
                    <p className="text-xl font-bold font-serif text-white tracking-wide">
                      {customer.name}
                    </p>
                    <p className="text-xs font-mono text-[#D09A40] mt-0.5">
                      Member ID: {customer.memberId}
                    </p>
                  </div>
                </div>

                {/* Points Counter & Cash Value */}
                <div className="relative z-10 my-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] text-white/60 uppercase tracking-wider block">
                      Available Points
                    </span>
                    <p className="text-3xl sm:text-4xl font-bold text-[#D09A40] tabular-nums tracking-tight font-serif mt-1">
                      {customer.totalPoints.toLocaleString()}
                    </p>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      = ₹{customer.totalPoints} Salon Cash
                    </span>
                  </div>

                  <div className="border-l border-white/10 pl-4">
                    <span className="text-[11px] text-white/60 uppercase tracking-wider block">
                      Lifetime Earned
                    </span>
                    <p className="text-xl font-bold text-white tabular-nums mt-1 font-serif">
                      {customer.lifetimePoints.toLocaleString()} pts
                    </p>
                    <span className="text-[11px] text-white/60">
                      {customer.visitsCount} Salon Visits
                    </span>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                  <span>Joined {customer.joinedDate}</span>
                  <span className="text-[#D09A40] font-medium">Valid at all 3 Jaipur Salons</span>
                </div>
              </div>
            </RevealOnScroll>
          </div>

          {/* Right Column: Simple Progress Tracker & Tier Benefits */}
          <div className="lg:col-span-7">
            <RevealOnScroll direction="left" duration={0.6}>
              <div className="rounded-3xl p-6 sm:p-7 bg-white/90 backdrop-blur-md border border-[#0F172A]/10 shadow-lg h-full flex flex-col justify-between">
                <div>
                  {/* Progress Tracker Title */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#D09A40]" />
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-[#0F172A]">
                        Your Tier Level Progress
                      </h3>
                    </div>

                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {progressStats.percent}% to Next Tier
                    </span>
                  </div>

                  {/* 3-Tier Milestone Steps */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className={`p-2 rounded-xl transition-all ${customer.tier === 'silver' ? 'bg-neutral-100 ring-2 ring-neutral-400' : 'opacity-70'}`}>
                      <span className="text-[11px] font-bold text-slate-700 block">Silver Club</span>
                      <span className="text-[10px] text-slate-500 font-mono">0 - 499 pts</span>
                    </div>

                    <div className={`p-2 rounded-xl transition-all ${customer.tier === 'gold' ? 'bg-[#D09A40]/15 ring-2 ring-[#D09A40]' : 'opacity-70'}`}>
                      <span className="text-[11px] font-bold text-[#D09A40] block">★ Gold VIP</span>
                      <span className="text-[10px] text-slate-500 font-mono">500 - 1,499 pts</span>
                    </div>

                    <div className={`p-2 rounded-xl transition-all ${customer.tier === 'platinum' ? 'bg-amber-100 ring-2 ring-amber-500' : 'opacity-70'}`}>
                      <span className="text-[11px] font-bold text-amber-900 block">👑 Platinum</span>
                      <span className="text-[10px] text-slate-500 font-mono">1,500+ pts</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-neutral-200 h-3.5 rounded-full overflow-hidden p-0.5 border border-neutral-300 relative my-3">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#D09A40] via-amber-400 to-[#DCA54A] transition-all duration-700 shadow-sm relative"
                      style={{ width: `${progressStats.percent}%` }}
                    >
                      <div className="absolute inset-0 bg-white/25 animate-pulse rounded-full" />
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="p-3 rounded-xl bg-[#FAF5E5] border border-[#D09A40]/30 text-xs text-[#0F172A] flex items-center justify-between gap-3 mt-2">
                    {progressStats.remaining > 0 ? (
                      <p>
                        ✨ Earn only <strong className="text-[#D09A40] font-bold font-mono">{progressStats.remaining} more points</strong> to unlock <strong>{progressStats.nextTierName}</strong> perks!
                      </p>
                    ) : (
                      <p className="text-emerald-800 font-medium">
                        👑 You have reached our highest Platinum Royalty tier with maximum 1.5x points multiplier!
                      </p>
                    )}
                  </div>

                  {/* Active Perks for Current Tier */}
                  <div className="mt-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-2.5">
                      Your Active {currentTierConfig.name} Privileges:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentTierConfig.perks.map((perk, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-[#4A4A4A] bg-white p-2.5 rounded-xl border border-neutral-100 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick CTA Actions */}
                <div className="mt-6 pt-4 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={onBookAppointment}
                    className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#D09A40] text-white text-xs font-semibold luxe-btn flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span>Book Appointment with Points</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={`${SOCIAL_LINKS.whatsapp.url}&text=Hi%20Beauty%20Zone%20Jaipur%2C%20I%20would%20like%20to%20know%20more%20about%20redeeming%20my%20loyalty%20points.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Inquiry</span>
                  </a>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>

        {/* Recently Redeemed Notification Banner */}
        {recentlyRedeemed && (
          <RevealOnScroll duration={0.4}>
            <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-[#0F172A] to-emerald-950 text-white border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-300">
                    Reward Successfully Redeemed!
                  </h4>
                  <p className="text-xs text-white/80 mt-0.5">
                    <strong>{recentlyRedeemed.title}</strong> has been unlocked. Show this coupon code at any of our 3 Jaipur salons.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-black/40 px-3.5 py-2 rounded-xl border border-white/20">
                <span className="font-mono text-xs text-[#FAF5E5] font-bold">
                  {recentlyRedeemed.code}
                </span>
                <button
                  onClick={() => handleCopyCode(recentlyRedeemed.code)}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Copy coupon code"
                >
                  {copiedCode === recentlyRedeemed.code ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/80" />
                  )}
                </button>
              </div>
            </div>
          </RevealOnScroll>
        )}

        {/* Interactive Tabs Navigation */}
        <div className="flex items-center justify-center gap-2 mb-8 border-b border-[#0F172A]/10 pb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'rewards'
                ? 'bg-[#0F172A] text-white shadow-md'
                : 'bg-white/80 hover:bg-white text-[#4A4A4A]'
            }`}
          >
            <Gift className="w-4 h-4 text-[#D09A40]" />
            <span>Redeem Rewards ({REWARD_OFFERS.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-[#0F172A] text-white shadow-md'
                : 'bg-white/80 hover:bg-white text-[#4A4A4A]'
            }`}
          >
            <History className="w-4 h-4 text-[#D09A40]" />
            <span>Points from Visits ({customer.activities.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('redeemed')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'redeemed'
                ? 'bg-[#0F172A] text-white shadow-md'
                : 'bg-white/80 hover:bg-white text-[#4A4A4A]'
            }`}
          >
            <Tag className="w-4 h-4 text-[#D09A40]" />
            <span>My Claimed Vouchers ({customer.redeemedRewards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'calculator'
                ? 'bg-[#0F172A] text-white shadow-md'
                : 'bg-white/80 hover:bg-white text-[#4A4A4A]'
            }`}
          >
            <Calculator className="w-4 h-4 text-[#D09A40]" />
            <span>Points Calculator</span>
          </button>
        </div>

        {/* Tab 1: Available Rewards to Redeem */}
        {activeTab === 'rewards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {REWARD_OFFERS.map((offer, idx) => {
              const canAfford = customer.totalPoints >= offer.pointsCost;
              return (
                <RevealOnScroll key={offer.id} delay={idx * 0.08} duration={0.5}>
                  <div className="h-full rounded-2xl bg-white p-6 border border-neutral-200 hover:border-[#D09A40] transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between group">
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#FAF5E5] text-[#D09A40] flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Gift className="w-5 h-5" />
                        </div>

                        {offer.badge && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                            {offer.badge}
                          </span>
                        )}
                      </div>

                      <h4 className="font-serif font-bold text-base text-[#0F172A] group-hover:text-[#D09A40] transition-colors">
                        {offer.title}
                      </h4>
                      <p className="text-xs font-bold text-emerald-700 mt-0.5">
                        {offer.discountValue}
                      </p>
                      <p className="text-xs text-[#4A4A4A] mt-2 leading-relaxed">
                        {offer.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-[#4A4A4A] block">Points Cost</span>
                        <span className="text-base font-bold font-serif text-[#0F172A] tabular-nums">
                          {offer.pointsCost} pts
                        </span>
                      </div>

                      <button
                        onClick={() => handleRedeemReward(offer)}
                        disabled={!canAfford}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          canAfford
                            ? 'bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] shadow-xs'
                            : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                        }`}
                      >
                        <span>{canAfford ? 'Redeem Voucher' : `Need ${offer.pointsCost - customer.totalPoints} pts`}</span>
                      </button>
                    </div>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        )}

        {/* Tab 2: Points Earned from Visits (History) */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-100">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#0F172A]">
                  Points Earned From Salon Visits
                </h3>
                <p className="text-xs text-[#4A4A4A] mt-0.5">
                  Verified activity and points credited at Beauty Zone Jaipur salons.
                </p>
              </div>

              <span className="text-xs font-bold text-[#0F172A] bg-neutral-100 px-3 py-1 rounded-full">
                Total Visits: {customer.visitsCount}
              </span>
            </div>

            <div className="space-y-4">
              {customer.activities.map((act) => (
                <div
                  key={act.id}
                  className="p-4 rounded-2xl bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF5E5] text-[#D09A40] flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0F172A]">
                          {act.serviceTitle}
                        </h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {act.type === 'bonus' ? 'Bonus' : act.type === 'referral' ? 'Referral' : 'Salon Visit'}
                        </span>
                      </div>
                      <p className="text-xs text-[#4A4A4A] mt-0.5 flex items-center gap-2">
                        <span>{act.date}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#D09A40]" />
                          <span>{act.branch}</span>
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right sm:shrink-0 w-full sm:w-auto flex sm:flex-col justify-between sm:justify-end items-center sm:items-end">
                    <span className="text-base font-bold text-emerald-700 font-mono">
                      +{act.pointsEarned} pts
                    </span>
                    {act.billAmount > 0 && (
                      <span className="text-[11px] text-[#4A4A4A]">
                        Bill: ₹{act.billAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Redeemed Rewards History */}
        {activeTab === 'redeemed' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-100">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#0F172A]">
                  My Claimed Reward Vouchers
                </h3>
                <p className="text-xs text-[#4A4A4A] mt-0.5">
                  Show these codes during payment at any of our Jaipur salon branches.
                </p>
              </div>
            </div>

            {customer.redeemedRewards.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-[#0F172A]">No reward vouchers redeemed yet</p>
                <p className="text-xs text-[#4A4A4A] mt-1 max-w-sm mx-auto">
                  Select from available rewards above to convert your points into instant salon discounts!
                </p>
                <button
                  onClick={() => setActiveTab('rewards')}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold"
                >
                  View Available Rewards
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.redeemedRewards.map((red) => (
                  <div
                    key={red.id}
                    className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          {red.discountValue}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${red.status === 'active' ? 'bg-amber-100 text-amber-900' : 'bg-neutral-200 text-neutral-600'}`}>
                          {red.status === 'active' ? 'Active - Ready to Use' : 'Used in Salon'}
                        </span>
                      </div>

                      <h4 className="font-serif font-bold text-sm text-[#0F172A]">
                        {red.rewardTitle}
                      </h4>
                      <p className="text-[11px] text-[#4A4A4A] mt-0.5">
                        Redeemed on {red.dateRedeemed} • Valid till {red.validTill}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between gap-3">
                      <div className="bg-white px-3 py-1.5 rounded-xl border border-neutral-300 font-mono text-xs font-bold text-[#0F172A]">
                        {red.voucherCode}
                      </div>

                      <button
                        onClick={() => handleCopyCode(red.voucherCode)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-xs font-medium text-[#0F172A] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCode === red.voucherCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Points Calculator */}
        {activeTab === 'calculator' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF5E5] text-[#D09A40] flex items-center justify-center mx-auto mb-2">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#0F172A]">
                Calculate Points on Your Next Visit
              </h3>
              <p className="text-xs text-[#4A4A4A] mt-1">
                See how many loyalty points you will earn based on your expected salon service spend.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-[#0F172A] mb-2">
                  <span>Estimated Bill Amount:</span>
                  <span className="text-base font-bold font-mono text-[#D09A40]">₹{calcBillAmount.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="35000"
                  step="500"
                  value={calcBillAmount}
                  onChange={(e) => setCalcBillAmount(Number(e.target.value))}
                  className="w-full accent-[#D09A40] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-neutral-400 font-mono mt-1">
                  <span>₹500</span>
                  <span>₹15,000</span>
                  <span>₹35,000 (Bridal)</span>
                </div>
              </div>

              {/* Calculation Output Card */}
              <div className="p-5 rounded-2xl bg-[#FAF5E5] border border-[#D09A40]/30 text-center">
                <span className="text-xs text-[#4A4A4A] uppercase tracking-wider block">
                  You Will Earn on This Visit
                </span>
                <p className="text-3xl sm:text-4xl font-bold text-[#0F172A] font-serif tabular-nums mt-1">
                  +{estimatedPoints} Beauty Points
                </p>
                <p className="text-xs text-emerald-800 font-medium mt-1">
                  Includes {currentTierConfig.multiplier}x {currentTierConfig.name} Tier Multiplier!
                </p>
              </div>

              <div className="text-center">
                <button
                  onClick={onBookAppointment}
                  className="px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-[#D09A40] text-white text-xs font-semibold luxe-btn inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Book Appointment Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
