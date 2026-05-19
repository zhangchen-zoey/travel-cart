import { onMessage } from '../shared/messaging';
import type { ExtensionMessage, CartItem, PriceStatus } from '../shared/types';
import { GHOST_TAB_INTERVAL, STORAGE_KEY_CART } from '../shared/constants';

/**
 * Service Worker - 后台调度中心
 * Ghost Tab 完整实现
 */

// ============ 类型 ============

interface PriceCache {
  price: number;
  timestamp: number;
}

interface GhostTask {
  itemId: string;
  sourceUrl: string;
  resolve: (result: { price: number; status: PriceStatus }) => void;
  reject: (err: Error) => void;
}

// ============ 状态 ============

const CACHE_TTL = 60 * 60 * 1000; // 1h
const GHOST_TIMEOUT = 15_000; // 15s
const MAX_CONCURRENT_GHOSTS = 2;

let activeGhosts = 0;
const ghostQueue: GhostTask[] = [];

// ============ 缓存层 ============

async function getCachedPrice(url: string): Promise<PriceCache | null> {
  const key = `price_cache_${btoa(url).slice(0, 40)}`;
  const result = await chrome.storage.local.get(key);
  const cached = result[key] as PriceCache | undefined;
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    await chrome.storage.local.remove(key);
    return null;
  }
  return cached;
}

async function setCachedPrice(url: string, price: number): Promise<void> {
  const key = `price_cache_${btoa(url).slice(0, 40)}`;
  await chrome.storage.local.set({ [key]: { price, timestamp: Date.now() } });
}

// ============ Ghost Tab 核心 ============

async function ghostRefresh(url: string): Promise<{ price: number; status: PriceStatus }> {
  // 1. 检查缓存
  const cached = await getCachedPrice(url);
  if (cached) {
    return { price: cached.price, status: 'fresh' };
  }

  // 2. 创建隐形 Tab
  const tab = await chrome.tabs.create({
    url,
    active: false,
    pinned: false,
  });

  const tabId = tab.id!;

  return new Promise((resolve, reject) => {
    let settled = false;

    // 超时 15s 自动销毁
    const timeout = setTimeout(async () => {
      if (!settled) {
        settled = true;
        try { await chrome.tabs.remove(tabId); } catch {}
        reject(new Error(`Ghost tab timeout for ${url}`));
      }
    }, GHOST_TIMEOUT);

    // 监听来自 content script 的价格结果
    const listener = (
      message: { action: string; payload?: { price?: number; captcha?: boolean } },
      sender: chrome.runtime.MessageSender
    ) => {
      if (sender.tab?.id !== tabId || settled) return;

      if (message.action === 'PRICE_RESULT' && message.payload?.price !== undefined) {
        settled = true;
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        chrome.tabs.remove(tabId).catch(() => {});
        setCachedPrice(url, message.payload.price);
        resolve({ price: message.payload.price, status: 'fresh' });
      }

      // Human Pivot: 验证码检测
      if (message.action === 'CAPTCHA_DETECTED') {
        settled = true;
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        // 不关闭 tab，让用户手动处理
        notifySidePanel('CAPTCHA_DETECTED', { tabId, url });
        reject(new Error('Captcha detected'));
      }
    };

    chrome.runtime.onMessage.addListener(listener);
  });
}

// ============ 并发控制 ============

async function processQueue(): Promise<void> {
  while (ghostQueue.length > 0 && activeGhosts < MAX_CONCURRENT_GHOSTS) {
    const task = ghostQueue.shift()!;
    activeGhosts++;

    ghostRefresh(task.sourceUrl)
      .then((result) => {
        task.resolve(result);
        // 通知 side panel 价格更新
        notifySidePanel('PRICE_UPDATE', { itemId: task.itemId, ...result });
      })
      .catch((err) => {
        task.reject(err);
        // 标记为 unavailable
        notifySidePanel('PRICE_UPDATE', { itemId: task.itemId, price: 0, status: 'unavailable' as PriceStatus });
      })
      .finally(() => {
        activeGhosts--;
        processQueue(); // 继续处理队列
      });
  }
}

function enqueueGhostRefresh(itemId: string, sourceUrl: string): Promise<{ price: number; status: PriceStatus }> {
  return new Promise((resolve, reject) => {
    ghostQueue.push({ itemId, sourceUrl, resolve, reject });
    processQueue();
  });
}

// ============ Side Panel 通知 ============

function notifySidePanel(action: string, payload: Record<string, unknown>): void {
  chrome.runtime.sendMessage({ action, payload }).catch(() => {
    // side panel 可能未打开，忽略
  });
}

// ============ 消息路由 ============

// 监听扩展图标点击，打开 side panel
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

onMessage((message: ExtensionMessage & { action: string; payload?: any }, _sender, sendResponse) => {
  switch (message.action) {
    case 'ADD_ITEM':
      handleAddItem((message as any).payload);
      sendResponse({ success: true });
      break;

    case 'REMOVE_ITEM':
      handleRemoveItem((message as any).payload?.id);
      sendResponse({ success: true });
      break;

    case 'CHECK_PRICE':
      // 触发 ghost refresh
      const { itemId, sourceUrl } = (message as any).payload;
      enqueueGhostRefresh(itemId, sourceUrl);
      sendResponse({ queued: true });
      break;

    case 'PRICE_RESULT':
      // 来自 ghost tab 内的 content script，由 ghostRefresh listener 处理
      break;

    case 'CAPTCHA_DETECTED':
      // 来自 ghost tab，由 ghostRefresh listener 处理
      break;

    case 'REANCHOR':
      // 切日期，全部重新刷新
      handleReanchor();
      sendResponse({ success: true });
      break;
  }
});

/**
 * 串行化锁：防止并发 ADD_ITEM 竞态
 */
let storageOpLock = Promise.resolve();

/**
 * 处理添加行程项（串行化）
 */
async function handleAddItem(payload: Omit<CartItem, 'id' | 'addedAt' | 'priceUpdatedAt'>) {
  storageOpLock = storageOpLock.then(async () => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item: CartItem = {
      ...payload,
      id,
      addedAt: Date.now(),
      priceUpdatedAt: Date.now(),
    };

    // 读取当前 items
    const result = await chrome.storage.local.get(STORAGE_KEY_CART);
    const stored = result[STORAGE_KEY_CART];
    const state = stored ? JSON.parse(stored as string) : { state: { items: [] } };
    state.state.items.push(item);
    await chrome.storage.local.set({ [STORAGE_KEY_CART]: JSON.stringify(state) });

    console.log('[travel-cart][background] ADD_ITEM done, total items:', state.state.items.length);

    // 通知 side panel
    notifySidePanel('ITEM_ADDED', { item });
  });
  await storageOpLock;
}

/**
 * 处理移除行程项（串行化）+ 广播到 content scripts
 */
async function handleRemoveItem(id: string) {
  if (!id) return;
  storageOpLock = storageOpLock.then(async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY_CART);
    const stored = result[STORAGE_KEY_CART];
    if (!stored) return;
    const state = JSON.parse(stored as string);
    state.state.items = (state.state.items ?? []).filter((i: CartItem) => i.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY_CART]: JSON.stringify(state) });
    console.log('[travel-cart][background] REMOVE_ITEM done, remaining:', state.state.items.length);
  });
  await storageOpLock;

  // 广播 ITEM_REMOVED 到所有 tabs 的 content scripts
  notifySidePanel('ITEM_REMOVED', { id });
  broadcastToContentScripts('ITEM_REMOVED', { id });
}

/**
 * 广播消息到所有 content scripts
 */
function broadcastToContentScripts(action: string, payload: Record<string, unknown>): void {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action, payload }).catch(() => {});
      }
    }
  });
}

/**
 * Reanchor: 标记所有为 stale，逐一触发 ghost refresh
 */
async function handleReanchor() {
  const result = await chrome.storage.local.get(STORAGE_KEY_CART);
  const stored = result[STORAGE_KEY_CART];
  if (!stored) return;

  const state = JSON.parse(stored as string);
  const items: CartItem[] = state.state?.items ?? [];

  // Mark all stale
  items.forEach((item) => { item.priceStatus = 'stale'; });
  state.state.items = items;
  await chrome.storage.local.set({ [STORAGE_KEY_CART]: JSON.stringify(state) });

  notifySidePanel('ALL_STALE', {});

  // 逐一触发 ghost refresh
  for (const item of items) {
    enqueueGhostRefresh(item.id, item.sourceUrl);
  }
}

// ============ 定时刷新 ============

let _ghostInterval: ReturnType<typeof setInterval> | null = null;

function startGhostScheduler() {
  if (_ghostInterval) return;
  _ghostInterval = setInterval(async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY_CART);
    const stored = result[STORAGE_KEY_CART];
    if (!stored) return;

    const state = JSON.parse(stored as string);
    const items: CartItem[] = state.state?.items ?? [];

    const staleItems = items.filter(
      (i) => i.priceStatus === 'stale' || Date.now() - i.priceUpdatedAt > 30 * 60 * 1000
    );

    for (const item of staleItems) {
      enqueueGhostRefresh(item.id, item.sourceUrl);
    }
  }, GHOST_TAB_INTERVAL);
}

startGhostScheduler();
console.log('[background] Service worker initialized with Ghost Tab support');
