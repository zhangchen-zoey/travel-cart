/** Storage keys */
export const STORAGE_KEY_CART = 'travel_cart_items';
export const STORAGE_KEY_SETTINGS = 'travel_cart_settings';

/** Price staleness threshold (ms) - 30 minutes */
export const PRICE_STALE_THRESHOLD = 30 * 60 * 1000;

/** Ghost tab scheduling interval (ms) - 5 minutes */
export const GHOST_TAB_INTERVAL = 5 * 60 * 1000;

/** Supported Ctrip URL patterns */
export const CTRIP_FLIGHT_PATTERNS = [
  'https://flights.ctrip.com/*',
  'https://www.ctrip.com/flights/*',
];

export const CTRIP_HOTEL_PATTERNS = [
  'https://hotels.ctrip.com/*',
  'https://www.ctrip.com/hotels/*',
];

/** Default currency */
export const DEFAULT_CURRENCY = 'CNY';
