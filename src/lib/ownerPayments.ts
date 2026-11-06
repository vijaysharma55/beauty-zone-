import { api } from './api';
import type { CheckoutBooking, PaymentRecord } from './payments';

export interface OwnerPaymentSettings {
  advanceEnabled: boolean;
  advanceType: 'percent' | 'fixed';
  advancePercent: number;
  advanceFixedPaise: number;
  balancePolicy: 'at_salon' | 'online';
  disabledPolicy: 'pay_at_salon' | 'block_booking';
  gatewayEnabled: boolean;
  manualUpiEnabled: boolean;
  upiId: string;
  paymentDisplayName: string;
  upiQrUrl: string;
  bankName: string;
  paymentInstructions: string;
  verificationMode: 'static_qr' | 'provider';
  providerAccountId: string;
  providerOnboardingStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
  customized: boolean;
  updatedAt: string | null;
  channels: { gateway: boolean; manual: boolean; gatewayMode: string; gatewayReason: string | null; testMode: boolean };
}

export interface OwnerPayment extends PaymentRecord {
  salonId: string;
  manualReference?: string | null;
  customerNote?: string;
  verificationNote?: string;
  hasPaymentProof?: boolean;
  refundedAmountPaise?: number;
  refundReference?: string;
  refundReason?: string;
  refundedAt?: string | null;
  booking: CheckoutBooking & { fullName?: string; phone?: string; full_name?: string };
  receipt: { id: string; receiptNumber: string; accessToken?: string } | null;
}

export interface PaymentAuditEntry {
  id: string;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  performedBy: string | null;
  notes: string;
  createdAt: string;
}

export interface PaymentRefund {
  id: string;
  amountPaise: number;
  providerRefundId: string | null;
  reference: string;
  reason: string;
  status: 'processed' | 'recorded';
  createdAt: string;
}

export interface PaymentSummary {
  receivedPaise: number;
  todayCollectionPaise: number;
  monthCollectionPaise: number;
  pendingVerificationCount: number;
  pendingVerificationPaise: number;
  paidCount: number;
  failedCount: number;
  refundedPaise: number;
  refundCount: number;
  outstandingBalancePaise: number;
}

export const getOwnerPaymentSettings = () =>
  api.get<{ settings: OwnerPaymentSettings }>('/salon/payment-settings').then((res) => res.settings);

export const saveOwnerPaymentSettings = (settings: Partial<OwnerPaymentSettings> & { confirmActivation?: boolean }) =>
  api.put<{ settings: OwnerPaymentSettings }>('/salon/payment-settings', settings).then((res) => res.settings);

export const getOwnerPayments = (filters: { search?: string; status?: string; from?: string; to?: string }) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  return api.get<{ payments: OwnerPayment[] }>(`/salon/payments?${params}`).then((res) => res.payments);
};

export const getOwnerPaymentSummary = () => api.get<PaymentSummary>('/salon/payments/summary');
export const getOwnerPaymentDetails = (id: string) =>
  api.get<{ payment: OwnerPayment; audit: PaymentAuditEntry[]; refunds: PaymentRefund[] }>(`/salon/payments/details/${id}`);

export const paymentCsvUrl = (filters: { search?: string; status?: string; from?: string; to?: string }) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  return `/api/salon/payments/export.csv?${params}`;
};

export const statusLabel = (payment: PaymentRecord) => {
  const status = payment.displayStatus || payment.status;
  return ({
    paid: 'Verified', verified: 'Verified', verification_pending: 'Pending verification',
    pending_verification: 'Pending verification', failed: 'Rejected', rejected: 'Rejected',
    refunded: 'Refunded', created: 'Created', pending: 'Pending', cancelled: 'Cancelled', expired: 'Expired',
  } as Record<string, string>)[status] || status;
};
