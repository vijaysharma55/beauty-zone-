import React, { useState } from 'react';
import { SALON_STYLISTS } from '../data/stylistsData';
import { Stylist } from '../types';
import { RevealOnScroll } from './RevealOnScroll';
import { 
  Star, 
  Award, 
  MapPin, 
  Check, 
  ArrowRight, 
  Sparkles, 
  X, 
  Image as ImageIcon, 
  CalendarCheck,
  CheckCircle2,
  Briefcase
} from 'lucide-react';

interface StylistsSectionProps {
  onBookWithStylist?: (stylist: Stylist) => void;
}

export const StylistsSection: React.FC<StylistsSectionProps> = ({ onBookWithStylist }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activePortfolioModal, setActivePortfolioModal] = useState<Stylist | null>(null);

  const categories = [
    { id: 'all', label: 'All Stylists' },
    { id: 'bridal', label: 'Bridal Artists' },
    { id: 'hair', label: 'Hair Specialists' },
    { id: 'skin', label: 'Skin Specialists' },
    { id: 'nails', label: 'Nail Artists' },
  ];

  const filteredStylists = selectedCategory === 'all'
    ? SALON_STYLISTS
    : SALON_STYLISTS.filter((s) => s.category === selectedCategory);

  const handleBook = (stylist: Stylist) => {
    if (onBookWithStylist) {
      onBookWithStylist(stylist);
    } else {
      const el = document.getElementById('booking');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="stylists" className="py-16 md:py-24 bg-white/70 border-t border-[#0F172A]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <RevealOnScroll duration={0.6}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#0F172A]/10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-2">
                <Award className="w-3.5 h-3.5" />
                <span>Meet Your Stylists & Artists</span>
                <span aria-hidden="true">·</span>
                <span>Certified Salon Professionals</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Our Experienced Salon Artists & Stylists
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#4A4A4A] leading-relaxed font-light">
                Meet our friendly team of bridal makeup artists, hair experts, skin specialists, 
                and nail artists with 7 to 14+ years of trusted experience in Jaipur.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-[#FAF5E5] rounded-xl border border-[#0F172A]/10 overflow-x-auto self-start md:self-auto scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'text-[#4A4A4A] hover:text-[#0F172A]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </RevealOnScroll>

        {/* Stylists Grid */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredStylists.map((stylist, index) => (
            <RevealOnScroll key={stylist.id} delay={index * 0.1} duration={0.6}>
              <div
                className="bg-white rounded-2xl border border-[#0F172A]/10 overflow-hidden hover:border-[#D09A40] luxe-card-hover flex flex-col justify-between group h-full"
              >
                <div className="p-6 sm:p-7 space-y-5">
                  {/* Header: Avatar, Name, Role, Rating */}
                  <div className="flex items-start gap-4">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 bg-neutral-100 border border-[#0F172A]/10 shadow-sm">
                      <img
                        src={stylist.avatar}
                        alt={`${stylist.name} - ${stylist.role}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover luxe-img-zoom"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-2xs text-[9px] text-[#FAF5E5] text-center font-mono py-0.5 font-bold">
                        {stylist.experience}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#D09A40] bg-[#FAF5E5] px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {stylist.category === 'skin' ? 'Clinical Skin' : stylist.category}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-bold text-[#0F172A]">
                          <Star className="w-3.5 h-3.5 fill-[#D09A40] text-[#D09A40]" />
                          <span>{stylist.rating.toFixed(1)}</span>
                          <span className="text-neutral-400 font-normal text-[11px]">
                            ({stylist.reviewCount})
                          </span>
                        </div>
                      </div>

                      <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0F172A] mt-1 group-hover:text-[#D09A40] transition-colors leading-snug">
                        {stylist.name}
                      </h3>
                      <p className="text-xs text-[#D09A40] font-medium mt-0.5">
                        {stylist.role}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#4A4A4A] mt-1">
                        <MapPin className="w-3 h-3 text-[#D09A40]" />
                        <span>{stylist.branch}</span>
                      </div>
                    </div>
                  </div>

                  {/* Professional Bio */}
                  <p className="text-xs sm:text-sm text-[#4A4A4A] leading-relaxed font-light">
                    {stylist.bio}
                  </p>

                  {/* Specialties */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A] block mb-2">
                      Specialties:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {stylist.specialties.map((spec, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-[#0F172A]/85">
                          <Check className="w-3.5 h-3.5 text-[#D09A40] shrink-0" />
                          <span className="truncate">{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div className="pt-2 border-t border-neutral-100 space-y-1">
                    <span className="text-[10px] font-mono text-[#D09A40] uppercase tracking-wider font-semibold block">
                      Certificates & Training:
                    </span>
                    {stylist.certifications.map((cert, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{cert}</span>
                      </div>
                    ))}
                  </div>

                  {/* Portfolio Preview Strip */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A]">
                        Recent Work Photos ({stylist.portfolio.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => setActivePortfolioModal(stylist)}
                        className="text-[11px] text-[#D09A40] hover:underline font-semibold cursor-pointer"
                      >
                        View Photos
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {stylist.portfolio.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActivePortfolioModal(stylist)}
                          className="group/thumb relative aspect-square rounded-lg overflow-hidden border border-neutral-200 cursor-pointer bg-neutral-100"
                          title={item.title}
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center p-1 text-center">
                            <span className="text-[9px] font-bold text-white line-clamp-2">
                              {item.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="p-5 bg-[#FAF5E5]/50 border-t border-[#0F172A]/10 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActivePortfolioModal(stylist)}
                    className="px-4 py-2 text-xs font-semibold text-[#0F172A] hover:text-[#D09A40] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>View Photos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBook(stylist)}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl luxe-btn shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Book with {stylist.name.split(' ')[0]}</span>
                  </button>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>

      {/* Stylist Portfolio Detail Modal */}
      {activePortfolioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-modal-enter border border-[#0F172A]/10">
            <button
              onClick={() => setActivePortfolioModal(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-[#0F172A] p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Stylist Header */}
            <div className="flex items-center gap-4 pb-5 border-b border-[#0F172A]/10">
              <img
                src={activePortfolioModal.avatar}
                alt={activePortfolioModal.name}
                className="w-16 h-16 rounded-xl object-cover border border-[#0F172A]/10"
              />
              <div>
                <span className="text-[11px] font-semibold text-[#D09A40] uppercase tracking-wider">
                  Artist Portfolio Lookbook
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#0F172A]">
                  {activePortfolioModal.name}
                </h3>
                <p className="text-xs text-[#4A4A4A]">
                  {activePortfolioModal.role} · {activePortfolioModal.branch}
                </p>
              </div>
            </div>

            {/* Portfolio Grid */}
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {activePortfolioModal.portfolio.map((work, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl overflow-hidden border border-[#0F172A]/10 bg-[#FAF5E5]/30 flex flex-col group"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                      <img
                        src={work.image}
                        alt={work.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-serif text-sm font-bold text-[#0F172A]">
                          {work.title}
                        </h4>
                        <p className="text-xs text-[#4A4A4A] mt-1 leading-relaxed font-light">
                          {work.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Booking CTA from Modal */}
              <div className="p-4 bg-[#FAF5E5] rounded-xl border border-[#D09A40]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-serif font-bold text-[#0F172A] text-sm">
                    Ready to book your session with {activePortfolioModal.name}?
                  </h4>
                  <p className="text-xs text-[#4A4A4A] mt-0.5">
                    Available for both flagship salon appointments and doorstep royal bridal dispatches.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleBook(activePortfolioModal);
                    setActivePortfolioModal(null);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-colors cursor-pointer shadow-sm whitespace-nowrap self-start sm:self-auto"
                >
                  Book Session with {activePortfolioModal.name.split(' ')[0]}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
