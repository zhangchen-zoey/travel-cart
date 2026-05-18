import { create } from 'zustand';
import type { ViewMode } from '../../shared/types';

export type AppPhase = 'PLANNING' | 'EXECUTION';

interface ModeState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isEditing: boolean;
  setEditing: (editing: boolean) => void;

  /** 当前阶段：规划 or 对账 */
  phase: AppPhase;
  setPhase: (phase: AppPhase) => void;

  /** 已勾选（已购买）的 item id 集合 */
  checkedItems: Set<string>;
  toggleChecked: (id: string) => void;

  /** 确认号映射 itemId → confirmationCode */
  confirmCodes: Record<string, string>;
  setConfirmCode: (id: string, code: string) => void;

  /** 进度：已购数 / 总数 */
  checkedCount: number;
  totalCount: number;
  setTotalCount: (n: number) => void;
}

export const useModeStore = create<ModeState>((set, _get) => ({
  viewMode: 'timeline',
  setViewMode: (viewMode) => set({ viewMode }),
  isEditing: false,
  setEditing: (isEditing) => set({ isEditing }),

  phase: 'PLANNING',
  setPhase: (phase) => set({ phase }),

  checkedItems: new Set<string>(),
  toggleChecked: (id) =>
    set((state) => {
      const next = new Set(state.checkedItems);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { checkedItems: next, checkedCount: next.size };
    }),

  confirmCodes: {},
  setConfirmCode: (id, code) =>
    set((state) => ({
      confirmCodes: { ...state.confirmCodes, [id]: code },
    })),

  checkedCount: 0,
  totalCount: 0,
  setTotalCount: (n) => set({ totalCount: n }),
}));
