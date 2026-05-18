/**
 * 携程机票页 Content Script
 * 匹配: https://flights.ctrip.com/*
 *
 * 提取：航班号、出发/到达城市、时间、价格、舱位
 * 策略：XHR 拦截航班搜索接口 → CSS 选择器 → 正则兜底
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

const ITEM_TYPE: CartItemType = 'flight';
const CURRENCY = 'CNY';

// ─── 携程机票页 DOM 选择器（基于携程实际页面结构的合理推测） ─────────────────

/** 航班卡片容器 */
const FLIGHT_CARD_SELECTOR = '.flight-item, [class*="FlightItem"], .list-item';

/** 各字段提取规则 */
const RULES = {
  flightNo: {
    name: 'flightNo',
    selector: '.flight-No, [class*="flightNo"], .plane-No',
    xhrPattern: /\/flights\/search/i,
    jsonPath: 'data.flightItineraryList.0.flightNo',
    regex: /([A-Z]{2}\d{3,5})/,
  } as ExtractionRule,

  airline: {
    name: 'airline',
    selector: '.airline-name, [class*="airlineName"], .flight-airline',
    regex: /([\u4e00-\u9fa5]{2,6}航空)/,
  } as ExtractionRule,

  departCity: {
    name: 'departCity',
    selector: '.depart-box .city, [class*="departCity"], .from-city',
    regex: /出发城市[：:]\s*([\u4e00-\u9fa5]+)/,
  } as ExtractionRule,

  arriveCity: {
    name: 'arriveCity',
    selector: '.arrive-box .city, [class*="arriveCity"], .to-city',
    regex: /到达城市[：:]\s*([\u4e00-\u9fa5]+)/,
  } as ExtractionRule,

  departTime: {
    name: 'departTime',
    selector: '.depart-box .time, [class*="departTime"], .from-time',
    regex: /(\d{2}:\d{2})\s*(?:出发|起飞)/,
  } as ExtractionRule,

  arriveTime: {
    name: 'arriveTime',
    selector: '.arrive-box .time, [class*="arriveTime"], .to-time',
    regex: /(?:到达|降落)\s*(\d{2}:\d{2})/,
  } as ExtractionRule,

  price: {
    name: 'price',
    selector: '.price, [class*="Price"] em, .flight-price .base-price',
    xhrPattern: /\/flights\/search/i,
    jsonPath: 'data.flightItineraryList.0.priceList.0.price',
    regex: /[¥￥]\s*(\d[\d,]+)/,
    transform: (v: string) => v.replace(/,/g, ''),
  } as ExtractionRule,

  cabin: {
    name: 'cabin',
    selector: '.cabin-class, [class*="cabin"], .seat-class',
    regex: /(经济舱|商务舱|头等舱|超级经济舱)/,
  } as ExtractionRule,

  date: {
    name: 'date',
    // 通常在搜索栏/面包屑中显示出发日期
    selector: '.search-date, [class*="searchDate"], .date-picker .selected',
    regex: /(\d{4}-\d{2}-\d{2})/,
  } as ExtractionRule,
};

// ─── 提取逻辑 ─────────────────────────────────────────────────────────────────

/**
 * 从机票卡片中提取完整航班数据
 */
export function extractFlightData(
  flightCard: Element
): Omit<CartItem, 'id' | 'addedAt' | 'priceUpdatedAt'> {
  const flightNo = extract(RULES.flightNo, flightCard)?.value ?? '';
  const airline = extract(RULES.airline, flightCard)?.value ?? '';
  const departCity = extract(RULES.departCity, flightCard)?.value ?? '';
  const arriveCity = extract(RULES.arriveCity, flightCard)?.value ?? '';
  const departTime = extract(RULES.departTime, flightCard)?.value ?? '';
  const arriveTime = extract(RULES.arriveTime, flightCard)?.value ?? '';
  const priceStr = extract(RULES.price, flightCard)?.value ?? '0';
  const cabin = extract(RULES.cabin, flightCard)?.value ?? '经济舱';
  const dateStr = extract(RULES.date, document)?.value ?? new Date().toISOString().slice(0, 10);

  const title = `${airline} ${flightNo}`.trim() || '未知航班';
  const subtitle = `${departCity} → ${arriveCity} | ${cabin}`;

  return {
    type: ITEM_TYPE,
    title,
    subtitle,
    startDate: dateStr,
    startTime: departTime,
    endTime: arriveTime,
    price: parsePrice(priceStr),
    currency: CURRENCY,
    priceStatus: 'fresh',
    sourceUrl: window.location.href,
    rawData: {
      flightNo,
      airline,
      departCity,
      arriveCity,
      departTime,
      arriveTime,
      cabin,
    },
  };
}

// ─── 按钮注入 ─────────────────────────────────────────────────────────────────

/**
 * 为航班卡片注入 [+ 行程单] 按钮
 */
function injectFlightButtons(cards: Element[]): void {
  cards.forEach((card) => {
    // 避免重复注入
    if (card.querySelector('.travel-cart-inject')) return;

    // 找到按钮注入锚点（价格区域旁边）
    const anchor =
      card.querySelector('.price-box, [class*="PriceBox"], .flight-operate') ?? card;

    injectButton(anchor, () => extractFlightData(card));
  });
}

// ─── 初始化 ───────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  console.log('[travel-cart] ✈️ Flight content script loaded');

  // 安装 XHR 拦截器（捕获航班搜索接口数据）
  installXhrInterceptor([
    /\/flights\/search/i,
    /\/flight\/lowprice/i,
    /\/itinerary\/search/i,
  ]);

  // 监听航班卡片出现（包括懒加载/翻页）
  observeNewElements(FLIGHT_CARD_SELECTOR, injectFlightButtons);
}

init();
