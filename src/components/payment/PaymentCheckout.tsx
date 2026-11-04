import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  Lock,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { errorMessage } from '../../lib/api';
import {
  MOCK_UPI_HINTS,
  TEST_MODE_NOTICE,
  cancelMockPayment,
  completeMockPayment,
  computeAdvancePreviewPaise,
  createPaymentOrder,
  formatPaise,
  getBookingStatus,
  loadRazorpayScript,
  startMockCheckout,
  verifyRazorpayPayment,
  type CheckoutBooking,
  type MockOutcome,
  type PaymentConfig,
  type PaymentMethodKind,
  type PaymentResponse,
} from '../../lib/payments';

type Stage =
  | 'idle'
  | 'loading-order'
  | 'ready'
  | 'processing'
  | 'verifying'
  | 'success'
  | 'failed'
  | 'pending'
  | 'cancelled'
  | 'error';

export interface PaymentCheckoutProps {
  open: boolean;
  booking: (CheckoutBooking & { salonName?: string; locationLabel?: string }) | null;
  config: PaymentConfig | null;
  theme?: { accent?: string; primary?: string; background?: string; surface?: string };
  onClose: (reason: 'dismissed' | 'cancelled') => void;
  onConfirmed: (result: PaymentResponse) => void;
  onStateChange?: (stage: Stage, result?: PaymentResponse) => void;
}

/** Fallbacks used only if the config request failed mid-checkout. */
const DEFAULT_TEST_CARDS = [
  { number: '4111111111111111', outcome: 'success', label: 'Test Visa — Success' },
  { number: '4000000000000002', outcome: 'failed', label: 'Test Card — Failure' },
  { number: '4000000000000006', outcome: 'pending', label: 'Test Card — Pending' },
];
const DEFAULT_TEST_BANKS = [
  { code: 'test_success', label: 'Test Bank — Success', outcome: 'success' },
  { code: 'test_failure', label: 'Test Bank — Failure', outcome: 'failed' },
  { code: 'test_pending', label: 'Test Bank — Pending', outcome: 'pending' },
];
const DEFAULT_TEST_WALLETS = [
  { code: 'test_success', label: 'Test Wallet — Success', outcome: 'success' },
  { code: 'test_failure', label: 'Test Wallet — Failure', outcome: 'failed' },
  { code: 'test_pending', label: 'Test Wallet — Pending', outcome: 'pending' },
];

const METHODS: Array<{ id: PaymentMethodKind; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking', icon: Building2 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
];

/** Deterministic decorative QR for the mock UPI flow ("TEST ONLY"). */
const MockQr: React.FC<{ value: string; ink: string }> = ({ value, ink }) => {
  const cells = useMemo(() => {
    const size = 21;
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const grid: boolean[] = [];
    let state = hash >>> 0;
    for (let i = 0; i < size * size; i += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      grid.push(((state >>> 16) & 7) > 3);
    }
    // Finder patterns in three corners so it reads like a QR code.
    const setBlock = (col: number, row: number) => {
      for (let y = 0; y < 7; y += 1) {
        for (let x = 0; x < 7; x += 1) {
          const edge = x === 0 || y === 0 || x === 6 || y === 6;
          const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          grid[(row + y) * size + (col + x)] = edge || core;
        }
      }
    };
    setBlock(0, 0);
    setBlock(size - 7, 0);
    setBlock(0, size - 7);
    return grid;
  }, [value]);

  return (
    <svg viewBox="0 0 21 21" className="h-32 w-32" role="img" aria-label="Decorative mock UPI QR code — test only">
      <rect width="21" height="21" fill="#FFFFFF" />
      {cells.map((on, index) =>
        on ? (
          <rect
            key={index}
            x={index % 21}
            y={Math.floor(index / 21)}
            width="1"
            height="1"
            fill={ink}
            shapeRendering="crispEdges"
          />
        ) : null
      )}
    </svg>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode; strong?: boolean; tone?: string }> = ({
  label,
  value,
  strong,
  tone,
}) => (
  <div className="flex items-baseline justify-between gap-3 text-xs">
    <span className="text-[#4A4A4A]">{label}</span>
    <span className={`text-right ${strong ? 'text-sm font-bold' : 'font-semibold'}`} style={tone ? { color: tone } : undefined}>
      {value}
    </span>
  </div>
);

/**
 * Booking checkout screen.
 *
 * Works in two server-driven modes: a fully simulated `mock` checkout for
 * testing (UPI / card / net banking / wallet with labelled test instruments) and
 * live Razorpay Checkout. The screen never decides that a booking is paid — it
 * renders whatever the verification endpoint returns.
 */
export const PaymentCheckout: React.FC<PaymentCheckoutProps> = ({
  open,
  booking,
  config,
  theme,
  onClose,
  onConfirmed,
  onStateChange,
}) => {
  const accent = theme?.accent || '#D09A40';
  const primary = theme?.primary || '#0F172A';
  const surface = theme?.surface || '#FFFFFF';
  const background = theme?.background || '#FAF5E5';

  const [stage, setStage] = useState<Stage>('idle');
  const [method, setMethod] = useState<PaymentMethodKind>('upi');
  const [upiId, setUpiId] = useState('success@mockupi');
  const [cardNumber, setCardNumber] = useState('4111111111111111');
  const [bank, setBank] = useState('test_success');
  const [wallet, setWallet] = useState('test_success');
  const [selectedOutcome, setSelectedOutcome] = useState<MockOutcome | 'custom'>('success');
  const [order, setOrder] = useState<PaymentResponse['payment']>(null);
  const [message, setMessage] = useState('');
  const [lastResult, setLastResult] = useState<PaymentResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const orderRequestRef = useRef(0);

  const bookingId = booking?.id || '';
  const providerMode = config?.mode ?? (order?.provider === 'razorpay' ? 'razorpay' : order?.provider === 'mock' ? 'mock' : null);
  const isMock = providerMode === 'mock';
  const testCards = config?.testCards?.length ? config.testCards : DEFAULT_TEST_CARDS;
  const testBanks = config?.testBanks?.length ? config.testBanks : DEFAULT_TEST_BANKS;
  const testWallets = config?.testWallets?.length ? config.testWallets : DEFAULT_TEST_WALLETS;
  const amountPaise = order?.amountPaise ?? booking?.advancePaise ?? 0;
  const totalPaise = booking?.amountPaise ?? 0;
  const remainingPaise = Math.max(0, totalPaise - (booking?.advancePaise ?? 0));
  const busy = stage === 'processing' || stage === 'verifying' || stage === 'loading-order';

  const emit = useCallback(
    (next: Stage, result?: PaymentResponse) => {
      setStage(next);
      onStateChange?.(next, result);
    },
    [onStateChange]
  );

  const reset = useCallback(() => {
    setStage('idle');
    setOrder(null);
    setMessage('');
    setLastResult(null);
    setMethod('upi');
    setUpiId('success@mockupi');
    setCardNumber('4111111111111111');
    setBank('test_success');
    setWallet('test_success');
    setSelectedOutcome('success');
  }, []);

  // Create a server-side order whenever a new booking is opened.
  useEffect(() => {
    if (!open || !bookingId) {
      reset();
      return;
    }
    const requestId = orderRequestRef.current + 1;
    orderRequestRef.current = requestId;
    let cancelled = false;
    setStage('loading-order');
    setMessage('');
    setLastResult(null);
    setOrder(null);
    createPaymentOrder(bookingId)
      .then((res) => {
        if (cancelled || orderRequestRef.current !== requestId) return;
        setOrder(res.payment);
        if (res.config?.mode === 'razorpay') setMessage('');
        emit('ready', res);
      })
      .catch((err) => {
        if (cancelled || orderRequestRef.current !== requestId) return;
        setMessage(errorMessage(err));
        emit('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bookingId, attempt]);

  const applyOutcome = (outcome: MockOutcome | 'custom') => {
    setSelectedOutcome(outcome);
    if (outcome === 'custom') return;
    if (outcome === 'success') {
      setUpiId('success@mockupi');
      setCardNumber('4111111111111111');
      setBank('test_success');
      setWallet('test_success');
    } else if (outcome === 'failed') {
      setUpiId('failure@mockupi');
      setCardNumber('4000000000000002');
      setBank('test_failure');
      setWallet('test_failure');
    } else if (outcome === 'pending') {
      setUpiId('pending@mockupi');
      setCardNumber('4000000000000006');
      setBank('test_pending');
      setWallet('test_pending');
    } else {
      setUpiId('cancel@mockupi');
    }
  };

  const startNewOrder = () => {
    setAttempt((n) => n + 1);
  };

  const finishSuccess = (result: PaymentResponse) => {
    setLastResult(result);
    setOrder(result.payment || order);
    setMessage(result.message || 'Payment verified. Your booking is confirmed.');
    emit('success', result);
    onConfirmed(result);
  };

  const handleMockCancel = async () => {
    if (!order) return;
    setStage('processing');
    try {
      const res = await cancelMockPayment(order.id);
      setLastResult(res);
      setMessage(res.message || 'Payment cancelled. Your booking has not been confirmed.');
      emit('cancelled', res);
    } catch (err) {
      setMessage(errorMessage(err));
      emit('failed');
    }
  };

  const handleMockPay = async () => {
    if (!order) return;
    setStage('processing');
    setMessage('');
    try {
      const requestedOutcome =
        selectedOutcome !== 'custom' && selectedOutcome !== 'cancelled' ? selectedOutcome : undefined;
      const checkout = await startMockCheckout({
        orderId: order.id,
        method,
        upiId: method === 'upi' ? upiId.trim() : undefined,
        cardNumber: method === 'card' ? cardNumber : undefined,
        bank: method === 'netbanking' ? bank : undefined,
        wallet: method === 'wallet' ? wallet : undefined,
        requestedOutcome,
      });
      setLastResult(checkout);
      if (checkout.payment) setOrder(checkout.payment);

      if (checkout.outcome === 'cancelled') {
        setMessage(checkout.message || 'Payment cancelled.');
        emit('cancelled', checkout);
        return;
      }
      if (checkout.outcome !== 'success') {
        setMessage(checkout.message || 'The test payment was not successful.');
        emit(checkout.outcome === 'pending' ? 'pending' : 'failed', checkout);
        return;
      }

      setStage('verifying');
      const verified = await completeMockPayment({
        orderId: order.id,
        transactionId: checkout.transactionId || '',
        amountPaise: order.amountPaise,
        currency: order.currency,
      });
      setLastResult(verified);
      if (verified.payment) setOrder(verified.payment);
      if (verified.confirmed) {
        finishSuccess(verified);
        return;
      }
      setMessage(
        verified.message ||
          (verified.status === 'pending'
            ? 'Payment is pending bank confirmation. The booking is not confirmed yet.'
            : 'The payment could not be verified. Please try again.')
      );
      emit(verified.status === 'pending' ? 'pending' : verified.requiresReview ? 'pending' : 'failed', verified);
    } catch (err) {
      setMessage(errorMessage(err));
      emit('failed');
    }
  };

  const handleRazorpayPay = async () => {
    if (!order || !config) return;
    setStage('processing');
    setMessage('');
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setMessage('Could not load the secure payment window. Please check your connection and retry.');
      emit('failed');
      return;
    }
    const checkout = new window.Razorpay({
      key: config.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      order_id: order.orderId,
      name: booking?.salonName || 'Beauty Zone',
      description: `${booking?.service || 'Appointment'} · advance payment`,
      prefill: { name: '', contact: '' },
      notes: { bookingId, reference: booking?.reference || '' },
      theme: { color: accent },
      modal: {
        ondismiss: () => {
          setMessage('Payment window closed before it completed. Your booking is still awaiting payment.');
          emit('cancelled');
        },
      },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        setStage('verifying');
        try {
          const verified = await verifyRazorpayPayment({
            orderId: order.id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            amountPaise: order.amountPaise,
            currency: order.currency,
          });
          setLastResult(verified);
          if (verified.payment) setOrder(verified.payment);
          if (verified.confirmed) {
            finishSuccess(verified);
            return;
          }
          setMessage(verified.message || 'Payment could not be verified.');
          emit('pending', verified);
        } catch (err) {
          setMessage(errorMessage(err));
          emit('failed');
        }
      },
    });
    checkout.on('payment.failed', () => {
      setMessage('The payment failed at the gateway. No booking confirmation was issued — you can retry.');
      emit('failed');
    });
    checkout.open();
  };

  const checkPendingStatus = async () => {
    if (!bookingId) return;
    setStage('processing');
    try {
      const res = await getBookingStatus(bookingId);
      if (res.booking?.confirmed) {
        finishSuccess({
          payment: res.payment,
          confirmed: true,
          message: 'Payment confirmed. Your booking is confirmed.',
        });
        return;
      }
      setMessage('Still awaiting confirmation. The booking remains unconfirmed until the payment clears.');
      emit('pending', { payment: res.payment });
    } catch (err) {
      setMessage(errorMessage(err));
      emit('failed');
    }
  };

  const copyUpi = () => {
    navigator.clipboard?.writeText(upiId).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!open) return null;

  const paymentUnavailable = config && !config.available;
  const title =
    stage === 'success'
      ? 'Payment successful'
      : stage === 'failed'
        ? 'Payment failed'
        : stage === 'pending'
          ? 'Payment pending'
          : stage === 'cancelled'
            ? 'Payment cancelled'
            : 'Secure checkout';
  const HeaderIcon =
    stage === 'success'
      ? CheckCircle2
      : stage === 'failed'
        ? XCircle
        : stage === 'pending'
          ? Clock
          : stage === 'cancelled'
            ? XCircle
            : ShieldCheck;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#0F172A]/85 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Booking payment checkout"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose('dismissed');
      }}
    >
      <div
        className="relative my-auto w-full max-w-2xl overflow-hidden rounded-3xl border shadow-2xl"
        style={{ backgroundColor: surface, borderColor: `${accent}55`, color: primary }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 border-b px-5 py-4 sm:px-7"
          style={{ background: `linear-gradient(135deg, ${background}, ${surface})`, borderColor: `${accent}33` }}
        >
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              <HeaderIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
                {isMock ? 'Mock payment provider' : 'Razorpay secure checkout'}
              </p>
              <h2 className="font-serif text-xl font-bold sm:text-2xl">{title}</h2>
              <p className="mt-0.5 text-xs" style={{ color: `${primary}99` }}>
                {booking?.salonName ? `${booking.salonName} · ` : ''}
                {booking?.service || 'Appointment'}
                {booking?.reference ? ` · ${booking.reference}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose(stage === 'cancelled' ? 'cancelled' : 'dismissed')}
            disabled={busy}
            aria-label="Close payment dialog"
            className="rounded-full p-2 transition-colors hover:bg-black/5 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[78vh] space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
          {isMock && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong className="font-bold">{TEST_MODE_NOTICE}</strong>
                <p className="mt-0.5 leading-snug text-amber-800">
                  This is a simulated gateway. Test UPI IDs and card numbers never touch a real payment network.
                </p>
              </div>
            </div>
          )}

          {/* Booking summary + amounts */}
          <div className="rounded-2xl border p-4" style={{ borderColor: `${primary}1A`, backgroundColor: background }}>
            <div className="space-y-1.5">
              {booking?.salonName && <Row label="Salon" value={booking.salonName} />}
              <Row label="Service" value={booking?.service || '—'} />
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                <span className="text-[#4A4A4A]">Date &amp; time</span>
                <span className="font-semibold">
                  {booking?.date || '—'} · {booking?.time || '—'}
                </span>
              </div>
              {booking?.locationLabel && <Row label="Location" value={booking.locationLabel} />}
              <div className="border-t pt-2" style={{ borderColor: `${primary}18` }}>
                <Row label="Total service amount" value={formatPaise(totalPaise)} />
                <Row label={`Advance due now (${config?.advancePercent ?? 25}%)`} value={formatPaise(booking?.advancePaise ?? 0)} strong tone={accent} />
                <Row label="Remaining balance (pay at salon)" value={formatPaise(remainingPaise)} />
              </div>
            </div>
          </div>

          {/* Stage: loading / errors */}
          {(stage === 'loading-order' || stage === 'idle') && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-sm" style={{ borderColor: `${primary}22`, color: `${primary}99` }}>
              <Loader2 className="h-4 w-4 animate-spin" /> Preparing a secure payment order…
            </div>
          )}

          {stage === 'error' && (
            <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {message ||
                    config?.reason ||
                    'Online payment could not be started. Please retry or confirm your appointment on WhatsApp.'}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={startNewOrder} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white">
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
                <button type="button" onClick={() => onClose('dismissed')} className="rounded-lg border border-rose-300 px-3.5 py-2 text-xs font-bold text-rose-700">
                  Close
                </button>
              </div>
            </div>
          )}

          {paymentUnavailable && stage !== 'error' && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
              Online payments are currently unavailable{config?.reason ? `: ${config.reason}` : '.'}
            </div>
          )}

          {/* Mock checkout body */}
          {isMock && order && stage !== 'success' && stage !== 'failed' && stage !== 'pending' && stage !== 'cancelled' && (
            <>
              <div className="grid gap-2 sm:grid-cols-4">
                {METHODS.map((entry) => {
                  const Icon = entry.icon;
                  const active = method === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      disabled={busy}
                      onClick={() => setMethod(entry.id)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors disabled:opacity-50"
                      style={
                        active
                          ? { backgroundColor: primary, borderColor: primary, color: background }
                          : { backgroundColor: surface, borderColor: `${primary}22`, color: primary }
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {entry.label}
                    </button>
                  );
                })}
              </div>

              {method === 'upi' && (
                <div className="space-y-3 rounded-2xl border p-4" style={{ borderColor: `${primary}1A` }}>
                  <label htmlFor="mock-upi" className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: `${primary}99` }}>
                    UPI ID
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="mock-upi"
                      value={upiId}
                      disabled={busy}
                      onChange={(event) => {
                        setUpiId(event.target.value);
                        setSelectedOutcome('custom');
                      }}
                      placeholder="success@mockupi"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full rounded-xl border px-3 py-2.5 font-mono text-sm outline-none focus:ring-2"
                      style={{ borderColor: `${primary}26`, backgroundColor: surface, color: primary }}
                    />
                    <button
                      type="button"
                      onClick={copyUpi}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold"
                      style={{ borderColor: `${primary}26`, color: accent }}
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {MOCK_UPI_HINTS.map((hint) => (
                      <button
                        key={hint.id}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setUpiId(hint.id);
                          applyOutcome(hint.outcome);
                        }}
                        className="rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors disabled:opacity-50"
                        style={{
                          borderColor: upiId === hint.id ? accent : `${primary}22`,
                          backgroundColor: upiId === hint.id ? `${accent}1A` : surface,
                          color: primary,
                        }}
                        title={`Test UPI ID → ${hint.label}`}
                      >
                        {hint.id}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-3 sm:flex-row sm:items-center sm:gap-4" style={{ borderColor: `${accent}66`, backgroundColor: surface }}>
                    <div className="relative shrink-0">
                      <MockQr value={upiId || 'success@mockupi'} ink={primary} />
                      <span className="absolute inset-x-2 bottom-2 rounded bg-amber-400/95 px-1 py-0.5 text-center text-[9px] font-black uppercase tracking-wider text-amber-950">
                        Test only
                      </span>
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: `${primary}AA` }}>
                      <p className="font-bold" style={{ color: primary }}>
                        Mock UPI QR preview
                      </p>
                      <p className="mt-0.5">Decorative only — not a scannable payment code.</p>
                      <p className="mt-1 font-mono text-[11px]">Pay to: {upiId || 'success@mockupi'}</p>
                      <p className="mt-1">Only the documented test IDs are accepted in this mode.</p>
                    </div>
                  </div>
                </div>
              )}

              {method === 'card' && (
                <div className="space-y-3 rounded-2xl border p-4" style={{ borderColor: `${primary}1A` }}>
                  <div>
                    <label htmlFor="mock-card" className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: `${primary}99` }}>
                      Test card number
                    </label>
                    <input
                      id="mock-card"
                      value={cardNumber}
                      disabled={busy}
                      inputMode="numeric"
                      onChange={(event) => {
                        setCardNumber(event.target.value.replace(/[^\d]/g, '').slice(0, 19));
                        setSelectedOutcome('custom');
                      }}
                      placeholder="4111 1111 1111 1111"
                      className="mt-1 w-full rounded-xl border px-3 py-2.5 font-mono text-sm outline-none"
                      style={{ borderColor: `${primary}26`, backgroundColor: surface, color: primary }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      aria-label="Test expiry"
                      placeholder="MM / YY"
                      defaultValue="12 / 34"
                      disabled={busy}
                      className="rounded-xl border px-3 py-2.5 font-mono text-sm"
                      style={{ borderColor: `${primary}26`, backgroundColor: surface, color: primary }}
                    />
                    <input
                      aria-label="Test CVV"
                      placeholder="CVV"
                      defaultValue="123"
                      maxLength={3}
                      disabled={busy}
                      className="rounded-xl border px-3 py-2.5 font-mono text-sm"
                      style={{ borderColor: `${primary}26`, backgroundColor: surface, color: primary }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {testCards.map((card) => (
                      <button
                        key={card.number}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setCardNumber(card.number);
                          applyOutcome(card.outcome as MockOutcome);
                        }}
                        className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          borderColor: cardNumber === card.number ? accent : `${primary}22`,
                          backgroundColor: cardNumber === card.number ? `${accent}1A` : surface,
                          color: primary,
                        }}
                      >
                        {card.number} · {card.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {method === 'netbanking' && (
                <div className="space-y-2 rounded-2xl border p-4" style={{ borderColor: `${primary}1A` }}>
                  {testBanks.map((entry) => (
                    <label
                      key={entry.code}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold"
                      style={{
                        borderColor: bank === entry.code ? accent : `${primary}22`,
                        backgroundColor: bank === entry.code ? `${accent}14` : surface,
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="mock-bank"
                          checked={bank === entry.code}
                          disabled={busy}
                          onChange={() => {
                            setBank(entry.code);
                            applyOutcome(entry.outcome as MockOutcome);
                          }}
                        />
                        <Building2 className="h-4 w-4" style={{ color: accent }} />
                        {entry.label}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: `${primary}77` }}>
                        {entry.code}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {method === 'wallet' && (
                <div className="space-y-2 rounded-2xl border p-4" style={{ borderColor: `${primary}1A` }}>
                  {testWallets.map((entry) => (
                    <label
                      key={entry.code}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold"
                      style={{
                        borderColor: wallet === entry.code ? accent : `${primary}22`,
                        backgroundColor: wallet === entry.code ? `${accent}14` : surface,
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="mock-wallet"
                          checked={wallet === entry.code}
                          disabled={busy}
                          onChange={() => {
                            setWallet(entry.code);
                            applyOutcome(entry.outcome as MockOutcome);
                          }}
                        />
                        <Wallet className="h-4 w-4" style={{ color: accent }} />
                        {entry.label}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: `${primary}77` }}>
                        {entry.code}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Test outcome selector */}
              <div className="rounded-2xl border border-dashed p-3" style={{ borderColor: `${primary}22` }}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: `${primary}99` }}>
                  Test payment result
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      { id: 'success', label: 'Success', color: '#10B981' },
                      { id: 'failed', label: 'Failure', color: '#E11D48' },
                      { id: 'pending', label: 'Pending', color: '#D97706' },
                      { id: 'cancelled', label: 'Cancel', color: '#475569' },
                    ] as Array<{ id: MockOutcome; label: string; color: string }>
                  ).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (option.id === 'cancelled') {
                          applyOutcome('cancelled');
                          return;
                        }
                        applyOutcome(option.id);
                      }}
                      className="rounded-lg border px-2 py-1.5 text-[11px] font-bold disabled:opacity-50"
                      style={{
                        borderColor: selectedOutcome === option.id ? option.color : `${primary}22`,
                        backgroundColor: selectedOutcome === option.id ? `${option.color}18` : surface,
                        color: selectedOutcome === option.id ? option.color : primary,
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-snug" style={{ color: `${primary}88` }}>
                  {selectedOutcome === 'cancelled'
                    ? 'Cancel records a cancelled payment — the booking is never confirmed.'
                    : 'Selecting a test result pre-fills the matching test instrument. The server derives the real outcome from that instrument, so a forged result is rejected.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {selectedOutcome === 'cancelled' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleMockCancel}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold disabled:opacity-50"
                    style={{ borderColor: `${primary}33`, color: primary }}
                  >
                    Cancel this payment
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy || !order}
                    onClick={handleMockPay}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
                    style={{ backgroundColor: primary }}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {stage === 'processing'
                      ? 'Simulating payment…'
                      : stage === 'verifying'
                        ? 'Verifying with server…'
                        : `Pay ${formatPaise(amountPaise)} (test)`}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onClose('dismissed')}
                  className="rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50"
                  style={{ borderColor: `${primary}22`, color: `${primary}AA` }}
                >
                  Pay later
                </button>
              </div>
              <p className="text-center text-[11px]" style={{ color: `${primary}77` }}>
                {config?.testHint || 'Server-verified payment. Your slot is held for a short time.'}
              </p>
            </>
          )}

          {/* Razorpay body */}
          {!isMock && providerMode === 'razorpay' && order && stage !== 'success' && stage !== 'failed' && stage !== 'pending' && stage !== 'cancelled' && (
            <div className="space-y-3">
              <div className="rounded-xl border px-3.5 py-3 text-xs leading-relaxed" style={{ borderColor: `${primary}1A`, color: `${primary}AA` }}>
                You will be redirected to Razorpay's secure window to pay the advance. The booking is confirmed only
                after the server verifies Razorpay's signature for this order.
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={handleRazorpayPay}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-60"
                style={{ backgroundColor: primary }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {busy ? 'Opening secure payment…' : `Pay ${formatPaise(amountPaise)} with Razorpay`}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onClose('dismissed')}
                className="w-full rounded-xl border px-4 py-2.5 text-xs font-bold disabled:opacity-50"
                style={{ borderColor: `${primary}22`, color: `${primary}AA` }}
              >
                Pay later
              </button>
            </div>
          )}

          {/* Result states */}
          {stage === 'success' && (
            <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
              <p className="flex items-center gap-2 text-sm font-bold">
                <CheckCircle2 className="h-5 w-5" /> Payment verified
              </p>
              <p>{message || 'Your advance has been verified by the server.'}</p>
              {lastResult?.transactionId && (
                <p className="font-mono text-[11px]">Transaction: {lastResult.transactionId}</p>
              )}
              <p>Calendar downloads and confirmation notifications are now unlocked.</p>
              <button
                type="button"
                onClick={() => onClose('dismissed')}
                className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white"
              >
                <Check className="h-3.5 w-3.5" /> Done
              </button>
            </div>
          )}

          {stage === 'failed' && (
            <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
              <p className="flex items-start gap-2 text-sm font-bold">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" /> Payment was not successful
              </p>
              <p className="leading-relaxed">{message || 'The test payment failed. No confirmation was issued.'}</p>
              <p className="font-semibold">Your booking is still pending payment — nothing has been confirmed.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startNewOrder}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try payment again
                </button>
                <button
                  type="button"
                  onClick={() => onClose('dismissed')}
                  className="rounded-lg border border-rose-300 px-3.5 py-2 text-xs font-bold text-rose-700"
                >
                  Pay later
                </button>
              </div>
            </div>
          )}

          {stage === 'pending' && (
            <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
              <p className="flex items-start gap-2 text-sm font-bold">
                <Clock className="mt-0.5 h-5 w-5 shrink-0" /> Payment pending
              </p>
              <p className="leading-relaxed">
                {message || 'The payment is awaiting confirmation. The booking is not confirmed yet.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={checkPendingStatus}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3.5 py-2 text-xs font-bold text-amber-800"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Check status
                </button>
                <button
                  type="button"
                  onClick={startNewOrder}
                  className="rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white"
                >
                  Retry payment
                </button>
                <button
                  type="button"
                  onClick={() => onClose('dismissed')}
                  className="rounded-lg border border-amber-300 px-3.5 py-2 text-xs font-bold text-amber-800"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {stage === 'cancelled' && (
            <div className="space-y-3 rounded-2xl border p-4 text-xs" style={{ borderColor: `${primary}22`, color: `${primary}CC` }}>
              <p className="flex items-start gap-2 text-sm font-bold" style={{ color: primary }}>
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" /> Payment cancelled
              </p>
              <p className="leading-relaxed">{message || 'The payment was cancelled. Your booking has not been confirmed.'}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startNewOrder}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-white"
                  style={{ backgroundColor: primary }}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Start a new payment
                </button>
                <button
                  type="button"
                  onClick={() => onClose('cancelled')}
                  className="rounded-lg border px-3.5 py-2 text-xs font-bold"
                  style={{ borderColor: `${primary}22` }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <p className="flex items-center justify-center gap-1.5 text-center text-[10px]" style={{ color: `${primary}66` }}>
            <Lock className="h-3 w-3" />
            Amount, currency and booking are verified on the server before any confirmation is issued.
            {config?.holdMinutes ? ` Unpaid slots are released after ${config.holdMinutes} minutes.` : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCheckout;
