import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'rose' | 'blue';
}

export function AdminStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'emerald',
}: AdminStatsCardProps) {
  const badgeClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  }[badgeColor];

  return (
    <div className="p-6 rounded-2xl bg-herbal-900 border border-herbal-800 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-cream-400 uppercase tracking-wider">{title}</span>
        <div className="w-9 h-9 rounded-xl bg-herbal-800 border border-herbal-700/60 text-gold-400 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="font-serif text-2xl sm:text-3xl font-bold text-cream-50">{value}</span>
        {badge && (
          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${badgeClasses}`}>
            {badge}
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-cream-400">{subtitle}</p>}
    </div>
  );
}
