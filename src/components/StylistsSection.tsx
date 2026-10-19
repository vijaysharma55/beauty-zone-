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

  // Live Availability State per stylist ID
  const [stylistAvailabilities, setStylistAvailabilities] = useState<{ [id: string]: boolean }>(() => {
    const initial: { [id: string]: boolean } = {};
    SALON_STYLISTS.forEach((s, idx) => {
      initial[s.id] = idx % 3 !== 0; // true = Available Now, false = Booked
    });
    return initial;
  });

  // Periodically toggle status for live urgency simulation
  React.useEffect(() => {
    const timer = setInterval(() => {
      const randomStylist = SALON_STYLISTS[Math.floor(Math.random() * SALON_STYLISTS.length)];
      if (randomStylist) {
        setStylistAvailabilities((prev) => ({
          ...prev,
          [randomStylist.id]: !prev[randomStylist.id],
        }));
      }
    }, 12000);
    return () => clearInterval(timer);
  }, []);

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
    <section id="stylists" className="py-8 sm:py-16 md:py-24 bg-white/70 border-t border-[#0F172A]/10 w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
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

        {/* Stylists Grid / Mobile Horizontal Swipe Carousel */}
        <div className="mt-6 flex overflow-x-auto gap-3.5 pb-3 scrollbar-none snap-x snap-mandatory -mx-3 px-3 md:grid md:grid-cols-2 gap-8 md:mx-0 md:px-0 scroll-smooth scroll-pl-3 md:scroll-pl-0">
          {filteredStylists.map((stylist, index) => (
            <RevealOnScroll key={stylist.id} delay={index * 0.1} duration={0.6} className="shrink-0 snap-start h-full md:w-auto">
              <div
                className="w-[90vw] max-w-[400px] shrink-0 snap-start md:w-full md:max-w-none bg-white rounded-2xl border border-[#0F172A]/10 overflow-hidden hover:border-[#D09A40] luxe-card-hover flex flex-col justify-between group h-full shadow-2xs"
              >
                <div className="p-4 space-y-3">
                  {/* Header: Avatar, Name, Role, Rating */}
                  <div className="flex items-start gap-3">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-neutral-100 border border-[#0F172A]/10 shadow-sm">
                      <img
                        src={stylist.avatar}
                        alt={`${stylist.name} - ${stylist.role}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover luxe-img-zoom"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] text-[#FAF5E5] text-center font-mono py-0.5 font-bold">
                        {stylist.experience}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-[#D09A40] bg-[#FAF5E5] px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {stylist.category === 'skin' ? 'Clinical Skin' : stylist.category}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#0F172A]">
                          <Star className="w-3 h-3 fill-[#D09A40] text-[#D09A40]" />
                          <span>{stylist.rating.toFixed(1)}</span>
                          <span className="text-neutral-400 font-normal text-[10px]">
                            ({stylist.reviewCount})
                          </span>
                        </div>
                      </div>

                      <h3 className="font-serif text-lg sm:text-xl font-bold text-[#0F172A] mt-0.5 group-hover:text-[#D09A40] transition-colors leading-snug truncate">
                        {stylist.name}
                      </h3>
                      <p className="text-[11px] text-[#D09A40] font-medium">
                        {stylist.role}
                      </p>

                      <div className="flex items-center gap-1 text-[10px] text-[#4A4A4A] mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-[#D09A40]" />
                        <span>{stylist.branch}</span>
                      </div>

                      {/* Live Availability Badge */}
                      {(() => {
                        const isAvailable = stylistAvailabilities[stylist.id] ?? true;
                        return (
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold font-mono border shadow-2xs transition-all duration-300">
                            <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                            <span className={isAvailable ? 'text-emerald-700' : 'text-amber-700'}>
                              {isAvailable ? 'Available Now' : 'Booked'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Professional Bio */}
                  <p className="text-[11px] text-[#4A4A4A] leading-relaxed font-light line-clamp-2">
                    {stylist.bio}
                  </p>

                  {/* Specialties */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F172A] block mb-1">
                      Specialties:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {stylist.specialties.slice(0, 4).map((spec, i) => (
                        <div key={i} className="flex items-center gap-1 text-[10px] text-[#0F172A]/85 bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-100">
                          <Check className="w-2.5 h-2.5 text-[#D09A40] shrink-0" />
                          <span className="truncate">{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Certifications (Condensed) */}
                  <div className="pt-1 border-t border-neutral-100">
                     <div className="text-[9px] font-mono text-[#D09A40] uppercase tracking-wider font-semibold mb-1">
                      Certificates:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {stylist.certifications.slice(0, 2).map((cert, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[10px] text-neutral-600">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          <span>{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Portfolio Preview Strip */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F172A]">
                        Recent Work ({stylist.portfolio.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => setActivePortfolioModal(stylist)}
                        className="text-[10px] text-[#D09A40] hover:underline font-semibold cursor-pointer"
                      >
                        View Photos
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      {stylist.portfolio.slice(0, 4).map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActivePortfolioModal(stylist)}
                          className="group/thumb relative w-12 h-12 rounded-md overflow-hidden border border-neutral-200 cursor-pointer bg-neutral-100 shrink-0"
                          title={item.title}
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                          />
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
                    className="px-4 py-2 text-[11px] font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl luxe-btn shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <CalendarCheck className="w-3 h-3" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
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
