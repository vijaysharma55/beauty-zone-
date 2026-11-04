import React, { useState } from 'react';
import { X, Send, MessageCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Stylist } from '../types';
import { useBrand } from '../context/BrandContext';

interface StylistChatModalProps {
  stylist: Stylist;
  onClose: () => void;
}

export const StylistChatModal: React.FC<StylistChatModalProps> = ({ stylist, onClose }) => {
  const { brand } = useBrand();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: `Hi ${stylist.name.split(' ')[0]}, I'm interested in your ${stylist.specialties[0] || 'services'} and would like to ask a quick question...`
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/public/stylist-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: brand.domainSeo.subdomainSlug || 'default',
          stylistId: stylist.id,
          stylistName: stylist.name,
          userName: formData.name,
          userPhone: formData.phone,
          message: formData.message
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send inquiry');
      }

      setStatus('success');
    } catch (err: any) {
      console.error('[stylist inquiry]', err);
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-[60] bg-[#0F172A]/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl border border-[#D09A40]/30" onClick={e => e.stopPropagation()}>
          <div className="w-20 h-20 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[#10B981]" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-[#0F172A] mb-3">Inquiry Sent!</h3>
          <p className="text-[#4A4A4A] text-sm mb-8">
            Your message has been sent to <strong>{stylist.name}</strong>. They will get back to you on your provided contact number soon.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-[#0F172A] hover:bg-[#D09A40] text-white hover:text-[#0F172A] rounded-xl font-bold transition-all shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-[#0F172A]/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[#D09A40]/30" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#0F172A] p-6 relative flex items-center gap-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <img
            src={stylist.avatar}
            alt={stylist.name}
            className="w-14 h-14 rounded-xl object-cover border border-[#D09A40]/50"
          />
          <div>
            <h3 className="font-serif text-lg font-bold text-white leading-tight">Inquiry for {stylist.name}</h3>
            <p className="text-[11px] text-[#D09A40] font-bold uppercase tracking-wider mt-0.5">{stylist.role}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-[#0F172A]/60 ml-1">Your Name</label>
            <input
              required
              type="text"
              placeholder="e.g. Priya Sharma"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-[#0F172A]/10 bg-[#FAF5E5]/30 focus:bg-white focus:ring-2 focus:ring-[#D09A40]/30 focus:border-[#D09A40] transition-all text-sm outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-[#0F172A]/60 ml-1">Phone Number</label>
            <input
              required
              type="tel"
              placeholder="e.g. 98000 12345"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-[#0F172A]/10 bg-[#FAF5E5]/30 focus:bg-white focus:ring-2 focus:ring-[#D09A40]/30 focus:border-[#D09A40] transition-all text-sm outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-[#0F172A]/60 ml-1">Message</label>
            <textarea
              required
              rows={4}
              placeholder="Type your message here..."
              value={formData.message}
              onChange={e => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-[#0F172A]/10 bg-[#FAF5E5]/30 focus:bg-white focus:ring-2 focus:ring-[#D09A40]/30 focus:border-[#D09A40] transition-all text-sm outline-none resize-none"
            />
          </div>

          {status === 'error' && (
            <p className="text-red-500 text-xs text-center font-medium">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full py-4 bg-[#0F172A] hover:bg-[#D09A40] text-white hover:text-[#0F172A] rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {status === 'submitting' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                <span>Send Inquiry</span>
              </>
            )}
          </button>
          
          <p className="text-[10px] text-[#4A4A4A] text-center italic">
            * {stylist.name.split(' ')[0]} usually responds within a few hours.
          </p>
        </form>
      </div>
    </div>
  );
};
