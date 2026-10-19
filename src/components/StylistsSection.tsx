import React, { useState } from 'react';
import { Stylist } from '../types';
import { Award, Star, MapPin, Calendar, Sparkles, CheckCircle2, X, Eye } from 'lucide-react';
import { useBrand } from '../context/BrandContext';

interface StylistsSectionProps {
  onBookWithStylist: (stylistName: string, branchName: string) => void;
}

export const StylistsSection: React.FC<StylistsSectionProps> = ({ onBookWithStylist }) => {
  const { brand, t } = useBrand();
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'bridal' | 'hair' | 'skin' | 'nails'>('all');

  const filteredStylists =
    activeFilter === 'all'
      ? brand.stylists
      : brand.stylists.filter((s) => s.category === activeFilter);

  return (
    <section id="stylists" className="py-20 lg:py-28 bg-[#FAF5E5] border-t border-[#0F172A]/10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D09A40]/15 text-[#0F172A] text-xs font-semibold uppercase tracking-widest border border-[#D09A40]/30">
            <Sparkles className="w-3.5 h-3.5 text-[#D09A40]" />
            <span>{t('stylistsOverline')}</span>
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] tracking-tight">
            {t('stylistsTitle')}
          </h2>
          <p className="text-base text-[#4A4A4A]">
            {t('stylistsSubtitle')}
          </p>
        </div>

        {/* Specialty Filter Pills */}
        <div className="flex items-center justify-center flex-wrap gap-2 mb-12">
          {[
            { id: 'all', label: 'All Specialists' },
            { id: 'bridal', label: 'Bridal Makeup' },
            { id: 'hair', label: 'Hair & Color' },
            { id: 'skin', label: 'Skin & Facials' },
            { id: 'nails', label: 'Nail Art' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-[#0F172A] text-[#FAF5E5] shadow-md border border-[#D09A40]'
                  : 'bg-white text-[#4A4A4A] hover:text-[#0F172A] border border-[#0F172A]/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stylists Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
          {filteredStylists.map((stylist) => (
            <div
              key={stylist.id}
              className="bg-white rounded-3xl overflow-hidden border border-[#0F172A]/10 elevation-subtle card-lift flex flex-col justify-between group"
            >
              <div>
                {/* Portrait Header */}
                <div className="relative h-72 overflow-hidden bg-[#0F172A]">
                  <img
                    src={stylist.avatar}
                    alt={stylist.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-85" />

                  {/* Experience Pill */}
                  <div className="absolute top-3.5 left-3.5 bg-[#0F172A]/85 backdrop-blur-md text-[#FAF5E5] border border-[#D09A40]/40 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Award className="w-3 h-3 text-[#D09A40]" />
                    <span>{stylist.experience} Exp</span>
                  </div>

                  {/* Rating Pill */}
                  <div className="absolute top-3.5 right-3.5 bg-white/95 backdrop-blur-md text-[#0F172A] text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                    <Star className="w-3.5 h-3.5 fill-[#D09A40] text-[#D09A40]" />
                    <span>{stylist.rating.toFixed(1)}</span>
                  </div>

                  {/* Name & Title Overlay */}
                  <div className="absolute bottom-3.5 left-4 right-4 text-[#FAF5E5]">
                    <p className="text-[11px] uppercase tracking-wider text-[#D09A40] font-bold">
                      {stylist.role}
                    </p>
                    <h3 className="font-serif text-xl font-bold leading-snug mt-0.5">
                      {stylist.name}
                    </h3>
                    <p className="text-[11px] text-[#FAF5E5]/80 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-[#D09A40]" />
                      <span>{stylist.branch}</span>
                    </p>
                  </div>
                </div>

                {/* Bio & Specialties */}
                <div className="p-5 space-y-4">
                  <p className="text-xs text-[#4A4A4A] leading-relaxed line-clamp-3">
                    {stylist.bio}
                  </p>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[#0F172A]/60 mb-1.5">
                      Specialties
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {stylist.specialties.slice(0, 3).map((spec, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-[#FAF5E5] text-[#0F172A] px-2.5 py-1 rounded-lg border border-[#D09A40]/25 font-medium"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer CTAs */}
              <div className="px-5 pb-5 pt-2 space-y-2">
                <button
                  onClick={() => setSelectedStylist(stylist)}
                  className="w-full py-2.5 px-3 rounded-xl border border-[#0F172A]/15 bg-[#FAF5E5]/60 hover:bg-[#0F172A]/5 text-[#0F172A] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#D09A40]" />
                  <span>View Portfolio & Bio</span>
                </button>
                <button
                  onClick={() => onBookWithStylist(stylist.name, stylist.branch)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#0F172A] hover:bg-[#D09A40] text-[#FAF5E5] hover:text-[#0F172A] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book with {stylist.name.split(' ')[0]}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stylist Full Profile & Portfolio Modal */}
      {selectedStylist && (
        <div
          className="fixed inset-0 z-50 bg-[#0F172A]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedStylist(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-[#D09A40]/30 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="bg-[#0F172A] text-[#FAF5E5] p-6 sm:p-8 relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <button
                onClick={() => setSelectedStylist(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-[#FAF5E5] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <img
                src={selectedStylist.avatar}
                alt={selectedStylist.name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-[#D09A40] shrink-0"
              />

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] uppercase tracking-widest bg-[#D09A40] text-[#0F172A] font-bold px-2.5 py-0.5 rounded-full">
                    {selectedStylist.role}
                  </span>
                  <span className="text-xs text-[#FAF5E5]/80 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-[#D09A40] text-[#D09A40]" />
                    <strong>{selectedStylist.rating.toFixed(1)}</strong> ({selectedStylist.reviewCount} Client Reviews)
                  </span>
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#FAF5E5]">
                  {selectedStylist.name}
                </h3>
                <p className="text-xs text-[#FAF5E5]/70 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#D09A40]" />
                  <span>{selectedStylist.branch}</span>
                  <span>•</span>
                  <span>{selectedStylist.experience} Experience</span>
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#4A4A4A] mb-2">
                  About the Specialist
                </h4>
                <p className="text-sm text-[#0F172A] leading-relaxed">
                  {selectedStylist.bio}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-[#FAF5E5] p-4 rounded-2xl border border-[#0F172A]/10">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-[#0F172A] mb-2.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D09A40]" />
                    <span>Signature Services</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedStylist.specialties.map((spec, idx) => (
                      <li key={idx} className="text-xs text-[#0F172A] flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[#FAF5E5] p-4 rounded-2xl border border-[#0F172A]/10">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-[#0F172A] mb-2.5 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#D09A40]" />
                    <span>Academy & Certifications</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedStylist.certifications.map((cert, idx) => (
                      <li key={idx} className="text-xs text-[#0F172A] flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#D09A40] shrink-0" />
                        <span>{cert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#4A4A4A] mb-3">
                  Recent Client Transformations by {selectedStylist.name.split(' ')[0]}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {selectedStylist.portfolio.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl overflow-hidden border border-[#0F172A]/10 bg-[#FAF5E5]"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-36 object-cover"
                      />
                      <div className="p-3">
                        <p className="font-serif font-bold text-xs text-[#0F172A]">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-[#4A4A4A] mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#0F172A]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-[#4A4A4A]">
                  Available at <strong>{selectedStylist.branch}</strong> & for Bridal Venue Bookings
                </p>
                <button
                  onClick={() => {
                    const stylist = selectedStylist;
                    setSelectedStylist(null);
                    onBookWithStylist(stylist.name, stylist.branch);
                  }}
                  className="w-full sm:w-auto bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] font-bold text-xs sm:text-sm px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Appointment with {selectedStylist.name}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
