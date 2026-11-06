import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarClock, Clock, CreditCard, History as HistoryIcon, MapPin, RefreshCw, User } from 'lucide-react';
import { PaymentCheckout } from '../payment/PaymentCheckout';
import { getPaymentConfig, type CheckoutBooking, type PaymentConfig, type PaymentResponse } from '../../lib/payments';
import { Alert, Badge, Button, Card, EmptyState, cn, formatCurrency } from '../ui';
import {
  APPOINTMENT_FILTERS,
  describeHistoryError,
  fetchAppointmentHistory,
  type Appointment,
  type AppointmentDisplayStatus,
  type AppointmentFilter,
} from '../../lib/appointmentHistory';

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<AppointmentDisplayStatus, { label: string; tone: 'gold' | 'green' | 'red' | 'amber' | 'slate' }> = {
  upcoming: { label: 'Upcoming', tone: 'gold' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  no_show: { label: 'No-show', tone: 'amber' },
  past: { label: 'Past', tone: 'slate' },
};

const EMPTY_COPY: Record<AppointmentFilter, { title: string; description: string }> = {
  all: { title: 'No appointments yet', description: 'Once you book a visit with the number you signed in with, it will appear here.' },
  upcoming: { title: 'No upcoming appointments', description: 'Book your next visit and it will show up here.' },
  completed: { title: 'No completed visits yet', description: 'Your finished appointments will be listed here.' },
  cancelled: { title: 'No cancelled appointments', description: 'Cancelled or declined bookings would appear here.' },
  no_show: { title: 'No missed appointments', description: 'Nothing to show here.' },
};

const isValidDate = (d: Date) => !Number.isNaN(d.getTime());

const formatLongDate = (a: Appointment) =>
  isValidDate(a.bookingAt)
    ? a.bookingAt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : a.bookingDate;

const DateTile: React.FC<{ appointment: Appointment }> = ({ appointment }) => {
  const valid = isValidDate(appointment.bookingAt);
  return (
    <div
      className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-[#D09A40]/30 bg-[#FAF5E5] text-[#0F172A]"
      aria-hidden="true"
    >
      <span className="text-lg font-bold leading-none">{valid ? appointment.bookingAt.getDate() : '—'}</span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a641f]">
        {valid ? appointment.bookingAt.toLocaleDateString('en-IN', { month: 'short' }) : ''}
      </span>
    </div>
  );
};

const AppointmentCard: React.FC<{ appointment: Appointment; onPay: (appointment: Appointment) => void }> = ({ appointment, onPay }) => {
  const badge = STATUS_BADGE[appointment.status];
  return (
    <li>
      <Card className="flex items-start gap-4 p-4 sm:p-5">
        <DateTile appointment={appointment} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h3 className="font-serif text-base font-bold text-[#0F172A] sm:text-lg">{appointment.serviceName}</h3>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
          <dl className="mt-2 grid gap-1.5 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Date and time</dt>
              <CalendarClock className="h-4 w-4 shrink-0 text-[#8a641f]" aria-hidden="true" />
              <dd>
                {formatLongDate(appointment)}
                {appointment.bookingTime ? (
                  <>
                    <span aria-hidden="true"> · </span>
                    <Clock className="mx-1 inline h-3.5 w-3.5 align-[-2px] text-slate-400" aria-hidden="true" />
                    {appointment.bookingTime}
                  </>
                ) : null}
              </dd>
            </div>
            {appointment.staffName ? (
              <div className="flex items-center gap-2">
                <dt className="sr-only">Stylist</dt>
                <User className="h-4 w-4 shrink-0 text-[#8a641f]" aria-hidden="true" />
                <dd>{appointment.staffName}</dd>
              </div>
            ) : null}
            {appointment.salonName ? (
              <div className="flex items-center gap-2">
                <dt className="sr-only">Salon</dt>
                <MapPin className="h-4 w-4 shrink-0 text-[#8a641f]" aria-hidden="true" />
                <dd>{appointment.salonName}</dd>
              </div>
            ) : null}
          </dl>
          {appointment.paymentStatus === 'verification_pending' && <p className="mt-3 text-xs font-semibold text-amber-700">Payment submitted · awaiting salon verification</p>}
          {['pending_payment', 'payment_failed'].includes(appointment.rawStatus) && (
            <Button size="sm" variant="gold" className="mt-3" onClick={() => onPay(appointment)}><CreditCard className="h-3.5 w-3.5" />Complete payment</Button>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Price</p>
          <p className="text-base font-bold text-[#0F172A]">
            {appointment.pricePaise > 0 ? formatCurrency(appointment.pricePaise) : '—'}
          </p>
        </div>
      </Card>
    </li>
  );
};

const LoadingList: React.FC = () => (
  <ul className="space-y-3" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <li key={i}>
        <Card className="flex animate-pulse items-start gap-4 p-5">
          <div className="h-14 w-14 rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 rounded bg-slate-100" />
            <div className="h-3 w-2/3 rounded bg-slate-100" />
            <div className="h-3 w-1/3 rounded bg-slate-100" />
          </div>
          <div className="h-5 w-14 rounded bg-slate-100" />
        </Card>
      </li>
    ))}
  </ul>
);

export const AppointmentHistory: React.FC<{ customerId: string }> = ({ customerId }) => {
  const [filter, setFilter] = useState<AppointmentFilter>('all');
  const [items, setItems] = useState<Appointment[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutBooking, setCheckoutBooking] = useState<(CheckoutBooking & { salonName?: string }) | null>(null);
  const [payConfig, setPayConfig] = useState<PaymentConfig | null>(null);
  // Only the latest request may update state, so a slow earlier filter cannot overwrite a newer one.
  const latestRequest = useRef(0);

  const load = useCallback(
    async (nextFilter: AppointmentFilter, offset: number) => {
      const requestId = ++latestRequest.current;
      if (offset === 0) setPhase('loading');
      else setLoadingMore(true);
      setError(null);
      try {
        const page = await fetchAppointmentHistory({ customerId, filter: nextFilter, offset, pageSize: PAGE_SIZE });
        if (requestId !== latestRequest.current) return;
        setItems((prev) => (offset === 0 ? page.items : [...prev, ...page.items]));
        setHasMore(page.hasMore);
        setPhase('ready');
      } catch (err) {
        if (requestId !== latestRequest.current) return;
        console.error('[appointment-history] load failed:', err);
        setError(describeHistoryError(err));
        setPhase(offset === 0 ? 'error' : 'ready');
      } finally {
        if (requestId === latestRequest.current) setLoadingMore(false);
      }
    },
    [customerId]
  );

  useEffect(() => {
    setItems([]);
    setHasMore(false);
    void load(filter, 0);
    return () => {
      // Invalidate in-flight work when the filter/customer changes or the panel unmounts.
      latestRequest.current++;
    };
  }, [filter, load]);

  const startPayment = async (appointment: Appointment) => {
    setError(null);
    try {
      const config = await getPaymentConfig(appointment.salonSlug || undefined);
      setPayConfig(config);
      setCheckoutBooking({
        id: appointment.id,
        reference: appointment.reference || appointment.id,
        service: appointment.serviceName,
        date: appointment.bookingDate,
        time: appointment.bookingTime || '',
        locationType: 'salon',
        status: appointment.rawStatus,
        paymentStatus: appointment.paymentStatus || 'pending',
        amountPaise: appointment.pricePaise,
        advancePaise: appointment.advancePaise,
        remainingPaise: Math.max(0, appointment.pricePaise - appointment.advancePaise),
        confirmed: false,
        calendarEnabled: false,
        salonName: appointment.salonName || 'Salon',
      });
    } catch (err) { setError(describeHistoryError(err)); }
  };
  const paymentConfirmed = (_result: PaymentResponse) => {
    setCheckoutBooking(null);
    void load(filter, 0);
  };

  return (
    <section aria-labelledby="appointment-history-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a641f]">Your visits</p>
          <h2 id="appointment-history-heading" className="mt-1 flex items-center gap-2 font-serif text-2xl font-bold text-[#0F172A]">
            <HistoryIcon className="h-5 w-5 text-[#D09A40]" aria-hidden="true" />
            Appointment History
          </h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load(filter, 0)} disabled={phase === 'loading'} aria-label="Refresh appointment history">
          <RefreshCw className={cn('h-4 w-4', phase === 'loading' && 'animate-spin')} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      <div role="group" aria-label="Filter appointments by status" className="flex flex-wrap gap-2">
        {APPOINTMENT_FILTERS.map((option) => {
          const active = option.value === filter;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.value)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D09A40]',
                active
                  ? 'border-[#D09A40] bg-[#D09A40] text-[#0F172A]'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div aria-live="polite" aria-busy={phase === 'loading'}>
        {phase === 'loading' && <LoadingList />}

        {phase === 'error' && (
          <div className="space-y-3">
            <Alert tone="error">{error}</Alert>
            <Button variant="secondary" size="sm" onClick={() => void load(filter, 0)}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        )}

        {phase === 'ready' && items.length === 0 && (
          <Card>
            <EmptyState
              icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}
              title={EMPTY_COPY[filter].title}
              description={EMPTY_COPY[filter].description}
              action={
                filter === 'all' || filter === 'upcoming' ? (
                  <a
                    href="/#booking"
                    className="inline-flex items-center justify-center rounded-lg bg-[#D09A40] px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-[#DCA54A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D09A40]"
                  >
                    Book an appointment
                  </a>
                ) : undefined
              }
            />
          </Card>
        )}

        {phase === 'ready' && items.length > 0 && (
          <>
            <ul className="space-y-3">
              {items.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} onPay={startPayment} />
              ))}
            </ul>
            {error && (
              <div className="mt-3">
                <Alert tone="error">{error}</Alert>
              </div>
            )}
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" loading={loadingMore} onClick={() => void load(filter, items.length)}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <PaymentCheckout
        open={Boolean(checkoutBooking)}
        booking={checkoutBooking}
        config={payConfig}
        onClose={() => setCheckoutBooking(null)}
        onConfirmed={paymentConfirmed}
      />
    </section>
  );
};
