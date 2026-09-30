import React, { useState } from 'react';
import { ChevronDown, Sparkles, HelpCircle, MessageCircle, Phone, CalendarCheck, ShieldCheck } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import { SOCIAL_LINKS, WhatsAppIcon } from './SocialIcons';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const SALON_FAQS: FAQItem[] = [
  {
    category: 'Bridal & Makeup',
    question: 'What is included in the Royal Rajasthani HD Bridal Package?',
    answer: 'Our signature bridal package includes pre-bridal skin consultation, HD Airbrush or Mineral Waterproof base, authentic Kundan & jewelry setting, luxury hair styling with fresh flowers/accessories, draping, lash extensions, and a complimentary touch-up kit. Pre-bridal trials can also be scheduled at our C-Scheme flagship salon.',
  },
  {
    category: 'Home Service',
    question: 'How do doorstep home salon services work across Jaipur?',
    answer: 'Our certified senior beauticians and stylists arrive at your doorstep in Jaipur with fully sterilized equipment, single-use hygiene kits (disposable towels, sheets, gowns), and 100% genuine branded products. Standard distance-based travel fees apply transparently during booking (starting at ₹250).',
  },
  {
    category: 'Packages & Discounts',
    question: 'How long are festival combo packages and vouchers valid for?',
    answer: 'All promotional combo packages and festival deals purchased online remain valid for 60 to 90 days from the date of booking. You can redeem individual included treatments across multiple visits or all in a single appointment at any of our 3 Jaipur branches.',
  },
  {
    category: 'Booking & Cancellations',
    question: 'What is your rescheduling and cancellation policy?',
    answer: 'We understand plans change! You can reschedule or cancel your appointment free of charge up to 4 hours before the scheduled time. For bridal destination bookings, cancellations made at least 48 hours in advance are eligible for full deposit refunds or date modifications.',
  },
  {
    category: 'Safety & Products',
    question: 'Which cosmetic and hair care brands do you use?',
    answer: 'We exclusively use 100% genuine, dermatologist-tested international brands including MAC Cosmetics, Kryolan, Moroccanoil, L\'Oréal Professionnel, Huda Beauty, NARS, and O3+ for skin facials. All nanoplastia and hair smoothening formulas are 0% formaldehyde and pregnancy-safe.',
  },
  {
    category: 'Bridal Party & Guests',
    question: 'Can you accommodate sangeet, mehendi, and family guest makeovers simultaneously?',
    answer: 'Yes! With our dedicated team of 18+ senior stylists and bridal assistants across our 3 Jaipur salons, we can style up to 15 family members and bridesmaids simultaneously either at our salon private suites or at your wedding venue (e.g. Rambagh, Fairmont, Leela).',
  },
];

interface FAQSectionProps {
  onOpenBooking: () => void;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ onOpenBooking }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq" className="py-16 md:py-24 bg-[#FAF5E5]/70 border-t border-[#0F172A]/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <RevealOnScroll duration={0.6}>
          <div className="text-center max-w-2xl mx-auto pb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D09A40]/15 border border-[#D09A40]/30 text-[#D09A40] text-xs font-semibold uppercase tracking-wider mb-2">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Got Questions? We Have Answers</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#4A4A4A] leading-relaxed font-light">
              Clear information about our bridal packages, home salon visits across Jaipur, cancellations, and premium products.
            </p>
          </div>
        </RevealOnScroll>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {SALON_FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <RevealOnScroll key={idx} delay={idx * 0.04} duration={0.4}>
                <div 
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen 
                      ? 'bg-white border-[#D09A40] shadow-md ring-1 ring-[#D09A40]/30' 
                      : 'bg-white/80 border-[#0F172A]/10 hover:border-[#D09A40]/50 hover:bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFAQ(idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase font-bold text-[#D09A40] tracking-wider">
                        {faq.category}
                      </span>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-[#0F172A]">
                        {faq.question}
                      </h3>
                    </div>

                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? 'bg-[#D09A40] text-white rotate-180' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#4A4A4A] leading-relaxed font-light border-t border-neutral-100/80 animate-fade-in">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              </RevealOnScroll>
            );
          })}
        </div>

        {/* Quick Contact & WhatsApp Strip */}
        <RevealOnScroll delay={0.2} duration={0.5}>
          <div className="mt-10 p-5 sm:p-6 rounded-2xl bg-[#0F172A] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="text-center sm:text-left">
              <h4 className="font-serif text-base font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                <Sparkles className="w-4 h-4 text-[#D09A40]" />
                <span>Have a custom requirement or wedding inquiry?</span>
              </h4>
              <p className="text-xs text-white/70 mt-0.5">
                Our Jaipur salon concierge is available daily from 9:30 AM to 9:00 PM.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href={SOCIAL_LINKS.whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>WhatsApp Us</span>
              </a>

              <button
                type="button"
                onClick={onOpenBooking}
                className="px-4 py-2.5 bg-[#D09A40] hover:bg-[#b8832e] text-[#0F172A] font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Book Appointment</span>
              </button>
            </div>
          </div>
        </RevealOnScroll>

      </div>
    </section>
  );
};
