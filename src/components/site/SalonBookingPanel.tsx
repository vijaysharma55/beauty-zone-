import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Lock,
  RefreshCw,
  Scissors,
  Star,
  Users,
} from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAvailability, type Slot } from '../../hooks/useAvailability';
import type { Salon, SalonService, SalonStaff } from '../../types/auth';
import { DEMO_PREVIEW_SERVICES } from '../../data/demoStaffData';
import { PaymentCheckout } from '../payment/PaymentCheckout';
import { StylistSelectGrid, type StylistOption } from '../StylistSelectGrid';
import { StylistProfileModal, staffToProfile, type StylistProfile } from '../StylistProfileModal';
import {
  formatPaise,
  getBookingConfirmation,
  getPaymentConfig,
  type BookingCreationResponse,
  type CheckoutBooking,
  type ConfirmationPayload,
  type PaymentConfig,
  type PaymentResponse,
} from '../../lib/payments';

interface SalonBookingPanelProps {
  salon: Salon;
  services: SalonService[];
  staff: SalonStaff[];
  accent: string;
  primary: string;
  background: string;
  surface: string;
  selectedStaffId?: string;
  onSelectStaffId?: (id: string) => void;
}

type SubmitState = 'idle' | 'submitting' | 'done' | 'failed';
type PaymentState = 'idle' | 'pending' | 'failed' | 'cancelled' | 'confirmed' | 'not_required';

const pad = (n: number) => String(n).padStart(2, '0');

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

/**
 * Shared booking panel rendered across all salon templates (`luxe`, `minimal`, `noir`, `blush`).
 *
 * - Unpublished websites render in preview-only mode (real booking disabled on both UI and API).
 * - Published websites automatically enable real salon staff selection and booking.
 */
export const SalonBookingPanel: React.FC<SalonBookingPanelProps> = ({
  salon,
  services,
  staff,
  accent,
  primary,
  background,
  surface,
  selectedStaffId,
  onSelectStaffId,
}) => {
  const isWebsiteLive = Boolean(salon.published && !salon.suspended);
  const panelRadius = 'rounded-2xl';
  const headingClass = 'font-serif';

  const bookableServices = useMemo(() => {
    const activeReal = services.filter((s) => s.active);
    if (isWebsiteLive) return activeReal;
    return activeReal.length > 0 ? activeReal : [...DEMO_PREVIEW_SERVICES];
  }, [services, isWebsiteLive]);

  const visibleStaff = useMemo(() => {
    if (isWebsiteLive) {
      return staff.filter((m) => m.active && !m.isDemo && m.bookingEnabled !== false);
    }
    return staff.filter((m) => m.active);
  }, [staff, isWebsiteLive]);

  const [serviceName, setServiceName] = useState(bookableServices[0]?.name || '');
  const [internalStaffId, setInternalStaffId] = useState('');
  const staffId = selectedStaffId !== undefined ? selectedStaffId : internalStaffId;
  const [stylist, setStylist] = useState('');
  const [profileStaffId, setProfileStaffId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitError, setSubmitError] = useState('');
  const [reference, setReference] = useState('');

  // Payment state — the server, never this component, decides confirmation.
  const [payConfig, setPayConfig] = useState<PaymentConfig | null>(null);
  const [serverBooking, setServerBooking] = useState<CheckoutBooking | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [paymentNotice, setPaymentNotice] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationPayload | null>(null);
  const [confirmationError, setConfirmationError] = useState('');

  useEffect(() => {
    if (!bookableServices.some((s) => s.name === serviceName)) {
      setServiceName(bookableServices[0]?.name || '');
    }
  }, [bookableServices, serviceName]);

  const staffOptions: StylistOption[] = useMemo(
    () =>
      visibleStaff.map((member) => ({
        id: member.id,
        name: member.name,
        role: member.roleTitle || '',
        photo: member.photoUrl || undefined,
        specialty: member.specialties?.[0],
        rating:
          member.rating !== null && member.rating !== undefined && Number(member.rating) > 0
            ? Number(member.rating)
            : null,
        reviewCount: Number(member.reviewCount) || 0,
        experience: member.experience || '',
        isDemo: Boolean(member.isDemo),
        bookingDisabled: !isWebsiteLive || Boolean(member.isDemo) || member.bookingEnabled === false,
      })),
    [visibleStaff, isWebsiteLive]
  );

  const selectedStaff = useMemo(
    () => (isWebsiteLive ? visibleStaff.find((member) => member.id === staffId && !member.isDemo) || null : null),
    [visibleStaff, staffId, isWebsiteLive]
  );

  useEffect(() => {
    setStylist(selectedStaff ? selectedStaff.name : '');
  }, [selectedStaff]);

  const profileStaff = useMemo(
    () => staff.find((member) => member.id === profileStaffId) || null,
    [staff, profileStaffId]
  );

  const branchLabel = [salon.addressLine, salon.city].filter(Boolean).join(', ');

  const profileStaffData: StylistProfile | null = useMemo(
    () => (profileStaff ? staffToProfile(profileStaff, { branch: branchLabel }) : null),
    [profileStaff, branchLabel]
  );

  /** Empty id means “any available specialist”. */
  const handleStaffSelect = (id: string) => {
    if (!isWebsiteLive) return;
    const member = visibleStaff.find((item) => item.id === id && !item.isDemo);
    const nextId = member ? member.id : '';
    setInternalStaffId(nextId);
    onSelectStaffId?.(nextId);
    setStylist(member ? member.name : '');
  };

  useEffect(() => {
    if (!isWebsiteLive) return;
    let active = true;
    getPaymentConfig(salon.slug)
      .then((config) => {
        if (active) setPayConfig(config);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isWebsiteLive, salon.slug]);

  const selectedService = useMemo(
    () => bookableServices.find((s) => s.name === serviceName) || bookableServices[0],
    [bookableServices, serviceName]
  );
  const duration = selectedService?.durationMinutes || 60;

  const availability = useAvailability({
    date: date || undefined,
    slug: salon.slug,
    durationMinutes: duration,
    enabled: Boolean(date && isWebsiteLive),
    // A preferred specialist narrows the bookable window to their own roster.
    staffId: selectedStaff ? selectedStaff.id : null,
  });

  const slots: Slot[] = availability.slots;
  const closedByStaffRoster = availability.reason === 'staff_closed';

  // Keep the chosen time valid as the generated grid changes.
  useEffect(() => {
    if (slots.length === 0) return;
    if (!slots.some((s) => s.label === time)) setTime(slots[0].label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  // Default to the next open day once slots are known.
  useEffect(() => {
    if (date) return;
    let cursor = new Date();
    for (let i = 0; i < 14; i += 1) {
      const iso = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
      if (iso >= todayIso()) {
        setDate(iso);
        break;
      }
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
  }, [date]);

  const whatsappUrl = useMemo(() => {
    const phoneRaw = (salon.whatsapp || salon.phone || '').replace(/[^\d]/g, '');
    const lines = [
      `Hello ${salon.name},`,
      `I'd like to book:`,
      reference ? `Ref: ${reference}` : null,
      `Service: ${serviceName}`,
      stylist ? `Specialist: ${stylist}` : null,
      `Date & time: ${date} at ${time || '—'}`,
      `Name: ${fullName}`,
      `Phone: ${phone}`,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    return phoneRaw ? `https://wa.me/${phoneRaw}?text=${encodeURIComponent(lines)}` : '';
  }, [salon, reference, serviceName, stylist, date, time, fullName, phone, notes]);

  const reset = () => {
    setFullName('');
    setPhone('');
    setNotes('');
    setErrors({});
    setSubmitState('idle');
    setSubmitError('');
    setServerBooking(null);
    setPaymentState('idle');
    setPaymentNotice('');
    setConfirmation(null);
    setConfirmationError('');
    setCheckoutOpen(false);
  };

  const salonPayment = payConfig?.salonPayment;
  const paymentAvailable = Boolean(payConfig?.available || salonPayment?.manualUpi?.enabled || salonPayment?.gateway?.available);
  const paymentRequired = Boolean(
    isWebsiteLive && paymentAvailable && (salonPayment?.advanceEnabled ?? payConfig?.advanceRequired) && selectedService?.price
  );
  const advancePercent = salonPayment?.advancePercent ?? payConfig?.advancePercent ?? 25;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!isWebsiteLive) {
      setSubmitState('failed');
      setSubmitError('Online booking is disabled while this salon website is unpublished.');
      return;
    }
    if (staffId && (staffId.startsWith('demo-') || selectedStaff?.isDemo)) {
      setSubmitState('failed');
      setSubmitError('Demo staff profiles are sample previews only and cannot be booked.');
      return;
    }

    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = 'Please enter your name.';
    if (phone.replace(/\D/g, '').length < 8) next.phone = 'Enter a valid phone number.';
    if (!date) next.date = 'Please choose a date.';
    if (availability.closed) {
      next.date = closedByStaffRoster
        ? 'The selected specialist is off on this day. Please pick another date or choose “Any available”.'
        : 'We are closed on this day.';
    }
    if (!time) next.time = 'Please choose a time.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitState('submitting');
    try {
      const res = await api.post<BookingCreationResponse>('/public/bookings', {
        slug: salon.slug,
        fullName: fullName.trim(),
        phone: phone.trim(),
        service: serviceName,
        serviceCategory: selectedService?.category || '',
        stylist: stylist || '',
        stylistId: staffId || null,
        date,
        time,
        locationType: 'salon',
        branch: salon.city || '',
        notes: notes.trim(),
        amountPaise: selectedService ? Math.round(selectedService.price * 100) : 0,
      });

      const booking = res.booking as CheckoutBooking;
      setReference(booking.reference || '');
      setServerBooking(booking);
      setSubmitState('done');

      if (res.payment?.required) {
        if (!payConfig) {
          try {
            setPayConfig(await getPaymentConfig(salon.slug));
          } catch {
            // The checkout can still render from the order itself.
          }
        }
        setPaymentState('pending');
        setPaymentNotice(
          `Pay ${formatPaise(res.payment.advancePaise)} now to confirm. The remaining ${formatPaise(
            res.payment.remainingPaise
          )} is payable at the salon.`
        );
        setCheckoutOpen(true);
      } else {
        setPaymentState('not_required');
        setPaymentNotice('Your request is saved. The salon will confirm your appointment.');
      }
    } catch (err) {
      console.error('[salon booking] failed', err);
      setSubmitState('failed');
      setSubmitError(errorMessage(err));
    }
  };

  const handlePaymentConfirmed = (result: PaymentResponse) => {
    const booking = (result.booking as CheckoutBooking | undefined) || serverBooking;
    if (booking) setServerBooking(booking);
    setPaymentState('confirmed');
    setCheckoutOpen(false);
    setPaymentNotice('Payment verified. Your appointment is confirmed.');
  };

  const handleCheckoutClose = (reason: 'dismissed' | 'cancelled') => {
    setCheckoutOpen(false);
    setPaymentState(reason === 'cancelled' ? 'cancelled' : 'pending');
    setPaymentNotice(
      reason === 'cancelled'
        ? 'Payment cancelled — the booking is not confirmed. You can retry the payment while the slot is held.'
        : 'Payment not completed — the booking stays unconfirmed until the advance is verified.'
    );
  };

  useEffect(() => {
    if (submitState !== 'done' || !serverBooking?.confirmed) return;
    let active = true;
    getBookingConfirmation(serverBooking.id)
      .then((data) => {
        if (active) {
          setConfirmation(data);
          setConfirmationError('');
        }
      })
      .catch((err) => {
        if (active) {
          setConfirmation(null);
          setConfirmationError(errorMessage(err));
        }
      });
    return () => {
      active = false;
    };
  }, [submitState, serverBooking?.confirmed, serverBooking?.id]);

  const downloadIcs = () => {
    const ics = confirmation?.calendar?.ics;
    if (!ics) return;
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `booking-${serverBooking?.reference || 'appointment'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: '0.75rem',
    border: `1px solid ${primary}22`,
    backgroundColor: background,
    color: primary,
    padding: '0.65rem 0.8rem',
    fontSize: '0.875rem',
    opacity: isWebsiteLive ? 1 : 0.7,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: `${primary}99`,
    marginBottom: '0.35rem',
  };

  if (isWebsiteLive && bookableServices.length === 0) return null;

  if (submitState === 'done') {
    const confirmed = paymentState === 'confirmed' && Boolean(serverBooking?.confirmed);
    const pending = !confirmed;
    return (
      <section id="book" className="scroll-mt-24 py-16" style={{ backgroundColor: `${accent}12` }}>
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div
            className={`${panelRadius} border p-8 text-center`}
            style={{ borderColor: confirmed ? `${accent}44` : '#fcd34d', backgroundColor: surface }}
          >
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={
                confirmed
                  ? { backgroundColor: 'rgba(16,185,129,0.14)', color: '#047857' }
                  : { backgroundColor: 'rgba(245,158,11,0.16)', color: '#b45309' }
              }
            >
              {confirmed ? <CheckCircle2 className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
            </div>
            <h2 className={`mt-4 ${headingClass} text-2xl font-bold`} style={{ color: primary }}>
              {confirmed ? 'Booking Confirmed!' : 'Awaiting payment'}
            </h2>
            <p className="mt-2 text-sm" style={{ color: `${primary}AA` }}>
              {confirmed ? (
                <>
                  Thanks {fullName.trim()}! {salon.name} has your appointment for{' '}
                  <strong>{serviceName}</strong> on <strong>{date}</strong> at <strong>{time}</strong>.
                </>
              ) : (
                <>
                  Your slot for <strong>{serviceName}</strong> on <strong>{date}</strong> at{' '}
                  <strong>{time}</strong> is held, but the booking is <strong>not confirmed</strong> until
                  the advance payment is verified.
                </>
              )}
            </p>
            {reference && (
              <p className="mt-3 text-xs font-mono font-semibold" style={{ color: accent }}>
                Reference: {reference}
              </p>
            )}
            <p className="mt-1 text-[11px]" style={{ color: `${primary}99` }}>
              Specialist: <strong style={{ color: primary }}>{stylist || 'Any available stylist'}</strong>
            </p>

            {pending && paymentNotice && (
              <div
                className="mx-auto mt-4 flex max-w-md items-start gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs"
                style={{ borderColor: '#fcd34d', backgroundColor: '#fffbeb', color: '#92400e' }}
              >
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{paymentNotice}</span>
              </div>
            )}

            {confirmed && (
              <div
                className="mx-auto mt-4 max-w-md rounded-xl border px-4 py-3 text-left text-xs"
                style={{ borderColor: `${primary}18`, backgroundColor: background }}
              >
                <div className="flex justify-between">
                  <span style={{ color: `${primary}99` }}>Advance paid</span>
                  <span className="font-semibold" style={{ color: primary }}>
                    {formatPaise(serverBooking?.advancePaise || 0)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span style={{ color: `${primary}99` }}>Balance at salon</span>
                  <span className="font-semibold" style={{ color: primary }}>
                    {formatPaise(serverBooking?.remainingPaise || 0)}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {confirmed && confirmation?.calendar?.googleUrl && (
                <a
                  href={confirmation.calendar.googleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="action-base primary-action action-md"
                >
                  <CalendarDays className="h-4 w-4" /> Add to Google Calendar
                </a>
              )}
              {confirmed && confirmation?.calendar?.ics && (
                <button type="button" onClick={downloadIcs} className="action-base secondary-action action-md">
                  <Download className="h-4 w-4" /> Download iCal
                </button>
              )}
              {!confirmed && selectedService && (
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(true)}
                  className="action-base primary-action action-md"
                >
                  <Lock className="h-4 w-4" /> Pay{' '}
                  {formatPaise(
                    serverBooking?.advancePaise ??
                      Math.round((selectedService.price * 100 * advancePercent) / 100)
                  )}{' '}
                  now
                </button>
              )}
              {confirmed &&
                (confirmation?.calendar?.whatsappUrl ? (
                  <a
                    href={confirmation.calendar.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="action-base secondary-action action-md"
                  >
                    Send confirmation on WhatsApp
                  </a>
                ) : whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="action-base secondary-action action-md"
                  >
                    Send on WhatsApp
                  </a>
                ) : null)}
              <button type="button" onClick={reset} className="action-base secondary-action action-md">
                Book another service
              </button>
            </div>

            {confirmationError && (
              <p className="mt-3 text-[11px]" style={{ color: '#b45309' }}>
                {confirmationError}
              </p>
            )}
            {pending && (
              <p className="mx-auto mt-4 max-w-md text-[11px] leading-relaxed" style={{ color: `${primary}77` }}>
                Calendar downloads and confirmation notifications unlock automatically after the server verifies
                the payment.
                {payConfig?.mock ? ' Test mode is active — no real money is charged.' : ''}
              </p>
            )}
          </div>
        </div>

        <PaymentCheckout
          open={checkoutOpen && Boolean(serverBooking)}
          booking={
            serverBooking
              ? {
                  ...serverBooking,
                  salonName: salon.name,
                  locationLabel: salon.city || salon.addressLine || '',
                }
              : null
          }
          config={payConfig}
          theme={{ accent, primary, background, surface }}
          onClose={handleCheckoutClose}
          onConfirmed={handlePaymentConfirmed}
        />
      </section>
    );
  }

  return (
    <section id="book" className="scroll-mt-24 py-16" style={{ backgroundColor: `${accent}12` }}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: accent }}>
          {isWebsiteLive ? 'Book an appointment' : 'Booking preview'}
        </p>
        <h2 className={`mt-1 ${headingClass} text-3xl font-bold`} style={{ color: primary }}>
          {isWebsiteLive ? 'Reserve your slot' : 'Appointment booking preview'}
        </h2>
        <p className="mt-2 max-w-xl text-sm" style={{ color: `${primary}99` }}>
          {isWebsiteLive
            ? "Pick a service, select your preferred specialist and choose a time that suits you — we'll confirm by phone or WhatsApp."
            : 'Preview how clients will browse your services and specialists. Online booking activates automatically once your salon website is published.'}
        </p>

        {!isWebsiteLive && (
          <div
            data-testid="booking-unpublished-banner"
            className={`mt-5 flex items-start gap-3 border p-4 ${panelRadius}`}
            style={{
              backgroundColor: '#FFFBEB',
              borderColor: '#F59E0B',
              color: '#78350F',
            }}
          >
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold uppercase tracking-wider text-amber-900">
                Website Unpublished · Real Booking Disabled
              </p>
              <p className="mt-0.5 text-amber-800">
                You can inspect every staff card and open <strong>View Full Profile</strong> below. Live client
                bookings unlock automatically as soon as your website is published.
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={submit}
          noValidate
          className={`mt-8 border p-5 sm:p-6 ${panelRadius}`}
          style={{ borderColor: `${accent}33`, backgroundColor: surface }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label style={labelStyle} htmlFor="sb-service">
                Service
              </label>
              <div className="relative">
                <Scissors
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: accent }}
                />
                <select
                  id="sb-service"
                  disabled={!isWebsiteLive}
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '2.25rem' }}
                >
                  {bookableServices.map((service) => (
                    <option key={service.id} value={service.name}>
                      {service.name} — {money(service.price)} · {service.durationMinutes} min
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  {staffOptions.some((s) => s.isDemo)
                    ? 'Sample Staff Preview (Demo · Not Bookable)'
                    : 'Select Preferred Stylist / Staff'}
                </label>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                  style={{ backgroundColor: `${accent}1A`, color: primary }}
                >
                  {!isWebsiteLive ? (
                    <>
                      <Lock className="h-3 w-3" style={{ color: accent }} />
                      Preview mode
                    </>
                  ) : selectedStaff ? (
                    <>
                      <Star className="h-3 w-3" style={{ color: accent, fill: accent }} />
                      {selectedStaff.name}
                    </>
                  ) : (
                    <>
                      <Users className="h-3 w-3" style={{ color: accent }} />
                      Any available
                    </>
                  )}
                </span>
              </div>

              <StylistSelectGrid
                options={staffOptions}
                selectedId={staffId}
                onSelect={handleStaffSelect}
                onViewProfile={(id) => setProfileStaffId(id)}
                accent={accent}
                primary={primary}
                background={background}
                surface={surface}
                bookingDisabled={!isWebsiteLive}
                anyLabel="Any Available Stylist"
                anyDescription="Best match for your service"
                emptyMessage="No specialist is accepting online bookings right now — we'll assign the best match."
                className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3"
              />

              <p className="mt-2 text-[11px] leading-snug" style={{ color: `${primary}88` }}>
                {!isWebsiteLive
                  ? 'Publish your website to activate real staff selection and client appointment scheduling.'
                  : selectedStaff
                    ? `${selectedStaff.name} will be reserved for your appointment.`
                    : "We'll assign the best specialist for your chosen service."}
              </p>
            </div>

            <div>
              <label style={labelStyle} htmlFor="sb-date">
                Date
              </label>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: accent }}
                />
                <input
                  id="sb-date"
                  type="date"
                  disabled={!isWebsiteLive}
                  min={todayIso()}
                  value={date}
                  onChange={(e) => {
                    setErrors((prev) => ({ ...prev, date: '' }));
                    setDate(e.target.value);
                  }}
                  style={{ ...inputStyle, paddingLeft: '2.25rem' }}
                />
              </div>
              {errors.date && <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.date}</p>}
              {isWebsiteLive && !errors.date && availability.open && availability.close && (
                <p className="mt-1 text-[11px]" style={{ color: `${primary}77` }}>
                  Open {availability.open} – {availability.close}
                </p>
              )}
            </div>

            <div>
              <label style={labelStyle} htmlFor="sb-time">
                Time
              </label>
              <div className="relative">
                <Clock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: accent }}
                />
                <select
                  id="sb-time"
                  value={time}
                  disabled={
                    !isWebsiteLive || availability.status === 'loading' || availability.closed || slots.length === 0
                  }
                  onChange={(e) => {
                    setErrors((prev) => ({ ...prev, time: '' }));
                    setTime(e.target.value);
                  }}
                  style={{ ...inputStyle, paddingLeft: '2.25rem' }}
                >
                  {!isWebsiteLive ? (
                    <option value="">Available after publishing</option>
                  ) : availability.status === 'loading' ? (
                    <option value={time}>{availability.retrying ? 'Retrying…' : 'Checking availability…'}</option>
                  ) : availability.closed ? (
                    <option value="">
                      {closedByStaffRoster ? 'This specialist is off on this day' : 'Closed on this day'}
                    </option>
                  ) : slots.length === 0 ? (
                    <option value="">No slots available</option>
                  ) : (
                    slots.map((slot) => (
                      <option key={slot.value} value={slot.label}>
                        {slot.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
              {errors.time && <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.time}</p>}
              {isWebsiteLive && availability.status === 'loading' && (
                <p className="mt-1 flex items-center gap-1.5 text-[11px]" style={{ color: `${primary}77` }}>
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading times…
                </p>
              )}
              {isWebsiteLive && availability.usingFallback && (
                <div
                  className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2"
                  style={{ borderColor: '#fcd34d', backgroundColor: '#fffbeb' }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: '#b45309' }} />
                  <p className="flex-1 text-[11px] leading-snug" style={{ color: '#92400e' }}>
                    Live availability is unreachable — showing standard times.
                  </p>
                  <button type="button" onClick={availability.reload} className="action-base inverted-action action-sm">
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle} htmlFor="sb-name">
                Your name
              </label>
              <input
                id="sb-name"
                disabled={!isWebsiteLive}
                value={fullName}
                onChange={(e) => {
                  setErrors((prev) => ({ ...prev, fullName: '' }));
                  setFullName(e.target.value);
                }}
                placeholder="Priya Sharma"
                style={inputStyle}
              />
              {errors.fullName && (
                <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label style={labelStyle} htmlFor="sb-phone">
                Phone
              </label>
              <input
                id="sb-phone"
                type="tel"
                inputMode="tel"
                disabled={!isWebsiteLive}
                value={phone}
                onChange={(e) => {
                  setErrors((prev) => ({ ...prev, phone: '' }));
                  setPhone(e.target.value);
                }}
                placeholder="+91 98000 12345"
                style={inputStyle}
              />
              {errors.phone && <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.phone}</p>}
            </div>
          </div>

          <div className="mt-4">
            <label style={labelStyle} htmlFor="sb-notes">
              Notes (optional)
            </label>
            <textarea
              id="sb-notes"
              rows={2}
              disabled={!isWebsiteLive}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, occasion, number of people…"
              style={{ ...inputStyle, minHeight: '72px' }}
            />
          </div>

          {selectedService && (
            <div
              className="mt-4 rounded-xl border px-3.5 py-3 text-sm"
              style={{ borderColor: `${accent}33`, backgroundColor: background, color: `${primary}AA` }}
            >
              <p>
                Estimated total{' '}
                <strong style={{ color: primary }}>{money(selectedService.price)}</strong> · {duration} minutes
              </p>
              {paymentRequired && (
                <p className="mt-1 text-xs">
                  Advance to confirm:{' '}
                  <strong style={{ color: primary }}>
                    {formatPaise(
                      Math.min(
                        Math.round(selectedService.price * 100),
                        Math.max(
                          Math.min(1000, Math.round(selectedService.price * 100)),
                          Math.round((selectedService.price * 100 * advancePercent) / 100)
                        )
                      )
                    )}
                  </strong>{' '}
                  ({advancePercent}%) · balance at the salon
                </p>
              )}
              {payConfig?.mock && isWebsiteLive && (
                <p className="mt-1 text-[11px] font-semibold" style={{ color: '#b45309' }}>
                  TEST MODE — No real money will be charged.
                </p>
              )}
            </div>
          )}

          {submitState === 'failed' && submitError && (
            <div
              className="mt-4 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
              style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2' }}
            >
              <p className="flex items-start gap-2 text-xs leading-snug" style={{ color: '#991b1b' }}>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </p>
              {isWebsiteLive && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="submit" className="action-base danger-action action-sm">
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </button>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="action-base primary-action action-sm"
                    >
                      Confirm on WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!isWebsiteLive || submitState === 'submitting'}
              className="action-base primary-action action-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!isWebsiteLive ? (
                <>
                  <Lock className="h-4 w-4" /> Booking Activates After Publishing
                </>
              ) : submitState === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending request…
                </>
              ) : (
                'Request appointment'
              )}
            </button>
            <p className="text-xs" style={{ color: `${primary}88` }}>
              {!isWebsiteLive
                ? 'Booking requests are disabled until this salon website is published.'
                : paymentRequired
                  ? `You will pay the ${advancePercent}% advance on the next step.`
                  : 'No online payment is configured — the salon will confirm your request.'}
            </p>
          </div>
        </form>
      </div>

      {/* Closed by default: opens only when clicking “View Full Profile” */}
      <StylistProfileModal
        profile={profileStaffData}
        selected={Boolean(profileStaff && staffId === profileStaff.id && isWebsiteLive)}
        websitePublished={isWebsiteLive}
        accent={accent}
        primary={primary}
        background={background}
        surface={surface}
        onClose={() => setProfileStaffId(null)}
        onSelect={(profile) => {
          if (!isWebsiteLive || profile.isDemo) return;
          handleStaffSelect(profile.id);
          setProfileStaffId(null);
        }}
      />
    </section>
  );
};

export default SalonBookingPanel;
