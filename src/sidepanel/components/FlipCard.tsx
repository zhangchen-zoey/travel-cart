import React from 'react';
import { motion } from 'framer-motion';
import type { CartItem } from '../../shared/types';
import { ExecutionView } from './ExecutionView';
import { useModeStore } from '../store/modeStore';

interface FlipCardProps {
  item: CartItem;
  anchorDate?: string;
  /** 正面内容（PlanningView）由外部传入 */
  frontContent: React.ReactNode;
}

export const FlipCard: React.FC<FlipCardProps> = ({ item, anchorDate, frontContent }) => {
  const phase = useModeStore((s) => s.phase);
  const isFlipped = phase === 'EXECUTION';

  return (
    <div className="flip-card-container" style={{ perspective: 1200 }}>
      <motion.div
        className="relative w-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Front — Planning */}
        <div
          className="w-full bg-white rounded-xl shadow-sm border border-gray-100"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {!isFlipped && frontContent}
        </div>

        {/* Back — Execution */}
        <div
          className="w-full bg-white rounded-xl shadow-sm border border-gray-100"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: isFlipped ? 'relative' : 'absolute',
            top: 0,
            left: 0,
            ...(isFlipped ? {} : { pointerEvents: 'none' as const }),
          }}
        >
          {isFlipped && <ExecutionView item={item} anchorDate={anchorDate} />}
        </div>
      </motion.div>
    </div>
  );
};
