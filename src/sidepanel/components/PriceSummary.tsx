import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../store/cartStore';

export const PriceSummary: React.FC = () => {
  const items = useCartStore((s) => s.items);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [deltaTip, setDeltaTip] = useState<{ amount: number; show: boolean }>({ amount: 0, show: false });
  const prevTotalRef = useRef<number | null>(null);

  const total = React.useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items]
  );

  const staleCount = items.filter((i) => i.priceStatus === 'stale').length;
  const unavailableCount = items.filter((i) => i.priceStatus === 'unavailable').length;

  // 检测价格变化 delta
  useEffect(() => {
    if (prevTotalRef.current !== null && prevTotalRef.current !== total) {
      const delta = total - prevTotalRef.current;
      setDeltaTip({ amount: delta, show: true });
      const timer = setTimeout(() => setDeltaTip((d) => ({ ...d, show: false })), 3000);
      return () => clearTimeout(timer);
    }
    prevTotalRef.current = total;
  }, [total]);

  // 模拟"正在重新计算"状态
  useEffect(() => {
    if (staleCount > 0) {
      setIsRecalculating(true);
    } else {
      // 延迟关闭，让用户看到过渡
      const timer = setTimeout(() => setIsRecalculating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [staleCount]);

  return (
    <footer className="border-t bg-white px-4 py-3 relative">
      {/* Delta Tip 气泡 */}
      <AnimatePresence>
        {deltaTip.show && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className={`absolute -top-8 right-4 px-2 py-1 rounded-full text-xs font-medium shadow-md ${
              deltaTip.amount > 0
                ? 'bg-red-100 text-red-600'
                : 'bg-green-100 text-green-600'
            }`}
          >
            {deltaTip.amount > 0 ? '📈' : '📉'} {deltaTip.amount > 0 ? '+' : ''}¥{deltaTip.amount.toLocaleString()}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">
            总计
            {isRecalculating && (
              <span className="ml-2 inline-flex items-center text-orange-500">
                <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                正在重新计算...
              </span>
            )}
          </p>
          <p className={`text-xl font-bold ${isRecalculating ? 'text-gray-400' : 'text-gray-800'}`}>
            ¥{total.toLocaleString()}
          </p>
        </div>
        <div className="text-right space-y-0.5">
          {staleCount > 0 && (
            <p className="text-[10px] text-orange-500">{staleCount} 项价格待更新</p>
          )}
          {unavailableCount > 0 && (
            <p className="text-[10px] text-red-500">{unavailableCount} 项已不可用</p>
          )}
        </div>
      </div>
    </footer>
  );
};
