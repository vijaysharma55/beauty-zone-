import React, { useState } from 'react';
import { ServiceItem, ServiceReview } from '../types';
import { 
  X, 
  Star, 
  CheckCircle2, 
  User, 
  MapPin, 
  MessageSquare, 
  Send, 
  ShieldCheck, 
  Sparkles,
  Calendar
} from 'lucide-react';

interface ServiceReviewModalProps {
  service: ServiceItem | null;
  reviews: ServiceReview[];
  aggregateRating: number;
  reviewCount: number;
  onClose: () => void;
  onSubmitReview: (review: Omit<ServiceReview, 'id' | 'date'>) => void;
}

export const ServiceReviewModal: React.FC<ServiceReviewModalProps> = ({
  service,
  reviews,
  aggregateRating,
  reviewCount,
  onClose,
  onSubmitReview,
}) => {
  if (!service) return null;

  const [activeTab, setActiveTab] = useState<'reviews' | 'write'>('reviews');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [authorName, setAuthorName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  const starLabels: { [key: number]: string } = {
    1: 'Needs Improvement',
    2: 'Fair Experience',
    3: 'Good Quality',
    4: 'Very Good Experience',
    5: 'Excellent & Highly Recommended',
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) {
      alert('Please provide your name and your review feedback.');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate brief network submission
    setTimeout(() => {
      onSubmitReview({
        serviceId: service.id,
        authorName: authorName.trim(),
        location: location.trim() || 'Jaipur Client',
        rating,
        comment: comment.trim(),
        verifiedBooking: true,
      });

      setIsSubmitting(false);
      setSubmittedSuccess(true);
      setAuthorName('');
      setLocation('');
      setComment('');
      setRating(5);

      setTimeout(() => {
        setSubmittedSuccess(false);
        setActiveTab('reviews');
      }, 1500);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 border border-[#0F172A]/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-[#0F172A] p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Service Header Overview */}
        <div className="flex items-start gap-4 pb-5 border-b border-[#0F172A]/10">
          {service.image && (
            <img
              src={service.image}
              alt={service.title}
              className="w-20 h-20 rounded-xl object-cover shrink-0 border border-[#0F172A]/10"
            />
          )}
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-[#D09A40] uppercase tracking-wider block">
              {service.category === 'skin' ? 'Skin Care' : service.category} Service · Verified Reviews
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0F172A] leading-snug">
              {service.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#4A4A4A]">
              <span className="font-bold text-[#0F172A] tabular-nums">
                ₹{service.price.toLocaleString('en-IN')}
              </span>
              <span aria-hidden="true">·</span>
              <span>{service.duration}</span>
              <span aria-hidden="true">·</span>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-[#D09A40] text-[#D09A40]" />
                <span className="font-bold text-[#0F172A] tabular-nums">{aggregateRating.toFixed(1)}</span>
                <span>({reviewCount} reviews)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Buttons: Read Reviews vs Write Review */}
        <div className="flex items-center justify-between gap-2 mt-5 border-b border-[#0F172A]/10 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#4A4A4A] hover:bg-neutral-100'
              }`}
            >
              <span>Customer Reviews ({reviews.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('write')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'write'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#4A4A4A] hover:bg-neutral-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D09A40]" />
              <span>Write a Review</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-[#D09A40] font-semibold hidden sm:inline">
            100% Genuine Jaipur Feedback
          </span>
        </div>

        {/* TAB 1: Read Reviews List */}
        {activeTab === 'reviews' && (
          <div className="mt-5 space-y-4">
            {/* Aggregate Score Card */}
            <div className="p-4 bg-[#FAF5E5] rounded-xl border border-[#D09A40]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl sm:text-4xl font-serif font-bold text-[#0F172A] tabular-nums">
                  {aggregateRating.toFixed(1)}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= Math.round(aggregateRating)
                            ? 'fill-[#D09A40] text-[#D09A40]'
                            : 'text-neutral-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#4A4A4A] mt-0.5">
                    Based on {reviewCount} client ratings in Jaipur
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('write')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#D09A40] hover:bg-[#b88530] rounded-lg transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
              >
                Rate This Service
              </button>
            </div>

            {/* List of Reviews */}
            {reviews.length > 0 ? (
              <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl border border-[#0F172A]/10 bg-white hover:border-[#D09A40]/40 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-sm text-[#0F172A]">
                            {rev.authorName}
                          </span>
                          {rev.verifiedBooking && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Verified Booking
                            </span>
                          )}
                        </div>
                        {rev.location && (
                          <div className="flex items-center gap-1 text-[11px] text-[#4A4A4A] mt-0.5">
                            <MapPin className="w-3 h-3 text-[#D09A40]" />
                            <span>{rev.location}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-0.5 justify-end">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating ? 'fill-[#D09A40] text-[#D09A40]' : 'text-neutral-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-neutral-400 mt-0.5 block font-mono">
                          {rev.date}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#4A4A4A] leading-relaxed font-light">
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No reviews recorded yet. Be the first to share your experience!
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Review Submission Form */}
        {activeTab === 'write' && (
          <form onSubmit={handleFormSubmit} className="mt-5 space-y-5">
            {submittedSuccess ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2 animate-in fade-in">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-serif font-bold text-emerald-900 text-base">
                  Review Published Successfully!
                </h4>
                <p className="text-xs text-emerald-800">
                  Thank you for rating {service.title}. Your feedback helps our Jaipur team maintain high standards.
                </p>
              </div>
            ) : (
              <>
                {/* Interactive Star Picker */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-2 uppercase tracking-wider">
                    Select Your Rating *
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((starValue) => {
                      const isFilled = starValue <= (hoverRating || rating);
                      return (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => setRating(starValue)}
                          onMouseEnter={() => setHoverRating(starValue)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 rounded hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                          aria-label={`Rate ${starValue} stars`}
                        >
                          <Star
                            className={`w-7 h-7 ${
                              isFilled
                                ? 'fill-[#D09A40] text-[#D09A40]'
                                : 'text-neutral-300 stroke-[1.5]'
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="text-xs font-bold text-[#0F172A] ml-2">
                      {starLabels[hoverRating || rating]}
                    </span>
                  </div>
                </div>

                {/* Name & Jaipur Locality */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Your Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#4A4A4A] absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Anjali Singhal"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-[#0F172A]/15 rounded-xl focus:outline-none focus:border-[#D09A40] focus:ring-1 focus:ring-[#D09A40]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Jaipur Area / Venue (Optional)
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[#4A4A4A] absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="e.g. C-Scheme / Rambagh Palace"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-[#0F172A]/15 rounded-xl focus:outline-none focus:border-[#D09A40] focus:ring-1 focus:ring-[#D09A40]"
                      />
                    </div>
                  </div>
                </div>

                {/* Detailed Feedback */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Your Review & Experience *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Share your experience with our salon service, artist, and results..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-3 text-xs border border-[#0F172A]/15 rounded-xl focus:outline-none focus:border-[#D09A40] focus:ring-1 focus:ring-[#D09A40]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#0F172A]/10">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#4A4A4A]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified review published directly to Beauty Zone rate card</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Publishing...' : 'Submit Review'}</span>
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
