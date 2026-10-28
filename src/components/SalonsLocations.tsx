import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Clock,
  Star,
  CheckCircle,
  Calendar,
  Navigation,
  Compass,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  X,
  Sparkles,
} from 'lucide-react';
import { WhatsAppIcon } from './SocialIcons';
import { useBrand } from '../context/BrandContext';
import { SalonBranch } from '../types';

export interface BranchReview {
  id: string;
  branchId: string;
  clientName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
}

const INITIAL_BRANCH_REVIEWS: BranchReview[] = [
  {
    id: 'rev-1',
    branchId: 'flagship-central',
    clientName: 'Priya Sharma',
    rating: 5,
    comment: 'Exceptional bridal service and luxurious ambiance at the central flagship! The staff is extremely professional.',
    date: '2026-02-15',
  },
  {
    id: 'rev-2',
    branchId: 'studio-academy',
    clientName: 'Neha Verma',
    rating: 5,
    comment: 'Got my Hydra-Facial done here. Skin is glowing! Highly recommend South Avenue branch.',
    date: '2026-02-10',
  },
  {
    id: 'rev-3',
    branchId: 'westside-luxe',
    clientName: 'Ananya Gupta',
    rating: 5,
    comment: 'Fantastic nail art and hair smoothing. Very clean and hygienic salon suites.',
    date: '2026-01-28',
  },
];

interface SalonsLocationsProps {
  onSelectBranchForBooking: (branchName: string) => void;
}

interface BranchReviewModalProps {
  branch: SalonBranch;
  reviews: BranchReview[];
  onClose: () => void;
  onSubmitReview: (review: Omit<BranchReview, 'id' | 'date'>) => void;
}

const BranchReviewModal: React.FC<BranchReviewModalProps> = ({
  branch,
  reviews,
  onClose,
  onSubmitReview,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [clientName, setClientName] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const branchReviews = reviews.filter((r) => r.branchId === branch.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!comment.trim()) {
      setError('Please write your feedback comment.');
      return;
    }
    setError(null);
    onSubmitReview({
      branchId: branch.id,
      clientName: clientName.trim(),
      rating,
      comment: comment.trim(),
    });
    setSubmitted(true);
    setClientName('');
    setComment('');
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#D09A40]/40 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#0F172A]/10 bg-[#0F172A] px-6 py-4 text-white">
          <div>
            <h3 className="font-serif text-lg font-bold">{branch.name} Reviews & Ratings</h3>
            <p className="text-xs text-white/70">Average Rating: {branch.googleRating} / 5 ({branch.reviewCount} reviews)</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {submitted && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xs font-semibold text-emerald-800">
              Thank you! Your feedback and rating have been successfully submitted and stored.
            </div>
          )}

          {/* New Review Form */}
          <form onSubmit={handleSubmit} className="rounded-2xl border border-[#0F172A]/10 bg-[#FAF5E5]/60 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Leave Your Feedback & Rating</h4>
            
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">Select Star Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating ? 'fill-[#D09A40] text-[#D09A40]' : 'text-neutral-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-[#0F172A] ml-2">{rating}.0 Stars</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">Your Full Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Ritu Singhal"
                  className="w-full rounded-xl border border-[#0F172A]/15 bg-white px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">Your Review / Feedback</label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with the stylists, ambience, and treatment..."
                className="w-full rounded-xl border border-[#0F172A]/15 bg-white px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
              />
            </div>

            {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#D09A40] text-white hover:text-[#0F172A] font-bold text-xs transition-colors cursor-pointer shadow-sm"
            >
              Submit Rating & Feedback
            </button>
          </form>

          {/* Existing Reviews List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Customer Feedback History ({branchReviews.length})</h4>
            {branchReviews.length === 0 ? (
              <p className="text-xs text-neutral-500 py-4 text-center">No reviews yet for this branch. Be the first to leave feedback!</p>
            ) : (
              branchReviews.map((rev) => (
                <div key={rev.id} className="rounded-2xl border border-[#0F172A]/10 bg-white p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A]">{rev.clientName}</span>
                    <div className="flex items-center gap-1">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${s <= rev.rating ? 'fill-[#D09A40] text-[#D09A40]' : 'text-neutral-200'}`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono ml-1">{rev.date}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#4A4A4A] leading-relaxed">{rev.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const SalonsLocations: React.FC<SalonsLocationsProps> = ({ onSelectBranchForBooking }) => {
  const { brand, t, updateBrand } = useBrand();
  const [activeBranchId, setActiveBranchId] = useState<string>(
    brand.branches[0]?.id || 'flagship-central'
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reviews state stored in local storage
  const [reviews, setReviews] = useState<BranchReview[]>(() => {
    try {
      const stored = localStorage.getItem('bz_branch_reviews');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_BRANCH_REVIEWS;
  });

  const [reviewModalBranch, setReviewModalBranch] = useState<SalonBranch | null>(null);

  const activeBranch =
    brand.branches.find((b) => b.id === activeBranchId) || brand.branches[0];

  const localitySummary =
    brand.localities.length > 0
      ? brand.localities
          .slice(0, 6)
          .map((l) => l.name.split('/')[0].trim())
          .join(', ')
      : brand.cityName;

  const handleCopyAddress = (address: string, id: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleSaveReview = (newReviewData: Omit<BranchReview, 'id' | 'date'>) => {
    const createdReview: BranchReview = {
      ...newReviewData,
      id: `rev-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
    };

    const nextReviews = [createdReview, ...reviews];
    setReviews(nextReviews);
    try {
      localStorage.setItem('bz_branch_reviews', JSON.stringify(nextReviews));
    } catch (e) {
      console.error(e);
    }

    // Recalculate average rating for this branch
    const targetBranchId = newReviewData.branchId;
    const branchReviews = nextReviews.filter((r) => r.branchId === targetBranchId);
    const totalPoints = branchReviews.reduce((sum, r) => sum + r.rating, 0);
    const newRating = branchReviews.length > 0 ? Math.round((totalPoints / branchReviews.length) * 10) / 10 : 5.0;

    const updatedBranches = brand.branches.map((b) => {
      if (b.id === targetBranchId) {
        return {
          ...b,
          googleRating: newRating,
          reviewCount: branchReviews.length,
        };
      }
      return b;
    });

    updateBrand({ branches: updatedBranches });
  };

  // Google Maps directions URL targeting the specific branch address
  const activeDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${brand.brandName} ${activeBranch?.name || ''} ${activeBranch?.address || ''}`
  )}`;

  // Embedded map search query
  const mapEmbedQuery = encodeURIComponent(
    activeBranch?.address
      ? `${activeBranch.name}, ${activeBranch.address}`
      : `${brand.brandName}, ${brand.cityName}`
  );

  const mapEmbedUrl = `https://maps.google.com/maps?q=${mapEmbedQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <section id="locations" className="py-20 lg:py-28 bg-[#FAF5E5] border-t border-[#0F172A]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
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
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/salons?city=Jaipur"
              className="inline-flex items-center gap-2 rounded-full bg-[#0F172A] px-5 py-2.5 text-xs font-bold text-[#FAF5E5] hover:bg-slate-800 transition shadow-sm"
            >
              <Compass className="w-4 h-4 text-[#D09A40]" />
              <span>Explore Verified Salons in Jaipur</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#D09A40]" />
            </Link>
          </div>
        </div>

        {/* Interactive Google Maps Component Section */}
        <div className="bg-[#0F172A] text-[#FAF5E5] rounded-3xl border-2 border-[#D09A40]/50 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left / Info Panel */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6 border-b lg:border-b-0 lg:border-r border-white/10 bg-gradient-to-b from-[#0F172A] to-[#1E293B]">
            <div className="space-y-6">
              {/* Branch Selector Tabs */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D09A40] block mb-2">
                  Select Jaipur Branch Location:
                </span>
                <div className="flex flex-wrap gap-2">
                  {brand.branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setActiveBranchId(b.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        b.id === activeBranch?.id
                          ? 'bg-[#D09A40] text-[#0F172A] shadow-md ring-1 ring-white/20'
                          : 'bg-white/10 text-[#FAF5E5]/80 hover:bg-white/20 border border-white/10'
                      }`}
                    >
                      {b.name.split(' ')[0]} {b.isFlagship ? '(Flagship)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Branch Main Info */}
              <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#D09A40] text-[#0F172A]">
                    {activeBranch?.isFlagship ? 'Main Flagship Studio' : activeBranch?.locality}
                  </span>
                  <button
                    onClick={() => setReviewModalBranch(activeBranch)}
                    className="flex items-center gap-1 text-xs font-bold text-[#FAF5E5] bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition cursor-pointer"
                    title="View & leave ratings"
                  >
                    <Star className="w-3.5 h-3.5 fill-[#D09A40] text-[#D09A40]" />
                    <span>{activeBranch?.googleRating}</span>
                    <span className="text-white/60">({activeBranch?.reviewCount} reviews)</span>
                  </button>
                </div>

                <div>
                  <h3 className="font-serif text-2xl font-bold text-white">{activeBranch?.name}</h3>
                  <p className="text-xs sm:text-sm text-[#FAF5E5]/80 mt-2 flex items-start gap-2 leading-relaxed">
                    <MapPin className="w-4 h-4 text-[#D09A40] shrink-0 mt-0.5" />
                    <span>{activeBranch?.address}</span>
                  </p>
                </div>

                <div className="text-xs space-y-2 pt-2 border-t border-white/10 text-white/80">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#D09A40] shrink-0" />
                    <span>{activeBranch?.timings}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#10B981] shrink-0" />
                    <a href={`tel:${activeBranch?.phone.replace(/\s+/g, '')}`} className="hover:underline">
                      {activeBranch?.phone}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Actions */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <a
                href={activeDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                <span>Open Directions in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => activeBranch && handleCopyAddress(activeBranch.address, activeBranch.id)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-white/15 transition cursor-pointer"
                >
                  {copiedId === activeBranch?.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#10B981]" />
                      <span className="text-[#10B981]">Address Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#D09A40]" />
                      <span>Copy Address</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => activeBranch && onSelectBranchForBooking(activeBranch.name)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-[#FAF5E5] font-semibold text-xs flex items-center justify-center gap-1.5 border border-white/15 transition cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#D09A40]" />
                  <span>Book Studio</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right / Embedded Map View */}
          <div className="lg:col-span-7 relative min-h-[360px] lg:min-h-[480px] w-full bg-slate-900">
            <iframe
              title={`Google Map for ${activeBranch?.name || brand.brandName}`}
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '360px' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full min-h-[360px] lg:min-h-[480px]"
            />

            {/* Map Overlay Badge */}
            <div className="absolute top-4 right-4 bg-[#0F172A]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-[#FAF5E5] border border-[#D09A40]/40 shadow-xl flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#D09A40] animate-bounce" />
              <span>Jaipur Branch: {activeBranch?.locality}</span>
            </div>
          </div>
        </div>

        {/* All Branches Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          {brand.branches.map((branch) => {
            const googleMapsSearchUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
              `${brand.brandName} ${branch.name} ${branch.address}`
            )}`;
            const cleanWa = branch.whatsapp.replace(/[^0-9]/g, '') || brand.whatsappNumber;
            const isCurrentActive = branch.id === activeBranch?.id;

            return (
              <div
                key={branch.id}
                className={`rounded-3xl p-7 transition-all duration-300 flex flex-col justify-between ${
                  branch.isFlagship
                    ? 'bg-[#0F172A] text-[#FAF5E5] shadow-2xl border-2 border-[#D09A40]'
                    : isCurrentActive
                    ? 'bg-white text-[#0F172A] shadow-xl border-2 border-[#D09A40]'
                    : 'bg-white text-[#0F172A] elevation-subtle border border-[#0F172A]/10 hover:border-[#D09A40]'
                }`}
              >
                <div className="space-y-5">
                  {/* Top Badge & Star Rating System */}
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
                    <button
                      type="button"
                      onClick={() => setReviewModalBranch(branch)}
                      className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl transition cursor-pointer ${
                        branch.isFlagship
                          ? 'bg-white/10 hover:bg-white/20 text-[#FAF5E5]'
                          : 'bg-[#FAF5E5] hover:bg-[#F2E8CD] text-[#0F172A] border border-[#D09A40]/30'
                      }`}
                      title="View average rating and leave feedback"
                    >
                      <Star className="w-3.5 h-3.5 fill-[#D09A40] text-[#D09A40]" />
                      <span>{branch.googleRating}</span>
                      <span className={branch.isFlagship ? 'text-[#FAF5E5]/60' : 'text-[#4A4A4A]'}>
                        ({branch.reviewCount})
                      </span>
                    </button>
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
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setReviewModalBranch(branch)}
                      className={`py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                        branch.isFlagship
                          ? 'border-white/20 bg-white/10 hover:bg-white/20 text-white'
                          : 'border-[#D09A40]/40 bg-[#FAF5E5] hover:bg-[#F2E8CD] text-[#0F172A]'
                      }`}
                      title="Rate & Review this salon branch"
                    >
                      <Star className="w-3.5 h-3.5 fill-[#D09A40] text-[#D09A40]" />
                      <span>Rate Salon</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveBranchId(branch.id);
                        onSelectBranchForBooking(branch.name);
                      }}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        branch.isFlagship
                          ? 'bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A]'
                          : 'bg-[#0F172A] hover:bg-[#D09A40] text-[#FAF5E5] hover:text-[#0F172A]'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Studio</span>
                    </button>
                  </div>

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
                      <span>Directions</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
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

      {/* Branch Review Modal */}
      {reviewModalBranch && (
        <BranchReviewModal
          branch={reviewModalBranch}
          reviews={reviews}
          onClose={() => setReviewModalBranch(null)}
          onSubmitReview={handleSaveReview}
        />
      )}
    </section>
  );
};
