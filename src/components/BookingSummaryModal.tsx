import React from 'react';
import { X, Calendar as CalendarIcon, CheckCircle2, Clock, MapPin, User, Tag } from 'lucide-react';
import { BookingFormState } from '../types';

interface BookingSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingRef: string;
  form: BookingFormState;
  serviceTitle: string;
  price: string;
  promoDiscount?: number;
  promoCode?: string;
}

export const BookingSummaryModal: React.FC<BookingSummaryModalProps> = ({
  isOpen,
  onClose,
  bookingRef,
  form,
  serviceTitle,
  price,
  promoDiscount,
  promoCode,
}) => {
  if (!isOpen) return null;

  // Google Calendar Link generator
  const generateCalendarLink = () => {
    const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
    const text = `Booking: ${serviceTitle}`;
    const details = `Booking Ref: #${bookingRef}\nName: ${form.fullName}\nService: ${serviceTitle}\nLocation: ${form.locationType === 'salon' ? form.selectedBranch : form.homeAddress}`;
    const location = form.locationType === 'salon' ? form.selectedBranch : form.homeAddress;
    
    // Simplistic date/time formatting
    const date = new Date(`${form.appointmentDate}T${form.timeSlot.replace(/ AM| PM/, '')}`);
    const startDate = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(date.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; // Assume 1 hour
    
    return `${baseUrl}&text=${encodeURIComponent(text)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location || '')}&dates=${startDate}/${endDate}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-sm">
      <div className="bg-white text-[#0F172A] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-[#D09A40]/40">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#0F172A]">Booking Confirmed!</h2>
          <p className="text-sm text-[#4A4A4A] mt-2">Booking Reference: #{bookingRef}</p>
        </div>

        <div className="bg-[#FAF5E5] rounded-2xl p-4 text-xs space-y-2 mb-6 border border-[#D09A40]/30">
          <div className="flex justify-between">
            <span className="text-[#4A4A4A]">Service:</span>
            <span className="font-semibold">{serviceTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4A4A4A]">Date/Time:</span>
            <span className="font-semibold">{form.appointmentDate} at {form.timeSlot}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4A4A4A]">Location:</span>
            <span className="font-semibold text-right">{form.locationType === 'salon' ? form.selectedBranch : form.homeAddress}</span>
          </div>
        </div>

        <a
          href={generateCalendarLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg transition-all"
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Add to Google Calendar</span>
        </a>
      </div>
    </div>
  );
};
