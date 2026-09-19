'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitProductReview } from '@/lib/actions/reviews';
import { Star, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

interface ReviewFormProps {
  productId: string;
  canReview: boolean;
  reason?: string;
  initialRating?: number;
  initialText?: string;
}

export default function ReviewForm({
  productId,
  canReview,
  reason,
  initialRating = 5,
  initialText = '',
}: ReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState(initialText);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (!canReview) {
    return (
      <div className="p-4 rounded-2xl bg-cream-100/70 border border-cream-300 text-xs text-herbal-700 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-herbal-600 shrink-0" />
          <span>{reason || 'Only verified purchasers can submit reviews for this product.'}</span>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await submitProductReview({
        productId,
        rating,
        reviewText,
      });

      if (res.success) {
        setSuccessMessage(
          'Thank you! Your verified review has been submitted and is pending moderation approval.'
        );
        setIsFormOpen(false);
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Failed to submit review.');
      }
    });
  };

  return (
    <div className="space-y-4">
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!isFormOpen && !successMessage && (
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-cream-200 text-herbal-900 hover:bg-herbal-800 hover:text-cream-100 text-xs font-semibold transition-colors"
        >
          <Star className="w-4 h-4 text-gold-600" />
          <span>Write a Verified Customer Review</span>
        </button>
      )}

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-cream-50 rounded-3xl p-6 border border-cream-300 shadow-sm space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-cream-200 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span className="font-bold text-xs text-herbal-950 uppercase tracking-wider">
                Verified Buyer Review
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-xs text-herbal-600 hover:text-herbal-900"
            >
              Cancel
            </button>
          </div>

          {/* Star Picker */}
          <div>
            <label className="block text-xs font-semibold text-herbal-800 mb-1.5">
              Overall Rating *
            </label>
            <div className="flex items-center gap-1 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 rounded hover:scale-110 transition-transform"
                  aria-label={`Rate ${star} star`}
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-cream-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs font-bold text-herbal-900">{rating} out of 5</span>
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-xs font-semibold text-herbal-800 mb-1">
              Your Experience & Herbal Benefits *
            </label>
            <textarea
              required
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Describe how this herbal formulation worked for you, scent, texture, or results..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-white text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30 leading-relaxed"
            />
            <span className="text-[10px] text-herbal-500 block text-right mt-1">
              {reviewText.length} / 1000 characters
            </span>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isPending || reviewText.trim().length < 5}
              className="px-5 py-2.5 rounded-xl bg-herbal-800 hover:bg-herbal-900 text-cream-100 text-xs font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Review for Moderation</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
