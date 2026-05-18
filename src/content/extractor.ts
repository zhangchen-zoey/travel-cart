/**
 * DOM 数据提取通用引擎
 * 多层降级策略：XHR 拦截 → CSS 选择器 → 正则兜底
 * MutationObserver 监听动态加载
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExtractedData {
  title: string;
  subtitle?: string;
  price: number;
  currency: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  raw?: Record<string, unknown>;
}

/** 单条提取规则 */
export interface ExtractionRule<T = string> {
  /** 规则名称（用于日志） */
  name: string;
  /** CSS 选择器 */
  selector?: string;
  /** XHR 拦截的 URL 模式（正则） */
  xhrPattern?: RegExp;
  /** XHR 响应中取值的 JSON path（点分隔） */
  jsonPath?: string;
  /** 正则兜底（从 textContent 或 innerHTML 中匹配） */
  regex?: RegExp;
  /** 匹配到的捕获组索引，默认 1 */
  captureGroup?: number;
  /** 自定义转换函数 */
  transform?: (raw: string) => T;
}

/** 提取结果（含来源标记） */
export interface ExtractionResult<T = string> {
  value: T;
  source: 'xhr' | 'selector' | 'regex' | 'jsonld';
}

// ─── XHR 拦截器 ─────────────────────────────────────────────────────────────

/** 缓存拦截到的 XHR 响应 */
const xhrResponseCache: Map<string, unknown> = new Map();

/** 是否已安装拦截器 */
let xhrInterceptorInstalled = false;

/**
 * 安装 XHR 拦截器，缓存匹配的响应数据
 * 通过 monkey-patch XMLHttpRequest.prototype.open/send 实现
 */
export function installXhrInterceptor(patterns: RegExp[]): void {
  if (xhrInterceptorInstalled) return;
  xhrInterceptorInstalled = true;

  const OriginalXHR = window.XMLHttpRequest;
  const originalOpen = OriginalXHR.prototype.open;
  const originalSend = OriginalXHR.prototype.send;

  OriginalXHR.prototype.open = function (method: string, url: string | URL, ...args: any[]) {
    (this as any).__tcUrl = String(url);
    return originalOpen.apply(this, [method, url, ...args] as any);
  };

  OriginalXHR.prototype.send = function (...args: any[]) {
    const url: string = (this as any).__tcUrl || '';
    const matched = patterns.some((p) => p.test(url));

    if (matched) {
      this.addEventListener('load', function () {
        try {
          const data = JSON.parse(this.responseText);
          xhrResponseCache.set(url, data);
        } catch { /* non-JSON response, skip */ }
      });
    }

    return originalSend.apply(this, args as any);
  };
}

/**
 * 从 XHR 缓存中按 pattern + jsonPath 取值
 */
function extractFromXhr(pattern: RegExp, jsonPath?: string): string | null {
  for (const [url, data] of xhrResponseCache.entries()) {
    if (!pattern.test(url)) continue;
    if (!jsonPath) return JSON.stringify(data);

    // 简单 dot-path 取值
    const parts = jsonPath.split('.');
    let current: any = data;
    for (const part of parts) {
      if (current == null) return null;
      current = current[part];
    }
    return current != null ? String(current) : null;
  }
  return null;
}

// ─── 核心提取函数 ─────────────────────────────────────────────────────────────

/**
 * 按规则多层降级提取数据
 * 优先级：XHR 拦截 → CSS 选择器 → 正则兜底
 */
export function extract<T = string>(
  rule: ExtractionRule<T>,
  root: Element | Document = document
): ExtractionResult<T> | null {
  const transform = rule.transform ?? ((v: string) => v as unknown as T);
  const group = rule.captureGroup ?? 1;

  // 1️⃣ XHR 拦截
  if (rule.xhrPattern) {
    const val = extractFromXhr(rule.xhrPattern, rule.jsonPath);
    if (val != null) {
      return { value: transform(val), source: 'xhr' };
    }
  }

  // 2️⃣ CSS 选择器
  if (rule.selector) {
    const el = root.querySelector(rule.selector);
    const text = el?.textContent?.trim();
    if (text) {
      return { value: transform(text), source: 'selector' };
    }
  }

  // 3️⃣ 正则兜底（在 root 的 innerHTML 中匹配）
  if (rule.regex) {
    const html = root instanceof Document
      ? document.body.innerHTML
      : root.innerHTML;
    const match = rule.regex.exec(html);
    if (match && match[group]) {
      return { value: transform(match[group]), source: 'regex' };
    }
  }

  return null;
}

/**
 * 批量提取：按字段名 → 规则映射提取
 */
export function extractAll(
  rules: Record<string, ExtractionRule>,
  root: Element | Document = document
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const [key, rule] of Object.entries(rules)) {
    const r = extract(rule, root);
    result[key] = r ? String(r.value) : null;
  }
  return result;
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 安全地从 DOM 元素中提取文本
 */
export function safeText(selector: string, root: Element | Document = document): string | null {
  const el = root.querySelector(selector);
  return el?.textContent?.trim() ?? null;
}

/**
 * 解析价格字符串为数字
 */
export function parsePrice(text: string): number {
  const cleaned = text.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * 等待元素出现（基于 MutationObserver）
 */
export function waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * 等待多个元素出现并返回 NodeList
 */
export function waitForElements(selector: string, minCount = 1, timeout = 8000): Promise<NodeListOf<Element>> {
  return new Promise((resolve) => {
    const check = () => {
      const els = document.querySelectorAll(selector);
      if (els.length >= minCount) return els;
      return null;
    };

    const found = check();
    if (found) return resolve(found);

    const observer = new MutationObserver(() => {
      const els = check();
      if (els) {
        observer.disconnect();
        resolve(els);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(document.querySelectorAll(selector));
    }, timeout);
  });
}

/**
 * 提取页面中的 JSON-LD 结构化数据
 */
export function extractJsonLd(): Record<string, unknown>[] {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  const results: Record<string, unknown>[] = [];
  scripts.forEach((script) => {
    try {
      results.push(JSON.parse(script.textContent || ''));
    } catch { /* ignore */ }
  });
  return results;
}

/**
 * 创建 MutationObserver 监听动态加载，发现新元素时执行回调
 * 返回 disconnect 函数
 */
export function observeNewElements(
  selector: string,
  callback: (elements: Element[]) => void,
  root: Node = document.body
): () => void {
  // 处理已有元素
  const existing = document.querySelectorAll(selector);
  if (existing.length > 0) {
    callback(Array.from(existing));
  }

  // 处理已标记的元素（防重复）
  const processed = new WeakSet<Element>();
  existing.forEach((el) => processed.add(el));

  const observer = new MutationObserver(() => {
    const all = document.querySelectorAll(selector);
    const newOnes: Element[] = [];
    all.forEach((el) => {
      if (!processed.has(el)) {
        processed.add(el);
        newOnes.push(el);
      }
    });
    if (newOnes.length > 0) {
      callback(newOnes);
    }
  });

  observer.observe(root, { childList: true, subtree: true });

  return () => observer.disconnect();
}
