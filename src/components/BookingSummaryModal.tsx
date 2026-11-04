import React from 'react';
import { X, Calendar as CalendarIcon, CheckCircle2, Clock, Lock, RefreshCw } from 'lucide-react';
import { BookingFormState } from '../types';
import { formatPaise } from '../lib/payments';

interface BookingSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingRef: string;
  form: BookingFormState;
  serviceTitle: string;
  price: string;
  promoDiscount?: number;
  promoCode?: string;
  /** Server-verified confirmation. Calendar downloads unlock only when true. */
  confirmed?: boolean;
  paymentStatus?: string;
  salonName?: string;
  /** Preferred specialist locked into the booking (falls back to the form value). */
  stylistName?: string;
  amountPaise?: number;
  advancePaise?: number;
  remainingPaise?: number;
  onRetryPayment?: () => void;
}

/**
 * Final booking dialog.
 *
 * The "Booking Confirmed!" headline is only rendered for a server-verified
 * confirmation. Anything else shows a pending state with the calendar buttons
 * disabled, because the API refuses to hand out calendar/confirmation details
 * until the payment has cleared.
 */
export const BookingSummaryModal: React.FC<BookingSummaryModalProps> = ({
  isOpen,
  onClose,
  bookingRef,
  form,
  serviceTitle,
  price,
  confirmed = false,
  paymentStatus,
  salonName,
  stylistName,
  amountPaise,
  advancePaise,
  remainingPaise,
  onRetryPayment,
}) => {
  if (!isOpen) return null;

  const location = form.locationType === 'salon' ? form.selectedBranch : form.homeAddress;

  // Google Calendar Link generator
  const generateCalendarLink = () => {
    const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
    const text = `Booking: ${serviceTitle}`;
    const details = `Booking Ref: #${bookingRef}\nName: ${form.fullName}\nService: ${serviceTitle}\nLocation: ${location}`;
    const date = new Date(`${form.appointmentDate}T${form.timeSlot.replace(/ AM| PM/, '')}`);
    const startDate = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(date.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `${baseUrl}&text=${encodeURIComponent(text)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location || '')}&dates=${startDate}/${endDate}`;
  };

  // iCal (.ics) file generator for Apple/Outlook/others
  const downloadIcsFile = () => {
    const text = `Booking: ${serviceTitle}`;
    const details = `Booking Ref: #${bookingRef}\nName: ${form.fullName}\nService: ${serviceTitle}\nLocation: ${location}`;
    const date = new Date(`${form.appointmentDate}T${form.timeSlot.replace(/ AM| PM/, '')}`);
    const startDate = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(date.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `URL:${window.location.href}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${text}`,
      `DESCRIPTION:${details.replace(/\n/g, '\\n')}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `beautyzone-booking-${bookingRef}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pending = !confirmed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-sm">
      <div className="bg-white text-[#0F172A] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-[#D09A40]/40">
        <button
          onClick={onClose}
          aria-label="Close booking summary"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="text-center mb-6">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              confirmed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {confirmed ? <CheckCircle2 className="w-10 h-10" /> : <Clock className="w-10 h-10" />}
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#0F172A]">
            {confirmed ? 'Booking Confirmed!' : paymentStatus === 'not_required' ? 'Request Received' : 'Awaiting Payment'}
          </h2>
          <p className="text-sm text-[#4A4A4A] mt-2">
            {confirmed
              ? `Booking Reference: #${bookingRef}`
              : paymentStatus === 'not_required'
                ? `Reference: #${bookingRef} · the salon will confirm your appointment.`
                : `Reference: #${bookingRef} · your slot is held until the advance is paid.`}
          </p>
        </div>

        <div className="bg-[#FAF5E5] rounded-2xl p-4 text-xs space-y-2 mb-4 border border-[#D09A40]/30">
          {salonName && (
            <div className="flex justify-between">
              <span className="text-[#4A4A4A]">Salon:</span>
              <span className="font-semibold text-right">{salonName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[#4A4A4A]">Service:</span>
            <span className="font-semibold text-right">{serviceTitle}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[#4A4A4A]">Specialist:</span>
            <span className="font-semibold text-right">
              {stylistName || form.preferredStylist || 'Any available stylist'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4A4A4A]">Date/Time:</span>
            <span className="font-semibold">
              {form.appointmentDate} at {form.timeSlot}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4A4A4A]">Location:</span>
            <span className="font-semibold text-right">{location}</span>
          </div>
          {typeof amountPaise === 'number' && (
            <>
              <div className="flex justify-between border-t border-[#0F172A]/10 pt-2">
                <span className="text-[#4A4A4A]">Total amount:</span>
                <span className="font-semibold">{formatPaise(amountPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A4A4A]">Advance {confirmed ? 'paid' : 'due now'}:</span>
                <span className="font-semibold text-[#D09A40]">{formatPaise(advancePaise || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A4A4A]">Remaining balance:</span>
                <span className="font-semibold">{formatPaise(remainingPaise || 0)}</span>
              </div>
            </>
          )}
          {typeof amountPaise !== 'number' && (
            <div className="flex justify-between">
              <span className="text-[#4A4A4A]">Estimated total:</span>
              <span className="font-semibold">{price}</span>
            </div>
          )}
        </div>

        {pending && (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900">
            <p className="flex items-start gap-2 font-semibold">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {paymentStatus === 'not_required'
                  ? 'Calendar downloads and confirmation notifications stay locked until the salon confirms this request.'
                  : `Payment status: ${paymentStatus || 'unpaid'}. Calendar downloads and confirmation notifications stay locked until the advance payment is verified by the server.`}
              </span>
            </p>
            {onRetryPayment && (
              <button
                type="button"
                onClick={onRetryPayment}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Complete payment
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {confirmed ? (
            <>
              <a
                href={generateCalendarLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg transition-all"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Add to Google Calendar</span>
              </a>

              <button
                onClick={downloadIcsFile}
                className="w-full flex items-center justify-center gap-2 bg-white border border-[#0F172A]/20 hover:bg-gray-50 text-[#0F172A] font-bold text-sm px-6 py-3 rounded-xl transition-all"
              >
                <CalendarIcon className="w-4 h-4 text-[#D09A40]" />
                <span>Download iCal / Outlook</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled
              title="Calendar downloads unlock after the payment is verified"
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 border border-gray-200 font-bold text-sm px-6 py-3 rounded-xl cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              <span>Calendar download locked until payment</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingSummaryModal;
