import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../store/cartStore';

export const ShareButton: React.FC = () => {
  const items = useCartStore((s) => s.items);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleShare = async () => {
    if (items.length === 0) return;
    setStatus('loading');

    const snapshot = {
      items,
      createdAt: Date.now(),
      version: 1,
    };

    try {
      const res = await fetch('/api/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });

      if (!res.ok) throw new Error('API error');

      const { url } = (await res.json()) as { url: string };
      await navigator.clipboard.writeText(url);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        disabled={status === 'loading' || items.length === 0}
        className="p-2 text-gray-500 hover:text-blue-500 disabled:opacity-40 transition-colors"
        title="分享行程"
      >
        {status === 'loading' ? (
          <motion.svg
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83" />
          </motion.svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Toast */}
      <AnimatePresence>
        {(status === 'done' || status === 'error') && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`absolute right-0 top-full mt-2 px-3 py-1.5 text-xs font-medium rounded-lg shadow-lg whitespace-nowrap z-50 ${
              status === 'done'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {status === 'done' ? '✅ 链接已复制' : '❌ 分享失败'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
