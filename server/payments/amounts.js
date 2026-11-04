/**
 * Pure money helpers for the booking checkout.
 *
 * All monetary values are integer paise. The advance is always derived on the
 * server from the authoritative service price — a browser can never choose how
 * much it owes.
 */

import { ValidationError } from '../security.js';
import {
  MOCK_BANKS,
  MOCK_CARDS,
  MOCK_METHODS,
  MOCK_UPI_IDS,
  MOCK_WALLETS,
  MIN_ADVANCE_PAISE,
  clampPercent,
} from './config.js';

export function toPaise(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/** Advance (pay-now) amount in paise for a given total. */
export function computeAdvancePaise(amountPaise, advancePercent) {
  const total = toPaise(amountPaise);
  const percent = clampPercent(advancePercent);
  if (total <= 0 || percent <= 0) return 0;
  const raw = Math.round((total * percent) / 100);
  return Math.min(total, Math.max(Math.min(MIN_ADVANCE_PAISE, total), raw));
}

/** Full checkout breakdown, consistent between server and UI previews. */
export function computePaymentAmounts({ amountPaise, advancePercent, advanceRequired = true }) {
  const totalPaise = toPaise(amountPaise);
  const advancePaise = advanceRequired ? computeAdvancePaise(totalPaise, advancePercent) : 0;
  return {
    totalPaise,
    advancePaise,
    remainingPaise: Math.max(0, totalPaise - advancePaise),
    paymentRequired: advancePaise > 0,
  };
}

const normalizeDigits = (value) => String(value || '').replace(/\D/g, '');

export function isValidUpiVpa(value) {
  const vpa = String(value || '').trim();
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}@[a-zA-Z][a-zA-Z0-9.-]{1,31}$/.test(vpa);
}

function roundOutcome(result) {
  return {
    outcome: result.outcome,
    instrument: result.instrument,
    instrumentLabel: result.instrumentLabel,
    message: result.message,
  };
}

/**
 * Maps a mock payment instrument to a deterministic outcome **on the server**.
 *
 * Only the documented test instruments are accepted — an arbitrary UPI ID or
 * card number is rejected rather than guessed at, so a client cannot force a
 * success result, and no real payment identifier is ever processed.
 */
export function deriveMockOutcome({ method, upiId, cardNumber, bank, wallet } = {}) {
  const kind = String(method || '').trim().toLowerCase();
  if (!MOCK_METHODS.includes(kind)) {
    throw new ValidationError(`Choose a payment method: ${MOCK_METHODS.join(', ')}.`);
  }

  if (kind === 'upi') {
    const vpa = String(upiId || '').trim().toLowerCase();
    if (!vpa) throw new ValidationError('Enter a test UPI ID to continue.');
    if (!isValidUpiVpa(vpa)) throw new ValidationError('Enter a valid UPI ID, for example success@mockupi.');
    const outcome = MOCK_UPI_IDS[vpa];
    if (!outcome) {
      throw new ValidationError(
        `"${vpa}" is not a mock test UPI ID. Test mode accepts success@mockupi, failure@mockupi, pending@mockupi or cancel@mockupi.`
      );
    }
    return roundOutcome({
      outcome,
      instrument: vpa,
      instrumentLabel: `UPI · ${vpa}`,
      message: mockOutcomeMessage(outcome, 'UPI'),
    });
  }

  if (kind === 'card') {
    const digits = normalizeDigits(cardNumber);
    if (digits.length < 12 || digits.length > 19) {
      throw new ValidationError('Enter a test card number (12–19 digits).');
    }
    const card = MOCK_CARDS.find((entry) => entry.number === digits);
    if (!card) {
      throw new ValidationError(
        'This card number is not a mock test card. Use 4111111111111111 (success), 4000000000000002 (failure) or 4000000000000006 (pending).'
      );
    }
    return roundOutcome({
      outcome: card.outcome,
      instrument: `**** **** **** ${digits.slice(-4)}`,
      instrumentLabel: card.label,
      message: mockOutcomeMessage(card.outcome, 'card'),
    });
  }

  if (kind === 'netbanking') {
    const code = String(bank || '').trim().toLowerCase();
    const entry = MOCK_BANKS.find((b) => b.code === code);
    if (!entry) {
      throw new ValidationError('Select a test bank (test_success, test_failure or test_pending).');
    }
    return roundOutcome({
      outcome: entry.outcome,
      instrument: entry.code,
      instrumentLabel: entry.label,
      message: mockOutcomeMessage(entry.outcome, 'net banking'),
    });
  }

  const code = String(wallet || '').trim().toLowerCase();
  const entry = MOCK_WALLETS.find((w) => w.code === code);
  if (!entry) {
    throw new ValidationError('Select a test wallet (test_success, test_failure or test_pending).');
  }
  return roundOutcome({
    outcome: entry.outcome,
    instrument: entry.code,
    instrumentLabel: entry.label,
    message: mockOutcomeMessage(entry.outcome, 'wallet'),
  });
}

export function mockOutcomeMessage(outcome, channel = 'payment') {
  switch (outcome) {
    case 'success':
      return `Mock ${channel} authorised successfully. No real money was charged.`;
    case 'failed':
      return `Mock ${channel} declined. This instrument is configured to simulate a failed payment.`;
    case 'pending':
      return `Mock ${channel} is awaiting bank confirmation. The booking stays unconfirmed while the payment is pending.`;
    case 'cancelled':
      return `Mock ${channel} was cancelled. The booking has not been confirmed.`;
    default:
      return 'Mock payment status unknown.';
  }
}

export const MOCK_OUTCOMES = Object.freeze(['success', 'failed', 'pending', 'cancelled']);
