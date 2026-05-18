import React, { useState, useEffect } from 'react';
import { Timeline } from './components/Timeline';
import { PriceSummary } from './components/PriceSummary';
import { CheckoutBar } from './components/CheckoutBar';
import { ShareButton } from './components/ShareButton';
import { useCartStore } from './store/cartStore';
import { useModeStore } from './store/modeStore';

/** 紧凑日期选择器 */
const AnchorDatePicker: React.FC = () => {
  const reanchor = useCartStore((s) => s.reanchor);
  const items = useCartStore((s) => s.items);

  // 从 items 中推断 anchorDate（最早的 startDate）或用今天
  const anchorDate = React.useMemo(() => {
    const dates = items.map((i) => i.startDate).filter(Boolean).sort();
    return dates[0] || new Date().toISOString().slice(0, 10);
  }, [items]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) reanchor(val);
  };

  return (
    <input
      type="date"
      value={anchorDate}
      onChange={handleChange}
      className="text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 w-[120px]"
    />
  );
};

const App: React.FC = () => {
  const items = useCartStore((s) => s.items);
  const setTotalCount = useModeStore((s) => s.setTotalCount);

  // 同步 totalCount
  useEffect(() => {
    setTotalCount(items.length);
  }, [items.length, setTotalCount]);

  // 日期选择器：获取行程涉及的所有日期
  const allDates = React.useMemo(() => {
    const dates = new Set<string>();
    items.forEach((item) => {
      if (item.startDate) dates.add(item.startDate);
    });
    return Array.from(dates).sort();
  }, [items]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const filteredItems = React.useMemo(() => {
    if (!selectedDate) return items;
    return items.filter((i) => i.startDate === selectedDate);
  }, [items, selectedDate]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <h1 className="text-lg font-semibold text-gray-800">🧳 行程单</h1>
        <div className="flex items-center gap-2">
          <AnchorDatePicker />
          <span className="text-sm text-gray-500">{items.length} 项</span>
          <ShareButton />
        </div>
      </header>

      {/* Date Picker Bar */}
      {allDates.length > 0 && (
        <div className="flex gap-2 px-4 py-2 bg-white border-b overflow-x-auto">
          <button
            onClick={() => setSelectedDate(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedDate === null
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          {allDates.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedDate === date
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-4xl mb-2">✈️</p>
            <p>浏览携程，点击 [+ 行程单] 添加</p>
          </div>
        ) : (
          <Timeline items={filteredItems} />
        )}
      </main>

      {/* Footer */}
      {items.length > 0 && (
        <>
          <PriceSummary />
          <CheckoutBar />
        </>
      )}
    </div>
  );
};

export default App;
