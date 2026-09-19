import React from 'react';
import Link from 'next/link';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="p-10 rounded-2xl bg-herbal-900/60 border border-herbal-800 text-center space-y-4 max-w-md mx-auto">
      <div className="w-12 h-12 rounded-full bg-herbal-800 text-gold-400 flex items-center justify-center mx-auto border border-herbal-700/60 shadow">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="font-serif text-base font-bold text-cream-100">{title}</h3>
        <p className="text-xs text-cream-400 leading-relaxed">{description}</p>
      </div>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-herbal-800 border border-gold-500/30 text-gold-400 hover:bg-herbal-700 text-xs font-semibold transition-colors cursor-pointer"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
