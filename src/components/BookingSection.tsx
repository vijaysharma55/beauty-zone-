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
  Lock,
  Check,
  X,
  UserCheck,
  Tag,
  Gift,
  Mic,
  MicOff,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Sliders,
  Star,
  Info,
} from 'lucide-react';
import { WhatsAppIcon } from './SocialIcons';
import { BookingSummaryModal } from './BookingSummaryModal';
import { StylistSelectGrid, type StylistOption } from './StylistSelectGrid';
import { StylistProfileModal, type StylistProfile } from './StylistProfileModal';
import { useBrand } from '../context/BrandContext';
import { api } from '../lib/api';
import { useAvailability, FALLBACK_SLOTS } from '../hooks/useAvailability';
import { PaymentCheckout } from './payment/PaymentCheckout';
import {
  computeAdvancePreviewPaise,
  formatPaise,
  getPaymentConfig,
  type BookingCreationResponse,
  type CheckoutBooking,
  type PaymentConfig,
  type PaymentResponse,
} from '../lib/payments';

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
  /** Salon slug whose opening hours drive slot generation (public salon sites). */
  salonSlug?: string | null;
  /** Service duration in minutes used when generating the slot grid. */
  defaultDurationMinutes?: number;
}

/** Legacy static grid — kept as the last-resort render when a date is not chosen yet. */
const TIME_SLOTS = FALLBACK_SLOTS.map((slot) => slot.label);

/**
 * Cash value of a redeemed loyalty reward.
 *
 * Looks the reward up in the live catalogue (by title, then by fuzzy match) and
 * parses the advertised worth, e.g. "100% Free Service (Worth ₹1,800)" → 1800.
 * Falls back to the smallest catalogue value so a renamed reward still applies
 * a sensible discount instead of silently breaking a check-out.
 */
const catalogueFloor = () =>
  REWARD_OFFERS.reduce((min, offer) => {
    const value = Number.parseInt(offer.discountValue.replace(/[^\d]/g, ''), 10);
    return Number.isFinite(value) && value > 0 ? Math.min(min, value) : min;
  }, 500);

function rewardValueFor(rewardTitle: string): number {
  const title = (rewardTitle || '').toLowerCase();
  const exact = REWARD_OFFERS.find((offer) => offer.title.toLowerCase() === title);
  const match =
    exact ||
    REWARD_OFFERS.find((offer) => {
      const words = offer.title
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3);
      return words.some((w) => title.includes(w));
    });

  if (match) {
    const parsed = Number.parseInt(match.discountValue.replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const fromTitle = Number.parseInt((rewardTitle || '').replace(/[^\d]/g, ''), 10);
  if (Number.isFinite(fromTitle) && fromTitle > 0) return fromTitle;
  return catalogueFloor();
}

/** Visual Service Picker Component */
const ServicePicker: React.FC<{
  services: ServiceItem[];
  selectedService: string;
  onSelect: (service: ServiceItem) => void;
  formatPrice: (amount: number) => string;
}> = ({ services, selectedService, onSelect, formatPrice }) => {
  const categories = Array.from(new Set(services.map((s) => s.category)));
  const [activeCategory, setActiveCategory] = useState(categories[0] || 'all');

  const filtered = services.filter((s) => s.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
              activeCategory === cat
                ? 'bg-[#0F172A] text-[#D09A40] border-[#0F172A]'
                : 'bg-white text-slate-500 border-slate-200 hover:border-[#D09A40]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
        {filtered.map((srv) => {
          const isSelected = selectedService === srv.title;
          return (
            <button
              key={srv.id}
              type="button"
              onClick={() => onSelect(srv)}
              className={`flex items-start gap-3 p-3 rounded-2xl border-2 text-left transition-all group ${
                isSelected
                  ? 'border-[#D09A40] bg-[#FAF5E5] shadow-md'
                  : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
              }`}
            >
              {srv.image && (
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                  <img src={srv.image} alt={srv.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-xs text-[#0F172A] leading-tight line-clamp-2">{srv.title}</h4>
                  <span className="font-bold text-xs text-[#D09A40] whitespace-nowrap">{formatPrice(srv.price)}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{srv.description}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {srv.duration}
                  </span>
                  {srv.popular && (
                    <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      Popular
                    </span>
                  )}
                </div>
              </div>
              <div className={`mt-0.5 shrink-0 ${isSelected ? 'text-[#D09A40]' : 'text-slate-200'}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const BookingSection: React.FC<BookingSectionProps> = ({
  services = SALON_SERVICES,
  preselectedServiceId,
  preselectedServiceTitle,
  preselectedLocationMode,
  preselectedBranch,
  preselectedStylistName,
  preselectedPromoCode,
  salonSlug = null,
  defaultDurationMinutes = 60,
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
    preferredStylist: 'Any Available Stylist',
    preferredStylistId: '',
    appointmentDate: '',
    timeSlot: '11:30 AM',
    bridalTrialRequired: false,
    specialNotes: '',
    advancePaymentVerified: false,
    advancePaymentRef: '',
    advancePaymentMethod: 'upi',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [bookingRefCode, setBookingRefCode] = useState('');

  // Payment lifecycle. `payConfig` is served by the API; the browser never
  // decides the amount, the advance percentage or whether a booking is paid.
  const [payConfig, setPayConfig] = useState<PaymentConfig | null>(null);
  const [checkoutBooking, setCheckoutBooking] = useState<
    (CheckoutBooking & { salonName?: string; locationLabel?: string }) | null
  >(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentState, setPaymentState] = useState<'idle' | 'pending' | 'failed' | 'cancelled' | 'confirmed'>('idle');
  const [serverBooking, setServerBooking] = useState<CheckoutBooking | null>(null);
  const [paymentNotice, setPaymentNotice] = useState('');

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

  // Submit lifecycle: idle → submitting → confirmed / failed (with retry)
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'failed'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    phone?: string;
    appointmentDate?: string;
    homeAddress?: string;
  }>({});
  const [attemptCount, setAttemptCount] = useState(0);
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);

  // Step-by-Step Progress Indicator state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'wizard' | 'single'>('wizard');

  // Preferred stylist / staff selection: grid of mini cards + full profile modal.
  const [profileStylistId, setProfileStylistId] = useState<string | null>(null);
  const stylistCatalog = brand.stylists || [];

  const stylistOptions: StylistOption[] = useMemo(
    () =>
      stylistCatalog.map((stylist) => ({
        id: stylist.id,
        name: stylist.name,
        role: stylist.role,
        photo: stylist.avatar,
        specialty: stylist.specialties?.[0] || stylist.role,
        rating: stylist.ratings,
        reviewCount: stylist.reviewCount,
        experience: stylist.experience,
      })),
    [stylistCatalog]
  );

  const selectedStylist = useMemo(
    () => stylistCatalog.find((stylist) => stylist.id === form.preferredStylistId) || null,
    [stylistCatalog, form.preferredStylistId]
  );

  const profileStylist = useMemo(
    () => stylistCatalog.find((stylist) => stylist.id === profileStylistId) || null,
    [stylistCatalog, profileStylistId]
  );

  const profileStylistData: StylistProfile | null = useMemo(
    () =>
      profileStylist
        ? {
            id: profileStylist.id,
            name: profileStylist.name,
            role: profileStylist.role,
            branch: profileStylist.branch,
            experience: profileStylist.experience,
            rating: profileStylist.ratings,
            reviewCount: profileStylist.reviewCount,
            bio: profileStylist.bio,
            avatar: profileStylist.avatar,
            specialties: profileStylist.specialties,
            certifications: profileStylist.certifications,
          }
        : null,
    [profileStylist]
  );

  /** Selects a specialist by id (empty string = any available stylist). */
  const handleStylistSelect = (stylistId: string) => {
    const found = stylistCatalog.find((stylist) => stylist.id === stylistId);
    setForm((prev) => ({
      ...prev,
      preferredStylistId: found ? found.id : '',
      preferredStylist: found ? found.name : 'Any Available Stylist',
    }));
  };

  const BOOKING_STEPS = useMemo(
    () => [
      { id: 1, title: 'Service & Location', description: 'Mode, service & venue', icon: Sparkles },
      { id: 2, title: 'Date & Time', description: 'Schedule appointment', icon: Calendar },
      { id: 3, title: 'Contact & Voucher', description: 'Guest details & promo', icon: User },
      { id: 4, title: 'Confirmation', description: 'Review & lock slot', icon: CheckCircle2 },
    ],
    []
  );

  const validateStep1 = (): boolean => {
    setFieldErrors((prev) => ({ ...prev, homeAddress: undefined }));
    if (form.locationType === 'home' && form.homeAddress.trim().length < 8) {
      setFieldErrors((prev) => ({
        ...prev,
        homeAddress: 'Please enter your complete doorstep address.',
      }));
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    setFieldErrors((prev) => ({ ...prev, appointmentDate: undefined }));
    if (!form.appointmentDate) {
      setFieldErrors((prev) => ({ ...prev, appointmentDate: 'Please choose an appointment date.' }));
      return false;
    }
    if (availability.closed) {
      setFieldErrors((prev) => ({ ...prev, appointmentDate: 'We are closed on this date.' }));
      return false;
    }
    if (form.appointmentDate < todayStr) {
      setFieldErrors((prev) => ({ ...prev, appointmentDate: 'Please choose today or a future date.' }));
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    const errors: { fullName?: string; phone?: string } = {};
    if (!form.fullName.trim()) errors.fullName = 'Please enter your name.';
    else if (form.fullName.trim().length < 2) errors.fullName = 'Please enter your full name.';

    const digits = form.phone.replace(/\D/g, '');
    if (!form.phone.trim()) errors.phone = 'Please enter a contact number.';
    else if (digits.length < 8 || digits.length > 15) errors.phone = 'Enter a valid phone number (8–15 digits).';

    setFieldErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const handleGoNextStep = (next: number) => {
    if (next === 2 && !validateStep1()) return;
    if (next === 3 && (!validateStep1() || !validateStep2())) return;
    if (next === 4 && (!validateStep1() || !validateStep2() || !validateStep3())) return;
    setCurrentStep(next);
    const formEl = document.getElementById('booking-form');
    formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleJumpToStep = (targetStep: number) => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      return;
    }
    if (targetStep === 2 && validateStep1()) setCurrentStep(2);
    else if (targetStep === 3 && validateStep1() && validateStep2()) setCurrentStep(3);
    else if (targetStep === 4 && validateStep1() && validateStep2() && validateStep3()) setCurrentStep(4);
  };

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
      const wanted = preselectedStylistName.trim();
      const matched = (brand.stylists || []).find(
        (stylist) =>
          stylist.name.toLowerCase() === wanted.toLowerCase() || stylist.id === preselectedStylistName
      );
      setForm((prev) => ({
        ...prev,
        preferredStylist: matched ? matched.name : preselectedStylistName,
        preferredStylistId: matched ? matched.id : prev.preferredStylistId,
        locationType: 'salon',
      }));
    }
  }, [preselectedStylistName, brand.stylists]);

  useEffect(() => {
    if (preselectedPromoCode) {
      setPromoCodeInput(preselectedPromoCode);
      validateAndApplyPromo(preselectedPromoCode);
    }
  }, [preselectedPromoCode]);

  const validateAndApplyPromo = async (codeToTest: string) => {
    const clean = codeToTest.trim().toUpperCase();
    setPromoError(null);
    if (!clean) return;

    try {
      const res = await api.post<{
        valid: boolean;
        voucher: {
          code: string;
          title: string;
          discountAmount: number;
          phone: string;
        };
      }>('/public/loyalty/verify-voucher', { code: clean });

      if (res && res.valid && res.voucher) {
        setAppliedPromo({
          code: res.voucher.code,
          title: res.voucher.title,
          discountAmount: res.voucher.discountAmount,
        });
        return;
      }
    } catch (err: any) {
      console.warn('[booking] Live voucher verify failed or code invalid on server, checking local fallback', err);
      if (err?.message && !err.message.includes('Fetch error') && !err.message.includes('Failed to fetch')) {
        setPromoError(err.message);
        return;
      }
    }

    // Local fallback check for voucher
    const storedCustomer = getStoredLoyaltyCustomer();
    const matchedRedeemed = storedCustomer.redeemedRewards.find(
      (r) => r.voucherCode.toUpperCase() === clean
    );

    if (matchedRedeemed) {
      setAppliedPromo({
        code: clean,
        title: matchedRedeemed.rewardTitle,
        discountAmount: rewardValueFor(matchedRedeemed.rewardTitle),
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
        setCurrentStep(3);
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

  /**
   * Service length in minutes. `ServiceItem.duration` is a display string
   * ("210 mins", "7 Sessions"), so we parse the leading number and clamp it to a
   * sane booking window. Salon services from the API expose durationMinutes.
   */
  const serviceDurationMinutes = useMemo(() => {
    const raw = (selectedServiceObj as ServiceItem | undefined)?.duration;
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.min(1440, raw);
    if (typeof raw === 'string') {
      const parsed = Number.parseInt(raw.replace(/[^\d]/g, ''), 10);
      if (Number.isFinite(parsed) && parsed > 0) return Math.min(1440, parsed);
    }
    const apiDuration = Number((selectedServiceObj as { durationMinutes?: number } | undefined)?.durationMinutes);
    if (Number.isFinite(apiDuration) && apiDuration > 0) return Math.min(1440, apiDuration);
    return Math.min(1440, Math.max(5, defaultDurationMinutes));
  }, [selectedServiceObj, defaultDurationMinutes]);

  /**
   * Live availability for the chosen date.
   * Falls back to the static grid if the API is unreachable (see the hook).
   */
  const availability = useAvailability({
    date: form.appointmentDate || undefined,
    slug: salonSlug,
    durationMinutes: serviceDurationMinutes,
    enabled: Boolean(form.appointmentDate),
  });

  const timeSlotOptions = availability.slots.length > 0 ? availability.slots : FALLBACK_SLOTS;

  // Keep the selected slot valid whenever the generated grid changes.
  useEffect(() => {
    if (timeSlotOptions.length === 0) return;
    const stillValid = timeSlotOptions.some((slot) => slot.label === form.timeSlot);
    if (!stillValid) {
      setForm((prev) => ({ ...prev, timeSlot: timeSlotOptions[0].label }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability.slots, form.appointmentDate]);

  const selectedSlot = useMemo(() => {
    return timeSlotOptions.find((s) => s.label === form.timeSlot);
  }, [timeSlotOptions, form.timeSlot]);

  const isSlotFull = selectedSlot ? !selectedSlot.available : false;

  const handleJoinWaitlist = async () => {
    setWaitlistStatus('submitting');
    try {
      const res = await api.post<{ message: string }>('/public/waitlist', {
        slug: salonSlug,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        service: form.selectedService,
        date: form.appointmentDate,
        time: form.timeSlot,
      });
      setWaitlistStatus('success');
      setWaitlistMessage(res.message);
    } catch (err) {
      setWaitlistStatus('idle');
      alert(err instanceof Error ? err.message : 'Failed to join waitlist. Please try again.');
    }
  };

  /** Local calendar day (YYYY-MM-DD) used for the date input's min value. */
  const todayStr = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const calculateDistanceFee = (km: number): number => {
    const base = brand.homeServiceBaseFee || 250;
    const perKm = brand.homeServicePerKmRate || 30;
    if (km <= 4) return base;
    return base + (km - 4) * perKm;
  };

  const distanceFee = useMemo(() => {
    return form.locationType === 'home' ? calculateDistanceFee(form.distanceKm) : 0;
  }, [form.locationType, form.distanceKm, brand.homeServiceBaseFee, brand.homeServicePerKmRate]);

  // Load the server payment configuration (mode, advance percentage, hold time).
  useEffect(() => {
    let active = true;
    getPaymentConfig()
      .then((config) => {
        if (active) setPayConfig(config);
      })
      .catch(() => {
        if (active) setPayConfig(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const promoDiscount = appliedPromo ? appliedPromo.discountAmount : 0;
  const totalEstimatedAmount = Math.max(0, treatmentPrice + distanceFee - promoDiscount);

  const advancePercent = payConfig?.advancePercent ?? brand.advancePercentage ?? 25;
  const paymentAvailable = Boolean(payConfig?.available);
  const paymentRequired = Boolean(payConfig?.available && payConfig?.advanceRequired && totalEstimatedAmount > 0);

  /**
   * Preview of the advance due now. The server recomputes this from the
   * published service price; the preview only keeps the wizard honest before
   * the booking exists.
   */
  const advanceRequired = useMemo(() => {
    if (!paymentRequired) return 0;
    return computeAdvancePreviewPaise(Math.round(totalEstimatedAmount * 100), advancePercent) / 100;
  }, [paymentRequired, totalEstimatedAmount, advancePercent]);

  const paymentConfirmedHere = paymentState === 'confirmed' || Boolean(serverBooking?.confirmed);
  const balanceAtDoorstep = Math.max(0, totalEstimatedAmount - (paymentConfirmedHere ? advanceRequired : 0));

  const handleLocalityChange = (locName: string) => {
    const found = brand.localities.find((l) => l.name === locName);
    setForm((prev) => ({
      ...prev,
      locality: locName,
      distanceKm: found ? found.distanceKm : prev.distanceKm,
    }));
  };

  /**
   * Client-side validation. Returns a map of field → message instead of relying
   * on `alert()` or silently doing nothing, so errors are visible and recoverable.
   */
  const validateForm = () => {
    const errors: {
      fullName?: string;
      phone?: string;
      appointmentDate?: string;
      homeAddress?: string;
    } = {};

    if (!form.fullName.trim()) errors.fullName = 'Please enter your name.';
    else if (form.fullName.trim().length < 2) errors.fullName = 'Please enter your full name.';

    const digits = form.phone.replace(/\D/g, '');
    if (!form.phone.trim()) errors.phone = 'Please enter a contact number.';
    else if (digits.length < 8 || digits.length > 15) errors.phone = 'Enter a valid phone number (8–15 digits).';

    if (!form.appointmentDate) errors.appointmentDate = 'Please choose a date.';
    else if (availability.closed) errors.appointmentDate = 'We are closed on this day — please pick another date.';
    else if (availability.status === 'empty') {
      errors.appointmentDate = 'No slots left on this date. Please choose another day.';
    } else if (form.appointmentDate < todayStr) {
      errors.appointmentDate = 'Please choose today or a future date.';
    }

    if (form.locationType === 'home' && form.homeAddress.trim().length < 8) {
      errors.homeAddress = 'Please enter your complete doorstep address.';
    }

    return errors;
  };

  /**
   * Creates the booking, then hands the visitor to the payment screen.
   *
   * The booking is persisted server-side as `pending_payment`; the confirmation
   * dialog and every "confirmed" affordance stay locked until the payment
   * verification endpoint says otherwise.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0];
      const el = document.getElementById(`booking-${firstKey}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitState('submitting');
    // Track retries so the recovery copy can change after the first failure.
    setAttemptCount((n) => n + 1);

    try {
      const created = await api.post<BookingCreationResponse>('/public/bookings', {
        slug: salonSlug || undefined,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        service: form.selectedService,
        serviceCategory: form.serviceCategory,
        stylist: form.preferredStylist,
        stylistId: form.preferredStylistId || null,
        date: form.appointmentDate,
        time: form.timeSlot,
        locationType: form.locationType,
        branch: form.locationType === 'salon' ? form.selectedBranch : null,
        address: form.locationType === 'home' ? form.homeAddress.trim() : null,
        locality: form.locationType === 'home' ? form.locality : null,
        distanceKm: form.locationType === 'home' ? form.distanceKm : null,
        bridalTrial: form.bridalTrialRequired,
        notes: form.specialNotes.trim(),
        promoCode: appliedPromo?.code || null,
        // The server re-derives this from the salon's published price.
        estimatedTotal: totalEstimatedAmount,
      });

      const booking = created.booking as CheckoutBooking;
      setBookingRefCode(booking.reference || '');
      setServerBooking(booking);

      if (created.payment?.required) {
        if (!payConfig) {
          try {
            setPayConfig(await getPaymentConfig());
          } catch {
            // The checkout still works from the order's own provider details.
          }
        }
        const locationLabel =
          form.locationType === 'salon'
            ? form.selectedBranch
            : `${form.locality} (home visit, ~${form.distanceKm} km)`;
        setCheckoutBooking({
          ...booking,
          salonName: created.salon?.name || brand.brandName,
          locationLabel,
        });
        setPaymentState('pending');
        setPaymentNotice(
          `Your slot is held. Pay ${formatPaise(created.payment.advancePaise)} now to confirm — the remaining ${formatPaise(
            created.payment.remainingPaise
          )} is payable at the salon.`
        );
        setSubmitState('idle');
        setIsSubmitted(true);
        setIsSummaryModalOpen(false);
        setIsCheckoutOpen(true);
        return;
      }

      // No advance is configured: the booking is a request the salon confirms.
      setPaymentState('pending');
      setPaymentNotice('Your request is saved. The salon will confirm your appointment.');
      setSubmitState('idle');
      setIsSubmitted(true);
      setIsSummaryModalOpen(true);
    } catch (err) {
      console.error('[booking] submission failed', err);
      setSubmitState('failed');
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'We could not save your booking just now. Please retry — or confirm on WhatsApp.'
      );
    }
  };

  /** Only called after the server verified the payment. */
  const handlePaymentConfirmed = (result: PaymentResponse) => {
    const booking = (result.booking as CheckoutBooking | undefined) || serverBooking;
    if (booking) setServerBooking(booking);
    setPaymentState('confirmed');
    setPaymentNotice('Payment verified. Your appointment is confirmed.');
    setIsCheckoutOpen(false);
    setIsSubmitted(true);
    setIsSummaryModalOpen(true);
    setSubmitState('idle');
  };

  const handleCheckoutClose = (reason: 'dismissed' | 'cancelled') => {
    setIsCheckoutOpen(false);
    if (paymentState !== 'confirmed') {
      setPaymentState(reason === 'cancelled' ? 'cancelled' : 'pending');
      setPaymentNotice(
        reason === 'cancelled'
          ? 'Payment cancelled — your booking is not confirmed. You can retry the payment any time before the hold expires.'
          : 'Payment not completed yet — your booking stays unconfirmed until the advance is verified.'
      );
      setIsSubmitted(true);
      setIsSummaryModalOpen(true);
    }
  };

  const retryPayment = () => {
    if (!serverBooking?.id) return;
    setIsSummaryModalOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleFinalAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSlotFull) {
      if (waitlistStatus === 'success') return;
      handleJoinWaitlist();
    } else {
      handleSubmit(e);
    }
  };

  const buildWhatsAppBookingUrl = () => {
    const paidRef = paymentConfirmedHere ? serverBooking?.advanceRef || serverBooking?.reference || '' : '';
    const locationDetails =
      form.locationType === 'salon'
        ? `Salon Branch: ${form.selectedBranch}`
        : `Doorstep Home Service (${form.locality}, ~${form.distanceKm} km): ${form.homeAddress} | Travel Fee: ${formatPrice(distanceFee)} | Advance ${
            paymentConfirmedHere ? `Paid: ${formatPrice(advanceRequired)} (Ref: ${paidRef})` : 'Pending'
          }`;

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
          {/* Visual Step Progress Indicator Header */}
          <div className="bg-gradient-to-r from-[#FAF5E5] via-[#FFFDF5] to-[#FAF5E5] border-b border-[#D09A40]/25 p-5 sm:p-7">
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A] bg-[#D09A40]/20 px-2.5 py-1 rounded-full border border-[#D09A40]/40">
                    Step {isSubmitted ? 4 : currentStep} of 4
                  </span>
                  <span className="font-serif font-bold text-sm text-[#0F172A]">
                    {isSubmitted
                      ? paymentConfirmedHere
                        ? 'Appointment Confirmed!'
                        : 'Awaiting Payment'
                      : BOOKING_STEPS.find((s) => s.id === currentStep)?.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xs font-mono font-bold text-[#D09A40]">
                    {isSubmitted
                      ? paymentConfirmedHere
                        ? '100% Completed'
                        : 'Payment pending'
                      : `${Math.round(((currentStep - 1) / 3) * 100)}% Completed`}
                  </span>

                  {!isSubmitted && (
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === 'wizard' ? 'single' : 'wizard')}
                      className="text-[11px] font-semibold text-[#0F172A] bg-white border border-[#0F172A]/15 hover:bg-[#FAF5E5] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Sliders className="w-3 h-3 text-[#D09A40]" />
                      <span>{viewMode === 'wizard' ? 'All Fields View' : 'Step-by-Step Flow'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Line */}
              <div className="w-full bg-neutral-200/80 h-2.5 rounded-full overflow-hidden mb-5 relative border border-neutral-300/60 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-[#D09A40] via-amber-400 to-[#DCA54A] transition-all duration-500 rounded-full shadow-xs"
                  style={{
                    width: `${isSubmitted ? (paymentConfirmedHere ? 100 : 90) : Math.max(8, Math.round(((currentStep - 1) / 3) * 100))}%`,
                  }}
                />
              </div>

              {/* Stepper Nodes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                {BOOKING_STEPS.map((step) => {
                  const isCompleted = isSubmitted || step.id < currentStep;
                  const isActive = !isSubmitted && step.id === currentStep;
                  const Icon = step.icon;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => handleJumpToStep(step.id)}
                      className={`p-2.5 rounded-2xl transition-all cursor-pointer flex flex-col items-center group ${
                        isActive
                          ? 'bg-white shadow-md ring-2 ring-[#D09A40]'
                          : isCompleted
                          ? 'bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/80'
                          : 'bg-white/60 hover:bg-white border border-neutral-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:flex-col sm:gap-1.5 w-full justify-center">
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-all shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : isActive
                              ? 'bg-[#0F172A] text-[#D09A40] shadow-md ring-2 ring-[#D09A40]/40'
                              : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          ) : (
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                        </div>

                        <div className="text-left sm:text-center">
                          <span
                            className={`text-xs font-bold block leading-tight ${
                              isActive
                                ? 'text-[#0F172A]'
                                : isCompleted
                                ? 'text-emerald-900'
                                : 'text-neutral-500'
                            }`}
                          >
                            {step.title}
                          </span>
                          <span className="hidden sm:block text-[10px] text-[#4A4A4A] mt-0.5">
                            {step.description}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {!isSubmitted ? (
            <form id="booking-form" onSubmit={handleFinalAction} className="p-6 sm:p-10 space-y-7" noValidate>
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
                  className="action-base inverted-action action-sm shrink-0"
                >
                  {isListening ? 'Listening...' : 'Speak Now'}
                </button>
              </div>

              {/* STEP 1: Service & Location Mode */}
              {(currentStep === 1 || viewMode === 'single') && (
                <div className="space-y-6 pt-2">
                  <div className="border-b border-[#0F172A]/10 pb-3 flex items-center justify-between">
                    <h3 className="font-serif font-bold text-lg text-[#0F172A] flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#D09A40]" />
                      <span>Step 1: Choose Location & Salon Service</span>
                    </h3>
                    <span className="text-xs text-[#4A4A4A] font-medium">1 of 4</span>
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

                      <div id="booking-homeAddress">
                        <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                          Complete House / Flat / Hotel Address in {brand.cityName} *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={`House/Flat No., Street, Landmark, ${brand.cityName}`}
                          value={form.homeAddress}
                          onChange={(e) => {
                            setFieldErrors((prev) => ({ ...prev, homeAddress: undefined }));
                            setForm({ ...form, homeAddress: e.target.value });
                          }}
                          className={`w-full px-4 py-3 rounded-xl bg-white border text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40] ${
                            fieldErrors.homeAddress ? 'border-rose-400' : 'border-[#0F172A]/15'
                          }`}
                        />
                        {fieldErrors.homeAddress && (
                          <p className="mt-1.5 text-[11px] font-semibold text-rose-600">{fieldErrors.homeAddress}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Visual Service Picker */}
                  <div className="space-y-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A]">
                      {t('bookingSelectService')}
                    </label>
                    <ServicePicker
                      services={catalogServices}
                      selectedService={form.selectedService}
                      onSelect={(srv) =>
                        setForm({
                          ...form,
                          selectedService: srv.title,
                          serviceCategory: srv.category,
                        })
                      }
                      formatPrice={formatPrice}
                    />
                  </div>

                  {/* Preferred Specialist — mini-card grid with profile modals */}
                  <div>
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4A4A4A]">
                          <UserCheck className="w-4 h-4 text-[#D09A40]" />
                          <span>{t('bookingSelectStylist')}</span>
                        </label>
                        <p className="mt-1 text-[11px] text-[#4A4A4A]/85">
                          Select Preferred Stylist / Staff — or let us match you with the best available
                          specialist.
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF5E5] border border-[#D09A40]/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0F172A]">
                        <Star className="w-3 h-3 fill-[#D09A40] text-[#D09A40]" />
                        {stylistOptions.length} artists
                      </span>
                    </div>

                    <StylistSelectGrid
                      options={stylistOptions}
                      selectedId={form.preferredStylistId}
                      onSelect={handleStylistSelect}
                      onViewProfile={(id) => setProfileStylistId(id)}
                      emptyMessage="Our specialist roster is being updated — we will assign the best available artist for your appointment."
                    />

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FAF5E5] border border-[#D09A40]/30 px-3.5 py-2.5">
                      <p className="flex items-center gap-2 text-[11px] text-[#4A4A4A]">
                        {selectedStylist ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                            <span>
                              Locked in:{' '}
                              <strong className="text-[#0F172A]">{selectedStylist.name}</strong> ·{' '}
                              {selectedStylist.role}
                            </span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-[#D09A40]" />
                            <span>
                              Any available stylist — we will assign the best match for{' '}
                              <strong className="text-[#0F172A]">{form.selectedService}</strong>.
                            </span>
                          </>
                        )}
                      </p>
                      {selectedStylist && (
                        <button
                          type="button"
                          onClick={() => setProfileStylistId(selectedStylist.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F172A] underline decoration-[#D09A40] decoration-2 underline-offset-2 cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5 text-[#D09A40]" />
                          View full profile
                        </button>
                      )}
                    </div>
                  </div>


                  {viewMode === 'wizard' && (
                    <div className="pt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleGoNextStep(2)}
                        className="px-6 py-3.5 rounded-xl bg-[#0F172A] hover:bg-[#D09A40] text-white hover:text-[#0F172A] font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-colors"
                      >
                        <span>Continue to Schedule (Step 2)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Preferred Date & Time Slot */}
              {(currentStep === 2 || viewMode === 'single') && (
                <div className="space-y-6 pt-2">
                  <div className="border-b border-[#0F172A]/10 pb-3 flex items-center justify-between">
                    <h3 className="font-serif font-bold text-lg text-[#0F172A] flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#D09A40]" />
                      <span>Step 2: Select Date & Preferred Time Slot</span>
                    </h3>
                    <span className="text-xs text-[#4A4A4A] font-medium">2 of 4</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div id="booking-appointmentDate">
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
                          onChange={(e) => {
                            setFieldErrors((prev) => ({ ...prev, appointmentDate: undefined }));
                            setForm({ ...form, appointmentDate: e.target.value });
                          }}
                          className={`w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#FAF5E5] border text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40] ${
                            fieldErrors.appointmentDate ? 'border-rose-400' : 'border-[#0F172A]/15'
                          }`}
                        />
                      </div>
                      {fieldErrors.appointmentDate && (
                        <p className="mt-1.5 text-[11px] font-semibold text-rose-600">{fieldErrors.appointmentDate}</p>
                      )}
                      {!fieldErrors.appointmentDate && availability.open && availability.close && (
                        <p className="mt-1.5 text-[11px] text-[#4A4A4A]">
                          Open {availability.open} – {availability.close}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-2">
                        {t('bookingPreferredTime')}
                      </label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-[#D09A40] absolute left-4 top-1/2 -translate-y-1/2" />
                        <select
                          value={form.timeSlot}
                          disabled={availability.status === 'loading' || availability.closed}
                          onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                          className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#FAF5E5] border border-[#0F172A]/15 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#D09A40] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {availability.status === 'loading' ? (
                            <option value={form.timeSlot}>
                              {availability.retrying ? 'Retrying…' : 'Checking availability…'}
                            </option>
                          ) : availability.closed ? (
                            <option value="">Closed on this day</option>
                          ) : timeSlotOptions.length === 0 ? (
                            <option value="">No slots available</option>
                          ) : (
                            timeSlotOptions.map((slot) => (
                              <option key={slot.value} value={slot.label}>
                                {slot.label}
                                {slot.end && slot.start ? ` – ${slot.end}` : ''}
                                {!slot.available ? ' (Fully Booked)' : ''}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Availability recovery states */}
                      {availability.status === 'loading' && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#4A4A4A]">
                          <Loader2 className="w-3 h-3 animate-spin text-[#D09A40]" />
                          {availability.retrying ? 'Still trying to reach the booking service…' : 'Loading available times…'}
                        </p>
                      )}

                      {availability.closed && (
                        <p className="mt-1.5 text-[11px] font-semibold text-amber-700">
                          We're closed on this day. Please choose another date.
                        </p>
                      )}

                      {!availability.closed && availability.status === 'empty' && (
                        <p className="mt-1.5 text-[11px] font-semibold text-amber-700">
                          {availability.reason === 'no_slots_left_today'
                            ? 'No slots left today — please pick another date.'
                            : 'No slots left on this date. Please choose another day.'}
                        </p>
                      )}

                      {isSlotFull && (
                        <div className="mt-2.5 p-3 rounded-xl bg-[#FAF5E5] border border-[#D09A40]/30">
                          <p className="text-[11px] font-bold text-[#0F172A] flex items-center gap-1.5 mb-2">
                            <Clock className="w-3.5 h-3.5 text-[#D09A40]" />
                            <span>This slot is fully booked. Join the waitlist to be notified of cancellations!</span>
                          </p>
                          {waitlistStatus === 'success' ? (
                            <div className="flex items-center gap-2 text-emerald-700 font-bold text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{waitlistMessage || 'Added to waitlist!'}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (!validateStep3()) {
                                  setCurrentStep(3);
                                  return;
                                }
                                handleJoinWaitlist();
                              }}
                              disabled={waitlistStatus === 'submitting'}
                              className="w-full py-2 rounded-lg bg-[#0F172A] text-[#D09A40] text-[10px] font-bold uppercase tracking-wider hover:bg-[#D09A40] hover:text-[#0F172A] transition-colors disabled:opacity-50"
                            >
                              {waitlistStatus === 'submitting' ? 'Joining...' : 'Join Waitlist for this Slot'}
                            </button>
                          )}
                        </div>
                      )}

                      {availability.usingFallback && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                          <p className="flex-1 text-[11px] leading-snug text-amber-800">
                            Live availability is unreachable — showing standard times. Confirm your slot on WhatsApp.
                          </p>
                          <button
                            type="button"
                            onClick={availability.reload}
                            className="action-base inverted-action action-sm"
                          >
                            <RefreshCw className="w-3 h-3" /> Retry
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Special Requests & Bridal Trial Checkbox */}
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

                  {viewMode === 'wizard' && (
                    <div className="pt-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="px-5 py-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-[#0F172A] font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGoNextStep(3)}
                        className="px-6 py-3.5 rounded-xl bg-[#0F172A] hover:bg-[#D09A40] text-white hover:text-[#0F172A] font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-colors"
                      >
                        <span>Continue to Contact Info (Step 3)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Personal Contact Info & Loyalty Promo */}
              {(currentStep === 3 || viewMode === 'single') && (
                <div className="space-y-6 pt-2">
                  <div className="border-b border-[#0F172A]/10 pb-3 flex items-center justify-between">
                    <h3 className="font-serif font-bold text-lg text-[#0F172A] flex items-center gap-2">
                      <User className="w-5 h-5 text-[#D09A40]" />
                      <span>Step 3: Enter Guest Details & Voucher Code</span>
                    </h3>
                    <span className="text-xs text-[#4A4A4A] font-medium">3 of 4</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div id="booking-fullName">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-2">
                        {t('bookingFullName')} *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#D09A40] absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="e.g., Priya Sharma"
                          value={form.fullName}
                          onChange={(e) => {
                            setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                            setForm({ ...form, fullName: e.target.value });
                          }}
                          className={`w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#FAF5E5] border text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40] ${
                            fieldErrors.fullName ? 'border-rose-400' : 'border-[#0F172A]/15'
                          }`}
                        />
                      </div>
                      {fieldErrors.fullName && (
                        <p className="mt-1.5 text-[11px] font-semibold text-rose-600">{fieldErrors.fullName}</p>
                      )}
                    </div>

                    <div id="booking-phone">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A] mb-2">
                        {t('bookingPhone')} *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#D09A40] absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          inputMode="tel"
                          placeholder={brand.phoneDisplay}
                          value={form.phone}
                          onChange={(e) => {
                            setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                            setForm({ ...form, phone: e.target.value });
                          }}
                          className={`w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#FAF5E5] border text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40] ${
                            fieldErrors.phone ? 'border-rose-400' : 'border-[#0F172A]/15'
                          }`}
                        />
                      </div>
                      {fieldErrors.phone && (
                        <p className="mt-1.5 text-[11px] font-semibold text-rose-600">{fieldErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Loyalty Reward / Gift Card Code Input */}
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
                            placeholder={`e.g. ${brand.bookingPrefix}-GLOW-500 or VIP-500-1234`}
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-[#0F172A]/15 text-xs font-mono uppercase text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => validateAndApplyPromo(promoCodeInput)}
                          className="action-base inverted-action action-sm shrink-0"
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

                  {viewMode === 'wizard' && (
                    <div className="pt-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-5 py-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-[#0F172A] font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGoNextStep(4)}
                        className="px-6 py-3.5 rounded-xl bg-[#0F172A] hover:bg-[#D09A40] text-white hover:text-[#0F172A] font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-colors"
                      >
                        <span>Review & Confirm (Step 4)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Confirmation Summary & Final Submit */}
              {(currentStep === 4 || viewMode === 'single') && (
                <div className="space-y-6 pt-2">
                  <div className="border-b border-[#0F172A]/10 pb-3 flex items-center justify-between">
                    <h3 className="font-serif font-bold text-lg text-[#0F172A] flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#D09A40]" />
                      <span>Step 4: Review Appointment Summary & Confirm</span>
                    </h3>
                    <span className="text-xs text-[#4A4A4A] font-medium">4 of 4</span>
                  </div>

                  {/* Summary Breakdown Card */}
                  <div className="p-5 rounded-2xl bg-[#FAF5E5] border border-[#D09A40]/40 space-y-3.5 text-xs text-[#0F172A]">
                    <div className="flex items-center justify-between border-b border-[#0F172A]/10 pb-2.5">
                      <div>
                        <span className="text-[11px] text-[#4A4A4A] block uppercase tracking-wider">
                          Selected Service
                        </span>
                        <span className="font-serif font-bold text-sm text-[#0F172A]">
                          {form.selectedService}
                        </span>
                      </div>
                      <span className="font-bold font-mono text-sm text-[#0F172A]">
                        {formatPrice(treatmentPrice)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[11px] font-semibold text-[#4A4A4A] block">
                          Service Mode & Location:
                        </span>
                        <span className="font-medium text-[#0F172A]">
                          {form.locationType === 'salon'
                            ? `Salon Visit (${form.selectedBranch})`
                            : `Home Service in ${form.locality} (~${form.distanceKm} km)`}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-[#4A4A4A] block">
                          Scheduled Date & Time:
                        </span>
                        <span className="font-medium text-[#0F172A]">
                          {form.appointmentDate || 'Not selected'} at {form.timeSlot}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-[#4A4A4A] block">
                          Guest Name & Contact:
                        </span>
                        <span className="font-medium text-[#0F172A]">
                          {form.fullName || 'Guest'} ({form.phone || 'Phone not set'})
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-[#4A4A4A] block">
                          Preferred Artist:
                        </span>
                        {selectedStylist ? (
                          <span className="flex items-center gap-2 font-medium text-[#0F172A]">
                            {selectedStylist.avatar ? (
                              <img
                                src={selectedStylist.avatar}
                                alt={selectedStylist.name}
                                className="w-6 h-6 rounded-full object-cover object-top border border-[#D09A40]/50"
                              />
                            ) : (
                              <UserCheck className="w-4 h-4 text-[#D09A40]" />
                            )}
                            <span>
                              {selectedStylist.name}
                              <span className="text-[10px] text-[#4A4A4A]">
                                {' '}
                                · {selectedStylist.role} · ★ {selectedStylist.ratings.toFixed(1)}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setProfileStylistId(selectedStylist.id)}
                              className="text-[10px] font-bold text-[#0F172A] underline decoration-[#D09A40] underline-offset-2 cursor-pointer"
                            >
                              Profile
                            </button>
                          </span>
                        ) : (
                          <span className="font-medium text-[#0F172A]">{form.preferredStylist}</span>
                        )}
                      </div>
                    </div>

                    {appliedPromo && (
                      <div className="flex justify-between items-center bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-300/60 font-semibold text-emerald-900">
                        <span>Voucher Discount ({appliedPromo.code}):</span>
                        <span>-{formatPrice(appliedPromo.discountAmount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Advance payment summary (the real checkout opens after booking) */}
                  {paymentRequired && (
                    <div className="p-4 rounded-2xl border bg-amber-50/80 border-amber-200 text-xs text-[#0F172A] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-amber-700" />
                          <span className="font-bold text-amber-900">
                            {advancePercent}% advance confirms your slot
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                          <Lock className="w-3.5 h-3.5" />
                          Verified checkout
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-white/80 border border-amber-200 px-2 py-2">
                          <span className="block text-[10px] uppercase tracking-wider text-[#4A4A4A]">Total</span>
                          <strong className="text-sm">{formatPrice(totalEstimatedAmount)}</strong>
                        </div>
                        <div className="rounded-xl bg-white/80 border border-amber-300 px-2 py-2">
                          <span className="block text-[10px] uppercase tracking-wider text-[#4A4A4A]">Pay now</span>
                          <strong className="text-sm text-[#B45309]">{formatPrice(advanceRequired)}</strong>
                        </div>
                        <div className="rounded-xl bg-white/80 border border-amber-200 px-2 py-2">
                          <span className="block text-[10px] uppercase tracking-wider text-[#4A4A4A]">Balance</span>
                          <strong className="text-sm">{formatPrice(balanceAtDoorstep)}</strong>
                        </div>
                      </div>
                      <p className="text-amber-800 text-[11px] leading-relaxed">
                        Press <strong>Pay &amp; Confirm</strong> to reserve this slot. The secure checkout opens next;
                        your booking is confirmed only after the payment is verified on the server.
                        {payConfig?.mock ? ' Test mode is active — no real money is charged.' : ''}
                      </p>
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
                        {paymentConfirmedHere
                          ? `✓ Advance ${formatPrice(advanceRequired)} verified by the server • Balance ${formatPrice(
                              balanceAtDoorstep
                            )} payable at the salon`
                          : paymentRequired
                            ? `Pay ${formatPrice(advanceRequired)} now (${advancePercent}% advance) to confirm • Balance ${formatPrice(
                                balanceAtDoorstep
                              )} at the salon`
                            : '✓ No advance configured — your request will be confirmed by the salon'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {viewMode === 'wizard' && (
                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          className="px-4 py-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-[#0F172A] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Modify</span>
                        </button>
                      )}

                      <button
                        type="submit"
                        disabled={submitState === 'submitting'}
                        className="action-base primary-action action-lg w-full sm:w-auto flex-1 sm:flex-none justify-center"
                      >
                        {submitState === 'submitting' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Reserving slot…
                          </>
                        ) : isSlotFull ? (
                          waitlistStatus === 'success' ? (
                            'Already on Waitlist'
                          ) : (
                            'Join Waitlist'
                          )
                        ) : paymentRequired ? (
                          `Pay ${formatPrice(advanceRequired)} & Confirm`
                        ) : (
                          t('bookingConfirmBtn')
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submission error + recovery actions */}
                  {submitState === 'failed' && submitError && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="flex items-start gap-2 text-xs leading-snug text-rose-800">
                        <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0" />
                        <span>
                          {submitError}
                          {attemptCount > 1 ? ' (We will keep your details — just press retry.)' : ''}
                        </span>
                      </p>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSubmitState('idle');
                            setSubmitError(null);
                            const formEl = document.getElementById('booking-form') as HTMLFormElement | null;
                            formEl?.requestSubmit();
                          }}
                          className="action-base danger-action action-sm cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> {attemptCount > 1 ? 'Try again' : 'Retry booking'}
                        </button>
                        <a
                          href={buildWhatsAppBookingUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#10B981] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#059669]"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" /> Confirm on WhatsApp
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          ) : (
            /* Confirmation / pending-payment state */
            <div className="p-8 sm:p-12 text-center space-y-6">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                  paymentConfirmedHere ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-amber-100 text-amber-600'
                }`}
              >
                {paymentConfirmedHere ? <CheckCircle2 className="w-10 h-10" /> : <Clock className="w-10 h-10" />}
              </div>

              <div className="space-y-2">
                <span className="inline-block px-3.5 py-1 rounded-full bg-[#FAF5E5] border border-[#D09A40] text-xs font-bold text-[#0F172A]">
                  Booking Reference: #{bookingRefCode}
                </span>
                <h3 className="font-serif text-3xl font-bold text-[#0F172A]">
                  {paymentConfirmedHere ? `Booking Confirmed! Thank You, ${form.fullName}!` : `Almost there, ${form.fullName}!`}
                </h3>
                <p className="text-sm text-[#4A4A4A] max-w-md mx-auto">
                  {paymentConfirmedHere ? (
                    <>
                      Your appointment for <strong>{form.selectedService}</strong> on{' '}
                      <strong>{form.appointmentDate}</strong> at <strong>{form.timeSlot}</strong> is confirmed and the
                      advance payment has been verified.
                    </>
                  ) : (
                    <>
                      Your slot for <strong>{form.selectedService}</strong> on{' '}
                      <strong>{form.appointmentDate}</strong> at <strong>{form.timeSlot}</strong> is held, but the
                      booking is <strong>not confirmed</strong> until the advance payment is verified.
                    </>
                  )}
                </p>
              </div>

              {!paymentConfirmedHere && paymentNotice && (
                <div className="mx-auto flex max-w-md items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-left text-xs text-amber-900">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{paymentNotice}</span>
                </div>
              )}

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
                  <span className="font-semibold text-right">
                    {selectedStylist ? (
                      <button
                        type="button"
                        onClick={() => setProfileStylistId(selectedStylist.id)}
                        className="underline decoration-[#D09A40] underline-offset-2 cursor-pointer"
                      >
                        {selectedStylist.name}
                      </button>
                    ) : (
                      form.preferredStylist
                    )}
                  </span>
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
                {paymentRequired && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#4A4A4A]">Advance {paymentConfirmedHere ? 'paid' : 'due now'}:</span>
                      <span className="font-semibold text-[#D09A40]">{formatPrice(advanceRequired)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4A4A4A]">Remaining balance:</span>
                      <span className="font-semibold">{formatPrice(balanceAtDoorstep)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-[#4A4A4A]">Payment status:</span>
                  <span
                    className={`font-bold ${
                      paymentConfirmedHere ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {paymentConfirmedHere
                      ? 'Advance verified'
                      : serverBooking?.paymentStatus || paymentState || 'pending'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                {paymentConfirmedHere ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsSummaryModalOpen(true)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#0F172A] hover:bg-[#1E293B] text-[#FAF5E5] font-bold text-sm px-7 py-4 rounded-xl shadow-lg transition-all"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>View confirmation &amp; calendar</span>
                    </button>
                    <a
                      href={buildWhatsAppBookingUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm px-7 py-4 rounded-xl shadow-lg transition-all"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                      <span>Send confirmation on WhatsApp</span>
                    </a>
                  </>
                ) : (
                  <>
                    {paymentRequired && (
                      <button
                        type="button"
                        onClick={retryPayment}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#D09A40] hover:bg-[#B3822F] text-[#0F172A] font-bold text-sm px-7 py-4 rounded-xl shadow-lg transition-all"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Pay {formatPrice(advanceRequired)} now</span>
                      </button>
                    )}
                    {paymentRequired && (
                      <button
                        type="button"
                        onClick={() => setIsSummaryModalOpen(true)}
                        className="action-base secondary-action action-lg w-full sm:w-auto"
                      >
                        View booking status
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSubmitted(false);
                        setPaymentState('idle');
                        setPaymentNotice('');
                        setServerBooking(null);
                      }}
                      className="action-base secondary-action action-lg w-full sm:w-auto"
                    >
                      Modify Details
                    </button>
                  </>
                )}
              </div>

              {!paymentConfirmedHere && (
                <p className="mx-auto max-w-md text-[11px] leading-relaxed text-[#4A4A4A]">
                  Calendar downloads, confirmation notifications and the WhatsApp fast-lane unlock automatically once
                  the payment is verified.
                  {payConfig?.mock ? ' This environment is running the mock (test) payment provider.' : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <PaymentCheckout
        open={isCheckoutOpen && Boolean(checkoutBooking)}
        booking={checkoutBooking}
        config={payConfig}
        theme={{ accent: '#D09A40', primary: '#0F172A', background: '#FAF5E5', surface: '#FFFFFF' }}
        onClose={handleCheckoutClose}
        onConfirmed={handlePaymentConfirmed}
      />
      <BookingSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        bookingRef={bookingRefCode}
        form={form}
        serviceTitle={form.selectedService}
        price={formatPrice(totalEstimatedAmount)}
        confirmed={paymentConfirmedHere}
        paymentStatus={serverBooking?.paymentStatus || paymentState}
        salonName={payConfig?.mock ? `${brand.brandName} (test payments)` : brand.brandName}
        amountPaise={serverBooking?.amountPaise ?? Math.round(totalEstimatedAmount * 100)}
        advancePaise={serverBooking?.advancePaise ?? Math.round(advanceRequired * 100)}
        remainingPaise={serverBooking?.remainingPaise ?? Math.round(balanceAtDoorstep * 100)}
        stylistName={selectedStylist?.name || form.preferredStylist}
        onRetryPayment={retryPayment}
      />

      <StylistProfileModal
        profile={profileStylistData}
        selected={Boolean(profileStylist && form.preferredStylistId === profileStylist.id)}
        onClose={() => setProfileStylistId(null)}
        onSelect={(profile) => {
          handleStylistSelect(profile.id);
          setProfileStylistId(null);
        }}
      />
    </section>
  );
};
