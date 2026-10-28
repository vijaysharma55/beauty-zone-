import React, { useState, useEffect } from 'react';
import { Star, Quote, MapPin, CheckCircle2, X } from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { Testimonial } from '../types';

export const TestimonialsSection: React.FC = () => {
  const { brand, t, updateBrand } = useBrand();
  const [reviews, setReviews] = useState<Testimonial[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [clientName, setClientName] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    // Load persisted reviews
    const stored = localStorage.getItem('bz_testimonials');
    setReviews(stored ? JSON.parse(stored) : brand.testimonials);
  }, [brand.testimonials]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newReview: Testimonial = {
      id: `rev-${Date.now()}`,
      clientName,
      location: brand.cityName,
      service: 'Customer Review',
      date: new Date().toISOString().slice(0, 7), // YYYY-MM
      comment,
      rating,
    };
    const updated = [newReview, ...reviews];
    setReviews(updated);
    localStorage.setItem('bz_testimonials', JSON.stringify(updated));
    updateBrand({ testimonials: updated });
    setIsModalOpen(false);
    setClientName('');
    setComment('');
  };

  return (
    <section id="testimonials" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D09A40]/15 text-[#0F172A] text-xs font-semibold uppercase tracking-widest border border-[#D09A40]/30">
            <Star className="w-3.5 h-3.5 text-[#D09A40] fill-[#D09A40]" />
            <span>{t('testimonialsOverline')}</span>
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] tracking-tight">
            {t('testimonialsTitle')}
          </h2>
          <p className="text-base text-[#4A4A4A]">{t('testimonialsSubtitle')}</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0F172A] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#D09A40] transition"
          >
            Submit your review
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {reviews.map((t) => (
            <div
              key={t.id}
              className="bg-[#FAF5E5] rounded-3xl p-7 border border-[#0F172A]/10 elevation-subtle flex flex-col justify-between relative"
            >
              <Quote className="w-10 h-10 text-[#D09A40]/20 absolute top-6 right-6 pointer-events-none" />
              <div className="space-y-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-4 h-4 ${idx < t.rating ? 'fill-[#D09A40] text-[#D09A40]' : 'text-neutral-300'}`}
                    />
                  ))}
                </div>
                <div className="inline-block bg-white px-3 py-1 rounded-lg border border-[#0F172A]/10 text-xs font-semibold text-[#0F172A]">
                  {t.service}
                </div>
                <p className="text-sm text-[#4A4A4A] leading-relaxed italic">&ldquo;{t.comment}&rdquo;</p>
              </div>
              <div className="pt-5 mt-6 border-t border-[#0F172A]/10 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#0F172A]">{t.clientName}</h3>
                  <p className="text-xs text-[#4A4A4A] mt-0.5">{t.location}</p>
                </div>
                <span className="text-[11px] text-[#4A4A4A]/70">{t.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/70 p-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Submit Review</h3>
              <button onClick={() => setIsModalOpen(false)}><X/></button>
            </div>
            <div>
              <label className="block text-sm font-semibold">Rating (1-5)</label>
              <input type="number" min="1" max="5" value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-semibold">Name</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full border rounded p-2" required />
            </div>
            <div>
              <label className="block text-sm font-semibold">Review</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full border rounded p-2" required />
            </div>
            <button type="submit" className="w-full bg-[#D09A40] text-white p-2 rounded">Submit</button>
          </form>
        </div>
      )}
    </section>
  );
};
