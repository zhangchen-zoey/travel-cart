import type { CartItem } from './types';

/**
 * 格式化日期为携程 URL 参数格式 YYYY-MM-DD
 */
function formatDate(isoDate: string): string {
  return isoDate; // already YYYY-MM-DD
}

/**
 * 计算基于锚点日期的实际日期
 * anchorDate 为行程出发日（用户选择的实际出发日期）
 */
function resolveDate(itemDate: string, _anchorDate?: string): string {
  return _anchorDate ?? itemDate;
}

/**
 * 构建携程机票 Deep Link
 * 支持 ctrip:// App Schema + H5 fallback
 */
export function buildFlightDeepLink(
  item: CartItem,
  anchorDate?: string,
): { appUrl: string; h5Url: string } {
  const departDate = formatDate(resolveDate(item.startDate, anchorDate));
  const raw = item.rawData ?? {};

  const depCity = (raw.departCityCode as string) ?? '';
  const arrCity = (raw.arriveCityCode as string) ?? '';
  const flightNo = (raw.flightNo as string) ?? '';
  const cabin = (raw.cabin as string) ?? 'Y';

  // App Schema
  const appParams = new URLSearchParams({
    departdate: departDate,
    dcitycode: depCity,
    acitycode: arrCity,
    flightno: flightNo,
    cabin,
  });
  const appUrl = `ctrip://flight/search?${appParams.toString()}`;

  // H5 fallback
  const h5Params = new URLSearchParams({
    ddate: departDate,
    dcity: depCity,
    acity: arrCity,
    flightno: flightNo,
    cabin,
  });
  const h5Url = `https://m.ctrip.com/html5/flight/swift/domestic?${h5Params.toString()}`;

  return { appUrl, h5Url };
}

/**
 * 构建携程酒店 Deep Link
 * 支持 ctrip:// App Schema + H5 fallback
 */
export function buildHotelDeepLink(
  item: CartItem,
  anchorDate?: string,
): { appUrl: string; h5Url: string } {
  const checkIn = formatDate(resolveDate(item.startDate, anchorDate));
  const checkOut = item.endDate
    ? formatDate(resolveDate(item.endDate, anchorDate))
    : checkIn;
  const raw = item.rawData ?? {};

  const hotelId = (raw.hotelId as string) ?? '';
  const roomTypeId = (raw.roomTypeId as string) ?? '';
  const cityId = (raw.cityId as string) ?? '';

  // App Schema
  const appParams = new URLSearchParams({
    hotelid: hotelId,
    inday: checkIn,
    outday: checkOut,
    roomtypeid: roomTypeId,
    cityid: cityId,
  });
  const appUrl = `ctrip://hotel/detail?${appParams.toString()}`;

  // H5 fallback
  const h5Params = new URLSearchParams({
    hotelId,
    checkIn,
    checkOut,
    roomId: roomTypeId,
    cityId,
  });
  const h5Url = `https://m.ctrip.com/webapp/hotel/hoteldetail/${hotelId}.html?${h5Params.toString()}`;

  return { appUrl, h5Url };
}

/**
 * 根据 item 类型自动选择 Deep Link 构建器
 */
export function buildDeepLink(
  item: CartItem,
  anchorDate?: string,
): { appUrl: string; h5Url: string } {
  switch (item.type) {
    case 'flight':
      return buildFlightDeepLink(item, anchorDate);
    case 'hotel':
      return buildHotelDeepLink(item, anchorDate);
    default:
      // 通用 fallback — 直接打开源页面
      return { appUrl: item.sourceUrl, h5Url: item.sourceUrl };
  }
}
