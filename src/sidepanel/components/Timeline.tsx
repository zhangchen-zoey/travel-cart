import React from 'react';
import { TimeSlot } from './TimeSlot';
import type { CartItem, ResolvedDay } from '../../shared/types';

type TimeOfDay = 'morning' | 'afternoon' | 'evening';

function getTimeOfDay(time?: string): TimeOfDay {
  if (!time) return 'morning';
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

const timeOfDayLabels: Record<TimeOfDay, string> = {
  morning: '🌅 上午',
  afternoon: '☀️ 下午',
  evening: '🌙 晚上',
};

interface TimelineProps {
  items: CartItem[];
}

/**
 * 时间线视图 - 按天分组，每天分 morning/afternoon/evening 三个 TimeSlot
 */
export const Timeline: React.FC<TimelineProps> = ({ items }) => {
  // 按日期分组
  const days: ResolvedDay[] = React.useMemo(() => {
    const grouped = new Map<string, CartItem[]>();
    items.forEach((item) => {
      const date = item.startDate || 'unscheduled';
      const group = grouped.get(date) ?? [];
      group.push(item);
      grouped.set(date, group);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayItems]) => ({
        date,
        label: date === 'unscheduled' ? '未安排' : formatDateLabel(date),
        items: dayItems.sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
        dayTotal: dayItems.reduce((sum, i) => sum + i.price, 0),
      }));
  }, [items]);

  return (
    <div className="space-y-6">
      {days.map((day) => {
        // 按时间段分组
        const slots: Record<TimeOfDay, CartItem[]> = { morning: [], afternoon: [], evening: [] };
        day.items.forEach((item) => {
          slots[getTimeOfDay(item.startTime)].push(item);
        });

        return (
          <div key={day.date} className="space-y-3">
            {/* Day Header */}
            <div className="flex items-center justify-between sticky top-0 bg-gray-50 py-1 z-10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm font-semibold text-gray-700">{day.label}</span>
              </div>
              <span className="text-xs text-gray-400">小计 ¥{day.dayTotal.toLocaleString()}</span>
            </div>

            {/* Time Slots */}
            {(['morning', 'afternoon', 'evening'] as TimeOfDay[]).map((tod) => {
              if (slots[tod].length === 0) return null;
              return (
                <TimeSlot key={tod} slotLabel={timeOfDayLabels[tod]} items={slots[tod]} dayDate={day.date} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

function formatDateLabel(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
}
