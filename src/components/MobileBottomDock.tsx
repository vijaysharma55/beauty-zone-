import React from 'react';
import { Sparkles, Tag, Calendar, Crown, Phone } from 'lucide-react';
import { useBrand } from '../context/BrandContext';

interface MobileBottomDockProps {
  onNavigate: (sectionId: string) => void;
  onOpenBooking: () => void;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  onNavigate,
  onOpenBooking,
}) => {
  const { brand } = useBrand();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A]/95 backdrop-blur-lg border-t border-[#D09A40]/30 px-2 py-1.5 shadow-[0_-8px_30px_rgba(15,23,42,0.4)]">
      <div className="grid grid-cols-5 items-center max-w-md mx-auto">
        <button
          onClick={() => onNavigate('services')}
          className="flex flex-col items-center justify-center py-1 text-[#FAF5E5]/75 hover:text-[#D09A40] transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4 mb-0.5 text-[#D09A40]" />
          <span className="text-[10px] font-medium">Services</span>
        </button>

        <button
          onClick={() => onNavigate('packages')}
          className="flex flex-col items-center justify-center py-1 text-[#FAF5E5]/75 hover:text-[#D09A40] transition-colors cursor-pointer"
        >
          <Tag className="w-4 h-4 mb-0.5 text-[#10B981]" />
          <span className="text-[10px] font-medium">Packages</span>
        </button>

        {/* Center Highlighted Book Button */}
        <div className="flex justify-center -mt-4">
          <button
            onClick={onOpenBooking}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#D09A40] to-[#B88228] text-[#0F172A] shadow-lg shadow-[#D09A40]/30 border-2 border-[#0F172A] cursor-pointer active:scale-95 transition-transform"
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[9px] font-extrabold uppercase tracking-tighter mt-0.5">
              Book
            </span>
          </button>
        </div>

        <button
          onClick={() => onNavigate('bridal')}
          className="flex flex-col items-center justify-center py-1 text-[#FAF5E5]/75 hover:text-[#D09A40] transition-colors cursor-pointer"
        >
          <Crown className="w-4 h-4 mb-0.5 text-[#D09A40]" />
          <span className="text-[10px] font-medium">Bridal</span>
        </button>

        <a
          href={`tel:+${brand.phoneRaw}`}
          className="flex flex-col items-center justify-center py-1 text-[#FAF5E5]/75 hover:text-[#D09A40] transition-colors"
        >
          <Phone className="w-4 h-4 mb-0.5 text-[#10B981]" />
          <span className="text-[10px] font-medium">Call Salon</span>
        </a>
      </div>
    </div>
  );
};
