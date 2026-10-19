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
} from 'lucide-react';
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

export type BookingStatus = 'requested' | 'confirmed' | 'declined' | 'completed' | 'cancelled';

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
  advancePaid: number;
  advanceRef: string | null;
  status: BookingStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_TONE: Record<BookingStatus, 'blue' | 'green' | 'red' | 'slate' | 'amber'> = {
  requested: 'blue',
  confirmed: 'green',
  completed: 'slate',
  declined: 'red',
  cancelled: 'red',
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'New request',
  confirmed: 'Confirmed',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const NEXT_ACTIONS: Partial<Record<BookingStatus, Array<{ status: BookingStatus; label: string }>>> = {
  requested: [
    { status: 'confirmed', label: 'Confirm' },
    { status: 'declined', label: 'Decline' },
  ],
  confirmed: [
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
  const [updating, setUpdating] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  const upcoming = useMemo(
    () =>
      bookings.filter(
        (b) => b.status === 'requested' || b.status === 'confirmed'
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
          <Button variant="secondary" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
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

                  <p className="mt-2 text-[11px] text-slate-400">
                    Submitted {formatDate(booking.createdAt)}
                    {booking.estimatedTotal ? ` · Estimated ${formatMoney(booking.estimatedTotal)}` : ''}
                    {booking.advancePaid ? ` · Advance ${formatMoney(booking.advancePaid)} paid` : ''}
                  </p>
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
                  {(booking.status === 'declined' || booking.status === 'cancelled') && (
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
    </div>
  );
};

export default BookingsPage;
