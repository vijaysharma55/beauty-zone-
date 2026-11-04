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
  User as UserIcon,
} from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAvailability, type Slot } from '../../hooks/useAvailability';
import type { Salon, SalonService, SalonStaff } from '../../types/auth';
import { PaymentCheckout } from '../payment/PaymentCheckout';
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
 * Booking panel rendered on a published salon website.
 *
 * - Slots come from the salon's own opening hours via /api/public/availability.
 * - Only specialists flagged `bookingEnabled` can be selected.
 * - Requests are persisted server-side and appear in the owner's dashboard, so
 *   there is no gap between what a visitor submits and what the owner sees.
 * - If the availability service is unreachable the picker still works from a
 *   static grid, and a failure to save exposes a Retry + WhatsApp recovery path.
 */
export const SalonBookingPanel: React.FC<SalonBookingPanelProps> = ({
  salon,
  services,
  staff,
  accent,
  primary,
  background,
  surface,
}) => {
  const bookableServices = useMemo(() => services.filter((s) => s.active), [services]);
  const bookableStaff = useMemo(
    () => staff.filter((m) => m.active && m.bookingEnabled !== false),
    [staff]
  );

  const [serviceName, setServiceName] = useState(bookableServices[0]?.name || '');
  const [stylist, setStylist] = useState('');
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
    let active = true;
    getPaymentConfig()
      .then((config) => {
        if (active) setPayConfig(config);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const selectedService = useMemo(
    () => bookableServices.find((s) => s.name === serviceName) || bookableServices[0],
    [bookableServices, serviceName]
  );
  const duration = selectedService?.durationMinutes || 60;

  const availability = useAvailability({
    date: date || undefined,
    slug: salon.slug,
    durationMinutes: duration,
    enabled: Boolean(date),
  });

  const slots: Slot[] = availability.slots;

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

  const paymentRequired = Boolean(payConfig?.available && payConfig?.advanceRequired && selectedService?.price);
  const advancePercent = payConfig?.advancePercent ?? 25;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = 'Please enter your name.';
    if (phone.replace(/\D/g, '').length < 8) next.phone = 'Enter a valid phone number.';
    if (!date) next.date = 'Please choose a date.';
    if (availability.closed) next.date = 'We are closed on this day.';
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
        date,
        time,
        locationType: 'salon',
        branch: salon.city || '',
        notes: notes.trim(),
        // The server overrides this with the salon's published price.
        amountPaise: selectedService ? Math.round(selectedService.price * 100) : 0,
      });

      const booking = res.booking as CheckoutBooking;
      setReference(booking.reference || '');
      setServerBooking(booking);
      setSubmitState('done');

      if (res.payment?.required) {
        if (!payConfig) {
          try {
            setPayConfig(await getPaymentConfig());
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

  // Calendar / confirmation details come from the server, which refuses to
  // return them for an unpaid booking.
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

  if (bookableServices.length === 0) return null;

  if (submitState === 'done') {
    const confirmed = paymentState === 'confirmed' && Boolean(serverBooking?.confirmed);
    const pending = !confirmed;
    return (
      <section id="book" className="scroll-mt-24 py-16" style={{ backgroundColor: `${accent}12` }}>
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div
            className="rounded-2xl border p-8 text-center"
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
            <h2 className="mt-4 font-serif text-2xl font-bold" style={{ color: primary }}>
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
              <div className="mx-auto mt-4 max-w-md rounded-xl border px-4 py-3 text-left text-xs" style={{ borderColor: `${primary}18`, backgroundColor: background }}>
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
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="action-base secondary-action action-md">
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
          Book an appointment
        </p>
        <h2 className="mt-1 font-serif text-3xl font-bold" style={{ color: primary }}>
          Reserve your slot
        </h2>
        <p className="mt-2 max-w-xl text-sm" style={{ color: `${primary}99` }}>
          Pick a service, choose a time that suits you, and we'll confirm by phone or WhatsApp.
        </p>

        <form
          onSubmit={submit}
          noValidate
          className="mt-8 rounded-2xl border p-5 sm:p-6"
          style={{ borderColor: `${accent}33`, backgroundColor: surface }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
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

            <div>
              <label style={labelStyle} htmlFor="sb-stylist">
                Specialist
              </label>
              <div className="relative">
                <UserIcon
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: accent }}
                />
                <select
                  id="sb-stylist"
                  value={stylist}
                  onChange={(e) => setStylist(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '2.25rem' }}
                >
                  <option value="">First available specialist</option>
                  {bookableStaff.map((member) => (
                    <option key={member.id} value={member.name}>
                      {member.name}
                      {member.roleTitle ? ` — ${member.roleTitle}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {bookableStaff.length === 0 && (
                <p className="mt-1 text-[11px]" style={{ color: `${primary}77` }}>
                  No specialist is accepting online bookings right now — we'll assign the best match.
                </p>
              )}
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
              {!errors.date && availability.open && availability.close && (
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
                  disabled={availability.status === 'loading' || availability.closed || slots.length === 0}
                  onChange={(e) => {
                    setErrors((prev) => ({ ...prev, time: '' }));
                    setTime(e.target.value);
                  }}
                  style={{ ...inputStyle, paddingLeft: '2.25rem' }}
                >
                  {availability.status === 'loading' ? (
                    <option value={time}>{availability.retrying ? 'Retrying…' : 'Checking availability…'}</option>
                  ) : availability.closed ? (
                    <option value="">Closed on this day</option>
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
              {availability.status === 'loading' && (
                <p className="mt-1 flex items-center gap-1.5 text-[11px]" style={{ color: `${primary}77` }}>
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading times…
                </p>
              )}
              {availability.usingFallback && (
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, occasion, number of people…"
              style={{ ...inputStyle, minHeight: '72px' }}
            />
          </div>

          {selectedService && (
            <div className="mt-4 rounded-xl border px-3.5 py-3 text-sm" style={{ borderColor: `${accent}33`, backgroundColor: background, color: `${primary}AA` }}>
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
              {payConfig?.mock && (
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
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={submitState === 'submitting'} className="action-base primary-action action-md">
              {submitState === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending request…
                </>
              ) : (
                'Request appointment'
              )}
            </button>
            <p className="text-xs" style={{ color: `${primary}88` }}>
              {paymentRequired
                ? `You will pay the ${advancePercent}% advance on the next step.`
                : 'No online payment is configured — the salon will confirm your request.'}
            </p>
          </div>
        </form>
      </div>
    </section>
  );
};

export default SalonBookingPanel;
