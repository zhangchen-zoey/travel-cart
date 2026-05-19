/** 行程项目类型 */
export type CartItemType = 'flight' | 'hotel' | 'train' | 'activity';

/** 价格状态 */
export type PriceStatus = 'fresh' | 'stale' | 'unavailable';

/** 单个行程项 */
export interface CartItem {
  id: string;
  type: CartItemType;
  title: string;
  subtitle?: string;
  /** ISO date string: YYYY-MM-DD */
  startDate: string;
  /** ISO date string: YYYY-MM-DD */
  endDate?: string;
  /** HH:mm */
  startTime?: string;
  /** HH:mm */
  endTime?: string;
  price: number;
  currency: string;
  priceStatus: PriceStatus;
  /** 来源页面 URL */
  sourceUrl: string;
  /** 提取时的原始数据快照 */
  rawData?: Record<string, unknown>;
  /** 添加时间戳 */
  addedAt: number;
  /** 最后价格更新时间戳 */
  priceUpdatedAt: number;
}

/** 时间线中的一天 */
export interface ResolvedDay {
  date: string;
  label: string;
  items: CartItem[];
  /** 当天总价 */
  dayTotal: number;
}

/** 完整时间线 */
export interface Timeline {
  days: ResolvedDay[];
  totalPrice: number;
  currency: string;
  /** 行程跨度天数 */
  spanDays: number;
  startDate: string;
  endDate: string;
}

/** 两个项目之间的间隙 */
export interface TimeGap {
  fromItemId: string;
  toItemId: string;
  /** 间隙时长（分钟） */
  durationMinutes: number;
  /** 间隙类型 */
  type: 'overlap' | 'gap' | 'tight';
}

/** Side Panel 显示模式 */
export type ViewMode = 'timeline' | 'list' | 'summary';

/** Content Script → Background 消息 */
export interface AddItemMessage {
  action: 'ADD_ITEM';
  payload: Omit<CartItem, 'id' | 'addedAt' | 'priceUpdatedAt'>;
}

/** Background → Content Script 消息 */
export interface PriceCheckMessage {
  action: 'CHECK_PRICE';
  payload: { itemId: string; sourceUrl: string };
}

export interface PriceResultMessage {
  action: 'PRICE_RESULT';
  payload?: any;
}

export interface CaptchaDetectedMessage {
  action: 'CAPTCHA_DETECTED';
  payload?: any;
}

export interface ReanchorMessage {
  action: 'REANCHOR';
  payload?: any;
}

export interface RemoveItemMessage {
  action: 'REMOVE_ITEM';
  payload: { itemId: string };
}

export type ExtensionMessage = AddItemMessage | PriceCheckMessage | PriceResultMessage | CaptchaDetectedMessage | ReanchorMessage | RemoveItemMessage;
