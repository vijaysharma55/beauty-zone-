import React from 'react';
import { SALON_BRANCHES } from '../data/salonData';
import { MapPin, Phone, MessageSquare, Star, Clock, Check } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

export const SalonsLocations: React.FC = () => {
  return (
    <section id="locations" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealOnScroll duration={0.6}>
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#D09A40] tracking-wider uppercase mb-2">
              <span>Our Locations in Jaipur</span>
              <span aria-hidden="true">·</span>
              <span>3 Convenient Branches</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Visit Our Salons Across Jaipur
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#4A4A4A] leading-relaxed">
              Conveniently located in top areas of Jaipur with private bridal rooms, clean air-conditioned spaces, 
              and easy valet parking.
            </p>
          </div>
        </RevealOnScroll>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {SALON_BRANCHES.map((branch, index) => (
            <RevealOnScroll key={branch.id} delay={index * 0.1} duration={0.6}>
              <div
                className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all bg-white border h-full luxe-card-hover ${
                  branch.isFlagship
                    ? 'border-[#D09A40] shadow-md ring-1 ring-[#D09A40]/30'
                    : 'border-[#0F172A]/10 hover:border-[#D09A40]/50'
                }`}
              >
                <div>
                  {/* Branch Flag */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-[#D09A40] uppercase tracking-wider">
                      {branch.isFlagship ? '★ Main Flagship Salon' : 'Branch Salon'}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-semibold text-[#0F172A]">
                      <Star className="w-3.5 h-3.5 fill-[#D09A40] text-[#D09A40]" />
                      <span>{branch.googleRating}</span>
                      <span className="text-[#4A4A4A] font-normal text-[11px]">({branch.reviewCount})</span>
                    </div>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-[#0F172A]">
                    {branch.name}
                  </h3>
                  <p className="text-xs text-[#D09A40] font-medium mt-0.5">{branch.locality}</p>

                  <p className="mt-3 text-xs text-[#4A4A4A] leading-relaxed flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#0F172A]/60 shrink-0 mt-0.5" />
                    <span>{branch.address}</span>
                  </p>

                  <p className="mt-2.5 text-xs text-[#4A4A4A] flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#0F172A]/60 shrink-0" />
                    <span>{branch.timings}</span>
                  </p>

                  {/* Amenities */}
                  <div className="mt-5 pt-4 border-t border-[#0F172A]/10">
                    <p className="text-[11px] font-semibold text-[#0F172A] uppercase tracking-wider mb-2">
                      Salon Facilities:
                    </p>
                    <ul className="space-y-1.5">
                      {branch.amenities.map((a, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-[#4A4A4A]">
                          <Check className="w-3 h-3 text-[#D09A40] shrink-0" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Contact Actions */}
                <div className="mt-8 pt-5 border-t border-[#0F172A]/10 grid grid-cols-2 gap-3">
                  <a
                    href={`tel:${branch.phone}`}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#FAF5E5] hover:bg-[#D09A40] hover:text-white text-[#0F172A] luxe-btn flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Salon</span>
                  </a>

                  <a
                    href={`https://wa.me/${branch.whatsapp}?text=Hello%20Beauty%20Zone%20Jaipur,%20I%20would%20like%20to%20inquire%20about%20a%20salon%20appointment`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 luxe-btn flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
