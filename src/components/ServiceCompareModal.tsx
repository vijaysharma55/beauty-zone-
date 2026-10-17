import React, { useState, useMemo } from 'react';
import { ServiceItem } from '../types';
import { 
  X, 
  Check, 
  Star, 
  Clock, 
  Sparkles, 
  Plus, 
  ArrowRight, 
  Trash2, 
  ArrowLeftRight,
  Search,
  CheckCircle2,
  Share2,
  Info
} from 'lucide-react';

interface ServiceCompareModalProps {
  isOpen: boolean;
  services: ServiceItem[];
  comparedServices: ServiceItem[];
  serviceRatingsMap: { [serviceId: string]: { rating: number; count: number } };
  onClose: () => void;
  onSelectService: (service: ServiceItem) => void;
  onRemoveService: (serviceId: string) => void;
  onAddService: (service: ServiceItem) => void;
  onClearAll: () => void;
}

export const ServiceCompareModal: React.FC<ServiceCompareModalProps> = ({
  isOpen,
  services,
  comparedServices,
  serviceRatingsMap,
  onClose,
  onSelectService,
  onRemoveService,
  onAddService,
  onClearAll,
}) => {
  const [searchPickerQuery, setSearchPickerQuery] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [highlightDifferences, setHighlightDifferences] = useState(false);

  if (!isOpen) return null;

  // Filter available services that aren't already in comparison
  const availableToAdd = useMemo(() => {
    const comparedIds = new Set(comparedServices.map((s) => s.id));
    return services.filter(
      (s) =>
        !comparedIds.has(s.id) &&
        (searchPickerQuery.trim() === '' ||
          s.title.toLowerCase().includes(searchPickerQuery.toLowerCase()) ||
          s.category.toLowerCase().includes(searchPickerQuery.toLowerCase()))
    );
  }, [services, comparedServices, searchPickerQuery]);

  // Find lowest price
  const lowestPrice = useMemo(() => {
    if (comparedServices.length === 0) return 0;
    return Math.min(...comparedServices.map((s) => s.price));
  }, [comparedServices]);

  // Quick preset comparison pairs if user has 0 or 1 item
  const samplePairs: { label: string; ids: string[] }[] = [
    { label: 'Bridal HD vs Celebrity Airbrush', ids: ['b1', 'b2'] },
    { label: 'Hair Botox vs Nanoplastia Smoothening', ids: ['h1', 'h2'] },
    { label: '24K Gold Facial vs Hydra-Facial Glow', ids: ['s1', 's2'] },
  ];

  const handleApplySamplePair = (pairIds: string[]) => {
    onClearAll();
    pairIds.forEach((id) => {
      const found = services.find((s) => s.id === id);
      if (found) onAddService(found);
    });
  };

  const categoryNames: { [key: string]: string } = {
    bridal: 'Bridal Makeover',
    hair: 'Hair Care & Chemical Treatments',
    skin: 'Skin & Facial Therapy',
    nails: 'Nails & Art',
    spa: 'Spa & Body Rituals',
    academy: 'Makeup & Beauty Academy',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-[#0F172A]/15 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#0F172A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF5E5]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-[#D09A40] flex items-center justify-center shrink-0 shadow-xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 
                  id="compare-modal-title"
                  className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Service Comparison
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#0F172A] text-white">
                  {comparedServices.length} {comparedServices.length === 1 ? 'Selected' : 'Selected'}
                </span>
              </div>
              <p className="text-xs text-[#4A4A4A]">
                Side-by-side analysis of pricing, durations, included benefits & highlights
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {comparedServices.length >= 2 && (
              <button
                type="button"
                onClick={() => setHighlightDifferences(!highlightDifferences)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  highlightDifferences
                    ? 'bg-[#D09A40] text-white border-[#D09A40]'
                    : 'bg-white text-[#0F172A] border-[#0F172A]/15 hover:bg-neutral-50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{highlightDifferences ? 'Highlighting On' : 'Highlight Differences'}</span>
              </button>
            )}

            {comparedServices.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#4A4A4A] hover:text-[#0F172A] hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close comparison modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Comparison Table or Empty State */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          
          {/* Case 1: Less than 2 services selected */}
          {comparedServices.length < 2 && (
            <div className="py-6 px-4 max-w-2xl mx-auto text-center">
              <div className="w-12 h-12 rounded-full bg-[#FAF5E5] text-[#D09A40] mx-auto flex items-center justify-center mb-3">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">
                {comparedServices.length === 0
                  ? 'Select 2 or More Services to Compare'
                  : 'Add At Least 1 More Service to Compare'}
              </h3>
              <p className="text-xs text-[#4A4A4A] mt-1 mb-5">
                {comparedServices.length === 0
                  ? 'Browse the treatments below or select any service from the rate card to review them side by side.'
                  : `You have selected "${comparedServices[0]?.title}". Choose a second service below to see how they differ in cost, duration, and benefits.`}
              </p>

              {/* Sample Quick Comparison Presets */}
              {comparedServices.length === 0 && (
                <div className="mb-6 p-4 rounded-xl bg-[#FAF5E5]/50 border border-[#D09A40]/25 text-left">
                  <span className="text-[11px] font-bold text-[#D09A40] uppercase tracking-wider block mb-2">
                    Popular Comparisons
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {samplePairs.map((pair) => (
                      <button
                        key={pair.label}
                        type="button"
                        onClick={() => handleApplySamplePair(pair.ids)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-[#0F172A]/15 hover:border-[#D09A40] text-[#0F172A] hover:bg-[#FAF5E5] transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-[#D09A40]" />
                        <span>{pair.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Quick Picker Search */}
              <div className="text-left bg-neutral-50 rounded-xl p-4 border border-[#0F172A]/10">
                <label className="block text-xs font-bold text-[#0F172A] mb-2">
                  Pick Services from Catalog:
                </label>
                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-[#D09A40] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchPickerQuery}
                    onChange={(e) => setSearchPickerQuery(e.target.value)}
                    placeholder="Search by name e.g. Bridal, Facial, Botox, Nails..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#0F172A]/15 rounded-lg bg-white focus:outline-none focus:border-[#D09A40]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {availableToAdd.slice(0, 10).map((service) => (
                    <div
                      key={service.id}
                      className="p-2.5 rounded-lg bg-white border border-[#0F172A]/10 hover:border-[#D09A40] flex items-center justify-between gap-2 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-[#0F172A] truncate">
                          {service.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-[#4A4A4A] mt-0.5">
                          <span className="font-bold text-[#0F172A]">₹{service.price.toLocaleString('en-IN')}</span>
                          <span>·</span>
                          <span>{service.duration}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAddService(service)}
                        className="px-2.5 py-1 bg-[#0F172A] text-white hover:bg-[#D09A40] rounded-md text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                  {availableToAdd.length === 0 && (
                    <div className="col-span-2 text-center py-4 text-xs text-[#4A4A4A]">
                      No matching services found in catalog.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Case 2: 2 or more services compared side-by-side */}
          {comparedServices.length >= 2 && (
            <div className="space-y-4">
              
              {/* Add more service toolbar */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#0F172A]/10">
                <div className="text-xs text-[#4A4A4A] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#D09A40]" />
                  <span>
                    Comparing <strong>{comparedServices.length}</strong> services. You can add up to 4 services side-by-side.
                  </span>
                </div>

                {comparedServices.length < 5 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(!isPickerOpen)}
                      className="px-3 py-1.5 text-xs font-bold bg-[#0F172A] hover:bg-[#D09A40] text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Another Service</span>
                    </button>

                    {/* Dropdown picker popover */}
                    {isPickerOpen && (
                      <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-[#0F172A]/15 z-30 p-3">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#0F172A]/10">
                          <span className="text-xs font-bold text-[#0F172A]">Select Service to Add</span>
                          <button
                            type="button"
                            onClick={() => setIsPickerOpen(false)}
                            className="text-[#4A4A4A] hover:text-[#0F172A]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={searchPickerQuery}
                          onChange={(e) => setSearchPickerQuery(e.target.value)}
                          placeholder="Search service..."
                          className="w-full px-2.5 py-1.5 text-xs border border-[#0F172A]/15 rounded-md mb-2 bg-neutral-50"
                        />
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {availableToAdd.slice(0, 8).map((svc) => (
                            <button
                              key={svc.id}
                              type="button"
                              onClick={() => {
                                onAddService(svc);
                                setIsPickerOpen(false);
                              }}
                              className="w-full text-left p-2 rounded-lg hover:bg-[#FAF5E5] transition-colors flex items-center justify-between gap-2 cursor-pointer text-xs"
                            >
                              <div className="truncate">
                                <div className="font-bold text-[#0F172A] truncate">{svc.title}</div>
                                <div className="text-[10px] text-[#4A4A4A]">₹{svc.price.toLocaleString('en-IN')} · {svc.duration}</div>
                              </div>
                              <Plus className="w-3.5 h-3.5 text-[#D09A40] shrink-0" />
                            </button>
                          ))}
                          {availableToAdd.length === 0 && (
                            <div className="text-center py-2 text-xs text-[#4A4A4A]">No more services available</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Side-by-side Comparison Matrix Table */}
              <div className="overflow-x-auto pb-2">
                <table className="w-full border-collapse text-left min-w-[620px]">
                  <tbody>
                    
                    {/* Row 1: Header / Card Overview */}
                    <tr className="border-b border-[#0F172A]/10">
                      <td className="w-36 sm:w-44 p-3 bg-neutral-50/70 text-xs font-bold text-[#0F172A] align-top rounded-tl-xl">
                        Service
                      </td>
                      {comparedServices.map((svc) => (
                        <td key={svc.id} className="p-3 align-top min-w-[200px] sm:min-w-[240px] bg-white">
                          <div className="relative group">
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => onRemoveService(svc.id)}
                              className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/90 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 flex items-center justify-center transition-colors shadow-2xs border border-[#0F172A]/10 cursor-pointer"
                              title="Remove from comparison"
                              aria-label={`Remove ${svc.title} from comparison`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>

                            {/* Service Image */}
                            <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-2.5 bg-neutral-100 border border-[#0F172A]/10">
                              {svc.image ? (
                                <img
                                  src={svc.image}
                                  alt={svc.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#D09A40] bg-[#FAF5E5]">
                                  <Sparkles className="w-6 h-6" />
                                </div>
                              )}
                              {svc.popular && (
                                <span className="absolute top-2 left-2 bg-[#D09A40] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs">
                                  Bestseller
                                </span>
                              )}
                            </div>

                            <h3 className="font-serif text-sm sm:text-base font-bold text-[#0F172A] leading-snug">
                              {svc.title}
                            </h3>
                            <span className="text-[11px] text-[#4A4A4A] mt-0.5 block">
                              {categoryNames[svc.category] || svc.category}
                            </span>

                            {/* Top CTA */}
                            <button
                              type="button"
                              onClick={() => {
                                onSelectService(svc);
                                onClose();
                              }}
                              className="mt-3 w-full py-1.5 px-3 bg-[#0F172A] hover:bg-[#D09A40] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <span>Book This Service</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Row 2: Starting Price */}
                    <tr className={`border-b border-[#0F172A]/10 ${highlightDifferences ? 'bg-amber-50/20' : ''}`}>
                      <td className="p-3 bg-neutral-50/70 text-xs font-bold text-[#0F172A]">
                        Starting Price
                      </td>
                      {comparedServices.map((svc) => {
                        const isLowest = svc.price === lowestPrice && comparedServices.length > 1;
                        return (
                          <td key={svc.id} className="p-3 bg-white">
                            <div className="flex items-center gap-2">
                              <span className="text-base sm:text-lg font-bold font-mono text-[#0F172A]">
                                ₹{svc.price.toLocaleString('en-IN')}
                              </span>
                              {isLowest && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Best Price
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#4A4A4A] block mt-0.5">
                              Inclusive of consultation & prep
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row 3: Duration */}
                    <tr className="border-b border-[#0F172A]/10">
                      <td className="p-3 bg-neutral-50/70 text-xs font-bold text-[#0F172A]">
                        Session Duration
                      </td>
                      {comparedServices.map((svc) => (
                        <td key={svc.id} className="p-3 bg-white">
                          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#0F172A]">
                            <Clock className="w-3.5 h-3.5 text-[#D09A40]" />
                            <span>{svc.duration}</span>
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Row 4: Client Rating & Feedback */}
                    <tr className="border-b border-[#0F172A]/10">
                      <td className="p-3 bg-neutral-50/70 text-xs font-bold text-[#0F172A]">
                        Rating & Reviews
                      </td>
                      {comparedServices.map((svc) => {
                        const rating = serviceRatingsMap[svc.id] || { rating: 4.8, count: 18 };
                        return (
                          <td key={svc.id} className="p-3 bg-white">
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-0.5 text-amber-500">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="text-xs font-bold text-[#0F172A] font-mono">{rating.rating.toFixed(1)}</span>
                              </div>
                              <span className="text-[11px] text-[#4A4A4A]">({rating.count} reviews)</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 block mt-0.5">
                              ✓ 100% verified client reviews
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row 5: Key Benefits & Highlights */}
                    <tr className={`border-b border-[#0F172A]/10 ${highlightDifferences ? 'bg-amber-50/20' : ''}`}>
                      <td className="p-3 bg-neutral-50/70 text-xs font-bold text-[#0F172A] align-top">
                        Key Benefits & Highlights
                      </td>
                      {comparedServices.map((svc) => (
                        <td key={svc.id} className="p-3 align-top bg-white">
                          <ul className="space-y-1.5">
                            {svc.highlights.map((highlight, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-xs text-[#0F172A]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#D09A40] shrink-0 mt-0.5" />
                                <span className="leading-tight">{highlight}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      ))}
                    </tr>

                    {/* Row 6: Treatment Details / Description */}
                    <tr className="border-b border-[#0F172A]/10">
                      <td className="p-3 bg-neutral-50/70 text-xs font-bold text-[#0F172A] align-top">
                        Treatment Overview
                      </td>
                      {comparedServices.map((svc) => (
                        <td key={svc.id} className="p-3 align-top bg-white">
                          <p className="text-xs text-[#4A4A4A] leading-relaxed">
                            {svc.description}
                          </p>
                        </td>
                      ))}
                    </tr>

                    {/* Row 7: Products & Tech Used */}
                    <tr className="border-b border-[#0F172A]/10">
                      <td className="p-3 bg-neutral-50/70 text-xs font-bold text-[#0F172A] align-top">
                        Formulation & Care
                      </td>
                      {comparedServices.map((svc) => {
                        let formulationText = 'Dermatologist-tested premium salon products';
                        if (svc.category === 'bridal') formulationText = 'Waterproof Temptu HD airbrush, Huda Beauty & MAC master kit';
                        else if (svc.category === 'hair') formulationText = 'Formaldehyde-free Nanoplastia, Olaplex Bond Builder & Kerastase';
                        else if (svc.category === 'skin') formulationText = '24K gold foil, clinical grade hyaluronic acid serums';
                        else if (svc.category === 'nails') formulationText = 'Non-toxic, chip-resistant imported gel varnishes';
                        else if (svc.category === 'spa') formulationText = 'Cold-pressed almond oil, organic rose extracts & essential oils';
                        else if (svc.category === 'academy') formulationText = 'Professional vanity kit provided, ISO & Govt certified syllabus';

                        return (
                          <td key={svc.id} className="p-3 align-top bg-white text-xs text-[#4A4A4A]">
                            <div className="flex items-center gap-1 text-[#0F172A] font-medium mb-1">
                              <Sparkles className="w-3 h-3 text-[#D09A40]" />
                              <span>Salon Grade</span>
                            </div>
                            <p className="text-[11px]">{formulationText}</p>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row 8: Final Booking Action */}
                    <tr>
                      <td className="p-3 bg-neutral-50/70 text-xs font-bold text-[#0F172A] rounded-bl-xl">
                        Ready to Book?
                      </td>
                      {comparedServices.map((svc) => (
                        <td key={svc.id} className="p-3 bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectService(svc);
                              onClose();
                            }}
                            className="w-full py-2 px-3 bg-[#0F172A] hover:bg-[#D09A40] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow"
                          >
                            <span>Book {svc.title.split(' ')[0]}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      ))}
                    </tr>

                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-neutral-50 border-t border-[#0F172A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#4A4A4A]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#0F172A]">Need personalized consultation?</span>
            <span>Visit our Malviya Nagar or Vaishali Nagar salon in Jaipur.</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 font-bold rounded-lg bg-white border border-[#0F172A]/15 text-[#0F172A] hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
