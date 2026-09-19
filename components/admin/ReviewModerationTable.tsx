'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Star, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { AdminBadge } from './AdminBadge';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import { moderateReviewAction } from '@/lib/actions/admin/reviews';
import { ReviewStatus } from '@prisma/client';

interface ReviewItem {
  id: string;
  rating: number;
  reviewText: string;
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface ReviewModerationTableProps {
  initialData: {
    items: ReviewItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  status?: ReviewStatus;
  rating?: number;
}

export function ReviewModerationTable({
  initialData,
  status,
  rating,
}: ReviewModerationTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleModerate = (reviewId: string, newStatus: ReviewStatus) => {
    startTransition(async () => {
      const res = await moderateReviewAction({ reviewId, status: newStatus });
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to update review.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <form
        method="GET"
        className="p-4 rounded-2xl bg-herbal-900 border border-herbal-800 flex flex-col sm:flex-row items-center gap-3 shadow-lg"
      >
        <select
          name="status"
          defaultValue={status || ''}
          className="px-3 py-2 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-200 focus:outline-none focus:border-gold-500/50"
        >
          <option value="">All Review Statuses</option>
          <option value="PENDING">Pending Moderation</option>
          <option value="APPROVED">Approved & Published</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          name="rating"
          defaultValue={rating ? String(rating) : ''}
          className="px-3 py-2 bg-herbal-950/80 border border-herbal-800 rounded-xl text-xs text-cream-200 focus:outline-none focus:border-gold-500/50"
        >
          <option value="">All Star Ratings</option>
          <option value="5">5 Stars ★★★★★</option>
          <option value="4">4 Stars ★★★★☆</option>
          <option value="3">3 Stars ★★★☆☆</option>
          <option value="2">2 Stars ★★☆☆☆</option>
          <option value="1">1 Star ★☆☆☆☆</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-herbal-800 hover:bg-herbal-700 text-xs font-semibold text-cream-100 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Table Card */}
      <div className="rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl overflow-hidden p-6 space-y-4">
        {initialData.items.length === 0 ? (
          <EmptyState
            title="No Reviews Found"
            description="No customer reviews match the specified criteria."
            icon={Star}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-herbal-800 text-cream-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Product</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Rating</th>
                    <th className="pb-3">Feedback</th>
                    <th className="pb-3">Verified</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-herbal-800/60">
                  {initialData.items.map((rev) => (
                    <tr key={rev.id} className="hover:bg-herbal-800/30 transition-colors">
                      <td className="py-3 font-semibold text-cream-100 max-w-[160px] truncate">
                        <a
                          href={`/products/${rev.product.slug}`}
                          target="_blank"
                          className="hover:text-gold-400"
                        >
                          {rev.product.name}
                        </a>
                      </td>

                      <td className="py-3 text-cream-200 whitespace-nowrap">
                        {rev.user.firstName} {rev.user.lastName}
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-1 text-gold-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < rev.rating
                                  ? 'fill-gold-400 text-gold-400'
                                  : 'text-cream-600'
                              }`}
                            />
                          ))}
                        </div>
                      </td>

                      <td className="py-3 text-cream-300 max-w-xs truncate">{rev.reviewText}</td>

                      <td className="py-3">
                        {rev.isVerifiedPurchase ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                            Verified
                          </span>
                        ) : (
                          <span className="text-[10px] text-cream-500 italic">Unverified</span>
                        )}
                      </td>

                      <td className="py-3">
                        <AdminBadge status={rev.status} size="sm" />
                      </td>

                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {rev.status !== ReviewStatus.APPROVED && (
                            <button
                              type="button"
                              onClick={() => handleModerate(rev.id, ReviewStatus.APPROVED)}
                              disabled={isPending}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 font-semibold text-[11px] transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {rev.status !== ReviewStatus.REJECTED && (
                            <button
                              type="button"
                              onClick={() => handleModerate(rev.id, ReviewStatus.REJECTED)}
                              disabled={isPending}
                              className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 font-semibold text-[11px] transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={initialData.page}
              totalPages={initialData.totalPages}
              totalItems={initialData.total}
              pageSize={initialData.pageSize}
              baseUrl="/admin/reviews"
              searchParams={{ status, rating }}
            />
          </>
        )}
      </div>
    </div>
  );
}
