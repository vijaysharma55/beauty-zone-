import React, { useState, useEffect, useMemo } from 'react';
import { SALON_SERVICES } from '../data/salonData';
import { REWARD_OFFERS, getStoredLoyaltyCustomer } from '../data/loyaltyData';
import { BookingFormState, ServiceItem } from '../types';
import {
  Calendar,
  Clock,
  MapPin,
  Home,
  Building2,
  User,
  Phone,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  Navigation,
  ShieldCheck,
  QrCode,
  Check,
  Copy,
  CreditCard,
  X,
  UserCheck,
  Tag,
  Gift,
  Mic,
  MicOff,
} from 'lucide-react';
import { WhatsAppIcon } from './SocialIcons';
import { useBrand } from '../context/BrandContext';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface BookingSectionProps {
  services?: ServiceItem[];
  preselectedServiceId: string | null;
  preselectedServiceTitle?: string | null;
  preselectedLocationMode?: 'salon' | 'home' | null;
  preselectedBranch?: string | null;
  preselectedStylistName?: string | null;
  preselectedPromoCode?: string | null;
}

const TIME_SLOTS = [
  '10:00 AM',
  '11:30 AM',
  '01:00 PM',
  '02:30 PM',
  '04:00 PM',
  '05:30 PM',
  '07:00 PM',
];

export const BookingSection: React.FC<BookingSectionProps> = ({
  services = SALON_SERVICES,
  preselectedServiceId,
  preselectedServiceTitle,
  preselectedLocationMode,
  preselectedBranch,
  preselectedStylistName,
  preselectedPromoCode,
}) => {
  const { brand, formatPrice, convertPrice, t } = useBrand();
  const catalogServices = services.length > 0 ? services : SALON_SERVICES;

  const defaultBranchName =
    brand.branches[0]?.name || `${brand.cityName} Flagship Salon`;
  const defaultLocality =
    brand.localities[0] || {
      name: `${brand.cityName} Central`,
      distanceKm: 3,
      zone: 'Central Zone',
    };

  const [form, setForm] = useState<BookingFormState>({
    fullName: '',
    phone: '',
    locationType: 'salon',
    selectedBranch: defaultBranchName,
    homeAddress: '',
    locality: defaultLocality.name,
    distanceKm: defaultLocality.distanceKm,
    serviceCategory: 'bridal',
    selectedService: catalogServices[0]?.title || 'Signature Royal HD Bridal Makeover',
    preferredStylist: 'Any Senior Specialist',
    appointmentDate: '',
    timeSlot: '11:30 AM',
    bridalTrialRequired: false,
    specialNotes: '',
    advancePaymentVerified: false,
    advancePaymentRef: '',
    advancePaymentMethod: 'upi',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [bookingRefCode, setBookingRefCode] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Loyalty Voucher & Gift Card Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    title: string;
    discountAmount: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Voice AI State
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);

  // Keep branch & locality synced when white-label brand changes
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      selectedBranch:
        brand.branches.some((b) => b.name === prev.selectedBranch)
          ? prev.selectedBranch
          : brand.branches[0]?.name || prev.selectedBranch,
      locality:
        brand.localities.some((l) => l.name === prev.locality)
          ? prev.locality
          : brand.localities[0]?.name || prev.locality,
      distanceKm:
        brand.localities.find((l) => l.name === prev.locality)?.distanceKm ??
        brand.localities[0]?.distanceKm ??
        3,
    }));
  }, [brand.branches, brand.localities]);

  // Preselect service when triggered from ServicesSection
  useEffect(() => {
    if (preselectedServiceId) {
      const found = catalogServices.find((s) => s.id === preselectedServiceId);
      if (found) {
        setForm((prev) => ({
          ...prev,
          serviceCategory: found.category,
          selectedService: found.title,
        }));
      }
    }
  }, [preselectedServiceId, catalogServices]);

  useEffect(() => {
    if (preselectedServiceTitle) {
      setForm((prev) => ({
        ...prev,
        selectedService: preselectedServiceTitle,
      }));
    }
  }, [preselectedServiceTitle]);

  useEffect(() => {
    if (preselectedLocationMode) {
      setForm((prev) => ({
        ...prev,
        locationType: preselectedLocationMode,
      }));
    }
  }, [preselectedLocationMode]);

  useEffect(() => {
    if (preselectedBranch) {
      if (preselectedBranch === 'Home Service') {
        setForm((prev) => ({
          ...prev,
          locationType: 'home',
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          locationType: 'salon',
          selectedBranch: preselectedBranch,
        }));
      }
    }
  }, [preselectedBranch]);

  useEffect(() => {
    if (preselectedStylistName) {
      setForm((prev) => ({
        ...prev,
        preferredStylist: preselectedStylistName,
        locationType: 'salon',
      }));
    }
  }, [preselectedStylistName]);

  useEffect(() => {
    if (preselectedPromoCode) {
      setPromoCodeInput(preselectedPromoCode);
      validateAndApplyPromo(preselectedPromoCode);
    }
  }, [preselectedPromoCode]);

  const validateAndApplyPromo = (codeToTest: string) => {
    const clean = codeToTest.trim().toUpperCase();
    setPromoError(null);
    if (!clean) return;

    const storedCustomer = getStoredLoyaltyCustomer();
    const matchedRedeemed = storedCustomer.redeemedRewards.find(
      (r) => r.voucherCode.toUpperCase() === clean
    );

    if (matchedRedeemed) {
      let discountAmt = 500;
      if (matchedRedeemed.rewardTitle.includes('1,500')) discountAmt = 1500;
      else if (matchedRedeemed.rewardTitle.includes('Hair Spa')) discountAmt = 1800;
      else if (matchedRedeemed.rewardTitle.includes('Gold')) discountAmt = 2500;
      else if (matchedRedeemed.rewardTitle.includes('Nail')) discountAmt = 1499;
      else if (matchedRedeemed.rewardTitle.includes('Travel')) discountAmt = 600;

      setAppliedPromo({
        code: clean,
        title: matchedRedeemed.rewardTitle,
        discountAmount: discountAmt,
      });
      return;
    }

    if (clean.includes('1500') || clean.startsWith('ROYAL')) {
      setAppliedPromo({
        code: clean,
        title: 'Royal Bridal Booking Discount',
        discountAmount: 1500,
      });
    } else if (
      clean.startsWith(brand.bookingPrefix.toUpperCase()) ||
      clean.startsWith(brand.giftCardPrefix.toUpperCase()) ||
      clean.startsWith('BZ-') ||
      clean.startsWith('VIP-') ||
      clean.includes('500') ||
      clean.includes('GLOW') ||
      clean.includes('GIFT')
    ) {
      setAppliedPromo({
        code: clean,
        title: `${brand.brandName} Privilege Voucher`,
        discountAmount: 500,
      });
    } else {
      setPromoError(
        `Invalid voucher code. Try "${brand.bookingPrefix}-GLOW-500" or redeem a code from the ${brand.loyaltyClubName} section.`
      );
    }
  };

  // Voice AI "Speak to Book"
  const handleStartVoiceBooking = () => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Safari or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceFeedback(
          'Listening... Speak your service & date (e.g. "Book Bridal Makeup for tomorrow at 11:30 AM")'
        );
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscript(text);
        const lower = text.toLowerCase();

        let matchedService = catalogServices[0];
        for (const srv of catalogServices) {
          const words = srv.title.toLowerCase().split(' ');
          if (words.some((w) => w.length > 3 && lower.includes(w)) || lower.includes(srv.category)) {
            matchedService = srv;
            break;
          }
        }

        const now = new Date();
        let dateStr = form.appointmentDate || new Date(now.getTime() + 86400000).toISOString().split('T')[0];
        if (lower.includes('tomorrow')) {
          dateStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
        } else if (lower.includes('today')) {
          dateStr = now.toISOString().split('T')[0];
        }

        setForm((prev) => ({
          ...prev,
          serviceCategory: matchedService.category,
          selectedService: matchedService.title,
          appointmentDate: dateStr,
        }));
        setVoiceFeedback(`Matched "${matchedService.title}" on ${dateStr}!`);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setVoiceFeedback('Could not hear clearly. Please try again or select below.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Price & Distance Calculations
  const selectedServiceObj = useMemo(() => {
    return (
      catalogServices.find((s) => s.title === form.selectedService) ||
      catalogServices[0]
    );
  }, [form.selectedService, catalogServices]);

  const treatmentPrice = selectedServiceObj ? selectedServiceObj.price : 4999;

  const calculateDistanceFee = (km: number): number => {
    const base = brand.homeServiceBaseFee || 250;
    const perKm = brand.homeServicePerKmRate || 30;
    if (km <= 4) return base;
    return base + (km - 4) * perKm;
  };

  const distanceFee = useMemo(() => {
    return form.locationType === 'home' ? calculateDistanceFee(form.distanceKm) : 0;
  }, [form.locationType, form.distanceKm, brand.homeServiceBaseFee, brand.homeServicePerKmRate]);

  const advanceRequired = useMemo(() => {
    if (form.locationType !== 'home') return 0;
    const pct = (brand.advancePercentage || 20) / 100;
    return Math.max(500, Math.round((treatmentPrice * pct) / 50) * 50);
  }, [form.locationType, treatmentPrice, brand.advancePercentage]);

  const promoDiscount = appliedPromo ? appliedPromo.discountAmount : 0;
  const totalEstimatedAmount = Math.max(0, treatmentPrice + distanceFee - promoDiscount);
  const balanceAtDoorstep = Math.max(
    0,
    totalEstimatedAmount - (form.advancePaymentVerified ? advanceRequired : 0)
  );

  const handleLocalityChange = (locName: string) => {
    const found = brand.localities.find((l) => l.name === locName);
    setForm((prev) => ({
      ...prev,
      locality: locName,
      distanceKm: found ? found.distanceKm : prev.distanceKm,
    }));
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(brand.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleVerifyAdvancePayment = () => {
    const ref = `ADV-${Math.floor(100000 + Math.random() * 900000)}`;
    setForm((prev) => ({
      ...prev,
      advancePaymentVerified: true,
      advancePaymentRef: ref,
    }));
    setIsPaymentModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim() || !form.appointmentDate) return;

    if (form.locationType === 'home') {
      if (!form.homeAddress.trim()) {
        alert(`Please enter your complete doorstep address in ${brand.cityName}.`);
        return;
      }
      if (!form.advancePaymentVerified) {
        setIsPaymentModalOpen(true);
        return;
      }
    }

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const prefix = brand.bookingPrefix || 'BK';
    const ref =
      form.locationType === 'home'
        ? `${prefix}-HOME-${randomDigits}`
        : `${prefix}-SALON-${randomDigits}`;
    setBookingRefCode(ref);
    setIsSubmitted(true);
  };

  const buildWhatsAppBookingUrl = () => {
    const locationDetails =
      form.locationType === 'salon'
        ? `Salon Branch: ${form.selectedBranch}`
        : `Doorstep Home Service (${form.locality}, ~${form.distanceKm} km): ${form.homeAddress} | Travel Fee: ${formatPrice(distanceFee)} | Advance Paid: ${formatPrice(advanceRequired)} (Ref: ${form.advancePaymentRef})`;

    const promoLine = appliedPromo
      ? `\n*Loyalty Voucher:* ${appliedPromo.code} (-${formatPrice(appliedPromo.discountAmount)})`
      : '';

    const message =
      `Hello *${brand.brandName} (${brand.cityName})*,\n` +
      `I would like to confirm my appointment:\n\n` +
      `*Booking Ref:* ${bookingRefCode}\n` +
      `*Name:* ${form.fullName}\n` +
      `*Phone:* ${form.phone}\n` +
      `*Service:* ${form.selectedService} (${formatPrice(treatmentPrice)})\n` +
      `*Preferred Specialist:* ${form.preferredStylist}\n` +
      `*Date & Time:* ${form.appointmentDate} at ${form.timeSlot}\n` +
      `*Location:* ${locationDetails}` +
      promoLine +
      `\n*Total Estimated:* ${formatPrice(totalEstimatedAmount)}\n` +
      (form.specialNotes ? `*Notes:* ${form.specialNotes}` : '');

    return `https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const branchSummary =
    brand.branches.length > 0
      ? brand.branches
          .slice(0, 3)
          .map((b) => b.locality.split('/')[0].trim())
          .join(', ')
      : brand.cityName;

  return (
    <section
      id="booking"
      className="py-20 lg:py-28 bg-[#0F172A] text-[#FAF5E5] relative overflow-hidden"
    >
      {/* Decorative Ambient Glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full bg-[#D09A40]/10 blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D09A40]/15 text-[#D09A40] text-xs font-semibold uppercase tracking-widest border border-[#D09A40]/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('bookingOverline')}</span>
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#FAF5E5] tracking-tight">
            {t('bookingTitle')}
          </h2>
          <p className="text-sm sm:text-base text-[#FAF5E5]/75">
            {t('bookingSubtitle')}
          </p>
        </div>

        {/* Booking Card Container */}
        <div className="bg-white text-[#0F172A] rounded-3xl shadow-2xl border border-[#D09A40]/30 overflow-hidden">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-7">
              {/* Speak to Book Voice AI Bar */}
              <div className="p-4 rounded-2xl bg-[#FAF5E5] border border-[#D09A40]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      isListening ? 'bg-rose-600 animate-pulse' : 'bg-[#0F172A]'
                    } text-[#D09A40] shrink-0`}
                  >
                    {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-[#0F172A]">
                        Speak to Book (Voice AI Assistant)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D09A40] text-[#0F172A]">
                        Voice Enabled
                      </span>
                    </div>
                    <p className="text-xs text-[#4A4A4A] mt-0.5">
                      {voiceFeedback ||
                        'Tap mic & speak your preferred service and date (e.g. "Book Bridal Makeup for tomorrow")'}
                    </p>
                    {voiceTranscript && (
                      <p className="text-[11px] font-mono text-[#0F172A] mt-1">
                        &ldquo;{voiceTranscript}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStartVoiceBooking}
                  disabled={isListening}
                  className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#D09A40] text-[#FAF5E5] hover:text-[#0F172A] text-xs font-bold transition-colors shrink-0 cursor-pointer"
                >
                  {isListening ? 'Listening...' : 'Speak Now'}
                </button>
              </div>

              {/* 1. Choose Location Mode (Salon vs Home Service) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-3">
                  {t('bookingWhereQuestion')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, locationType: 'salon' })}
                    className={`flex items-center gap-3.5 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      form.locationType === 'salon'
                        ? 'border-[#D09A40] bg-[#FAF5E5] shadow-md'
                        : 'border-[#0F172A]/10 bg-white hover:border-[#0F172A]/30'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        form.locationType === 'salon'
                          ? 'bg-[#0F172A] text-[#D09A40]'
                          : 'bg-[#FAF5E5] text-[#0F172A]'
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#0F172A]">{t('bookingVisitSalon')}</p>
                      <p className="text-xs text-[#4A4A4A]">
                        {branchSummary} • Pay after service
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, locationType: 'home' })}
                    className={`flex items-center gap-3.5 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      form.locationType === 'home'
                        ? 'border-[#D09A40] bg-[#FAF5E5] shadow-md'
                        : 'border-[#0F172A]/10 bg-white hover:border-[#0F172A]/30'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        form.locationType === 'home'
                          ? 'bg-[#0F172A] text-[#D09A40]'
                          : 'bg-[#FAF5E5] text-[#0F172A]'
                      }`}
                    >
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#0F172A]">
                        {t('bookingHomeService')}
                      </p>
                      <p className="text-xs text-[#4A4A4A]">
                        Stylist visits your home or venue in {brand.cityName}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Conditional Location Input: Branch OR Home Distance Calculator */}
              {form.locationType === 'salon' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-2">
                    Select {brand.cityName} Salon Branch
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#D09A40] absolute left-4 top-1/2 -translate-y-1/2" />
                    <select
                      value={form.selectedBranch}
                      onChange={(e) => setForm({ ...form, selectedBranch: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#FAF5E5] border border-[#0F172A]/15 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                    >
                      {brand.branches.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name} ({b.locality})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-[#FAF5E5] rounded-2xl border border-[#D09A40]/40 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#0F172A]/10">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-[#D09A40]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                        {brand.cityName} Home Service & Travel Fee Calculator
                      </span>
                    </div>
                    <span className="text-xs font-bold bg-[#0F172A] text-[#D09A40] px-3 py-1 rounded-full">
                      Travel Fee: {formatPrice(distanceFee)} (~{form.distanceKm} km)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                        Select Your Area in {brand.cityName} *
                      </label>
                      <select
                        value={form.locality}
                        onChange={(e) => handleLocalityChange(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl bg-white border border-[#0F172A]/15 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                      >
                        {brand.localities.map((loc) => (
                          <option key={loc.name} value={loc.name}>
                            {loc.name} (~{loc.distanceKm} km)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-[#0F172A]">
                          Distance from Nearest Studio
                        </label>
                        <span className="text-xs font-bold text-[#D09A40]">
                          {form.distanceKm} km
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="45"
                        value={form.distanceKm}
                        onChange={(e) =>
                          setForm({ ...form, distanceKm: Number(e.target.value) })
                        }
                        className="w-full accent-[#D09A40] cursor-pointer mt-2"
                      />
                      <p className="text-[11px] text-[#4A4A4A] mt-1">
                        Base fee {formatPrice(brand.homeServiceBaseFee)} +{' '}
                        {formatPrice(brand.homeServicePerKmRate)}/km beyond 4 km
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                      Complete House / Flat / Hotel Address in {brand.cityName} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={`House/Flat No., Street, Landmark, ${brand.cityName}`}
                      value={form.homeAddress}
                      onChange={(e) => setForm({ ...form, homeAddress: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-[#0F172A]/15 text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                    />
                  </div>
                </div>
              )}

              {/* 2. Personal Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-2">
                    {t('bookingFullName')}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#D09A40] absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g., Priya Sharma"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#FAF5E5] border border-[#0F172A]/15 text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-2">
                    {t('bookingPhone')}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#D09A40] absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder={brand.phoneDisplay}
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#FAF5E5] border border-[#0F172A]/15 text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Select Service & Preferred Specialist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-2">
                    {t('bookingSelectService')}
                  </label>
                  <select
                    value={form.selectedService}
                    onChange={(e) => setForm({ ...form, selectedService: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-xl bg-[#FAF5E5] border border-[#0F172A]/15 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                  >
                    {preselectedServiceTitle &&
                      !catalogServices.some((s) => s.title === preselectedServiceTitle) && (
                        <option value={preselectedServiceTitle}>
                          {preselectedServiceTitle}
                        </option>
                      )}
                    {catalogServices.map((srv) => (
                      <option key={srv.id} value={srv.title}>
                        {srv.title} — {formatPrice(srv.price)} ({srv.duration})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-2">
                    {t('bookingSelectStylist')}
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-[#D09A40] absolute left-4 top-1/2 -translate-y-1/2" />
                    <select
                      value={form.preferredStylist}
                      onChange={(e) => setForm({ ...form, preferredStylist: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#FAF5E5] border border-[#0F172A]/15 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                    >
                      <option value="Any Senior Specialist">
                        Any Available Senior Specialist
                      </option>
                      {brand.stylists.map((stylist) => (
                        <option key={stylist.id} value={stylist.name}>
                          {stylist.name} — {stylist.role} ({stylist.branch.split(' ')[0]})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Preferred Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-2">
                    {t('bookingPreferredDate')}
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#D09A40] absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      required
                      min={todayStr}
                      value={form.appointmentDate}
                      onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#FAF5E5] border border-[#0F172A]/15 text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-2">
                    {t('bookingPreferredTime')}
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-[#D09A40] absolute left-4 top-1/2 -translate-y-1/2" />
                    <select
                      value={form.timeSlot}
                      onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#FAF5E5] border border-[#0F172A]/15 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                    >
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 5. Special Notes & Bridal Trial Checkbox */}
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer select-none bg-[#FAF5E5]/70 p-3.5 rounded-xl border border-[#D09A40]/30">
                  <input
                    type="checkbox"
                    checked={form.bridalTrialRequired}
                    onChange={(e) =>
                      setForm({ ...form, bridalTrialRequired: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#D09A40] rounded"
                  />
                  <span className="text-xs sm:text-sm font-medium text-[#0F172A]">
                    I am booking for a <strong>Bride / Wedding</strong> — include a free 15-minute skin & makeup consultation.
                  </span>
                </label>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-2">
                    Special Requests (Optional)
                  </label>
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 text-[#D09A40] absolute left-4 top-3.5" />
                    <textarea
                      rows={2}
                      placeholder="Mention skin sensitivity, hair length, or number of family members..."
                      value={form.specialNotes}
                      onChange={(e) => setForm({ ...form, specialNotes: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#FAF5E5] border border-[#0F172A]/15 text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                    />
                  </div>
                </div>
              </div>

              {/* 5.5 Loyalty Reward / Gift Card Code Input */}
              <div className="p-4 rounded-2xl bg-[#FAF5E5] border border-[#D09A40]/35 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-[#D09A40]" />
                    <span>Have a {brand.loyaltyClubName} or Gift Card Code?</span>
                  </label>
                  {appliedPromo && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedPromo(null);
                        setPromoCodeInput('');
                      }}
                      className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      Remove Voucher
                    </button>
                  )}
                </div>

                {!appliedPromo ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-4 h-4 text-[#D09A40] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value)}
                        placeholder={`e.g. ${brand.bookingPrefix}-GLOW-500 or ${brand.giftCardPrefix}-1234`}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-[#0F172A]/15 text-xs font-mono uppercase text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => validateAndApplyPromo(promoCodeInput)}
                      className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#D09A40] text-[#FAF5E5] hover:text-[#0F172A] font-bold text-xs transition-colors cursor-pointer shrink-0"
                    >
                      Apply Voucher
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-mono font-bold text-emerald-950">
                          {appliedPromo.code}
                        </span>
                        <span className="text-emerald-700 ml-2">
                          ({appliedPromo.title})
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-700">
                      -{formatPrice(appliedPromo.discountAmount)} Saved
                    </span>
                  </div>
                )}

                {promoError && (
                  <p className="text-[11px] text-rose-600 font-medium">{promoError}</p>
                )}
              </div>

              {/* 6. Home Service Advance Token Policy Card */}
              {form.locationType === 'home' && (
                <div className="p-4 rounded-2xl border bg-amber-50/80 border-amber-200 text-xs text-[#0F172A] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <span className="font-bold text-amber-900">
                        Advance Token Deposit for Home Visit
                      </span>
                    </div>
                    {form.advancePaymentVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        <Check className="w-3.5 h-3.5" />
                        Token Paid (Ref: {form.advancePaymentRef})
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                        Advance Token Required: {formatPrice(advanceRequired)}
                      </span>
                    )}
                  </div>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    To confirm a home visit and reserve your beauty artist, a small token deposit of{' '}
                    <strong>{formatPrice(advanceRequired)}</strong> is required. The remaining{' '}
                    <strong>{formatPrice(balanceAtDoorstep)}</strong> is payable after your service.
                  </p>
                  {!form.advancePaymentVerified && (
                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="mt-1 px-4 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay Advance Token ({formatPrice(advanceRequired)})</span>
                    </button>
                  )}
                </div>
              )}

              {/* Live Price Summary & Submit CTA */}
              <div className="pt-4 border-t border-[#0F172A]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <div className="flex items-baseline justify-center sm:justify-start gap-2">
                    <span className="text-xs text-[#4A4A4A]">{t('bookingEstimatedTotal')}</span>
                    <span className="font-serif text-2xl font-bold text-[#0F172A]">
                      {formatPrice(totalEstimatedAmount)}
                    </span>
                    {form.locationType === 'home' && (
                      <span className="text-[11px] text-[#4A4A4A]">
                        (Service {formatPrice(treatmentPrice)} + Travel {formatPrice(distanceFee)}
                        {promoDiscount > 0 ? ` - Voucher ${formatPrice(promoDiscount)}` : ''})
                      </span>
                    )}
                    {form.locationType === 'salon' && promoDiscount > 0 && (
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        (Includes {formatPrice(promoDiscount)} Voucher Off)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#10B981] font-semibold mt-0.5">
                    {form.locationType === 'salon'
                      ? '✓ Zero advance needed for salon visits — pay after your service'
                      : form.advancePaymentVerified
                      ? `✓ Advance ${formatPrice(advanceRequired)} verified • Balance ${formatPrice(balanceAtDoorstep)} after service`
                      : `Requires ${formatPrice(advanceRequired)} advance token to dispatch artist`}
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] font-bold text-base shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {form.locationType === 'home' && !form.advancePaymentVerified
                    ? `Pay ${formatPrice(advanceRequired)} Token & Book`
                    : t('bookingConfirmBtn')}
                </button>
              </div>
            </form>
          ) : (
            /* Confirmation State */
            <div className="p-8 sm:p-12 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#10B981]/15 text-[#10B981] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="inline-block px-3.5 py-1 rounded-full bg-[#FAF5E5] border border-[#D09A40] text-xs font-bold text-[#0F172A]">
                  Booking Reference: #{bookingRefCode}
                </span>
                <h3 className="font-serif text-3xl font-bold text-[#0F172A]">
                  Thank You, {form.fullName}!
                </h3>
                <p className="text-sm text-[#4A4A4A] max-w-md mx-auto">
                  Your appointment request for <strong>{form.selectedService}</strong> on{' '}
                  <strong>{form.appointmentDate}</strong> at <strong>{form.timeSlot}</strong> is ready.
                </p>
              </div>

              <div className="bg-[#FAF5E5] rounded-2xl p-5 max-w-md mx-auto text-left text-xs space-y-2 border border-[#0F172A]/10">
                <div className="flex justify-between">
                  <span className="text-[#4A4A4A]">Mode:</span>
                  <span className="font-bold">
                    {form.locationType === 'salon' ? 'Salon Studio Visit' : 'Doorstep Home Service'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4A4A4A]">Location:</span>
                  <span className="font-semibold text-right">
                    {form.locationType === 'salon'
                      ? form.selectedBranch
                      : `${form.locality} (~${form.distanceKm} km)`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4A4A4A]">Preferred Specialist:</span>
                  <span className="font-semibold text-right">{form.preferredStylist}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Voucher Applied ({appliedPromo.code}):</span>
                    <span>-{formatPrice(appliedPromo.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#0F172A]/10 pt-2 font-bold text-sm">
                  <span>Total Amount:</span>
                  <span>{formatPrice(totalEstimatedAmount)}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={buildWhatsAppBookingUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm px-7 py-4 rounded-xl shadow-lg transition-all"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Send Booking on WhatsApp for Instant Slot Lock</span>
                </a>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="w-full sm:w-auto px-6 py-4 rounded-xl border border-[#0F172A]/20 text-xs font-semibold text-[#0F172A] hover:bg-[#FAF5E5] transition-colors cursor-pointer"
                >
                  Modify Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* UPI / Card Advance Token Modal for Home Service */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white text-[#0F172A] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-[#D09A40]/40">
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute top-4 right-4 text-[#4A4A4A] hover:text-[#0F172A] p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#0F172A]">
                Pay Home Visit Token
              </h3>
              <p className="text-xs text-[#4A4A4A] mt-1">
                For Doorstep Service in {form.locality} (~{form.distanceKm} km)
              </p>
            </div>

            <div className="bg-[#FAF5E5] rounded-2xl p-4 text-xs space-y-1.5 mb-5 border border-[#D09A40]/30">
              <div className="flex justify-between">
                <span className="text-[#4A4A4A]">Selected Service:</span>
                <span className="font-semibold text-right max-w-[200px] truncate">
                  {form.selectedService}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A4A4A]">Travel Charge:</span>
                <span className="font-semibold">{formatPrice(distanceFee)}</span>
              </div>
              <div className="flex justify-between border-t border-[#0F172A]/10 pt-2 font-bold text-[#0F172A]">
                <span>Advance Token Payable Now:</span>
                <span className="text-sm text-[#D09A40]">{formatPrice(advanceRequired)}</span>
              </div>
            </div>

            {/* Method Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <button
                type="button"
                onClick={() => setForm({ ...form, advancePaymentMethod: 'upi' })}
                className={`py-2 px-3 rounded-xl border font-bold cursor-pointer ${
                  form.advancePaymentMethod === 'upi'
                    ? 'bg-[#0F172A] text-[#FAF5E5] border-[#0F172A]'
                    : 'bg-[#FAF5E5] text-[#0F172A] border-[#0F172A]/15'
                }`}
              >
                UPI / QR Scan
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, advancePaymentMethod: 'card' })}
                className={`py-2 px-3 rounded-xl border font-bold cursor-pointer ${
                  form.advancePaymentMethod === 'card'
                    ? 'bg-[#0F172A] text-[#FAF5E5] border-[#0F172A]'
                    : 'bg-[#FAF5E5] text-[#0F172A] border-[#0F172A]/15'
                }`}
              >
                Debit / Credit Card
              </button>
            </div>

            {form.advancePaymentMethod === 'upi' ? (
              <div className="space-y-4 text-center">
                <div className="w-36 h-36 bg-[#FAF5E5] border-2 border-dashed border-[#D09A40] rounded-2xl mx-auto flex flex-col items-center justify-center p-3">
                  <QrCode className="w-20 h-20 text-[#0F172A]" />
                  <span className="text-[10px] text-[#4A4A4A] mt-1 font-medium">
                    GPay • PhonePe • Paytm
                  </span>
                </div>

                <div className="flex items-center justify-between bg-[#FAF5E5] rounded-xl px-3.5 py-2.5 text-xs border border-[#0F172A]/10">
                  <span className="font-mono font-semibold text-[#0F172A]">
                    {brand.upiId}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="text-xs text-[#D09A40] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedUpi ? (
                      <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyAdvancePayment}
                  className="w-full py-3.5 px-4 text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] rounded-xl transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Token Paid ({formatPrice(advanceRequired)})</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Card Number (XXXX XXXX XXXX)"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#0F172A]/20 rounded-xl"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="MM / YY"
                    className="w-full px-3.5 py-2.5 text-xs border border-[#0F172A]/20 rounded-xl"
                  />
                  <input
                    type="password"
                    maxLength={3}
                    placeholder="CVV"
                    className="w-full px-3.5 py-2.5 text-xs border border-[#0F172A]/20 rounded-xl"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyAdvancePayment}
                  className="w-full py-3.5 px-4 text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] rounded-xl transition-colors cursor-pointer"
                >
                  Pay {formatPrice(advanceRequired)} & Verify
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
