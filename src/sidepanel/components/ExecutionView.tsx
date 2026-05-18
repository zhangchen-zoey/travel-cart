import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CartItem } from '../../shared/types';
import { buildDeepLink } from '../../shared/deeplink';
import { useModeStore } from '../store/modeStore';

interface ExecutionViewProps {
  item: CartItem;
  anchorDate?: string;
}

export const ExecutionView: React.FC<ExecutionViewProps> = ({ item, anchorDate }) => {
  const { checkedItems, toggleChecked, confirmCodes, setConfirmCode } = useModeStore();
  const isChecked = checkedItems.has(item.id);
  const [showConfirmInput, setShowConfirmInput] = useState(false);
  const confirmCode = confirmCodes[item.id] ?? '';

  const deepLink = buildDeepLink(item, anchorDate);

  const handleBooking = () => {
    // 尝试打开 App，失败则 fallback H5
    const w = window.open(deepLink.appUrl, '_blank');
    setTimeout(() => {
      if (!w || w.closed) {
        window.open(deepLink.h5Url, '_blank');
      }
    }, 500);
  };

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 1, height: 'auto' }}
        animate={{
          opacity: isChecked ? 0.5 : 1,
          filter: isChecked ? 'blur(2px)' : 'none',
          height: isChecked ? 64 : 'auto',
        }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="p-4 space-y-3"
      >
        {/* Checkbox + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleChecked(item.id)}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              isChecked
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-green-400'
            }`}
          >
            {isChecked && (
              <motion.svg
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 truncate">{item.title}</p>
            {item.subtitle && (
              <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
            )}
          </div>
          <span className="text-sm font-semibold text-orange-600">
            {item.currency} {item.price}
          </span>
        </div>

        {/* Actions — 未勾选时显示 */}
        {!isChecked && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex gap-2"
          >
            <button
              onClick={handleBooking}
              className="flex-1 py-2 px-3 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
            >
              去携程App预订
            </button>
            <button
              onClick={() => setShowConfirmInput(!showConfirmInput)}
              className="py-2 px-3 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              + 填入确认号
            </button>
          </motion.div>
        )}

        {/* 确认号输入 */}
        <AnimatePresence>
          {showConfirmInput && !isChecked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <input
                type="text"
                value={confirmCode}
                onChange={(e) => setConfirmCode(item.id, e.target.value)}
                placeholder="输入订单确认号..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
