import React, { useState } from 'react';
import { HelpCircle, ChevronDown, MessageCircle } from 'lucide-react';
import { useBrand } from '../context/BrandContext';

interface FAQSectionProps {
  onBookConsult: () => void;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ onBookConsult }) => {
  const { brand, t } = useBrand();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 lg:py-24 bg-white border-t border-[#0F172A]/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D09A40]/15 text-[#0F172A] text-xs font-semibold uppercase tracking-widest border border-[#D09A40]/30">
            <HelpCircle className="w-3.5 h-3.5 text-[#D09A40]" />
            <span>{t('faqOverline')}</span>
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight">
            {t('faqTitle')}
          </h2>
          <p className="text-sm sm:text-base text-[#4A4A4A] max-w-xl mx-auto">
            {t('faqSubtitle')}
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {brand.faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-[#FAF5E5]/70 border-[#D09A40] shadow-md'
                    : 'bg-[#FAF5E5]/30 border-[#0F172A]/10 hover:border-[#D09A40]/50'
                }`}
              >
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full text-left px-6 py-4 sm:py-5 flex items-center justify-between gap-4 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="font-serif text-base sm:text-lg font-bold text-[#0F172A] leading-snug">
                    {faq.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? 'bg-[#D09A40] text-[#0F172A] rotate-180'
                        : 'bg-[#0F172A]/5 text-[#0F172A]'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm text-[#4A4A4A] leading-relaxed border-t border-[#0F172A]/5">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Prompt */}
        <div className="mt-10 bg-[#0F172A] text-[#FAF5E5] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-lg font-bold">
              Still have a question about a treatment or bridal date?
            </h3>
            <p className="text-xs text-[#FAF5E5]/75 mt-0.5">
              Speak directly with our senior salon manager in {brand.cityName}. No obligation.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent(
                `Hi ${brand.brandName} (${brand.cityName}), I have a question about your salon services.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs px-4 py-3 rounded-xl transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t('faqAskWhatsapp')}</span>
            </a>
            <button
              onClick={onBookConsult}
              className="inline-flex items-center gap-2 bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] font-bold text-xs px-4 py-3 rounded-xl transition-colors cursor-pointer"
            >
              <span>Book Consultation</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
