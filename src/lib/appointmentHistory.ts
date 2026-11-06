/**
 * Customer appointment history — data access and mapping.
 *
 * Reads the signed-in customer's own rows from public.bookings through
 * PostgREST. Row Level Security (policy "bookings_customer_select") is the real
 * authorization boundary; the customer_id filter below is only for efficiency
 * and clarity.
 *
 * The existing bookings table uses the salon-operations column names, so this
 * module maps them to the customer-facing shape:
 *   service_name -> service        staff_name -> stylist
 *   price        -> amount_paise / 100 (falls back to estimated_total)
 *   status       -> completed | cancelled | upcoming | no_show (derived)
 *
 * Keep all Supabase knowledge in this file so the data source can change
 * without touching the UI.
 */
import { supabase } from './supabase';

export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled' | 'no_show';
/** 'past' = a still-active booking whose date has gone by without a final status. */
export type AppointmentDisplayStatus = AppointmentStatus | 'past';
export type AppointmentFilter = 'all' | AppointmentStatus;

export const APPOINTMENT_FILTERS: ReadonlyArray<{ value: AppointmentFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
];

/** Raw row as returned by PostgREST for the select list below. */
export interface BookingRow {
  id: string;
  reference: string | null;
  customer_id: string | null;
  service_id: string | null;
  service: string | null;
  stylist: string | null;
  estimated_total: number | null;
  amount_paise: number | null;
  advance_paise: number | null;
  payment_status: string | null;
  booking_date: string; // YYYY-MM-DD
  booking_time: string | null; // e.g. "11:30 AM"
  status: string;
  created_at: string;
  salons: { name: string | null; slug: string | null } | null;
}

export interface Appointment {
  id: string;
  reference: string | null;
  salonSlug: string | null;
  advancePaise: number;
  paymentStatus: string | null;
  serviceId: string | null;
  serviceName: string;
  staffName: string | null;
  salonName: string | null;
  /** Amount in paise, ready for formatCurrency(). 0 when no price is recorded. */
  pricePaise: number;
  bookingDate: string;
  bookingTime: string | null;
  /** Local date-time used for ordering; time defaults to start of day if unparseable. */
  bookingAt: Date;
  status: AppointmentDisplayStatus;
  rawStatus: string;
}

export interface AppointmentPage {
  items: Appointment[];
  hasMore: boolean;
}

/** Statuses that still represent a live appointment. */
const ACTIVE_STATUSES = ['requested', 'pending_payment', 'payment_verification_pending', 'advance_paid', 'confirmed'];
/** Statuses that mean the appointment will not happen. */
const CANCELLED_STATUSES = ['cancelled', 'declined', 'expired', 'payment_failed'];

const SELECT_COLUMNS =
  'id,reference,customer_id,service_id,service,stylist,estimated_total,amount_paise,advance_paise,payment_status,booking_date,booking_time,status,created_at,salons(name,slug)';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Today's date in the customer's local time zone as YYYY-MM-DD. */
export const localISODate = (now: Date = new Date()) =>
  `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

/** Minutes since midnight from "11:30 AM", "11:30am" or "14:05"; null if unparseable. */
export function parseTimeToMinutes(time: string | null | undefined): number | null {
  const match = /^\s*(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?\s*$/i.exec(time || '');
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toLowerCase().replace(/\./g, '');
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }
  return hours * 60 + minutes;
}

/** Local Date for a booking; invalid input yields an Invalid Date, never throws. */
export function bookingDateTime(date: string, time: string | null | undefined): Date {
  if (!ISO_DATE_PATTERN.test(date)) return new Date(NaN);
  const [year, month, day] = date.split('-').map(Number);
  const minutes = parseTimeToMinutes(time) ?? 0;
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
}

/** Date-only comparison, so an appointment later today still counts as upcoming. */
export function deriveStatus(row: Pick<BookingRow, 'status' | 'booking_date'>, today: string): AppointmentDisplayStatus {
  if (row.status === 'completed') return 'completed';
  if (row.status === 'no_show') return 'no_show';
  if (CANCELLED_STATUSES.includes(row.status)) return 'cancelled';
  if (ACTIVE_STATUSES.includes(row.status)) return row.booking_date >= today ? 'upcoming' : 'past';
  return 'past';
}

export function mapBookingRow(row: BookingRow, today: string = localISODate()): Appointment {
  const amountPaise = Number(row.amount_paise) || 0;
  const estimatedRupees = Number(row.estimated_total) || 0;
  return {
    id: row.id,
    reference: row.reference,
    salonSlug: row.salons?.slug || null,
    advancePaise: Number(row.advance_paise) || 0,
    paymentStatus: row.payment_status,
    serviceId: row.service_id,
    serviceName: (row.service || '').trim() || 'Appointment',
    staffName: (row.stylist || '').trim() || null,
    salonName: row.salons?.name?.trim() || null,
    pricePaise: amountPaise > 0 ? amountPaise : Math.round(estimatedRupees * 100),
    bookingDate: row.booking_date,
    bookingTime: row.booking_time || null,
    bookingAt: bookingDateTime(row.booking_date, row.booking_time),
    status: deriveStatus(row, today),
    rawStatus: row.status,
  };
}

/** PostgREST filter fragments for the chosen tab. */
function filterParams(filter: AppointmentFilter, today: string): string[] {
  switch (filter) {
    case 'upcoming':
      return [`status=in.(${ACTIVE_STATUSES.join(',')})`, `booking_date=gte.${today}`];
    case 'completed':
      return ['status=eq.completed'];
    case 'cancelled':
      return [`status=in.(${CANCELLED_STATUSES.join(',')})`];
    case 'no_show':
      return ['status=eq.no_show'];
    default:
      return [];
  }
}

export function buildHistoryQuery(opts: {
  customerId: string;
  filter: AppointmentFilter;
  offset: number;
  pageSize: number;
  today?: string;
}): string {
  if (!UUID_PATTERN.test(opts.customerId)) throw new Error('Invalid customer id.');
  const today = opts.today ?? localISODate();
  const ascending = opts.filter === 'upcoming';
  const order = ascending
    ? 'order=booking_date.asc,created_at.asc'
    : 'order=booking_date.desc,created_at.desc';
  return [
    `select=${SELECT_COLUMNS}`,
    `customer_id=eq.${opts.customerId}`,
    ...filterParams(opts.filter, today),
    order,
    // Ask for one extra row to learn whether another page exists.
    `limit=${opts.pageSize + 1}`,
    `offset=${Math.max(0, Math.floor(opts.offset))}`,
  ].join('&');
}

export async function fetchAppointmentHistory(opts: {
  customerId: string;
  filter: AppointmentFilter;
  offset?: number;
  pageSize?: number;
}): Promise<AppointmentPage> {
  const pageSize = opts.pageSize ?? 10;
  const today = localISODate();
  const query = buildHistoryQuery({
    customerId: opts.customerId,
    filter: opts.filter,
    offset: opts.offset ?? 0,
    pageSize,
    today,
  });
  const rows = await supabase.db.select<BookingRow>('bookings', query);
  const hasMore = rows.length > pageSize;
  const items = rows
    .slice(0, pageSize)
    .map((row) => mapBookingRow(row, today))
    // booking_time is free text, so order same-day entries by the parsed time.
    .sort((a, b) => {
      const diff = a.bookingAt.getTime() - b.bookingAt.getTime();
      if (Number.isNaN(diff) || diff === 0) return 0;
      return opts.filter === 'upcoming' ? diff : -diff;
    });
  return { items, hasMore };
}

/** Turns a failed request into a message that is safe and useful to show. */
export function describeHistoryError(error: unknown): string {
  const err = error as { status?: number; code?: string; message?: string } | null;
  if (err?.status === 401 || err?.status === 403) {
    return 'Your session has expired. Please sign in again to see your appointments.';
  }
  // Missing column/table means the customer-history migration has not been applied yet.
  if (err?.code === '42703' || err?.code === '42P01' || err?.code === 'PGRST204' || err?.code === 'PGRST205') {
    return 'Appointment history is not available yet. Please try again later.';
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'You appear to be offline. Check your connection and try again.';
  }
  return 'We could not load your appointments. Please try again.';
}
