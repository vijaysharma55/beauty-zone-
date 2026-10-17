import React, { useState, useEffect } from 'react';
import {
  Gift,
  Sparkles,
  Heart,
  PartyPopper,
  Copy,
  Check,
  Printer,
  Share2,
  Send,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Clock,
  Tag,
  Download,
  RotateCcw,
} from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import { WhatsAppIcon } from './SocialIcons';

export interface GiftCardItem {
  id: string;
  code: string;
  amount: number;
  recipientName: string;
  senderName: string;
  message: string;
  occasion: string;
  theme: string;
  createdAt: string;
  isRedeemed: boolean;
}

const GIFT_CARD_THEMES = [
  {
    id: 'birthday',
    name: 'Birthday Special',
    icon: PartyPopper,
    bgGradient: 'from-[#0F172A] via-[#1E293B] to-[#334155]',
    accentColor: '#D09A40',
    badgeText: 'Happy Birthday',
  },
  {
    id: 'wedding',
    name: 'Wedding & Anniversary',
    icon: Heart,
    bgGradient: 'from-[#2D1B2D] via-[#4A2E4B] to-[#1F1320]',
    accentColor: '#E2B764',
    badgeText: 'Congratulations',
  },
  {
    id: 'festive',
    name: 'Festive & Celebration',
    icon: Sparkles,
    bgGradient: 'from-[#1E1B4B] via-[#312E81] to-[#171330]',
    accentColor: '#F59E0B',
    badgeText: 'Festive Glow',
  },
  {
    id: 'pamper',
    name: 'Luxury Pamper Treat',
    icon: Gift,
    bgGradient: 'from-[#0F2922] via-[#134E4A] to-[#042F2E]',
    accentColor: '#34D399',
    badgeText: 'Relax & Rejuvenate',
  },
];

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000, 25000];

export const DigitalGiftCardSection: React.FC = () => {
  const [amount, setAmount] = useState<number>(2500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientContact, setRecipientContact] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  const [message, setMessage] = useState<string>(
    'Wishing you a wonderful time of relaxation and glowing beauty at our salon!'
  );
  const [selectedThemeId, setSelectedThemeId] = useState<string>('birthday');
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [successCard, setSuccessCard] = useState<GiftCardItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<GiftCardItem[]>(() => {
    try {
      const stored = localStorage.getItem('rani_salon_gift_cards');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('rani_salon_gift_cards', JSON.stringify(savedCards));
    } catch {
      // ignore
    }
  }, [savedCards]);

  const currentTheme =
    GIFT_CARD_THEMES.find((t) => t.id === selectedThemeId) || GIFT_CARD_THEMES[0];

  const effectiveAmount = customAmount ? Number(customAmount) || amount : amount;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleGenerateGiftCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !senderName.trim()) {
      alert('Please enter both recipient and sender names.');
      return;
    }

    setIsPurchasing(true);

    setTimeout(() => {
      const randomCode = `RANI-GIFT-${Math.floor(1000 + Math.random() * 9000)}-${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;

      const newCard: GiftCardItem = {
        id: `card-${Date.now()}`,
        code: randomCode,
        amount: effectiveAmount,
        recipientName: recipientName.trim(),
        senderName: senderName.trim(),
        message: message.trim() || 'Enjoy your luxury salon experience!',
        occasion: currentTheme.name,
        theme: selectedThemeId,
        createdAt: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        isRedeemed: false,
      };

      setSavedCards((prev) => [newCard, ...prev]);
      setSuccessCard(newCard);
      setIsPurchasing(false);
    }, 1200);
  };

  const handlePrintCard = (card: GiftCardItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Gift Card - ₹${card.amount.toLocaleString('en-IN')}</title>
          <style>
            body { font-family: 'Inter', sans-serif; background: #FAF5E5; color: #0F172A; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { width: 600px; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: white; border-radius: 20px; padding: 40px; border: 3px solid #D09A40; box-shadow: 0 20px 40px rgba(0,0,0,0.2); position: relative; overflow: hidden; }
            .gold { color: #D09A40; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; letter-spacing: 1px; font-serif; }
            .badge { background: #D09A40; color: #0F172A; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .amount { font-size: 42px; font-weight: 800; color: #D09A40; margin: 15px 0; }
            .details { margin: 25px 0; background: rgba(255,255,255,0.07); padding: 20px; border-radius: 12px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .code-box { background: white; color: #0F172A; padding: 15px; border-radius: 10px; text-align: center; font-size: 22px; font-weight: 800; letter-spacing: 2px; margin-top: 25px; border: 2px dashed #D09A40; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #94A3B8; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div>
                <div class="logo">RANI'S LUXURY SALON</div>
                <div style="font-size: 12px; color: #D09A40; letter-spacing: 2px;">JAIPUR • DIGITAL GIFT VOUCHER</div>
              </div>
              <div class="badge">${card.occasion}</div>
            </div>
            
            <div style="font-size: 13px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px;">Gift Voucher Worth</div>
            <div class="amount">₹${card.amount.toLocaleString('en-IN')}</div>
            
            <div class="details">
              <div class="row"><span><strong>To:</strong> ${card.recipientName}</span><span><strong>From:</strong> ${card.senderName}</span></div>
              <div style="margin-top: 10px; font-style: italic; color: #CBD5E1; font-size: 14px;">"${card.message}"</div>
            </div>

            <div class="code-box">
              CODE: ${card.code}
            </div>

            <div class="footer">
              Valid at all Rani's Luxury Salon & Spa branches across Jaipur. Redeemable against any hair, skin, bridal, or spa services. No expiry date.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShareWhatsApp = (card: GiftCardItem) => {
    const text = encodeURIComponent(
      `🎁 *Digital Gift Card from Rani's Luxury Salon, Jaipur!*\n\nHey ${card.recipientName},\n${card.senderName} has sent you a luxury salon gift card worth *₹${card.amount.toLocaleString('en-IN')}*!\n\nOccasion: ${card.occasion}\nMessage: "${card.message}"\n\n🎟️ *Gift Code:* \`${card.code}\`\n\nRedeem this code at any Rani's Salon branch or when booking online!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <section id="gift-cards" className="py-20 md:py-28 bg-[#FAF5E5] relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#D09A40]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#0F172A]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <RevealOnScroll>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-[#0F172A]/5 text-[#0F172A] px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-4 border border-[#0F172A]/10">
              <Gift className="w-4 h-4 text-[#D09A40]" />
              <span>Digital Gift Cards</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#0F172A] mb-4 tracking-tight">
              Gift the Joy of <span className="text-[#D09A40]">Luxury & Glow</span>
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Surprise your loved ones in Jaipur with an instant digital gift card for royal haircuts, bridal makeovers, gold facials, or relaxing spa treatments.
            </p>
          </div>
        </RevealOnScroll>

        {successCard ? (
          <RevealOnScroll>
            <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border-2 border-[#D09A40] text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="bg-[#D09A40]/10 text-[#0F172A] px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Successfully Generated!
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F172A] mt-3 mb-2">
                Your Gift Card is Ready
              </h3>
              <p className="text-slate-600 text-sm mb-8">
                Sent to <span className="font-semibold">{successCard.recipientName}</span> for{' '}
                <span className="font-semibold text-[#D09A40]">
                  ₹{successCard.amount.toLocaleString('en-IN')}
                </span>
              </p>

              {/* Gift Card visual voucher */}
              <div
                className={`bg-gradient-to-br ${currentTheme.bgGradient} text-white rounded-2xl p-6 sm:p-8 shadow-xl border-2 border-[#D09A40] text-left relative overflow-hidden mb-8`}
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#D09A40]/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="font-serif font-bold text-lg text-white">RANI'S LUXURY SALON</h4>
                    <p className="text-xs text-[#D09A40] tracking-widest uppercase">Jaipur • Gift Voucher</p>
                  </div>
                  <span className="bg-[#D09A40] text-[#0F172A] px-3 py-1 rounded-full text-[11px] font-bold">
                    {successCard.occasion}
                  </span>
                </div>

                <div className="text-xs text-slate-300 uppercase tracking-wider">Gift Amount</div>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#D09A40] my-1">
                  ₹{successCard.amount.toLocaleString('en-IN')}
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 my-4 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">To: <strong className="text-white">{successCard.recipientName}</strong></span>
                    <span className="text-slate-300">From: <strong className="text-white">{successCard.senderName}</strong></span>
                  </div>
                  <p className="text-xs text-slate-200 italic mt-2">"{successCard.message}"</p>
                </div>

                <div className="bg-white text-[#0F172A] rounded-xl p-3 text-center border-2 border-dashed border-[#D09A40]">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Unique Code</div>
                  <div className="text-lg sm:text-xl font-black tracking-wider text-[#0F172A] mt-0.5">
                    {successCard.code}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-center">
                <button
                  onClick={() => handleCopyCode(successCard.code)}
                  className="flex items-center gap-2 bg-[#0F172A] hover:bg-[#1E293B] text-white px-6 py-3 rounded-xl font-semibold text-sm transition shadow-md"
                >
                  {copiedCode === successCard.code ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Code Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#D09A40]" />
                      <span>Copy Gift Code</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handlePrintCard(successCard)}
                  className="flex items-center gap-2 bg-[#D09A40] hover:bg-[#B88530] text-[#0F172A] px-6 py-3 rounded-xl font-bold text-sm transition shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Gift Card</span>
                </button>

                <button
                  onClick={() => handleShareWhatsApp(successCard)}
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#22bf5b] text-white px-6 py-3 rounded-xl font-semibold text-sm transition shadow-md"
                >
                  <WhatsAppIcon className="w-4 h-4 text-white" />
                  <span>Share via WhatsApp</span>
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                <button
                  onClick={() => {
                    setSuccessCard(null);
                    setRecipientName('');
                    setSenderName('');
                  }}
                  className="flex items-center gap-2 text-[#0F172A] hover:text-[#D09A40] text-sm font-semibold transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Create Another Gift Card</span>
                </button>
              </div>
            </div>
          </RevealOnScroll>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Form Column */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200">
              <form onSubmit={handleGenerateGiftCard} className="space-y-6">
                {/* 1. Occasion Theme */}
                <div>
                  <label className="block text-sm font-bold text-[#0F172A] mb-3">
                    1. Select Occasion & Theme
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {GIFT_CARD_THEMES.map((theme) => {
                      const IconComponent = theme.icon;
                      const isSelected = selectedThemeId === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setSelectedThemeId(theme.id)}
                          className={`p-3 rounded-2xl text-left transition border-2 flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#D09A40] bg-[#FAF5E5] shadow-md'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${
                              isSelected
                                ? 'bg-[#0F172A] text-[#D09A40]'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-[#0F172A]">{theme.name}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{theme.badgeText}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Select Amount */}
                <div>
                  <label className="block text-sm font-bold text-[#0F172A] mb-3">
                    2. Select Gift Amount (INR)
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mb-3">
                    {PRESET_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setAmount(amt);
                          setCustomAmount('');
                        }}
                        className={`py-2.5 px-3 rounded-xl font-bold text-sm transition border ${
                          amount === amt && !customAmount
                            ? 'bg-[#0F172A] text-[#D09A40] border-[#0F172A] shadow-md'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Or enter custom amount (e.g. ₹3500)"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40] transition"
                    />
                  </div>
                </div>

                {/* 3. Recipient & Sender Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Recipient's Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sunita Sharma"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Your Name (Sender) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rohit Verma"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                    />
                  </div>
                </div>

                {/* Recipient Phone / Email */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Recipient Mobile / Email (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210 or sunita@gmail.com"
                    value={recipientContact}
                    onChange={(e) => setRecipientContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                  />
                </div>

                {/* Personal Message */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Personal Wishes / Message
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add a loving message for the recipient..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-[#D09A40] resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isPurchasing}
                  className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-[#D09A40] font-bold py-4 rounded-2xl transition shadow-lg flex items-center justify-center gap-3 text-base disabled:opacity-50"
                >
                  {isPurchasing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-[#D09A40] border-t-transparent rounded-full animate-spin" />
                      <span>Generating Gift Code...</span>
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5" />
                      <span>Generate Digital Gift Card (₹{effectiveAmount.toLocaleString('en-IN')})</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 sticky top-28">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Live Voucher Preview
                  </span>
                  <span className="bg-[#FAF5E5] text-[#0F172A] px-2.5 py-1 rounded-full text-[10px] font-bold border border-[#D09A40]/30">
                    Instant Delivery
                  </span>
                </div>

                {/* Card Preview Box */}
                <div
                  className={`bg-gradient-to-br ${currentTheme.bgGradient} text-white rounded-2xl p-6 shadow-2xl border-2 border-[#D09A40] relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 w-36 h-36 bg-[#D09A40]/10 rounded-full blur-xl pointer-events-none" />

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-serif font-bold text-base">RANI'S LUXURY SALON</h4>
                      <p className="text-[10px] text-[#D09A40] tracking-widest uppercase">Jaipur • Gift Card</p>
                    </div>
                    <span className="bg-[#D09A40] text-[#0F172A] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      {currentTheme.badgeText}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 uppercase tracking-wider">Value</div>
                  <div className="text-3xl font-extrabold text-[#D09A40] my-1">
                    ₹{effectiveAmount.toLocaleString('en-IN')}
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 my-3 text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-300">To: <strong className="text-white">{recipientName || '[Recipient Name]'}</strong></span>
                      <span className="text-slate-300">From: <strong className="text-white">{senderName || '[Your Name]'}</strong></span>
                    </div>
                    <p className="text-[11px] text-slate-200 italic mt-1.5">
                      "{message || 'Enjoy your gift!'}"
                    </p>
                  </div>

                  <div className="bg-white/90 text-[#0F172A] rounded-xl p-2.5 text-center font-mono text-sm font-bold tracking-wider">
                    RANI-GIFT-XXXX-YYYY
                  </div>
                </div>

                <div className="mt-6 space-y-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#D09A40] shrink-0" />
                    <span>Redeemable at all Rani's Salon branches in Jaipur.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#D09A40] shrink-0" />
                    <span>No expiry date. Can be used for any service or package.</span>
                  </div>
                </div>
              </div>

              {/* Previously Generated Cards in Session */}
              {savedCards.length > 0 && (
                <div className="mt-6 bg-white rounded-2xl p-6 shadow-md border border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
                    Your Recently Created Gift Codes ({savedCards.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {savedCards.slice(0, 3).map((card) => (
                      <div
                        key={card.id}
                        className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-xs transition"
                      >
                        <div>
                          <div className="font-bold text-[#0F172A]">{card.recipientName}</div>
                          <div className="text-slate-500 font-mono text-[10px]">{card.code} • ₹{card.amount.toLocaleString('en-IN')}</div>
                        </div>
                        <button
                          onClick={() => handleCopyCode(card.code)}
                          className="bg-[#0F172A] text-[#D09A40] px-2.5 py-1.5 rounded-lg font-bold text-[10px] hover:bg-[#1E293B] transition"
                        >
                          {copiedCode === card.code ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
