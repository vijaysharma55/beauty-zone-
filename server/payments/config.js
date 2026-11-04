/**
 * Payment configuration.
 *
 * A single place that decides which payment provider is active, whether mock
 * (test) payments are allowed and how much of a booking must be paid up front.
 * Nothing here ever reads a value supplied by a browser: the mode, the advance
 * percentage and the credentials all come from the server environment.
 *
 * Environment:
 *   PAYMENT_MODE=mock|razorpay
 *   PAYMENT_ADVANCE_PERCENT=25          (0 disables advance payments)
 *   PAYMENT_REQUIRE_ADVANCE=true|false  (defaults to true when a provider is ready)
 *   PAYMENT_HOLD_MINUTES=30             (how long an unpaid slot is held)
 *   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET
 *   RAZORPAY_CURRENCY=INR
 *
 * Mock payments are hard-blocked when NODE_ENV=production.
 */

export const CURRENCY = 'INR';
export const DEFAULT_ADVANCE_PERCENT = 25;
export const DEFAULT_HOLD_MINUTES = 30;
export const MIN_ADVANCE_PAISE = 1_000; // ₹10 floor for advance deposits

export const MOCK_UPI_IDS = Object.freeze({
  'success@mockupi': 'success',
  'failure@mockupi': 'failed',
  'pending@mockupi': 'pending',
  'cancel@mockupi': 'cancelled',
});

export const MOCK_METHODS = Object.freeze(['upi', 'card', 'netbanking', 'wallet']);

export const MOCK_CARDS = Object.freeze([
  { number: '4111111111111111', outcome: 'success', label: 'Test Visa — Success' },
  { number: '4000000000000002', outcome: 'failed', label: 'Test Card — Failure' },
  { number: '4000000000000006', outcome: 'pending', label: 'Test Card — Pending' },
]);

export const MOCK_BANKS = Object.freeze([
  { code: 'test_success', label: 'Test Bank — Success', outcome: 'success' },
  { code: 'test_failure', label: 'Test Bank — Failure', outcome: 'failed' },
  { code: 'test_pending', label: 'Test Bank — Pending', outcome: 'pending' },
]);

export const MOCK_WALLETS = Object.freeze([
  { code: 'test_success', label: 'Test Wallet — Success', outcome: 'success' },
  { code: 'test_failure', label: 'Test Wallet — Failure', outcome: 'failed' },
  { code: 'test_pending', label: 'Test Wallet — Pending', outcome: 'pending' },
]);

export const MOCK_TEST_HINT =
  'These are MOCK test credentials only. No real UPI, card, bank or wallet transaction is created.';

function readNumber(value) {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function clampPercent(value, fallback = DEFAULT_ADVANCE_PERCENT) {
  const n = readNumber(value);
  if (n === null) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function readHoldMinutes(env) {
  const n = readNumber(env.PAYMENT_HOLD_MINUTES);
  if (n === null) return DEFAULT_HOLD_MINUTES;
  return Math.min(1440, Math.max(1, Math.round(n)));
}

/**
 * Resolves the payment configuration for the current environment.
 *
 * @param {Record<string, string | undefined>} [env]
 */
export function resolvePaymentConfig(env = process.env) {
  const isProduction = String(env.NODE_ENV || '').toLowerCase() === 'production';
  const requestedMode = String(env.PAYMENT_MODE || '').trim().toLowerCase();
  const fallbackMode = isProduction ? 'razorpay' : 'mock';
  const declaredMode = requestedMode || fallbackMode;
  const keyId = String(env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = String(env.RAZORPAY_KEY_SECRET || '').trim();
  const webhookSecret = String(env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  const razorpayConfigured = Boolean(keyId && keySecret);
  const advancePercent = clampPercent(env.PAYMENT_ADVANCE_PERCENT);
  const holdMinutes = readHoldMinutes(env);

  let mode = declaredMode;
  let reason = null;

  if (!['mock', 'razorpay'].includes(declaredMode)) {
    mode = 'disabled';
    reason = `Unknown PAYMENT_MODE "${declaredMode}". Use "mock" or "razorpay".`;
  }

  const mockBlockedInProduction = isProduction && mode === 'mock';
  if (mockBlockedInProduction) {
    mode = 'disabled';
    reason = 'Mock payments are blocked when NODE_ENV=production. Set PAYMENT_MODE=razorpay with live credentials.';
  }

  if (mode === 'razorpay' && !razorpayConfigured) {
    reason = 'PAYMENT_MODE=razorpay but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured.';
  }

  const providerReady = mode === 'mock' || (mode === 'razorpay' && razorpayConfigured);
  const available = providerReady;
  if (mode === 'disabled' && !reason) reason = 'No payment provider is configured.';

  // Default: an advance is required whenever a provider is ready. Deployments
  // without any provider keep working with "pay at the salon" bookings, but an
  // explicit PAYMENT_REQUIRE_ADVANCE=true makes the API fail closed instead.
  const explicitAdvanceFlag = String(env.PAYMENT_REQUIRE_ADVANCE ?? '').trim().toLowerCase();
  const advanceExplicitlyRequired = explicitAdvanceFlag === 'true' || explicitAdvanceFlag === '1';
  const advanceExplicitlyDisabled = explicitAdvanceFlag === 'false' || explicitAdvanceFlag === '0';
  const advanceRequired =
    advancePercent > 0 &&
    (advanceExplicitlyRequired || (!advanceExplicitlyDisabled && available));

  return {
    mode,
    declaredMode,
    requestedMode,
    isProduction,
    currency: String(env.RAZORPAY_CURRENCY || CURRENCY).trim().toUpperCase() || CURRENCY,
    mock: mode === 'mock',
    mockAllowed: mode === 'mock' && !isProduction,
    mockBlockedInProduction,
    available,
    providerReady,
    advanceRequired,
    advancePercent,
    holdMinutes,
    keyId: mode === 'razorpay' ? keyId : '',
    keySecret: mode === 'razorpay' ? keySecret : '',
    webhookSecret,
    razorpayConfigured,
    reason,
  };
}

/** Safe subset that may be sent to a browser. Secrets are never included. */
export function publicPaymentConfig(config = resolvePaymentConfig()) {
  return {
    mode: config.mode,
    currency: config.currency,
    mock: config.mock,
    mockAllowed: config.mockAllowed,
    available: config.available,
    advanceRequired: config.advanceRequired,
    advancePercent: config.advancePercent,
    holdMinutes: config.holdMinutes,
    keyId: config.mode === 'razorpay' ? config.keyId : '',
    reason: config.reason,
    testMode: config.mock,
    testNotice: config.mock ? 'TEST MODE — No real money will be charged.' : '',
    testUpiIds: config.mock
      ? Object.entries(MOCK_UPI_IDS).map(([id, outcome]) => ({ id, outcome }))
      : [],
    testCards: config.mock ? MOCK_CARDS.map((c) => ({ ...c })) : [],
    testBanks: config.mock ? MOCK_BANKS.map((b) => ({ ...b })) : [],
    testWallets: config.mock ? MOCK_WALLETS.map((w) => ({ ...w })) : [],
    testHint: config.mock ? MOCK_TEST_HINT : '',
  };
}
