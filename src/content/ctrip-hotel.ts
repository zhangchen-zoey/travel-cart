/**
 * 携程酒店页 Content Script
 * 匹配: https://hotels.ctrip.com/*
 *
 * 提取：酒店名、hotelId、房型、价格、入住/退房日期
 * 策略：XHR 拦截酒店搜索接口 → CSS 选择器 → 正则兜底
 */
import {
  parsePrice,
  extract,
  installXhrInterceptor,
  observeNewElements,
  type ExtractionRule,
} from './extractor';
import { injectButton } from './inject-button';
import type { CartItem, CartItemType } from '../shared/types';

const ITEM_TYPE: CartItemType = 'hotel';
const CURRENCY = 'CNY';

// ─── 携程酒店页 DOM 选择器 ───────────────────────────────────────────────────

/** 房型行容器 — 只匹配酒店详情页的房型列表行 */
const HOTEL_CARD_SELECTOR = 'tr[class*="room"], [class*="RoomItem"], [class*="room-item"], .room-list tr, #J_RoomListTable tr';

/** 各字段提取规则 */
const RULES = {
  hotelName: {
    name: 'hotelName',
    selector: '.hotel-name, [class*="hotelName"], .name a',
    xhrPattern: /\/hotel\/search/i,
    jsonPath: 'data.hotelList.0.hotelBasicInfo.hotelName',
    regex: /<a[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)</i,
  } as ExtractionRule,

  hotelId: {
    name: 'hotelId',
    // 通常在卡片 data-id 或链接中
    selector: '[data-hotel-id], [data-id]',
    xhrPattern: /\/hotel\/search/i,
    jsonPath: 'data.hotelList.0.hotelBasicInfo.hotelId',
    regex: /hotel\/(\d+)\.html/,
    transform: (v: string) => {
      // 可能从 element attribute 获取
      const match = v.match(/\d+/);
      return match ? match[0] : v;
    },
  } as ExtractionRule,

  roomType: {
    name: 'roomType',
    selector: '.room-name, [class*="roomName"], .room-type-name',
    regex: /([\u4e00-\u9fa5]+[房间室][\u4e00-\u9fa5]*)/,
  } as ExtractionRule,

  price: {
    name: 'price',
    selector: '.price, [class*="Price"] em, .hotel-price .base-price',
    xhrPattern: /\/hotel\/search/i,
    jsonPath: 'data.hotelList.0.money.price',
    regex: /[¥￥]\s*(\d[\d,]+)/,
    transform: (v: string) => v.replace(/,/g, ''),
  } as ExtractionRule,

  address: {
    name: 'address',
    selector: '.hotel-address, [class*="address"], .location-info',
    regex: /地址[：:]\s*([^\n<]+)/,
  } as ExtractionRule,

  checkIn: {
    name: 'checkIn',
    // 入住日期通常在搜索框中
    selector: '.check-in-date, [class*="checkIn"], .date-start',
    regex: /入住[：:]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}月\d{1,2}日)/,
  } as ExtractionRule,

  checkOut: {
    name: 'checkOut',
    selector: '.check-out-date, [class*="checkOut"], .date-end',
    regex: /退房[：:]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}月\d{1,2}日)/,
  } as ExtractionRule,
};

// ─── 工具 ─────────────────────────────────────────────────────────────────────

/**
 * 规范化日期为 YYYY-MM-DD
 * 支持 "6月15日" → "2025-06-15"
 */
function normalizeDate(raw: string): string {
  // 已是 YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // 中文格式：X月Y日
  const match = raw.match(/(\d{1,2})月(\d{1,2})日/);
  if (match) {
    const year = new Date().getFullYear();
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return raw;
}

/**
 * 从 URL 或搜索栏解析日期
 */
function parseDatesFromContext(): { checkIn: string; checkOut: string } {
  const url = window.location.href;

  // URL 参数中取日期
  const urlParams = new URLSearchParams(window.location.search);
  const checkIn = urlParams.get('checkIn') || urlParams.get('startDate') || '';
  const checkOut = urlParams.get('checkOut') || urlParams.get('endDate') || '';
  if (checkIn && checkOut) {
    return { checkIn: normalizeDate(checkIn), checkOut: normalizeDate(checkOut) };
  }

  // 从 URL path 中匹配
  const dateMatch = url.match(/(\d{4}-\d{2}-\d{2})/g);
  if (dateMatch && dateMatch.length >= 2) {
    return { checkIn: dateMatch[0], checkOut: dateMatch[1] };
  }

  // 兜底：今天 + 明天
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    checkIn: today.toISOString().slice(0, 10),
    checkOut: tomorrow.toISOString().slice(0, 10),
  };
}

// ─── 提取逻辑 ─────────────────────────────────────────────────────────────────

/**
 * 从酒店卡片中提取完整酒店数据
 */
export function extractHotelData(
  hotelCard: Element
): Omit<CartItem, 'id' | 'addedAt' | 'priceUpdatedAt'> {
  const hotelName = extract(RULES.hotelName, hotelCard)?.value ?? '未知酒店';
  const hotelId = extract(RULES.hotelId, hotelCard)?.value ?? '';
  const roomType = extract(RULES.roomType, hotelCard)?.value ?? '';
  const priceStr = extract(RULES.price, hotelCard)?.value ?? '0';
  const address = extract(RULES.address, hotelCard)?.value ?? '';

  // 日期优先从 DOM 提取，兜底从 URL/搜索栏
  const checkInRaw = extract(RULES.checkIn, document)?.value;
  const checkOutRaw = extract(RULES.checkOut, document)?.value;
  const contextDates = parseDatesFromContext();

  const checkIn = checkInRaw ? normalizeDate(checkInRaw) : contextDates.checkIn;
  const checkOut = checkOutRaw ? normalizeDate(checkOutRaw) : contextDates.checkOut;

  const subtitle = [roomType, address].filter(Boolean).join(' · ');

  return {
    type: ITEM_TYPE,
    title: hotelName,
    subtitle: subtitle || undefined,
    startDate: checkIn,
    endDate: checkOut,
    price: parsePrice(priceStr),
    currency: CURRENCY,
    priceStatus: 'fresh',
    sourceUrl: window.location.href,
    rawData: {
      hotelId,
      hotelName,
      roomType,
      address,
      checkIn,
      checkOut,
    },
  };
}

// ─── 按钮注入 ─────────────────────────────────────────────────────────────────

/**
 * 为房型行注入 [+ 行程单] 按钮（每行最多一个，紧邻预订按钮）
 */
function injectHotelButtons(cards: Element[]): void {
  cards.forEach((card) => {
    if (card.querySelector('.travel-cart-inject')) return;

    // 精确定位预订按钮区域
    const bookBtn = card.querySelector('.room-book, [class*="book"], button[class*="book"], a[class*="book"]');
    const anchor = bookBtn?.parentElement ?? card.querySelector('[class*="price"], [class*="Price"]') ?? null;
    if (!anchor) return; // 找不到预订按钮区域则跳过

    injectButton(anchor, () => extractHotelData(card));
  });
}

// ─── 初始化 ───────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  console.log('[travel-cart] 🏨 Hotel content script loaded, URL:', location.href);

  // 安装 XHR 拦截器
  installXhrInterceptor([
    /\/hotel\/search/i,
    /\/hotel\/hotellist/i,
    /\/htls\/domestic\/search/i,
  ]);

  // 监听酒店卡片出现
  observeNewElements(HOTEL_CARD_SELECTOR, injectHotelButtons);


}

init();
