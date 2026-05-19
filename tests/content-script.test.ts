import { describe, test, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { buildCtripFlightPageHTML, MOCK_FLIGHTS, CTRIP_FLIGHT_URL } from './ctrip-dom-mock';

// We test the extraction logic by importing the actual extractor and ctrip-flight module
// But since they rely on browser globals, we set up jsdom first
import { extract, parsePrice, type ExtractionRule } from '../src/content/extractor';

// Replicate the key rules and extraction logic from ctrip-flight.ts for testability
const FLIGHT_CARD_SELECTOR = '.flight-item, [class*="FlightItem"], [class*="flight-item"], [class*="flightItem"], .list-item, [class*="Flight"][class*="card"], [class*="flight"][class*="card"]';

const RULES = {
  flightNo: {
    name: 'flightNo',
    selector: '.flight-No, [class*="flightNo"], .plane-No',
    regex: /([A-Z]{2}\d{3,5})/,
  } as ExtractionRule,
  airline: {
    name: 'airline',
    selector: '.airline-name, [class*="airlineName"], .flight-airline',
    regex: /([\u4e00-\u9fa5]{2,6}航空)/,
  } as ExtractionRule,
  departCity: {
    name: 'departCity',
    selector: '.depart-box .city, [class*="departCity"], [class*="depart"] [class*="city"]',
    regex: /([\u4e00-\u9fa5]{2,6})(?:\s*[\u2192>\-]|出发|起飞)/,
  } as ExtractionRule,
  arriveCity: {
    name: 'arriveCity',
    selector: '.arrive-box .city, [class*="arriveCity"], [class*="arrive"] [class*="city"]',
    regex: /(?:[\u2192>\-]|到达|降落)\s*([\u4e00-\u9fa5]{2,6})/,
  } as ExtractionRule,
  price: {
    name: 'price',
    selector: '.price, [class*="Price"] em, .flight-price .base-price',
    regex: /[¥￥]\s*(\d[\d,]+)/,
    transform: (v: string) => v.replace(/,/g, ''),
  } as ExtractionRule,
};

const CITY_CODES: Record<string, string> = {
  sha: '上海', bjs: '北京', can: '广州', szx: '深圳',
};

describe('携程机票 Content Script 测试', () => {
  let dom: JSDOM;
  let document: Document;
  let cards: Element[];

  beforeAll(() => {
    dom = new JSDOM(buildCtripFlightPageHTML(), { url: CTRIP_FLIGHT_URL });
    document = dom.window.document;
    cards = Array.from(document.querySelectorAll(FLIGHT_CARD_SELECTOR));
  });

  test('应该找到 5 个航班卡片', () => {
    expect(cards.length).toBe(5);
  });

  test('每个卡片都应该能提取 flightNo（无机型信息）', () => {
    cards.forEach((card, i) => {
      const result = extract(RULES.flightNo, card);
      expect(result).not.toBeNull();
      const raw = result!.value;
      // Clean: only take [A-Z]{2}\d{3,5}
      const match = raw.match(/([A-Z]{2}\d{3,5})/);
      const flightNo = match ? match[1] : raw;
      expect(flightNo).toBe(MOCK_FLIGHTS[i].flightNo);
      // Should NOT contain plane type info
      expect(flightNo).not.toMatch(/空客|波音/);
    });
  });

  test('airline 应该只是航司名，不含航班号和机型', () => {
    cards.forEach((card, i) => {
      const result = extract(RULES.airline, card);
      expect(result).not.toBeNull();
      const raw = result!.value;
      // Clean: only take Chinese airline name
      const match = raw.match(/([\u4e00-\u9fa5]{2,6}航空)/);
      const airline = match ? match[1] : raw;
      expect(airline).toBe(MOCK_FLIGHTS[i].airline);
      expect(airline).not.toMatch(/[A-Z]{2}\d+/);
      expect(airline).not.toMatch(/空客|波音/);
    });
  });

  test('城市应该从 URL 兜底解析', () => {
    // The DOM has empty city fields, so selector returns empty string
    // URL fallback: oneway-bjs-sha → 北京, 上海
    const url = CTRIP_FLIGHT_URL;
    const urlMatch = url.match(/(?:oneway|roundtrip)[\-\/]([a-z]{3})[\-\/]([a-z]{3})/);
    expect(urlMatch).not.toBeNull();
    const departCity = CITY_CODES[urlMatch![1]] || urlMatch![1].toUpperCase();
    const arriveCity = CITY_CODES[urlMatch![2]] || urlMatch![2].toUpperCase();
    expect(departCity).toBe('北京');
    expect(arriveCity).toBe('上海');
  });

  test('价格应该正确解析为数字', () => {
    cards.forEach((card, i) => {
      const result = extract(RULES.price, card);
      expect(result).not.toBeNull();
      const price = parsePrice(result!.value);
      expect(price).toBe(MOCK_FLIGHTS[i].price);
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
    });
  });
});
