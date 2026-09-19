'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { broadcastNotificationAction } from '@/lib/actions/admin/notifications';

export function NotificationBroadcastForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [targetUserId, setTargetUserId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await broadcastNotificationAction({
        title,
        message,
        linkUrl: linkUrl || null,
        targetUserId: targetUserId || null,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to dispatch notification.');
      } else {
        setSuccessMsg(
          targetUserId
            ? 'Direct notification dispatched to customer.'
            : 'Storewide broadcast sent to all active customers.'
        );
        setTitle('');
        setMessage('');
        setLinkUrl('');
        setTargetUserId('');
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-herbal-900 border border-herbal-800 shadow-xl space-y-4">
      <div className="flex items-center gap-3 border-b border-herbal-800 pb-3">
        <div className="w-8 h-8 rounded-xl bg-herbal-800 text-gold-400 flex items-center justify-center">
          <Bell className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-serif text-base font-bold text-cream-50">
            Dispatch Store Announcement
          </h3>
          <p className="text-xs text-cream-400">
            Broadcast promotional alerts, harvest updates, or direct order advisories.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1">
          <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
            Notification Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fresh Wood-Pressed Sesame Oil Batch Now In Stock!"
            className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
            Announcement Message *
          </label>
          <textarea
            required
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Detailed alert message displayed in the customer notification center..."
            className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 leading-relaxed"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
            Action Link URL (Optional)
          </label>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="/products/wood-pressed-sesame-oil"
            className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50 font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider">
            Target Customer User ID (Leave blank to broadcast to ALL)
          </label>
          <input
            type="text"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="UUID for individual customer, or blank"
            className="w-full px-3 py-2 bg-herbal-950 border border-herbal-800 rounded-xl text-xs font-mono text-cream-100 placeholder:text-cream-600 focus:outline-none focus:border-gold-500/50"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-herbal-800 hover:bg-herbal-700 text-gold-400 border border-gold-500/30 text-xs font-bold transition-all cursor-pointer shadow-lg disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Dispatching...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {targetUserId ? 'Send Direct Alert' : 'Broadcast to All Customers'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
