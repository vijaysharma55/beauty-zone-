import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Home,
  Inbox,
  MapPin,
  Phone,
  RefreshCw,
  Scissors,
  Store,
  User as UserIcon,
  XCircle,
  LayoutList,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { CalendarView } from './CalendarView';
import { api, errorMessage } from '../../lib/api';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Select,
  Spinner,
  formatDate,
} from '../ui';

export type BookingStatus =
  | 'requested'
  | 'pending_payment'
  | 'advance_paid'
  | 'confirmed'
  | 'declined'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface Booking {
  id: string;
  salonId: string;
  reference: string;
  fullName: string;
  phone: string;
  service: string;
  category: string;
  stylist: string;
  date: string;
  time: string;
  locationType: 'salon' | 'home';
  branch: string;
  address: string;
  locality: string;
  distanceKm: number | null;
  bridalTrial: boolean;
  notes: string;
  promoCode: string | null;
  estimatedTotal: number;
  finalBillAmount?: number | null;
  loyaltyAwardStatus?: 'not_awarded' | 'pending' | 'awarded' | 'failed' | 'not_eligible';
  loyaltyPointsAwarded?: number;
  loyaltyAwardError?: string;
  loyaltyVoucherStatus?: 'none' | 'reserved' | 'used' | 'released' | 'release_failed';
  loyaltyVoucherError?: string;
  advancePaid: number;
  advanceRef: string | null;
  paymentStatus?: string;
  amountPaise?: number;
  advancePaise?: number;
  remainingPaise?: number;
  paymentRequired?: boolean;
  confirmed?: boolean;
  confirmedAt?: string | null;
  status: BookingStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_TONE: Record<BookingStatus, 'blue' | 'green' | 'red' | 'slate' | 'amber'> = {
  requested: 'blue',
  pending_payment: 'amber',
  advance_paid: 'green',
  confirmed: 'green',
  completed: 'slate',
  declined: 'red',
  cancelled: 'red',
  expired: 'slate',
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'New request',
  pending_payment: 'Awaiting payment',
  advance_paid: 'Advance paid',
  confirmed: 'Confirmed',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const PAYMENT_LABEL: Record<string, string> = {
  not_required: 'Pay at salon',
  unpaid: 'Payment due',
  pending: 'Payment pending',
  failed: 'Payment failed',
  cancelled: 'Payment cancelled',
  advance_paid: 'Advance paid',
  paid: 'Paid in full',
};

const NEXT_ACTIONS: Partial<Record<BookingStatus, Array<{ status: BookingStatus; label: string }>>> = {
  requested: [
    { status: 'confirmed', label: 'Confirm' },
    { status: 'declined', label: 'Decline' },
  ],
  // Unpaid bookings are confirmed automatically once the advance clears, so the
  // owner can only decline or cancel while the checkout is open.
  pending_payment: [{ status: 'cancelled', label: 'Cancel' }],
  confirmed: [
    { status: 'completed', label: 'Mark completed' },
    { status: 'cancelled', label: 'Cancel' },
  ],
  advance_paid: [
    { status: 'completed', label: 'Mark completed' },
    { status: 'cancelled', label: 'Cancel' },
  ],
};

const formatTime = (value: string) => {
  const m = /^(\d{2}):(\d{2})$/.exec(value || '');
  if (!m) return value || '—';
  const hour = Number(m[1]);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(h12).padStart(2, '0')}:${m[2]} ${suffix}`;
};

const formatMoney = (amount: number) =>
  `₹${Number(amount || 0).toLocaleString('en-IN')}`;

/**
 * Owner-facing appointment inbox.
 *
 * Reads only the signed-in owner's salon (the API resolves tenancy from the
 * session, never from the client) so there is never a data gap between what a
 * visitor submits on the public site and what the owner sees here.
 */
export const BookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'all' | BookingStatus>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [updating, setUpdating] = useState<string | null>(null);
  const [completionBooking, setCompletionBooking] = useState<Booking | null>(null);
  const [finalBillAmount, setFinalBillAmount] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ bookings: Booking[] }>('/salon/bookings');
      setBookings(res.bookings || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeStatus = async (booking: Booking, status: BookingStatus) => {
    if (status === 'completed') {
      setCompletionBooking(booking);
      setFinalBillAmount(String(booking.finalBillAmount ?? booking.estimatedTotal ?? ''));
      setError('');
      setNotice('');
      return;
    }
    setUpdating(booking.id);
    setError('');
    setNotice('');
    try {
      const res = await api.patch<{ booking: Booking }>(`/salon/bookings/${booking.id}`, { status });
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? res.booking : b)));
      setNotice(`${booking.reference} marked ${STATUS_LABEL[status].toLowerCase()}.`);
      setTimeout(() => setNotice(''), 3500);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUpdating(null);
    }
  };


  const submitCompletion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!completionBooking) return;
    const amount = Number(finalBillAmount);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10000000) {
      setError('Enter the actual final bill amount between ₹1 and ₹1,00,00,000.');
      return;
    }

    setUpdating(completionBooking.id);
    setError('');
    setNotice('');
    try {
      const res = await api.patch<{ booking: Booking; loyaltyReward?: { awarded?: boolean; alreadyAwarded?: boolean; pointsEarned?: number; retryable?: boolean; message?: string } }>(
        `/salon/bookings/${completionBooking.id}`,
        { status: 'completed', finalBillAmount: amount }
      );
      setBookings((prev) => prev.map((b) => (b.id === completionBooking.id ? res.booking : b)));
      if (res.loyaltyReward?.awarded || res.loyaltyReward?.alreadyAwarded) {
        setNotice(`${completionBooking.reference} completed. ${Number(res.loyaltyReward.pointsEarned || 0).toLocaleString('en-IN')} loyalty points confirmed.`);
      } else {
        setNotice(`${completionBooking.reference} completed, but points are not confirmed yet. ${res.loyaltyReward?.message || 'Use Retry points award on this booking.'}`);
      }
      setCompletionBooking(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  const retryLoyaltyAward = async (booking: Booking) => {
    setUpdating(booking.id);
    setError('');
    setNotice('');
    try {
      const res = await api.post<{ booking: Booking; loyaltyReward?: { awarded?: boolean; alreadyAwarded?: boolean; pointsEarned?: number; message?: string } }>(
        `/salon/bookings/${booking.id}/loyalty/retry`
      );
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? res.booking : b)));
      if (res.loyaltyReward?.awarded || res.loyaltyReward?.alreadyAwarded) {
        setNotice(`${booking.reference}: ${Number(res.loyaltyReward.pointsEarned || 0).toLocaleString('en-IN')} loyalty points confirmed.`);
      } else {
        setNotice(`${booking.reference}: loyalty points are still pending. ${res.loyaltyReward?.message || ''}`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  const retryVoucherRelease = async (booking: Booking) => {
    setUpdating(booking.id);
    setError('');
    setNotice('');
    try {
      const res = await api.post<{ booking: Booking; voucherRelease?: { released?: boolean; retryable?: boolean; message?: string } }>(
        `/salon/bookings/${booking.id}/loyalty/voucher/release`
      );
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? res.booking : b)));
      setNotice(res.voucherRelease?.released
        ? `${booking.reference}: rewards voucher released back to the customer.`
        : `${booking.reference}: voucher release is still pending. ${res.voucherRelease?.message || ''}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  const upcoming = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.status === 'requested' ||
          b.status === 'confirmed' ||
          b.status === 'advance_paid' ||
          b.status === 'pending_payment'
      ).length,
    [bookings]
  );
  const newRequests = useMemo(() => bookings.filter((b) => b.status === 'requested').length, [bookings]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Appointments"
        title="Bookings"
        description="Every request submitted from your live website lands here."
        actions={
          <div className="flex items-center gap-2">
            <div className="mr-2 flex rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-md ${
                  viewMode === 'list' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-md ${
                  viewMode === 'calendar' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                Calendar
              </button>
            </div>
            <Button variant="secondary" onClick={load} loading={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New requests</p>
          <p className="mt-1 font-serif text-3xl font-bold text-slate-900">{newRequests}</p>
          <p className="mt-1 text-xs text-slate-500">Awaiting your confirmation</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upcoming</p>
          <p className="mt-1 font-serif text-3xl font-bold text-slate-900">{upcoming}</p>
          <p className="mt-1 text-xs text-slate-500">Confirmed or pending appointments</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total received</p>
          <p className="mt-1 font-serif text-3xl font-bold text-slate-900">{bookings.length}</p>
          <p className="mt-1 text-xs text-slate-500">All-time booking requests</p>
        </Card>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView bookings={bookings} onStatusChange={changeStatus} />
      ) : (
        <Card>
          <CardHeader
            title="Appointment requests"
            description="Confirm, complete or decline each request. Clients are notified by your team."
            action={
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | BookingStatus)}
                className="w-44"
                aria-label="Filter bookings by status"
              >
                <option value="all">All statuses</option>
                <option value="requested">New requests</option>
                <option value="pending_payment">Awaiting payment</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="declined">Declined</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            }
          />

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
              <Spinner className="h-4 w-4 text-[#D09A40]" /> Loading bookings…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title={bookings.length === 0 ? 'No bookings yet' : 'Nothing matches this filter'}
              description={
                bookings.length === 0
                  ? 'When a visitor books on your published website, the request appears here instantly.'
                  : 'Try a different status filter to see other requests.'
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((booking) => (
                <div key={booking.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#8a641f]">{booking.reference}</span>
                      <Badge tone={STATUS_TONE[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
                      {booking.locationType === 'home' ? (
                        <Badge tone="amber">
                          <Home className="h-3 w-3" /> Home visit
                        </Badge>
                      ) : (
                        <Badge tone="slate">
                          <Store className="h-3 w-3" /> In salon
                        </Badge>
                      )}
                      {booking.bridalTrial && <Badge tone="gold">Bridal trial</Badge>}
                    </div>

                    <p className="mt-2 truncate font-semibold text-slate-900">
                      <Scissors className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />
                      {booking.service}
                    </p>

                    <div className="mt-2 grid gap-1.5 text-xs text-slate-600 sm:grid-cols-2">
                      <p className="flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                        {booking.fullName}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <a href={`tel:${booking.phone.replace(/[^\d+]/g, '')}`} className="hover:underline">
                          {booking.phone}
                        </a>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {booking.date}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {formatTime(booking.time)}
                      </p>
                      {booking.stylist && (
                        <p className="flex items-center gap-1.5 sm:col-span-2">
                          <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                          Preferred specialist: {booking.stylist}
                        </p>
                      )}
                      {booking.locationType === 'salon' && booking.branch && (
                        <p className="flex items-center gap-1.5 sm:col-span-2">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {booking.branch}
                        </p>
                      )}
                      {booking.locationType === 'home' && (booking.address || booking.locality) && (
                        <p className="flex items-start gap-1.5 sm:col-span-2">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>
                            {[booking.address, booking.locality].filter(Boolean).join(' · ')}
                            {booking.distanceKm ? ` (~${booking.distanceKm} km)` : ''}
                          </span>
                        </p>
                      )}
                    </div>

                    {(booking.notes || booking.promoCode) && (
                      <div className="mt-2 space-y-1 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                        {booking.notes && <p>Notes: {booking.notes}</p>}
                        {booking.promoCode && (
                          <p>
                            Voucher: <span className="font-mono font-semibold">{booking.promoCode}</span>
                          </p>
                        )}
                      </div>
                    )}

                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                      <span>Submitted {formatDate(booking.createdAt)}</span>
                      {booking.estimatedTotal ? <span>· Estimated {formatMoney(booking.estimatedTotal)}</span> : null}
                      {booking.advancePaid ? <span>· Advance {formatMoney(booking.advancePaid)} paid</span> : null}
                      {booking.finalBillAmount ? (
                        <span>· Final bill {formatMoney(booking.finalBillAmount)}</span>
                      ) : null}
                      {booking.status === 'completed' && (
                        <span className={booking.loyaltyAwardStatus === 'awarded' ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
                          · {booking.loyaltyAwardStatus === 'awarded'
                            ? `${booking.loyaltyPointsAwarded || 0} points awarded`
                            : 'Points award pending'}
                        </span>
                      )}
                      {booking.promoCode && (
                        <span className={booking.loyaltyVoucherStatus === 'released' || booking.loyaltyVoucherStatus === 'used'
                          ? 'font-semibold text-slate-600'
                          : booking.loyaltyVoucherStatus === 'release_failed'
                            ? 'font-semibold text-rose-700'
                            : 'font-semibold text-amber-700'}>
                          · Voucher {booking.loyaltyVoucherStatus || 'reserved'}
                        </span>
                      )}
                      {booking.paymentStatus ? (
                        <span
                          className={`rounded-full px-1.5 py-0.5 font-semibold ${
                            booking.paymentStatus === 'advance_paid' || booking.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : booking.paymentStatus === 'not_required'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {PAYMENT_LABEL[booking.paymentStatus] || booking.paymentStatus}
                        </span>
                      ) : null}
                    </p>
                    {booking.status === 'pending_payment' && (
                      <p className="mt-1 text-[11px] text-amber-700">
                        Waiting for the client's advance payment
                        {booking.advancePaise ? ` (${formatMoney(booking.advancePaise / 100)})` : ''}. Confirmation is
                        issued automatically once the payment is verified.
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-1.5 sm:flex-col sm:items-stretch">
                    {(NEXT_ACTIONS[booking.status] || []).map((action) => (
                      <Button
                        key={action.status}
                        size="sm"
                        variant={action.status === 'confirmed' || action.status === 'completed' ? 'gold' : 'secondary'}
                        loading={updating === booking.id}
                        disabled={updating === booking.id}
                        onClick={() => changeStatus(booking, action.status)}
                      >
                        {action.status === 'confirmed' ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : action.status === 'declined' || action.status === 'cancelled' ? (
                          <XCircle className="h-3.5 w-3.5" />
                        ) : null}
                        {action.label}
                      </Button>
                    ))}
                    {(booking.status === 'cancelled' || booking.status === 'declined')
                      && booking.loyaltyVoucherStatus === 'release_failed' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={updating === booking.id}
                        disabled={updating === booking.id}
                        onClick={() => retryVoucherRelease(booking)}
                      >
                        Retry voucher release
                      </Button>
                    )}
                    {booking.status === 'completed' && booking.loyaltyAwardStatus !== 'awarded' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={updating === booking.id}
                        disabled={updating === booking.id}
                        onClick={() => retryLoyaltyAward(booking)}
                      >
                        Retry points award
                      </Button>
                    )}
                    {booking.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updating === booking.id}
                        onClick={() => changeStatus(booking, 'confirmed')}
                      >
                        Reopen
                      </Button>
                    )}
                    {(booking.status === 'declined' || booking.status === 'cancelled')
                      && (!booking.promoCode || booking.loyaltyVoucherStatus === 'reserved') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updating === booking.id}
                        onClick={() => changeStatus(booking, 'requested')}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {completionBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="complete-booking-title"
            onSubmit={submitCompletion}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2 id="complete-booking-title" className="font-serif text-xl font-bold text-slate-900">
              Complete appointment
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {completionBooking.reference} · {completionBooking.service}
            </p>
            <label className="mt-5 block text-sm font-semibold text-slate-800" htmlFor="final-booking-bill">
              Actual final bill (₹)
              <input
                id="final-booking-bill"
                type="number"
                inputMode="numeric"
                min="1"
                max="10000000"
                step="1"
                required
                value={finalBillAmount}
                onChange={(event) => setFinalBillAmount(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none focus:border-[#D09A40] focus:ring-2 focus:ring-[#D09A40]/20"
              />
            </label>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Points will be calculated from this final amount, not the visitor’s booking estimate. This value cannot be changed after points are awarded.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={updating === completionBooking.id} onClick={() => setCompletionBooking(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="gold" loading={updating === completionBooking.id} disabled={updating === completionBooking.id}>
                Save & complete
              </Button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default BookingsPage;
