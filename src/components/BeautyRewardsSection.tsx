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
  TrendingUp,
  MapPin,
  Calendar,
  Phone,
} from 'lucide-react';
import { LOYALTY_TIERS } from '../data/loyaltyData';
import { LoyaltyCustomer, RewardOffer } from '../types';
import { WhatsAppIcon } from './SocialIcons';
import { useBrand } from '../context/BrandContext';
import { supabase } from '../lib/supabase';

interface BeautyRewardsSectionProps {
  onBookWithReward?: (voucherCode: string) => void;
  onBookAppointment?: () => void;
}

export const BeautyRewardsSection: React.FC<BeautyRewardsSectionProps> = ({
  onBookWithReward,
  onBookAppointment,
}) => {
  const { brand, formatPrice, t } = useBrand();
  const [customer, setCustomer] = useState<LoyaltyCustomer | null>(null);
  const [offers, setOffers] = useState<RewardOffer[]>([]);
  const [activeTab, setActiveTab] = useState<'rewards' | 'history' | 'redeemed' | 'calculator'>('rewards');
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [memberName, setMemberName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [customerBusy, setCustomerBusy] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [redeemingOfferId, setRedeemingOfferId] = useState<string | null>(null);
  const [pendingRedemptionIds, setPendingRedemptionIds] = useState<Record<string, string>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [recentlyRedeemed, setRecentlyRedeemed] = useState<{
    title: string;
    code: string;
    points: number;
  } | null>(null);
  const [calcBillAmount, setCalcBillAmount] = useState<number>(4500);

  const loadCustomerDashboard = async (name = '') => {
    await supabase.db.rpc('ensure_customer_loyalty_account', { p_name: name });
    const dashboard = await supabase.db.rpc<any>('get_customer_loyalty_dashboard', {});
    const account = dashboard?.account;
    if (!account) throw new Error('Your rewards account could not be loaded.');

    const mappedCustomer: LoyaltyCustomer = {
      phone: String(account.phone || ''),
      name: String(account.name || 'BeautyZone Guest'),
      memberId: String(account.memberId || ''),
      tier: account.tier || 'silver',
      totalPoints: Number(account.totalPoints || 0),
      lifetimePoints: Number(account.lifetimePoints || 0),
      visitsCount: Number(account.visitsCount || 0),
      joinedDate: account.joinedDate
        ? new Date(account.joinedDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        : 'Recently',
      activities: (dashboard.activities || []).map((activity: any) => ({
        id: String(activity.id),
        date: activity.date ? new Date(activity.date).toLocaleDateString('en-IN') : 'Recently',
        branch: brand.cityName + ' Studio',
        serviceTitle: String(activity.serviceTitle || 'Salon activity'),
        billAmount: Number(activity.billAmount || 0),
        pointsEarned: Number(activity.pointsEarned || 0),
        type: activity.type === 'bonus' ? 'bonus' : activity.type === 'redeem' ? 'redeem' : 'visit',
      })),
      redeemedRewards: (dashboard.vouchers || []).map((voucher: any) => ({
        id: String(voucher.voucherCode),
        rewardTitle: String(voucher.rewardTitle || 'BeautyZone Reward'),
        voucherCode: String(voucher.voucherCode),
        pointsCost: Number(voucher.pointsCost || 0),
        dateRedeemed: voucher.dateRedeemed ? new Date(voucher.dateRedeemed).toLocaleDateString('en-IN') : 'Recently',
        validTill: voucher.validTill ? new Date(voucher.validTill).toLocaleDateString('en-IN') : '—',
        status: voucher.status === 'used' ? 'used' : voucher.status === 'expired' ? 'expired' : 'active',
        discountValue: String(voucher.discountValue || (Number(voucher.discountAmount || 0) ? '₹' + voucher.discountAmount + ' Off' : 'Reward')),
      })),
    };

    const liveOffers: RewardOffer[] = (dashboard.offers || []).map((offer: any) => ({
      id: String(offer.id),
      title: String(offer.title),
      description: String(offer.description || ''),
      pointsCost: Number(offer.pointsCost),
      discountValue: String(offer.discountValue || ''),
      category: offer.category,
      badge: offer.badge || undefined,
    }));
    setCustomer(mappedCustomer);
    setOffers(liveOffers);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await supabase.auth.recoverSessionFromUrl();
        if (active && session?.user?.phone) {
          await loadCustomerDashboard();
        }
      } catch (error) {
        if (active) {
          console.warn('[loyalty] Customer session restore failed', error);
          setAuthError(error instanceof Error ? error.message : 'Could not restore your rewards session.');
        }
      } finally {
        if (active) setCustomerBusy(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setAuthNotice('');
    const digits = phoneNumberInput.replace(/\D/g, '');
    if (digits.length !== 10) {
      setAuthError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setAuthBusy(true);
    try {
      await supabase.auth.signInWithOtp('+91' + digits);
      setPhoneNumberInput(digits);
      setOtpRequested(true);
      setAuthNotice('OTP sent. Check your SMS and enter the 6-digit code.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not send OTP. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    const digits = phoneNumberInput.replace(/\D/g, '');
    const code = otp.replace(/\D/g, '');
    if (digits.length !== 10 || code.length !== 6) {
      setAuthError('Enter your 10-digit mobile number and 6-digit OTP.');
      return;
    }
    setAuthBusy(true);
    try {
      await supabase.auth.verifyPhoneOtp('+91' + digits, code);
      await loadCustomerDashboard(memberName.trim());
      setAuthNotice('');
      setOtpRequested(false);
      setOtp('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'OTP verification failed. Please check the code.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCustomerSignOut = async () => {
    setAuthBusy(true);
    try {
      await supabase.auth.signOut('local');
      setCustomer(null);
      setRecentlyRedeemed(null);
      setActionError(null);
      setOtpRequested(false);
      setOtp('');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRedeemReward = async (offer: RewardOffer) => {
    if (!customer || redeemingOfferId) return;
    if (customer.totalPoints < offer.pointsCost) {
      setActionError('You need ' + (offer.pointsCost - customer.totalPoints) + ' more points to redeem this reward.');
      return;
    }

    setActionError(null);
    setRedeemingOfferId(offer.id);
    try {
      const storageKey = `beautyzone.loyalty.pending-redemption:${customer.memberId}:${offer.id}`;
      let requestId = pendingRedemptionIds[offer.id] || '';
      if (!requestId) {
        try { requestId = window.localStorage.getItem(storageKey) || ''; } catch { /* storage can be disabled */ }
      }
      if (!requestId) {
        requestId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
              const random = Math.random() * 16 | 0;
              return (char === 'x' ? random : (random & 0x3 | 0x8)).toString(16);
            });
      }
      setPendingRedemptionIds((current) => ({ ...current, [offer.id]: requestId }));
      try { window.localStorage.setItem(storageKey, requestId); } catch { /* state still protects in-page retries */ }
      const result = await supabase.db.rpc<any>('redeem_customer_loyalty_reward', {
        p_offer_id: offer.id,
        p_request_id: requestId,
      });
      if (!result?.success || !result?.voucherCode) {
        throw new Error('The reward could not be redeemed. No points have been deducted.');
      }
      await loadCustomerDashboard();
      try { window.localStorage.removeItem(storageKey); } catch { /* no-op */ }
      setPendingRedemptionIds((current) => {
        const updated = { ...current };
        delete updated[offer.id];
        return updated;
      });
      setRecentlyRedeemed({
        title: offer.title,
        code: String(result.voucherCode),
        points: offer.pointsCost,
      });
      setActiveTab('redeemed');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Reward redemption failed. Please retry.');
    } finally {
      setRedeemingOfferId(null);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 3000);
    } catch {
      setActionError('Could not copy the voucher. Please select and copy it manually.');
    }
  };

  const handleTriggerBooking = (voucherCode?: string) => {
    if (voucherCode && onBookWithReward) {
      onBookWithReward(voucherCode);
    } else if (onBookWithReward) {
      onBookWithReward('');
    } else if (onBookAppointment) {
      onBookAppointment();
    }
  };

  if (!customer) {
    return (
      <section id="rewards" className="py-16 md:py-24 bg-[#FAF5E5] relative overflow-hidden border-t border-[#0F172A]/10 w-full max-w-full">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#D09A40]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F172A] text-[#FAF5E5] text-xs font-semibold uppercase tracking-wider mb-3">
              <Crown className="w-4 h-4 text-[#D09A40]" />
              <span>{brand.loyaltyClubName}</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A]">{t('rewardsTitle')}</h2>
            <p className="mt-3 text-sm sm:text-base text-[#4A4A4A]">Sign in with your mobile number to securely view your points and vouchers.</p>
          </div>
          <div className="rounded-3xl bg-white border border-[#D09A40]/30 shadow-xl p-6 sm:p-8">
            {customerBusy ? (
              <div className="py-8 text-center text-sm text-neutral-600">Checking your rewards session…</div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-[#FAF5E5] text-[#D09A40] flex items-center justify-center"><Phone className="w-5 h-5" /></div>
                  <div><h3 className="font-serif text-xl font-bold text-[#0F172A]">Customer OTP Login</h3><p className="text-xs text-neutral-500">Your points are linked to your verified mobile number.</p></div>
                </div>
                {!otpRequested ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <label className="block text-xs font-semibold text-[#0F172A]">Your name <span className="font-normal text-neutral-400">(optional for existing members)</span>
                      <input value={memberName} onChange={(event) => setMemberName(event.target.value)} maxLength={120} autoComplete="name" placeholder="Enter your name" className="mt-1.5 w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40]" />
                    </label>
                    <label className="block text-xs font-semibold text-[#0F172A]">Mobile number
                      <div className="mt-1.5 flex rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden focus-within:border-[#D09A40]">
                        <span className="px-3 py-3 text-sm font-semibold text-neutral-600 border-r border-neutral-200">+91</span>
                        <input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phoneNumberInput} onChange={(event) => setPhoneNumberInput(event.target.value.replace(/\D/g, '').slice(0,10))} placeholder="10-digit mobile number" className="min-w-0 flex-1 px-3 py-3 bg-transparent text-sm text-[#0F172A] outline-none" required />
                      </div>
                    </label>
                    <button type="submit" disabled={authBusy} className="w-full rounded-xl bg-[#D09A40] hover:bg-[#DCA54A] disabled:opacity-60 text-[#0F172A] font-bold text-sm py-3 transition-colors">{authBusy ? 'Sending OTP…' : 'Send OTP'}</button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <p className="text-sm text-neutral-600">Enter the code sent to <strong>+91 {phoneNumberInput}</strong>.</p>
                    <label className="block text-xs font-semibold text-[#0F172A]">6-digit OTP
                      <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0,6))} placeholder="Enter OTP" className="mt-1.5 w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-center text-lg tracking-[0.35em] text-[#0F172A] focus:outline-none focus:border-[#D09A40]" required />
                    </label>
                    <button type="submit" disabled={authBusy} className="w-full rounded-xl bg-[#D09A40] hover:bg-[#DCA54A] disabled:opacity-60 text-[#0F172A] font-bold text-sm py-3 transition-colors">{authBusy ? 'Verifying…' : 'Verify & Open Rewards'}</button>
                    <button type="button" disabled={authBusy} onClick={() => { setOtpRequested(false); setOtp(''); setAuthError(null); }} className="w-full text-xs font-semibold text-neutral-600 hover:text-[#0F172A]">Change mobile number</button>
                  </form>
                )}
                {authNotice && <p role="status" className="mt-4 text-sm text-emerald-700">{authNotice}</p>}
                {authError && <p role="alert" className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{authError}</p>}
                <p className="mt-5 text-[11px] leading-relaxed text-neutral-500">We never look up points by an unverified number. OTP verification protects your membership and reward balance.</p>
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  const currentTierConfig = LOYALTY_TIERS[customer.tier];

  const getProgressStats = () => {
    if (customer.tier === 'silver') {
      const current = customer.lifetimePoints;
      const target = 500;
      const percent = Math.min(100, Math.round((current / target) * 100));
      const remaining = Math.max(0, target - current);
      return { percent, nextTierName: 'Gold Radiance VIP', remaining, min: 0, max: 500 };
    }
    if (customer.tier === 'gold') {
      const current = customer.lifetimePoints - 500;
      const percent = Math.min(100, Math.max(0, Math.round((current / 1000) * 100)));
      const remaining = Math.max(0, 1500 - customer.lifetimePoints);
      return { percent, nextTierName: 'Platinum Royal Crown', remaining, min: 500, max: 1500 };
    }
    return { percent: 100, nextTierName: 'Top Platinum Tier Achieved!', remaining: 0, min: 1500, max: 1500 };
  };

  const progressStats = getProgressStats();
  const billForCalculation = Math.max(0, calcBillAmount);
  const estimatedPoints = billForCalculation > 0
    ? Math.round(Math.max(100, Math.round(billForCalculation / 10)) * currentTierConfig.multiplier)
    : 0;


  return (
    <section
      id="rewards"
      className="py-16 md:py-24 bg-[#FAF5E5] relative overflow-hidden border-t border-[#0F172A]/10 w-full max-w-full"
    >
      {/* Decorative background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#D09A40]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F172A] text-[#FAF5E5] text-xs font-semibold uppercase tracking-wider mb-3 shadow-xs">
            <Crown className="w-4 h-4 text-[#D09A40]" />
            <span>{brand.loyaltyClubName}</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0F172A]">
            {t('rewardsTitle')}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#4A4A4A] leading-relaxed">
            {brand.loyaltyTagline ||
              t('rewardsSubtitle')}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#0F172A]/10 shadow-sm mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Verified Rewards Member</p>
            <p className="text-sm font-bold text-[#0F172A] mt-1">{customer.name} <span className="font-mono font-normal text-neutral-500">· {customer.phone}</span></p>
            <p className="text-[11px] text-[#D09A40] font-semibold mt-1">Member ID: {customer.memberId}</p>
          </div>
          <button type="button" onClick={handleCustomerSignOut} disabled={authBusy} className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:border-[#D09A40] hover:text-[#0F172A] disabled:opacity-60">Sign out</button>
        </div>
        {actionError && <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>}

        {/* Main Loyalty Grid: Digital Pass & Tier Progress Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Left Column: Digital VIP Pass Card */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl p-7 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white shadow-2xl border border-[#D09A40]/30 relative overflow-hidden flex flex-col justify-between min-h-[340px]">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-[#D09A40]/15 rounded-full blur-2xl pointer-events-none" />
              <Crown className="absolute -bottom-8 -right-8 w-44 h-44 text-white/[0.03] pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-serif text-lg font-bold tracking-tight text-white block">
                      {brand.brandName} ({brand.cityName})
                    </span>
                    <span className="text-[11px] text-[#FAF5E5]/70 uppercase tracking-widest block">
                      {brand.loyaltyClubName}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${currentTierConfig.badgeBg}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D09A40]" />
                    <span>{currentTierConfig.name}</span>
                  </span>
                </div>

                <div className="mt-6">
                  <p className="text-xl font-bold font-serif text-white tracking-wide">
                    {customer.name}
                  </p>
                  <p className="text-xs font-mono text-[#D09A40] mt-0.5">
                    Member ID: {customer.memberId}
                  </p>
                </div>
              </div>

              <div className="relative z-10 my-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-white/60 uppercase tracking-wider block">
                    Available Points
                  </span>
                  <p className="text-3xl sm:text-4xl font-bold text-[#D09A40] tabular-nums tracking-tight font-serif mt-1">
                    {customer.totalPoints.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    = Reward points to use on eligible salon benefits
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

              <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                <span>Joined {customer.joinedDate}</span>
                <span className="text-[#D09A40] font-medium">
                  Valid at all {brand.branches.length} {brand.cityName} Studios
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Progress Tracker & Tier Benefits */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl p-6 sm:p-7 bg-white border border-[#0F172A]/10 shadow-lg h-full flex flex-col justify-between">
              <div>
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

                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div
                    className={`p-2 rounded-xl transition-all ${
                      customer.tier === 'silver'
                        ? 'bg-neutral-100 ring-2 ring-neutral-400'
                        : 'opacity-70'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-slate-700 block">Silver Club</span>
                    <span className="text-[10px] text-slate-500 font-mono">0 - 499 pts</span>
                  </div>

                  <div
                    className={`p-2 rounded-xl transition-all ${
                      customer.tier === 'gold'
                        ? 'bg-[#D09A40]/15 ring-2 ring-[#D09A40]'
                        : 'opacity-70'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-[#D09A40] block">★ Gold VIP</span>
                    <span className="text-[10px] text-slate-500 font-mono">500 - 1,499 pts</span>
                  </div>

                  <div
                    className={`p-2 rounded-xl transition-all ${
                      customer.tier === 'platinum'
                        ? 'bg-amber-100 ring-2 ring-amber-500'
                        : 'opacity-70'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-amber-900 block">👑 Platinum</span>
                    <span className="text-[10px] text-slate-500 font-mono">1,500+ pts</span>
                  </div>
                </div>

                <div className="w-full bg-neutral-200 h-3.5 rounded-full overflow-hidden p-0.5 border border-neutral-300 relative my-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#D09A40] via-amber-400 to-[#DCA54A] transition-all duration-700 shadow-sm relative"
                    style={{ width: `${progressStats.percent}%` }}
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#FAF5E5] border border-[#D09A40]/30 text-xs text-[#0F172A] flex items-center justify-between gap-3 mt-2">
                  {progressStats.remaining > 0 ? (
                    <p>
                      ✨ Earn only{' '}
                      <strong className="text-[#D09A40] font-bold font-mono">
                        {progressStats.remaining} more points
                      </strong>{' '}
                      to unlock <strong>{progressStats.nextTierName}</strong> perks!
                    </p>
                  ) : (
                    <p className="text-emerald-800 font-medium">
                      👑 You have reached our highest Platinum Royalty tier with maximum 1.5x points multiplier!
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-2.5">
                    Your Active {currentTierConfig.name} Privileges:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentTierConfig.perks.map((perk, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-[#4A4A4A] bg-white p-2.5 rounded-xl border border-neutral-100 shadow-2xs"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => handleTriggerBooking()}
                  className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#D09A40] text-white hover:text-[#0F172A] text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
                >
                  <span>Book Appointment with Points</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <a
                  href={`https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent(
                    `Hi ${brand.brandName} (${brand.cityName}), I would like to know more about redeeming my loyalty points.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp Inquiry</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Recently Redeemed Notification Banner */}
        {recentlyRedeemed && (
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
                  <strong>{recentlyRedeemed.title}</strong> has been unlocked. Show this coupon code at any of our {brand.cityName} salons.
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
              <button
                onClick={() => handleTriggerBooking(recentlyRedeemed.code)}
                className="ml-1 px-2.5 py-1 rounded-lg bg-[#D09A40] text-[#0F172A] text-[11px] font-bold cursor-pointer"
              >
                Apply Now
              </button>
            </div>
          </div>
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
            <span>Redeem Rewards ({offers.length})</span>
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

        {/* Tab 1: Available Rewards */}
        {activeTab === 'rewards' && (
          offers.length === 0 ? (
            <div className="rounded-2xl bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-600">
              No rewards are currently available. Please check again later.
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => {
              const canAfford = customer.totalPoints >= offer.pointsCost;
              return (
                <div
                  key={offer.id}
                  className="h-full rounded-2xl bg-white p-5 sm:p-6 border border-neutral-200 hover:border-[#D09A40] transition-all duration-300 shadow-2xs hover:shadow-md flex flex-col justify-between group"
                >
                  <div>
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
                      disabled={!canAfford || redeemingOfferId !== null}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        canAfford
                          ? 'bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] shadow-xs'
                          : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      <span>
                        {redeemingOfferId === offer.id
                          ? 'Processing…'
                          : canAfford
                          ? 'Redeem Voucher'
                          : `Need ${offer.pointsCost - customer.totalPoints} pts`}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )
        )}

        {/* Tab 2: Visit History */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-100">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#0F172A]">
                  Points Earned From Salon Visits
                </h3>
                <p className="text-xs text-[#4A4A4A] mt-0.5">
                  Verified activity and points credited at {brand.brandName} ({brand.cityName}).
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
                        <h4 className="font-bold text-sm text-[#0F172A]">{act.serviceTitle}</h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {act.type === 'redeem'
                            ? 'Reward redeemed'
                            : act.type === 'bonus'
                            ? 'Bonus'
                            : act.type === 'referral'
                            ? 'Referral'
                            : 'Salon Visit'}
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
                    <span className={`text-base font-bold font-mono ${act.pointsEarned < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {act.pointsEarned > 0 ? '+' : ''}{act.pointsEarned} pts
                    </span>
                    {act.billAmount > 0 && (
                      <span className="text-[11px] text-[#4A4A4A]">
                        Bill: {formatPrice(act.billAmount)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Redeemed Vouchers */}
        {activeTab === 'redeemed' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-100">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#0F172A]">
                  My Claimed Reward Vouchers
                </h3>
                <p className="text-xs text-[#4A4A4A] mt-0.5">
                  Show these codes during payment at any of our {brand.cityName} salon branches.
                </p>
              </div>
            </div>

            {customer.redeemedRewards.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-[#0F172A]">
                  No reward vouchers redeemed yet
                </p>
                <p className="text-xs text-[#4A4A4A] mt-1 max-w-sm mx-auto">
                  Select from available rewards above to convert your points into instant salon discounts!
                </p>
                <button
                  onClick={() => setActiveTab('rewards')}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold cursor-pointer"
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
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            red.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : red.status === 'expired'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {red.status === 'active' ? 'Active - Ready to Use' : red.status === 'expired' ? 'Expired' : 'Used in Salon'}
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

                      <div className="flex items-center gap-2">
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
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleTriggerBooking(red.voucherCode)}
                          disabled={red.status !== 'active'}
                          className="px-3 py-1.5 rounded-xl bg-[#D09A40] text-[#0F172A] text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Use Now
                        </button>
                      </div>
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
                  <span className="text-base font-bold font-mono text-[#D09A40]">
                    {formatPrice(calcBillAmount)}
                  </span>
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
                  <span>{formatPrice(500)}</span>
                  <span>{formatPrice(15000)}</span>
                  <span>{formatPrice(35000)} (Bridal)</span>
                </div>
              </div>

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
                  onClick={() => handleTriggerBooking()}
                  className="px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-[#D09A40] text-white hover:text-[#0F172A] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
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
