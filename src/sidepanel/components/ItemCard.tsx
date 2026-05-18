import React from 'react';
import { motion } from 'framer-motion';
import { useCartStore } from '../store/cartStore';
import type { CartItem } from '../../shared/types';

interface ItemCardProps {
  item: CartItem;
}

const typeIcons: Record<string, string> = {
  flight: '✈️',
  hotel: '🏨',
  train: '🚄',
  activity: '🎯',
};

/** 判断是否满房（模拟：unavailable 且 hotel 类型） */
function isSoldOut(item: CartItem): boolean {
  return item.priceStatus === 'unavailable' && item.type === 'hotel';
}

/** 解析机票信息：从 title/subtitle 中提取关键展示字段 */
function parseFlightDisplay(item: CartItem) {
  // title 通常包含航班号，subtitle 包含航线等
  const title = item.title || '';
  const subtitle = item.subtitle || '';
  const raw = item.rawData || {};

  // 航班号：取第一个匹配的
  const flightNoMatch = title.match(/([A-Z]{2}\d{3,5})/);
  const flightNo = flightNoMatch ? flightNoMatch[1] : '';

  // 机场：尝试从 subtitle 或 rawData 解析 "上海虹桥 → 北京首都" 格式
  const routeMatch = subtitle.match(/(.+?)\s*[→\-–>]+\s*(.+?)(?:\s|$)/) ||
    title.match(/(.+?)\s*[→\-–>]+\s*(.+?)(?:\s|$)/);
  const departure = (raw['departure'] as string) || routeMatch?.[1] || '';
  const arrival = (raw['arrival'] as string) || routeMatch?.[2] || '';

  // 舱位
  const cabin = (raw['cabin'] as string) || subtitle.match(/(经济舱|商务舱|头等舱|超级经济舱)/)?.[1] || '';

  // 时间
  const timeStr = item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : '';

  return { flightNo, departure, arrival, cabin, timeStr };
}

export const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const removeItem = useCartStore((s) => s.removeItem);

  const isStale = item.priceStatus === 'stale';
  const isUnavailable = item.priceStatus === 'unavailable';
  const soldOut = isSoldOut(item);

  // 卡片状态样式
  const cardClass = [
    'rounded-lg p-3 shadow-sm border relative overflow-hidden',
    isUnavailable && !soldOut && 'bg-red-50 border-red-200',
    soldOut && 'bg-white border-gray-200 opacity-50',
    isStale && 'bg-white border-orange-200',
    !isStale && !isUnavailable && 'bg-white border-gray-100',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: soldOut ? 0.5 : 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cardClass}
    >
      {/* Skeleton overlay for STALE */}
      {isStale && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-50 to-transparent animate-pulse opacity-60" />
        </div>
      )}

      {/* Unavailable badge */}
      {isUnavailable && !soldOut && (
        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-medium">
          已下架
        </div>
      )}

      {soldOut && (
        <div className="absolute top-0 right-0 bg-gray-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-medium">
          满房
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="text-lg">{typeIcons[item.type] ?? '📌'}</span>
          <div>
            {item.type === 'flight' ? (() => {
              const f = parseFlightDisplay(item);
              return (
                <>
                  {f.departure && f.arrival && (
                    <p className={`font-medium text-sm ${isUnavailable ? 'text-red-700 line-through' : 'text-gray-800'}`}>
                      {f.departure} → {f.arrival}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[f.flightNo, f.cabin].filter(Boolean).join(' · ')}
                  </p>
                  {f.timeStr && (
                    <p className="text-xs text-gray-400 mt-0.5">{f.timeStr}</p>
                  )}
                </>
              );
            })() : (
              <>
                <p className={`font-medium text-sm ${isUnavailable ? 'text-red-700 line-through' : 'text-gray-800'}`}>
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                )}
                {item.startTime && (
                  <p className="text-xs text-gray-400 mt-1">
                    {item.startTime}
                    {item.endTime ? ` - ${item.endTime}` : ''}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <p
            className={`text-sm font-semibold ${
              isUnavailable
                ? 'text-red-500 line-through'
                : isStale
                ? 'text-orange-500'
                : 'text-gray-800'
            }`}
          >
            ¥{item.price.toLocaleString()}
          </p>
          {isStale && <p className="text-[10px] text-orange-400">价格待更新</p>}
          {isUnavailable && !soldOut && <p className="text-[10px] text-red-400">不可预订</p>}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2">
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-400 hover:text-blue-600 truncate max-w-[60%]"
        >
          查看原页面 →
        </a>
        <button
          onClick={() => removeItem(item.id)}
          className="text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          移除
        </button>
      </div>
    </motion.div>
  );
};
