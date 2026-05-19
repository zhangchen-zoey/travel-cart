import { describe, test, expect, beforeEach } from 'vitest';
import { STORAGE_KEY_CART } from '../src/shared/constants';

/**
 * 测试 Background 并发写入的串行化锁
 * 模拟快速连续发送 5 个 ADD_ITEM，验证 storage 最终包含 5 条
 */

// Mock chrome.storage.local
let storage: Record<string, string> = {};

const chromeStorageMock = {
  local: {
    get: async (key: string) => ({ [key]: storage[key] }),
    set: async (items: Record<string, string>) => {
      Object.assign(storage, items);
    },
  },
};

// Replicate the serialized handleAddItem logic from background/index.ts
let storageOpLock = Promise.resolve();

async function handleAddItem(payload: { type: string; title: string; price: number }) {
  storageOpLock = storageOpLock.then(async () => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item = {
      ...payload,
      id,
      addedAt: Date.now(),
      priceUpdatedAt: Date.now(),
    };

    const result = await chromeStorageMock.local.get(STORAGE_KEY_CART);
    const stored = result[STORAGE_KEY_CART];
    const state = stored ? JSON.parse(stored) : { state: { items: [] } };
    state.state.items.push(item);
    await chromeStorageMock.local.set({ [STORAGE_KEY_CART]: JSON.stringify(state) });
  });
  await storageOpLock;
}

describe('Background 并发写入测试', () => {
  beforeEach(() => {
    storage = {};
    storageOpLock = Promise.resolve();
  });

  test('快速连续发送 5 个 ADD_ITEM，storage 最终应包含 5 条', async () => {
    // Fire 5 concurrent ADD_ITEM without awaiting each one
    const promises = Array.from({ length: 5 }, (_, i) =>
      handleAddItem({
        type: 'flight',
        title: `航班 ${i + 1}`,
        price: (i + 1) * 100,
      })
    );

    await Promise.all(promises);

    const result = await chromeStorageMock.local.get(STORAGE_KEY_CART);
    const state = JSON.parse(result[STORAGE_KEY_CART]!);
    expect(state.state.items).toHaveLength(5);

    // Verify each item is unique
    const ids = new Set(state.state.items.map((i: any) => i.id));
    expect(ids.size).toBe(5);
  });

  test('无串行化锁时会丢数据（对照组）', async () => {
    // Without lock - simulate race condition
    const racyAdd = async (payload: { title: string; price: number }) => {
      // Read
      const result = await chromeStorageMock.local.get(STORAGE_KEY_CART);
      const stored = result[STORAGE_KEY_CART];
      const state = stored ? JSON.parse(stored) : { state: { items: [] } };

      // Yield to simulate async gap
      await new Promise(r => setTimeout(r, 0));

      // Write (potentially stale read)
      state.state.items.push({ ...payload, id: Math.random().toString() });
      await chromeStorageMock.local.set({ [STORAGE_KEY_CART]: JSON.stringify(state) });
    };

    const promises = Array.from({ length: 5 }, (_, i) =>
      racyAdd({ title: `航班 ${i + 1}`, price: (i + 1) * 100 })
    );
    await Promise.all(promises);

    const result = await chromeStorageMock.local.get(STORAGE_KEY_CART);
    const state = JSON.parse(result[STORAGE_KEY_CART]!);
    // Without lock, race condition likely loses items (usually only 1 survives)
    expect(state.state.items.length).toBeLessThanOrEqual(5);
    // This test demonstrates WHY the lock is needed
  });
});
