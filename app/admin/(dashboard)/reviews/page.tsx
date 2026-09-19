import 'server-only';
import React from 'react';
import { getAdminReviews } from '@/lib/db/admin';
import { ReviewModerationTable } from '@/components/admin/ReviewModerationTable';
import { ReviewStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Review Moderation | Admin | Mana Grameena',
  description: 'Moderate customer ratings and review submissions.',
};

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: ReviewStatus;
    rating?: string;
    page?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const status = resolvedParams.status;
  const rating = resolvedParams.rating ? parseInt(resolvedParams.rating, 10) : undefined;

  const reviewsData = await getAdminReviews({
    status: status || undefined,
    rating,
    page,
    pageSize: 15,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">
          Review Moderation
        </h1>
        <p className="text-xs text-cream-400 mt-1">
          Review customer feedback, verify purchases, and approve public store reviews.
        </p>
      </div>

      <ReviewModerationTable initialData={reviewsData} status={status} rating={rating} />
    </div>
  );
}
