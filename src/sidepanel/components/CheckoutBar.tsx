import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModeStore } from '../store/modeStore';

export const CheckoutBar: React.FC = () => {
  const { phase, setPhase, checkedCount, totalCount } = useModeStore();

  const progress = totalCount > 0 ? checkedCount / totalCount : 0;
  const allDone = totalCount > 0 && checkedCount >= totalCount;

  if (phase === 'PLANNING') {
    return (
      <div className="px-4 py-3 bg-white border-t">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setPhase('EXECUTION')}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          🛒 一键前往下单
        </motion.button>
      </div>
    );
  }

  // EXECUTION — 进度条
  return (
    <div className="px-4 py-3 bg-white border-t space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          已购 <span className="font-bold text-green-600">{checkedCount}</span> / {totalCount}
        </span>
        {allDone && (
          <AnimatePresence>
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-green-600 font-medium"
            >
              ✅ 全部搞定！
            </motion.span>
          </AnimatePresence>
        )}
        <button
          onClick={() => setPhase('PLANNING')}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          返回规划
        </button>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};
