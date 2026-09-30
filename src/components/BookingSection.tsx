import React, { useState, useMemo } from 'react';
import { SALON_SERVICES, SALON_BRANCHES } from '../data/salonData';
import { BookingFormData, ServiceItem, ServiceMode } from '../types';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Sparkles, 
  X, 
  MessageSquare, 
  Home, 
  Store, 
  ShieldCheck, 
  QrCode, 
  Check, 
  AlertCircle,
  Copy,
  CreditCard,
  Navigation,
  Truck,
  Gift
} from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

interface BookingSectionProps {
  selectedServicePreload?: ServiceItem | null;
  selectedBundlePreload?: {
    title: string;
    price: number;
    services: string[];
  } | null;
  selectedStylistPreload?: string | null;
  onClearPreload?: () => void;
  onClearBundle?: () => void;
  onClearStylist?: () => void;
}

// Popular Jaipur localities with preset distance in km from nearest salon hub
const JAIPUR_LOCALITIES = [
  { name: 'C-Scheme / Civil Lines', km: 2 },
  { name: 'Bani Park / MI Road', km: 4 },
  { name: 'Malviya Nagar / WTP', km: 3 },
  { name: 'Vaishali Nagar / Chitrakoot', km: 3 },
  { name: 'Raja Park / Tilak Nagar', km: 5 },
  { name: 'Mansarovar / VT Road', km: 7 },
  { name: 'Durgapura / Tonk Road', km: 8 },
  { name: 'Jagatpura / Mahal Road', km: 11 },
  { name: 'Vidhyadhar Nagar', km: 13 },
  { name: 'Ajmer Road / Nirman Nagar', km: 9 },
  { name: 'Sitapura Industrial / RIICO', km: 18 },
  { name: 'Kukas / Palace Resorts (Fairmont/Leela)', km: 28 },
  { name: 'Samode / Outstation Palace', km: 42 },
  { name: 'Other / Custom Area in Jaipur', km: 6 },
];

export const BookingSection: React.FC<BookingSectionProps> = ({
  selectedServicePreload,
  selectedBundlePreload,
  selectedStylistPreload,
  onClearPreload,
  onClearBundle,
  onClearStylist,
}) => {
  const [serviceMode, setServiceMode] = useState<ServiceMode>('in-salon');
  
  // Home service address & distance state
  const [homeLocality, setHomeLocality] = useState<string>('C-Scheme / Civil Lines');
  const [homeAddress, setHomeAddress] = useState<string>('');
  const [distanceKm, setDistanceKm] = useState<number>(2);

  // Advance Payment Verification state
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [isAdvanceVerified, setIsAdvanceVerified] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  const [formData, setFormData] = useState<BookingFormData>({
    fullName: '',
    phone: '',
    email: '',
    serviceMode: 'in-salon',
    branch: 'c-scheme',
    homeAddress: '',
    homeLocality: 'C-Scheme / Civil Lines',
    distanceKm: 2,
    distanceFee: 250,
    advanceDepositRequired: 500,
    advancePaymentVerified: false,
    serviceCategory: selectedServicePreload ? selectedServicePreload.category : 'bridal',
    selectedService: selectedServicePreload ? selectedServicePreload.id : 'b1',
    preferredDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    preferredTime: '11:30 AM',
    artistLevel: selectedStylistPreload ? 'master' : 'senior',
    notes: selectedStylistPreload ? `Requested Artist: ${selectedStylistPreload}` : '',
  });

  const [confirmedBooking, setConfirmedBooking] = useState<{
    code: string;
    data: BookingFormData;
    serviceName: string;
    treatmentPrice: number;
    distanceFee: number;
    advancePaid: number;
    balancePayable: number;
  } | null>(null);

  // Sync if preload prop changes
  React.useEffect(() => {
    if (selectedServicePreload) {
      setFormData((prev) => ({
        ...prev,
        serviceCategory: selectedServicePreload.category,
        selectedService: selectedServicePreload.id,
      }));
    }
  }, [selectedServicePreload]);

  React.useEffect(() => {
    if (selectedStylistPreload) {
      setFormData((prev) => ({
        ...prev,
        artistLevel: 'master',
        notes: prev.notes && !prev.notes.includes(selectedStylistPreload) 
          ? `${prev.notes} (Requested Artist: ${selectedStylistPreload})` 
          : `Requested Artist: ${selectedStylistPreload}`,
      }));
    }
  }, [selectedStylistPreload]);

  // Calculate dynamic distance fee
  const calculateDistanceFee = (km: number): number => {
    if (km <= 5) return 250;
    if (km <= 15) return 250 + (km - 5) * 30;
    if (km <= 30) return 550 + (km - 15) * 40;
    return 1150 + (km - 30) * 50;
  };

  const dynamicDistanceFee = useMemo(() => {
    return serviceMode === 'at-home' ? calculateDistanceFee(distanceKm) : 0;
  }, [serviceMode, distanceKm]);

  const availableServices = SALON_SERVICES.filter(
    (s) => s.category === formData.serviceCategory
  );

  const currentService = SALON_SERVICES.find((s) => s.id === formData.selectedService) || availableServices[0];
  const currentBranch = SALON_BRANCHES.find((b) => b.id === formData.branch) || SALON_BRANCHES[0];

  // If a bundle is selected, use its bundled discounted price and title
  const treatmentPrice = selectedBundlePreload ? selectedBundlePreload.price : (currentService?.price || 4999);
  const treatmentTitle = selectedBundlePreload ? selectedBundlePreload.title : (currentService?.title || 'Selected Salon Service');
  
  // Mandatory advance deposit for home service: 20% or ₹500, rounded to nearest 50
  const advanceRequired = useMemo(() => {
    if (serviceMode !== 'at-home') return 0;
    const deposit = Math.max(500, Math.round((treatmentPrice * 0.2) / 50) * 50);
    return deposit;
  }, [serviceMode, treatmentPrice]);

  const totalPayable = treatmentPrice + dynamicDistanceFee;
  const balanceRemaining = totalPayable - (isAdvanceVerified ? advanceRequired : 0);

  // When locality changes, automatically set typical distance
  const handleLocalityChange = (locName: string) => {
    setHomeLocality(locName);
    const found = JAIPUR_LOCALITIES.find((l) => l.name === locName);
    if (found) {
      setDistanceKm(found.km);
    }
  };

  // Simulate or verify advance payment
  const handleVerifyAdvancePayment = () => {
    const code = `ADV-${Math.floor(100000 + Math.random() * 900000)}`;
    setVerificationCode(code);
    setIsAdvanceVerified(true);
    setIsVerifyingPayment(false);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('beautyzone.jaipur@icici');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.phone) {
      alert('Please provide your name and phone number.');
      return;
    }

    if (serviceMode === 'at-home') {
      if (!homeAddress.trim()) {
        alert('Please enter your complete doorstep address in Jaipur.');
        return;
      }
      if (!isAdvanceVerified) {
        setIsVerifyingPayment(true);
        return;
      }
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = serviceMode === 'at-home' ? `BZ-HOME-${randomSuffix}` : `BZ-JPR-${randomSuffix}`;

    const submissionData: BookingFormData = {
      ...formData,
      serviceMode,
      homeAddress,
      homeLocality,
      distanceKm,
      distanceFee: dynamicDistanceFee,
      advanceDepositRequired: advanceRequired,
      advancePaymentVerified: isAdvanceVerified,
      advancePaymentRef: verificationCode || undefined,
      advancePaymentMethod: paymentMethod,
    };

    setConfirmedBooking({
      code: bookingCode,
      data: submissionData,
      serviceName: treatmentTitle,
      treatmentPrice,
      distanceFee: dynamicDistanceFee,
      advancePaid: isAdvanceVerified ? advanceRequired : 0,
      balancePayable: balanceRemaining,
    });
  };

  return (
    <section id="booking" className="py-16 md:py-24 bg-white/70 border-t border-[#0F172A]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealOnScroll duration={0.6}>
          <div className="max-w-2xl mx-auto text-center mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Easy Salon & Home Service Booking</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Book Your Appointment at Beauty Zone Jaipur
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#4A4A4A]">
              Choose to visit any of our 3 Jaipur salons or book our professional home salon service right to your doorstep.
            </p>
          </div>
        </RevealOnScroll>

        {/* Main Central Booking Card with Glassmorphism & Hover Animations */}
        <RevealOnScroll delay={0.1} duration={0.65}>
          <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 p-6 sm:p-10 shadow-xl luxe-card-hover">
          {/* Active Preloaded Bundle Banner */}
          {selectedBundlePreload && (
            <div className="mb-8 p-4 rounded-xl bg-[#FAF5E5] border border-[#D09A40] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#D09A40]" />
                  <span className="font-bold text-[#0F172A] text-sm">{selectedBundlePreload.title}</span>
                  <span className="font-mono font-bold text-[#D09A40] bg-white px-2 py-0.5 rounded shadow-2xs">
                    ₹{selectedBundlePreload.price.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[#4A4A4A]">
                  Bundled Services: {selectedBundlePreload.services.join(' · ')}
                </p>
              </div>
              {onClearBundle && (
                <button
                  type="button"
                  onClick={onClearBundle}
                  className="text-[#4A4A4A] hover:text-[#0F172A] font-semibold text-xs cursor-pointer underline self-start sm:self-auto shrink-0"
                >
                  Clear Bundle
                </button>
              )}
            </div>
          )}

          {/* Active Preloaded Stylist Banner */}
          {selectedStylistPreload && (
            <div className="mb-6 p-3.5 rounded-xl bg-[#FAF5E5] border border-[#D09A40] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D09A40]" />
                <span className="text-[#0F172A]">
                  Requested Master Stylist: <strong className="font-bold">{selectedStylistPreload}</strong> (Master Tier Allocated)
                </span>
              </div>
              {onClearStylist && (
                <button
                  type="button"
                  onClick={onClearStylist}
                  className="text-[#4A4A4A] hover:text-[#0F172A] font-semibold text-xs cursor-pointer underline"
                >
                  Clear Stylist
                </button>
              )}
            </div>
          )}

          {/* Prominent Mode Selector: In-Salon vs At-Home Doorstep */}
          <div className="mb-8">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4A4A] mb-3">
              Where would you like your service?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setServiceMode('in-salon')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  serviceMode === 'in-salon'
                    ? 'border-[#0F172A] bg-[#FAF5E5] ring-1 ring-[#0F172A] shadow-xs'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${serviceMode === 'in-salon' ? 'bg-[#0F172A] text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base font-bold text-[#0F172A]">Visit Our Salon</span>
                    {serviceMode === 'in-salon' && <span className="text-[10px] bg-[#0F172A] text-white px-2 py-0.5 rounded font-sans">Selected</span>}
                  </div>
                  <p className="text-xs text-[#4A4A4A] mt-1 leading-relaxed">
                    Visit us in C-Scheme, Malviya Nagar, or Vaishali Nagar. Pay comfortably after your service.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setServiceMode('at-home')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  serviceMode === 'at-home'
                    ? 'border-[#D09A40] bg-[#FAF5E5] ring-1 ring-[#D09A40] shadow-xs'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${serviceMode === 'at-home' ? 'bg-[#D09A40] text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base font-bold text-[#0F172A]">Home Salon Service</span>
                    {serviceMode === 'at-home' && <span className="text-[10px] bg-[#D09A40] text-white px-2 py-0.5 rounded font-sans">Selected</span>}
                  </div>
                  <p className="text-xs text-[#4A4A4A] mt-1 leading-relaxed">
                    Certified artist visits your home or hotel with a clean vanity kit and professional lighting.
                  </p>
                  <span className="inline-block mt-2 text-[10px] text-[#D09A40] font-semibold bg-[#D09A40]/10 px-2 py-0.5 rounded">
                    Small Travel Charge · Small Advance Token Required
                  </span>
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Personal Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#4A4A4A] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Radhika Sharma"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-[#0F172A]/15 rounded-lg focus:outline-none focus:border-[#D09A40] focus:ring-1 focus:ring-[#D09A40]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Phone / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#4A4A4A] absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98290 XXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-[#0F172A]/15 rounded-lg focus:outline-none focus:border-[#D09A40] focus:ring-1 focus:ring-[#D09A40]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#4A4A4A] absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-[#0F172A]/15 rounded-lg focus:outline-none focus:border-[#D09A40] focus:ring-1 focus:ring-[#D09A40]"
                  />
                </div>
              </div>
            </div>

            {/* In-Salon Specific Branch Picker */}
            {serviceMode === 'in-salon' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 p-4 bg-[#FAF5E5]/60 rounded-xl border border-[#0F172A]/10">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Preferred Jaipur Salon Branch *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#4A4A4A] absolute left-3 top-3" />
                    <select
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#0F172A]/15 rounded-lg focus:outline-none focus:border-[#D09A40] focus:ring-1 focus:ring-[#D09A40] bg-white cursor-pointer"
                    >
                      {SALON_BRANCHES.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} — {b.locality} ({b.address})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* At-Home Specific: Dynamic Distance Calculator & Address */}
            {serviceMode === 'at-home' && (
              <div className="p-5 bg-[#FAF5E5] rounded-xl border border-[#D09A40]/40 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#0F172A]/10">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#D09A40]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                      Jaipur Home Service & Distance Calculator
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#D09A40]">
                    Travel Charge: ₹{dynamicDistanceFee}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Your Area in Jaipur *
                    </label>
                    <select
                      value={homeLocality}
                      onChange={(e) => handleLocalityChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#0F172A]/15 rounded-lg focus:outline-none focus:border-[#D09A40] bg-white cursor-pointer"
                    >
                      {JAIPUR_LOCALITIES.map((loc) => (
                        <option key={loc.name} value={loc.name}>
                          {loc.name} (~{loc.km} km)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[#0F172A]">
                        Distance from Nearest Salon
                      </label>
                      <span className="text-xs font-mono font-bold text-[#0F172A]">
                        {distanceKm} km
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="45"
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(Number(e.target.value))}
                        className="w-full accent-[#D09A40] cursor-pointer"
                      />
                      <span className="text-xs font-mono font-medium text-neutral-600 w-12 shrink-0 text-right">
                        {distanceKm} km
                      </span>
                    </div>
                    <p className="text-[10px] text-[#4A4A4A] mt-1">
                      Rate: {distanceKm <= 5 ? 'Up to 5 km (₹250 flat)' : distanceKm <= 15 ? '5-15 km (₹250 + ₹30/km)' : distanceKm <= 30 ? '15-30 km (₹550 + ₹40/km)' : 'Outstation / Palace Resort (₹1,150 + ₹50/km)'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Complete Address in Jaipur (House / Flat / Hotel / Wedding Venue) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. House No. 14, Near Amrapali Circle, Vaishali Nagar, Jaipur"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#0F172A]/15 rounded-lg focus:outline-none focus:border-[#D09A40] bg-white"
                  />
                </div>

                {/* Hygiene & Kit Badge */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#4A4A4A] pt-2 border-t border-[#0F172A]/10">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Single-use clean disposable towels & cape</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Bright portable ring light for perfect makeup</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified & experienced female beauty artists</span>
                  </div>
                </div>
              </div>
            )}

            {/* Service & Treatment Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Service Category *
                </label>
                <select
                  value={formData.serviceCategory}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    const firstOfCat = SALON_SERVICES.find((s) => s.category === newCat);
                    setFormData({
                      ...formData,
                      serviceCategory: newCat,
                      selectedService: firstOfCat ? firstOfCat.id : '',
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#0F172A]/15 rounded-lg focus:outline-none focus:border-[#D09A40] focus:ring-1 focus:ring-[#D09A40] bg-white cursor-pointer"
                >
                  <option value="bridal">Bridal Makeup & Draping</option>
                  <option value="hair">Hair Care, Botox & Color</option>
                  <option value="skin">Skin Facials & HydraFacial</option>
                  <option value="nails">Nail Extensions & Manicure</option>
                  <option value="spa">Body Scrub & Milk Spa</option>
                  <option value="academy">Professional Makeup Course</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Select Service *
                </label>
                <select
                  value={formData.selectedService}
                  onChange={(e) => setFormData({ ...formData, selectedService: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#0F172A]/15 rounded-lg focus:outline-none focus:border-[#D09A40] focus:ring-1 focus:ring-[#D09A40] bg-white cursor-pointer"
                >
                  {availableServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} (₹{s.price.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Schedule & Artist Tier */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Preferred Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#4A4A4A] absolute left-3 top-3" />
                  <input
                    type="date"
                    required
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-[#0F172A]/15 rounded-lg focus:outline-none focus:border-[#D09A40] bg-white cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Preferred Time Slot *
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-[#4A4A4A] absolute left-3 top-3" />
                  <select
                    value={formData.preferredTime}
                    onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-[#0F172A]/15 rounded-lg focus:outline-none focus:border-[#D09A40] bg-white cursor-pointer"
                  >
                    <option value="09:00 AM">09:00 AM - Morning Slot</option>
                    <option value="11:00 AM">11:00 AM - Late Morning</option>
                    <option value="01:30 PM">01:30 PM - Afternoon</option>
                    <option value="04:00 PM">04:00 PM - Evening</option>
                    <option value="06:30 PM">06:30 PM - Late Evening</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Artist Level
                </label>
                <select
                  value={formData.artistLevel}
                  onChange={(e) => setFormData({ ...formData, artistLevel: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#0F172A]/15 rounded-lg focus:outline-none focus:border-[#D09A40] bg-white cursor-pointer"
                >
                  <option value="senior">Senior Salon Artist</option>
                  <option value="master">Master Bridal Artist</option>
                  <option value="director">Lead Stylist</option>
                </select>
              </div>
            </div>

            {/* Special Requests / Notes */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Special Requests or Landmark (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="E.g. Nearby landmark, hotel room number, hair type, or specific timing requirements..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#0F172A]/15 rounded-lg focus:outline-none focus:border-[#D09A40]"
              />
            </div>

            {/* Mandatory Advance Payment Notice Card for Home Services */}
            {serviceMode === 'at-home' && (
              <div className="p-4 rounded-xl border bg-amber-50/70 border-amber-200 text-xs text-[#0F172A] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span className="font-bold text-amber-900">
                      Advance Token Policy for Home Service
                    </span>
                  </div>
                  {isAdvanceVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      <Check className="w-3.5 h-3.5" />
                      Paid & Verified (Ref: {verificationCode})
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      Pending Advance Token: ₹{advanceRequired}
                    </span>
                  )}
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  To confirm your home booking and schedule the artist, a small advance token deposit of ₹{advanceRequired} is required. The remaining balance (₹{balanceRemaining}) can be paid comfortably at your home after your service.
                </p>

                {!isAdvanceVerified && (
                  <button
                    type="button"
                    onClick={() => setIsVerifyingPayment(true)}
                    className="mt-2 px-4 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay Advance Token (₹{advanceRequired})</span>
                  </button>
                )}
              </div>
            )}

            {/* Real-time Rate Breakdown & Confirmation Bar */}
            <div className="pt-4 border-t border-[#0F172A]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-[#4A4A4A]">Total Estimated Amount:</span>
                  <span className="text-2xl font-bold text-[#0F172A] tabular-nums">
                    ₹{totalPayable.toLocaleString('en-IN')}
                  </span>
                  {serviceMode === 'at-home' && (
                    <span className="text-[11px] text-[#4A4A4A]">
                      (Service ₹{treatmentPrice} + Travel ₹{dynamicDistanceFee})
                    </span>
                  )}
                </div>

                {serviceMode === 'at-home' ? (
                  <div className="text-[11px] flex items-center gap-2">
                    <span className="text-amber-900 font-semibold">
                      Advance: ₹{advanceRequired} {isAdvanceVerified ? '✓ Paid' : '(Required)'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-neutral-600">
                      Balance to pay at home: ₹{balanceRemaining}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                    Pay at salon after service
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl luxe-btn shadow-sm cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
              >
                {serviceMode === 'at-home' ? (
                  isAdvanceVerified ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Confirm Home Booking</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#D09A40]" />
                      <span>Pay Advance Token & Book</span>
                    </>
                  )
                ) : (
                  <span>Confirm Salon Booking</span>
                )}
              </button>
            </div>
          </form>
        </div>
        </RevealOnScroll>
      </div>

      {/* Mandatory Advance Payment Verification Modal */}
      {isVerifyingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsVerifyingPayment(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-black p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#0F172A]">
                Pay Advance Token
              </h3>
              <p className="text-xs text-[#4A4A4A] mt-1">
                Required for Home Service visit to {homeLocality} (~{distanceKm} km)
              </p>
            </div>

            {/* Payment Summary */}
            <div className="bg-[#FAF5E5] rounded-xl p-3.5 text-xs space-y-1.5 mb-5 border border-[#D09A40]/30">
              <div className="flex justify-between">
                <span className="text-[#4A4A4A]">Service:</span>
                <span className="font-semibold">{currentService?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A4A4A]">Travel Charge:</span>
                <span className="font-semibold font-mono">₹{dynamicDistanceFee}</span>
              </div>
              <div className="flex justify-between border-t border-[#0F172A]/10 pt-1.5 font-bold text-[#0F172A]">
                <span>Advance Token Amount:</span>
                <span className="text-sm font-mono text-[#D09A40]">₹{advanceRequired}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="flex items-center gap-2 mb-4 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`flex-1 py-1.5 px-3 rounded-lg border font-semibold cursor-pointer transition-colors ${
                  paymentMethod === 'upi' ? 'bg-[#0F172A] text-white border-[#0F172A]' : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                }`}
              >
                Instant UPI / QR
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 py-1.5 px-3 rounded-lg border font-semibold cursor-pointer transition-colors ${
                  paymentMethod === 'card' ? 'bg-[#0F172A] text-white border-[#0F172A]' : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                }`}
              >
                Card / NetBanking
              </button>
            </div>

            {/* UPI View */}
            {paymentMethod === 'upi' && (
              <div className="space-y-4 text-center">
                {/* Simulated QR Code Canvas */}
                <div className="w-40 h-40 bg-neutral-100 border-2 border-dashed border-[#D09A40] rounded-xl mx-auto flex flex-col items-center justify-center p-3 relative">
                  <QrCode className="w-24 h-24 text-[#0F172A]" />
                  <span className="text-[10px] text-neutral-500 font-mono mt-1">Scan via GPay / PhonePe / Paytm</span>
                </div>

                {/* VPA Handle with copy */}
                <div className="flex items-center justify-between bg-neutral-100 rounded-lg p-2 text-xs">
                  <span className="font-mono text-neutral-700 text-[11px]">beautyzone.jaipur@icici</span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="text-xs text-[#D09A40] font-bold flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                  </button>
                </div>

                {/* Simulation / Auto-Verification button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleVerifyAdvancePayment}
                    className="w-full py-3 px-4 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Pay Advance Token (₹{advanceRequired})</span>
                  </button>
                  <p className="text-[10px] text-neutral-500 mt-2">
                    Instant confirmation. Your booking reference will be generated immediately.
                  </p>
                </div>
              </div>
            )}

            {/* Card / NetBanking View */}
            {paymentMethod === 'card' && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Card Number (4000 1234 5678 9010)"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-[#D09A40]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="MM / YY"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-[#D09A40]"
                  />
                  <input
                    type="password"
                    maxLength={3}
                    placeholder="CVV"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-[#D09A40]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyAdvancePayment}
                  className="w-full mt-2 py-3 px-4 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors cursor-pointer"
                >
                  Pay ₹{advanceRequired} & Confirm
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-modal-enter">
            <button
              onClick={() => setConfirmedBooking(null)}
              className="absolute top-4 right-4 text-[#4A4A4A] hover:text-[#0F172A] p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3 animate-success-pop">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#0F172A]">
                {confirmedBooking.data.serviceMode === 'at-home' ? 'Home Service Booking Confirmed!' : 'Salon Appointment Confirmed!'}
              </h3>
              <p className="text-xs text-[#4A4A4A] mt-1">
                Booking Reference: <span className="font-mono font-bold text-[#D09A40]">{confirmedBooking.code}</span>
              </p>
            </div>

            <div className="mt-6 bg-[#FAF5E5] rounded-xl p-4 text-xs space-y-2 text-[#0F172A]">
              <div className="flex justify-between border-b border-[#0F172A]/10 pb-1.5">
                <span className="text-[#4A4A4A]">Booking Type:</span>
                <span className="font-bold text-[#0F172A]">
                  {confirmedBooking.data.serviceMode === 'at-home' ? '🏠 Home Salon Service' : '🏛 In-Salon Appointment'}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#0F172A]/10 pb-1.5">
                <span className="text-[#4A4A4A]">Customer:</span>
                <span className="font-semibold">{confirmedBooking.data.fullName} ({confirmedBooking.data.phone})</span>
              </div>
              <div className="flex justify-between border-b border-[#0F172A]/10 pb-1.5">
                <span className="text-[#4A4A4A]">Service:</span>
                <span className="font-semibold text-right">{confirmedBooking.serviceName}</span>
              </div>

              {confirmedBooking.data.serviceMode === 'at-home' ? (
                <>
                  <div className="flex justify-between border-b border-[#0F172A]/10 pb-1.5">
                    <span className="text-[#4A4A4A]">Service Address:</span>
                    <span className="font-semibold text-right max-w-[220px] truncate">{confirmedBooking.data.homeAddress}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#0F172A]/10 pb-1.5">
                    <span className="text-[#4A4A4A]">Distance & Travel Charge:</span>
                    <span className="font-semibold tabular-nums">{confirmedBooking.data.distanceKm} km (₹{confirmedBooking.distanceFee})</span>
                  </div>
                  <div className="flex justify-between border-b border-[#0F172A]/10 pb-1.5 text-emerald-800">
                    <span className="font-semibold">Advance Token Paid:</span>
                    <span className="font-bold tabular-nums">✓ ₹{confirmedBooking.advancePaid} (Ref: {confirmedBooking.data.advancePaymentRef})</span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-sm">
                    <span className="text-[#4A4A4A]">Balance to Pay at Home:</span>
                    <span className="tabular-nums text-[#0F172A]">₹{confirmedBooking.balancePayable.toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between border-b border-[#0F172A]/10 pb-1.5">
                    <span className="text-[#4A4A4A]">Salon Branch:</span>
                    <span className="font-semibold">{currentBranch.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#0F172A]/10 pb-1.5">
                    <span className="text-[#4A4A4A]">Appointment Date & Time:</span>
                    <span className="font-semibold">{confirmedBooking.data.preferredDate} at {confirmedBooking.data.preferredTime}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-[#4A4A4A]">Payable at Salon:</span>
                    <span className="font-bold text-sm text-[#0F172A] tabular-nums">₹{confirmedBooking.treatmentPrice.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/919829012345?text=Hello%20Beauty%20Zone%20Jaipur,%20I%20have%20confirmed%20my%20${confirmedBooking.data.serviceMode === 'at-home' ? 'Home%20Salon' : 'In-Salon'}%20Booking%20for%20${encodeURIComponent(confirmedBooking.serviceName)}%20(Ref:%20${confirmedBooking.code}).%20Scheduled%20Date:%20${confirmedBooking.data.preferredDate}.`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Details on WhatsApp</span>
              </a>
              <button
                onClick={() => setConfirmedBooking(null)}
                className="py-2.5 px-4 text-xs font-semibold text-[#0F172A] bg-white border border-[#0F172A]/20 hover:bg-[#FAF5E5] rounded-lg transition-colors cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
