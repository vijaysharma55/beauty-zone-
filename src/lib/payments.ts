import { api } from './api';

/**
 * Client helpers for the booking checkout.
 *
 * The browser only ever learns *what* it owes and *how* to start a payment.
 * Amounts, outcomes and booking status are decided by the server; every helper
 * here simply relays a request and returns the server's verdict.
 */

export type PaymentMode = 'mock' | 'razorpay' | 'disabled';
export type PaymentMethodKind = 'upi' | 'card' | 'netbanking' | 'wallet';
export type MockOutcome = 'success' | 'failed' | 'pending' | 'cancelled';

export interface SalonPaymentConfig {
  advanceEnabled: boolean;
  advanceType: 'percent' | 'fixed';
  advancePercent: number;
  advanceFixedPaise: number;
  balancePolicy: 'at_salon' | 'online';
  gateway: { enabled: boolean; available: boolean; mode: PaymentMode | null };
  manualUpi: { enabled: boolean; upiId: string; displayName: string; qrUrl: string; instructions?: string };
  methods: Array<{ id: string; label: string; channel: string }>;
  holdMinutes: number;
  currency: string;
  testMode: boolean;
}

export interface PaymentConfig {
  salonPayment?: SalonPaymentConfig | null;
  mode: PaymentMode;
  currency: string;
  mock: boolean;
  mockAllowed: boolean;
  available: boolean;
  advanceRequired: boolean;
  advancePercent: number;
  holdMinutes: number;
  keyId: string;
  reason: string | null;
  testMode: boolean;
  testNotice: string;
  testUpiIds: Array<{ id: string; outcome: string }>;
  testCards: Array<{ number: string; outcome: string; label: string }>;
  testBanks: Array<{ code: string; label: string; outcome: string }>;
  testWallets: Array<{ code: string; label: string; outcome: string }>;
  testHint: string;
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  provider: 'mock' | 'razorpay' | 'manual_upi';
  method: string;
  kind: 'advance' | 'balance';
  status: 'created' | 'pending' | 'verification_pending' | 'paid' | 'failed' | 'cancelled' | 'expired';
  displayStatus?: string;
  orderId: string;
  transactionId: string | null;
  amountPaise: number;
  totalPaise: number;
  remainingPaise: number;
  currency: string;
  instrument: string;
  failureReason: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingPaymentInfo {
  required: boolean;
  status: string;
  mode: PaymentMode;
  available: boolean;
  currency: string;
  advancePercent: number;
  holdMinutes: number;
  totalPaise: number;
  amountPaise: number;
  advancePaise: number;
  remainingPaise: number;
  advancePaidPaise?: number;
  message?: string;
}

/** Booking row returned by the API (only the fields the checkout needs). */
export interface CheckoutBooking {
  id: string;
  reference: string;
  service: string;
  date: string;
  time: string;
  locationType: 'salon' | 'home';
  branch?: string;
  status: string;
  paymentStatus: string;
  amountPaise: number;
  advancePaise: number;
  remainingPaise: number;
  confirmed: boolean;
  calendarEnabled: boolean;
  advanceRef?: string | null;
  confirmedAt?: string | null;
}

export interface PublicBookingStatus {
  id: string;
  reference: string;
  service: string;
  date: string;
  time: string;
  locationType: 'salon' | 'home';
  status: string;
  paymentStatus: string;
  amountPaise: number;
  advancePaise: number;
  remainingPaise: number;
  confirmed: boolean;
  calendarEnabled: boolean;
  notificationsEnabled: boolean;
  confirmedAt: string | null;
}

export interface ManualUpiOrder {
  upiId: string;
  displayName?: string;
  qrUrl: string;
  paymentLink: string;
  dynamicQrUrl: string;
  amountPaise: number;
  bookingReference: string;
  instructions: string;
}

export interface PaymentResponse {
  payment: PaymentRecord | null;
  manualUpi?: ManualUpiOrder;
  booking?: CheckoutBooking | null;
  bookingStatus?: PublicBookingStatus | null;
  paymentSummary?: BookingPaymentInfo | null;
  confirmed?: boolean;
  calendarEnabled?: boolean;
  notificationsEnabled?: boolean;
  status?: string;
  outcome?: MockOutcome;
  transactionId?: string;
  message?: string;
  instrumentLabel?: string;
  idempotent?: boolean;
  requiresReview?: boolean;
  config?: PaymentConfig;
}

export interface BookingCreationResponse {
  booking: CheckoutBooking;
  salon: { name: string; slug: string; phone: string } | null;
  payment: BookingPaymentInfo;
  confirmation?: { confirmed: boolean; calendarEnabled: boolean; notificationsEnabled: boolean; message?: string };
  warning?: string | null;
}

const unwrapConfig = (res: { payment: PaymentConfig }) => res.payment;

export const getPaymentConfig = (salonSlug?: string) =>
  api.get<{ payment: PaymentConfig }>(`/public/payments/config${salonSlug ? `?salon=${encodeURIComponent(salonSlug)}` : ''}`).then(unwrapConfig);

export const createPaymentOrder = (bookingId: string, method?: PaymentMethodKind | 'manual_upi' | 'upi_qr' | string, kind?: 'advance' | 'balance') =>
  api.post<PaymentResponse>('/public/payments/orders', { bookingId, ...(method ? { method } : {}), ...(kind ? { kind } : {}) });

export const claimManualUpiPayment = (payload: { orderId: string; reference: string; note?: string }) =>
  api.post<PaymentResponse>('/public/payments/manual/claim', payload);

export const uploadPaymentProof = (orderId: string, file: File) =>
  api.rawPost<{ uploaded: boolean; verified: false; message: string }>(
    `/public/payments/manual/proof?orderId=${encodeURIComponent(orderId)}`,
    file
  );

export const startMockCheckout = (payload: {
  orderId: string;
  method: PaymentMethodKind;
  upiId?: string;
  cardNumber?: string;
  bank?: string;
  wallet?: string;
  requestedOutcome?: MockOutcome;
}) => api.post<PaymentResponse>('/public/payments/mock/checkout', payload);

export const completeMockPayment = (payload: {
  orderId: string;
  transactionId: string;
  amountPaise?: number;
  currency?: string;
}) => api.post<PaymentResponse>('/public/payments/mock/complete', payload);

export const cancelMockPayment = (orderId: string) =>
  api.post<PaymentResponse>('/public/payments/mock/cancel', { orderId });

export const verifyRazorpayPayment = (payload: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  amountPaise?: number;
  currency?: string;
}) => api.post<PaymentResponse>('/public/payments/razorpay/verify', payload);

export const getBookingStatus = (bookingId: string) =>
  api.get<{ booking: PublicBookingStatus; payment: PaymentRecord | null }>(`/public/bookings/${bookingId}`);

export interface ConfirmationPayload {
  confirmed: boolean;
  booking?: PublicBookingStatus;
  salon?: { name: string; slug: string; phone: string; city: string } | null;
  calendar?: { title: string; location: string; googleUrl: string; ics: string; whatsappUrl: string };
  message?: string;
}

export const getBookingConfirmation = (bookingId: string) =>
  api.get<ConfirmationPayload>(`/public/bookings/${bookingId}/confirmation`);

export const formatPaise = (paise: number | null | undefined) => {
  const value = Number(paise || 0) / 100;
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
};

/**
 * Preview of the advance shown *before* the booking exists. The server applies
 * the same formula; its numbers replace this preview as soon as the booking is
 * created.
 */
export const computeAdvancePreviewPaise = (totalPaise: number, advancePercent: number) => {
  const total = Math.max(0, Math.round(Number(totalPaise) || 0));
  const percent = Math.min(100, Math.max(0, Math.round(Number(advancePercent) || 0)));
  if (total <= 0 || percent <= 0) return 0;
  const raw = Math.round((total * percent) / 100);
  return Math.min(total, Math.max(Math.min(1_000, total), raw));
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: () => void) => void };
  }
}

let razorpayScriptPromise: Promise<boolean> | null = null;

/** Loads Razorpay Checkout once, only when the server is in Razorpay mode. */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      razorpayScriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

export const MOCK_UPI_HINTS: Array<{ id: string; label: string; outcome: MockOutcome }> = [
  { id: 'success@mockupi', label: 'Successful payment', outcome: 'success' },
  { id: 'failure@mockupi', label: 'Failed payment', outcome: 'failed' },
  { id: 'pending@mockupi', label: 'Pending payment', outcome: 'pending' },
  { id: 'cancel@mockupi', label: 'Cancelled payment', outcome: 'cancelled' },
];

export const TEST_MODE_NOTICE = 'TEST MODE — No real money will be charged.';
