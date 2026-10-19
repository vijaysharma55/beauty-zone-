import React from 'react';
import { MapPin, Phone, Clock, Star, CheckCircle, Calendar, Navigation } from 'lucide-react';
import { WhatsAppIcon } from './SocialIcons';
import { useBrand } from '../context/BrandContext';

interface SalonsLocationsProps {
  onSelectBranchForBooking: (branchName: string) => void;
}

export const SalonsLocations: React.FC<SalonsLocationsProps> = ({ onSelectBranchForBooking }) => {
  const { brand, t } = useBrand();

  const localitySummary =
    brand.localities.length > 0
      ? brand.localities
          .slice(0, 6)
          .map((l) => l.name.split('/')[0].trim())
          .join(', ')
      : brand.cityName;

  return (
    <section id="locations" className="py-20 lg:py-28 bg-[#FAF5E5] border-t border-[#0F172A]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D09A40]/15 text-[#0F172A] text-xs font-semibold uppercase tracking-widest border border-[#D09A40]/30">
            <MapPin className="w-3.5 h-3.5 text-[#D09A40]" />
            <span>{t('locationsOverline')}</span>
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] tracking-tight">
            {brand.branches.length} Salon {brand.branches.length === 1 ? 'Branch' : 'Branches'} Across {brand.cityName}
          </h2>
          <p className="text-base text-[#4A4A4A]">
            {t('locationsSubtitle')}
          </p>
        </div>

        {/* Branches Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          {brand.branches.map((branch) => {
            const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${brand.brandName} ${branch.name} ${branch.address}`
            )}`;
            const cleanWa = branch.whatsapp.replace(/[^0-9]/g, '') || brand.whatsappNumber;

            return (
              <div
                key={branch.id}
                className={`rounded-3xl p-7 transition-all duration-300 flex flex-col justify-between ${
                  branch.isFlagship
                    ? 'bg-[#0F172A] text-[#FAF5E5] shadow-2xl border-2 border-[#D09A40]'
                    : 'bg-white text-[#0F172A] elevation-subtle border border-[#0F172A]/10 hover:border-[#D09A40]'
                }`}
              >
                <div className="space-y-5">
                  {/* Top Badge & Rating */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] uppercase tracking-wider font-bold px-3 py-1 rounded-full ${
                        branch.isFlagship
                          ? 'bg-[#D09A40] text-[#0F172A]'
                          : 'bg-[#0F172A]/5 text-[#0F172A]'
                      }`}
                    >
                      {branch.isFlagship ? 'Main Flagship Salon' : branch.locality}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-bold">
                      <Star className="w-4 h-4 fill-[#D09A40] text-[#D09A40]" />
                      <span>{branch.googleRating}</span>
                      <span
                        className={
                          branch.isFlagship ? 'text-[#FAF5E5]/60' : 'text-[#4A4A4A]'
                        }
                      >
                        ({branch.reviewCount})
                      </span>
                    </div>
                  </div>

                  {/* Branch Name & Address */}
                  <div>
                    <h3 className="font-serif text-2xl font-bold">{branch.name}</h3>
                    <p
                      className={`text-xs sm:text-sm mt-2 leading-relaxed flex items-start gap-2 ${
                        branch.isFlagship ? 'text-[#FAF5E5]/80' : 'text-[#4A4A4A]'
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-[#D09A40] shrink-0 mt-0.5" />
                      <span>{branch.address}</span>
                    </p>
                  </div>

                  {/* Timings & Phone */}
                  <div
                    className={`space-y-2 text-xs pt-3 border-t ${
                      branch.isFlagship ? 'border-white/10' : 'border-[#0F172A]/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#D09A40] shrink-0" />
                      <span>{branch.timings}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#10B981] shrink-0" />
                      <a
                        href={`tel:${branch.phone.replace(/\s+/g, '')}`}
                        className="font-semibold hover:text-[#D09A40] underline-offset-2 hover:underline"
                      >
                        {branch.phone}
                      </a>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="space-y-2 pt-2">
                    <p
                      className={`text-[11px] uppercase tracking-wider font-semibold ${
                        branch.isFlagship ? 'text-[#D09A40]' : 'text-[#4A4A4A]'
                      }`}
                    >
                      Salon Facilities:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {branch.amenities.map((amenity, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg ${
                            branch.isFlagship
                              ? 'bg-white/10 text-[#FAF5E5]/90'
                              : 'bg-[#FAF5E5] text-[#0F172A]'
                          }`}
                        >
                          <CheckCircle className="w-3 h-3 text-[#10B981]" />
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-7 pt-4 border-t border-current/10 space-y-2.5">
                  <button
                    onClick={() => onSelectBranchForBooking(branch.name)}
                    className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      branch.isFlagship
                        ? 'bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A]'
                        : 'bg-[#0F172A] hover:bg-[#D09A40] text-[#FAF5E5] hover:text-[#0F172A]'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book at {branch.name.split(' ')[0]}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={googleMapsSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 border transition-colors ${
                        branch.isFlagship
                          ? 'border-white/15 bg-white/5 hover:bg-white/15 text-[#FAF5E5]'
                          : 'border-[#0F172A]/15 bg-[#FAF5E5]/60 hover:bg-[#0F172A]/5 text-[#0F172A]'
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5 text-[#D09A40]" />
                      <span>{t('locationsDirections')}</span>
                    </a>

                    <a
                      href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                        `Hi ${brand.brandName} (${branch.name}), I would like to book an appointment.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 border transition-colors ${
                        branch.isFlagship
                          ? 'border-[#10B981]/40 bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981]'
                          : 'border-[#10B981]/30 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#0F172A]'
                      }`}
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Home Service Callout Strip */}
        <div className="mt-12 bg-white rounded-3xl p-6 sm:p-8 border border-[#D09A40]/40 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-[#D09A40]">
              Doorstep Home & Hotel Salon Service Across {brand.cityName}
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0F172A]">
              Want our stylists to visit your home, hotel, or wedding venue?
            </h3>
            <p className="text-xs sm:text-sm text-[#4A4A4A]">
              We bring sealed, clean kits to {localitySummary}, and all {brand.cityName} wedding resorts.
            </p>
          </div>
          <button
            onClick={() => onSelectBranchForBooking('Home Service')}
            className="shrink-0 bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] font-bold text-sm px-6 py-3.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            {t('locationsBookHomeVisit')}
          </button>
        </div>
      </div>
    </section>
  );
};
