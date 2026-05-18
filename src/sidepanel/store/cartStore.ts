import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, PriceStatus } from '../../shared/types';
import { STORAGE_KEY_CART } from '../../shared/constants';

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'addedAt' | 'priceUpdatedAt'>) => void;
  removeItem: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  updatePrice: (id: string, price: number, status?: PriceStatus) => void;
  markAllStale: () => void;
  clearAll: () => void;
  /** 切日期 → 标记全部 stale → 逐一触发 ghostRefresh */
  reanchor: (newDate?: string) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (payload) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...payload,
              id: generateId(),
              addedAt: Date.now(),
              priceUpdatedAt: Date.now(),
            },
          ],
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      reorder: (fromIndex, toIndex) =>
        set((state) => {
          const items = [...state.items];
          const [moved] = items.splice(fromIndex, 1);
          items.splice(toIndex, 0, moved);
          return { items };
        }),

      updatePrice: (id, price, status = 'fresh') =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, price, priceStatus: status, priceUpdatedAt: Date.now() }
              : item
          ),
        })),

      markAllStale: () =>
        set((state) => ({
          items: state.items.map((item) => ({ ...item, priceStatus: 'stale' as PriceStatus })),
        })),

      clearAll: () => set({ items: [] }),

      reanchor: (_newDate?: string) => {
        // 1. 标记所有 item 为 stale
        set((state) => ({
          items: state.items.map((item) => ({
            ...item,
            priceStatus: 'stale' as PriceStatus,
          })),
        }));

        // 2. 通知 background 触发全量 ghost refresh
        chrome.runtime.sendMessage({ action: 'REANCHOR' }).catch(() => {
          // background 可能未就绪，fallback: 逐一发送 CHECK_PRICE
          const items = get().items;
          items.forEach((item) => {
            chrome.runtime.sendMessage({
              action: 'CHECK_PRICE',
              payload: { itemId: item.id, sourceUrl: item.sourceUrl },
            }).catch(() => {});
          });
        });
      },
    }),
    {
      name: STORAGE_KEY_CART,
      storage: {
        getItem: async (name) => {
          const result = await chrome.storage.local.get(name);
          return result[name] ?? null;
        },
        setItem: async (name, value) => {
          await chrome.storage.local.set({ [name]: value });
        },
        removeItem: async (name) => {
          await chrome.storage.local.remove(name);
        },
      },
    }
  )
);

// 监听来自 background 的消息
chrome.runtime?.onMessage?.addListener((message: { action: string; payload?: any }) => {
  if (message.action === 'ITEM_ADDED' && message.payload?.item) {
    useCartStore.getState().addItem(message.payload.item);
  }
  if (message.action === 'PRICE_UPDATE' && message.payload) {
    const { itemId, price, status } = message.payload;
    if (itemId && price !== undefined) {
      useCartStore.getState().updatePrice(itemId, price, status);
    }
  }
  if (message.action === 'ALL_STALE') {
    useCartStore.getState().markAllStale();
  }
});
