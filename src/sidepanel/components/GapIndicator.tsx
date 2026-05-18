import React from 'react';
import type { CartItem } from '../../shared/types';

interface GapIndicatorProps {
  fromItem: CartItem;
  toItem: CartItem;
}

/**
 * 两个行程项之间的间隙路线耗时指示器
 * 模拟计算通勤时间，超 1h 爆红警告
 */
export const GapIndicator: React.FC<GapIndicatorProps> = ({ fromItem, toItem }) => {
  const { gapMinutes, travelMinutes } = React.useMemo(() => {
    if (!fromItem.endTime || !toItem.startTime) return { gapMinutes: null, travelMinutes: null };
    const [fh, fm] = fromItem.endTime.split(':').map(Number);
    const [th, tm] = toItem.startTime.split(':').map(Number);
    const gap = (th * 60 + tm) - (fh * 60 + fm);

    // 模拟路线耗时（基于类型组合，真实场景可接入地图 API）
    let travel = 30; // 默认 30 分钟通勤
    if (fromItem.type === 'flight' || toItem.type === 'flight') travel = 90;
    else if (fromItem.type === 'train' || toItem.type === 'train') travel = 45;
    else if (fromItem.type === 'hotel' && toItem.type === 'activity') travel = 20;

    return { gapMinutes: gap, travelMinutes: travel };
  }, [fromItem, toItem]);

  if (gapMinutes === null || travelMinutes === null) {
    return <div className="h-2" />;
  }

  const isOverlap = gapMinutes < 0;
  const isTight = !isOverlap && gapMinutes < travelMinutes;
  const isOverHour = travelMinutes > 60;

  let label: string;
  let color: string;
  let icon: string;

  if (isOverlap) {
    label = `⚠️ 时间重叠 ${Math.abs(gapMinutes)} 分钟`;
    color = 'text-red-500 bg-red-50';
    icon = '🔴';
  } else if (isOverHour) {
    label = `🚗 预计通勤 ${travelMinutes} 分钟（超1小时！）`;
    color = 'text-red-600 bg-red-50 font-medium';
    icon = '🔴';
  } else if (isTight) {
    label = `🚗 通勤 ~${travelMinutes}min｜间隔仅 ${gapMinutes}min`;
    color = 'text-amber-600 bg-amber-50';
    icon = '🟡';
  } else {
    label = `🚗 ~${travelMinutes}min｜空闲 ${gapMinutes - travelMinutes}min`;
    color = 'text-gray-500 bg-gray-50';
    icon = '🟢';
  }

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 mx-2 my-1 rounded text-xs ${color}`}>
      <div className="flex flex-col items-center">
        <div className="w-px h-2 bg-current opacity-30" />
        <span className="text-[10px]">{icon}</span>
        <div className="w-px h-2 bg-current opacity-30" />
      </div>
      <span>{label}</span>
    </div>
  );
};
