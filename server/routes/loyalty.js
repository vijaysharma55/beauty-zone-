import { Router } from 'express';
import { db, newId, nowIso } from '../db.js';
import { str, int, ValidationError, rateLimit } from '../security.js';
import { asyncHandler } from '../middleware.js';

export const loyaltyRouter = Router();

const limiter = rateLimit({ windowMs: 60_000, max: 40, key: 'loyalty-api' });

export const REWARD_OFFERS = [
  {
    id: 'rew-1',
    title: '₹200 Instant Salon Discount',
    description: 'Valid on any haircut, styling, or grooming service bill across all studio branches.',
    pointsCost: 200,
    discountAmount: 200,
    discountValue: '₹200 Flat Off',
    category: 'discount',
    badge: 'Popular',
  },
  {
    id: 'rew-2',
    title: '₹500 Premium Treatment Voucher',
    description: 'Use on any hair botox, balayage, or hydra-facial treatment.',
    pointsCost: 450,
    discountAmount: 500,
    discountValue: '₹500 Flat Off',
    category: 'discount',
    badge: 'Best Value',
  },
  {
    id: 'rew-3',
    title: 'Free Moroccan Scalp & Hair Spa (Worth ₹1,800)',
    description: 'Deep nourishing argan oil hair spa with hot towel steam and relaxing head massage.',
    pointsCost: 750,
    discountAmount: 1800,
    discountValue: '100% Free Service (Worth ₹1,800)',
    category: 'free_service',
    badge: '100% Free',
  },
  {
    id: 'rew-4',
    title: '24K Gold Foil Facial Upgrade (Worth ₹2,500)',
    description: 'Upgrade any regular facial to our signature real 24K Gold Leaf facial with ultrasound glow treatment.',
    pointsCost: 1000,
    discountAmount: 2500,
    discountValue: 'Free Luxury Upgrade (Worth ₹2,500)',
    category: 'upgrade',
    badge: 'Royal Favorite',
  },
  {
    id: 'rew-5',
    title: '₹1,500 Royal Bridal Booking Discount',
    description: 'Instant reduction on any Signature HD or Airbrush bridal makeup package.',
    pointsCost: 1200,
    discountAmount: 1500,
    discountValue: '₹1,500 Off Bridal',
    category: 'bridal',
    badge: 'Bridal Special',
  },
];

function calculateTier(totalPoints) {
  if (totalPoints >= 1500) return 'platinum';
  if (totalPoints >= 500) return 'gold';
  return 'silver';
}

function getOrCreateLoyaltyAccount(phoneRaw, nameHint = 'Valued Guest') {
  const cleanPhone = String(phoneRaw || '').replace(/\D/g, '');
  if (cleanPhone.length < 8) {
    throw new ValidationError('Please enter a valid 10-digit phone number.');
  }

  let row = db.prepare('SELECT * FROM loyalty_accounts WHERE phone = ?').get(cleanPhone);

  if (!row) {
    const memberId = `VIP-${cleanPhone.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
    const ts = nowIso();
    // Welcome gift: 100 bonus loyalty points on first lookup!
    db.prepare(
      `INSERT INTO loyalty_accounts (phone, name, member_id, tier, total_points, lifetime_points, visits_count, created_at, updated_at)
       VALUES (?, ?, ?, 'silver', 100, 100, 0, ?, ?)`
    ).run(cleanPhone, nameHint || 'Valued Guest', memberId, ts, ts);

    db.prepare(
      `INSERT INTO loyalty_transactions (id, phone, booking_id, salon_id, service_title, bill_amount, points, type, description, created_at)
       VALUES (?, ?, NULL, NULL, 'Welcome Loyalty Bonus', 0, 100, 'bonus', 'Welcome gift for joining BeautyZone VIP Rewards', ?)`
    ).run(newId(), cleanPhone, ts);

    row = db.prepare('SELECT * FROM loyalty_accounts WHERE phone = ?').get(cleanPhone);
  }

  return row;
}

/** Helper: Automatically credits points when a booking is completed */
export function creditLoyaltyPointsForCompletedBooking(booking) {
  if (!booking || !booking.phone) return null;
  const cleanPhone = String(booking.phone).replace(/\D/g, '');
  if (cleanPhone.length < 8) return null;

  // Prevent double crediting for the same booking
  const existingTx = db
    .prepare('SELECT id FROM loyalty_transactions WHERE booking_id = ? AND type = "earn"')
    .get(booking.id);
  if (existingTx) return null;

  const account = getOrCreateLoyaltyAccount(cleanPhone, booking.full_name || booking.client_name);

  // Calculate base points: 1 point per ₹10 spent (minimum 100 points)
  const billAmount = Number(booking.estimated_total || booking.estimatedTotal || 1000);
  const basePoints = Math.max(100, Math.round(billAmount / 10));

  // Multiplier by tier
  const tierMultipliers = { silver: 1.0, gold: 1.25, platinum: 1.5 };
  const multiplier = tierMultipliers[account.tier] || 1.0;
  const pointsEarned = Math.round(basePoints * multiplier);

  const ts = nowIso();
  const newTotal = account.total_points + pointsEarned;
  const newLifetime = account.lifetime_points + pointsEarned;
  const newVisits = account.visits_count + 1;
  const newTier = calculateTier(newTotal);

  db.prepare(
    `UPDATE loyalty_accounts
     SET total_points = ?, lifetime_points = ?, visits_count = ?, tier = ?, updated_at = ?
     WHERE phone = ?`
  ).run(newTotal, newLifetime, newVisits, newTier, ts, cleanPhone);

  db.prepare(
    `INSERT INTO loyalty_transactions (id, phone, booking_id, salon_id, service_title, bill_amount, points, type, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'earn', ?, ?)`
  ).run(
    newId(),
    cleanPhone,
    booking.id,
    booking.salon_id || null,
    booking.service || 'Salon Service',
    billAmount,
    pointsEarned,
    `Rewarded ${pointsEarned} loyalty points for completed appointment (${booking.reference || 'Ref'})`,
    ts
  );

  return { pointsEarned, totalPoints: newTotal, tier: newTier };
}

/** Get customer loyalty account, history, and active vouchers */
loyaltyRouter.get('/loyalty', limiter, asyncHandler(async (req, res) => {
  const phone = str(req.query.phone, { max: 40, field: 'Phone' });
  if (!phone) {
    return res.json({ account: null, offers: REWARD_OFFERS });
  }

  const account = getOrCreateLoyaltyAccount(phone);

  const activities = db
    .prepare(
      `SELECT id, created_at AS date, service_title AS serviceTitle, bill_amount AS billAmount, points AS pointsEarned, type, description
       FROM loyalty_transactions WHERE phone = ? ORDER BY created_at DESC LIMIT 30`
    )
    .all(account.phone);

  const vouchers = db
    .prepare(
      `SELECT code AS voucherCode, title AS rewardTitle, discount_amount AS discountAmount, points_cost AS pointsCost,
              created_at AS dateRedeemed, expires_at AS validTill, used
       FROM loyalty_vouchers WHERE phone = ? AND used = 0 ORDER BY created_at DESC`
    )
    .all(account.phone)
    .map((v) => ({
      ...v,
      status: v.used ? 'used' : 'active',
      discountValue: `₹${v.discountAmount} OFF`,
    }));

  res.json({
    account: {
      phone: account.phone,
      name: account.name,
      memberId: account.member_id,
      tier: account.tier,
      totalPoints: account.total_points,
      lifetimePoints: account.lifetime_points,
      visitsCount: account.visits_count,
      joinedDate: account.created_at,
    },
    activities,
    vouchers,
    offers: REWARD_OFFERS,
  });
}));

/** Redeem loyalty points for a discount voucher */
loyaltyRouter.post('/loyalty/redeem', limiter, asyncHandler(async (req, res) => {
  const phone = str(req.body.phone, { max: 40, field: 'Phone', required: true });
  const offerId = str(req.body.offerId, { max: 40, field: 'Offer ID', required: true });

  const offer = REWARD_OFFERS.find((o) => o.id === offerId);
  if (!offer) {
    throw new ValidationError('Selected reward offer does not exist.');
  }

  const account = getOrCreateLoyaltyAccount(phone);

  if (account.total_points < offer.pointsCost) {
    throw new ValidationError(
      `Insufficient points. You need ${offer.pointsCost - account.total_points} more points to redeem this reward.`
    );
  }

  const cleanPhone = account.phone;
  const ts = nowIso();
  const voucherCode = `VIP-${offer.discountAmount}-${cleanPhone.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

  // Expiry in 60 days
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const newPoints = account.total_points - offer.pointsCost;
  const newTier = calculateTier(newPoints);

  db.prepare(
    'UPDATE loyalty_accounts SET total_points = ?, tier = ?, updated_at = ? WHERE phone = ?'
  ).run(newPoints, newTier, ts, cleanPhone);

  db.prepare(
    `INSERT INTO loyalty_transactions (id, phone, booking_id, salon_id, service_title, bill_amount, points, type, description, created_at)
     VALUES (?, ?, NULL, NULL, ?, 0, ?, 'redeem', ?, ?)`
  ).run(
    newId(),
    cleanPhone,
    offer.title,
    -offer.pointsCost,
    `Redeemed ${offer.pointsCost} pts for voucher ${voucherCode}`,
    ts
  );

  db.prepare(
    `INSERT INTO loyalty_vouchers (code, phone, offer_id, title, discount_amount, points_cost, used, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
  ).run(voucherCode, cleanPhone, offer.id, offer.title, offer.discountAmount, offer.pointsCost, ts, expiresAt);

  res.json({
    success: true,
    voucherCode,
    discountAmount: offer.discountAmount,
    totalPoints: newPoints,
    tier: newTier,
    message: `Successfully redeemed ${offer.pointsCost} points for ${offer.title}! Voucher code: ${voucherCode}`,
  });
}));

/** Verify a voucher code for discount application in booking */
loyaltyRouter.post('/loyalty/verify-voucher', limiter, asyncHandler(async (req, res) => {
  const code = str(req.body.code, { max: 60, field: 'Voucher Code', required: true }).trim().toUpperCase();

  const voucher = db.prepare('SELECT * FROM loyalty_vouchers WHERE code = ?').get(code);

  if (!voucher) {
    throw new ValidationError('Invalid voucher code. Please check and try again.');
  }

  if (voucher.used) {
    throw new ValidationError('This loyalty voucher has already been used.');
  }

  if (new Date(voucher.expires_at).getTime() < Date.now()) {
    throw new ValidationError('This loyalty voucher has expired.');
  }

  res.json({
    valid: true,
    voucher: {
      code: voucher.code,
      title: voucher.title,
      discountAmount: voucher.discount_amount,
      phone: voucher.phone,
    },
  });
}));
