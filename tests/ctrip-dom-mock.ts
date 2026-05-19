/**
 * 携程机票列表页 DOM Mock
 * 基于携程真实页面结构构造 5 个航班卡片
 */

export const CTRIP_FLIGHT_URL = 'https://flights.ctrip.com/online/list/oneway-bjs-sha';

export interface MockFlight {
  flightNo: string;
  airline: string;
  planeType: string; // 应该被清洗掉
  departTime: string;
  arriveTime: string;
  price: number;
}

export const MOCK_FLIGHTS: MockFlight[] = [
  { flightNo: 'HO1254', airline: '吉祥航空', planeType: '空客320(中)', departTime: '07:30', arriveTime: '09:45', price: 680 },
  { flightNo: 'CZ3901', airline: '南方航空', planeType: '波音737(中)', departTime: '08:15', arriveTime: '10:30', price: 920 },
  { flightNo: 'MU5101', airline: '东方航空', planeType: '空客321(大)', departTime: '10:00', arriveTime: '12:15', price: 1050 },
  { flightNo: 'CA1234', airline: '国际航空', planeType: '波音787(大)', departTime: '13:45', arriveTime: '16:00', price: 1380 },
  { flightNo: 'FM9001', airline: '上海航空', planeType: '波音737-800(中)', departTime: '18:20', arriveTime: '20:35', price: 760 },
];

function buildFlightCard(f: MockFlight): string {
  return `
    <div class="flight-item" data-flight-no="${f.flightNo}">
      <div class="flight-info-wrapper">
        <div class="airline-name">${f.airline} ${f.flightNo} ${f.planeType}</div>
        <div class="flight-No">${f.flightNo} ${f.planeType}</div>
        <div class="flight-time-section">
          <div class="depart-box">
            <span class="time">${f.departTime}</span>
            <span class="city"></span>
          </div>
          <div class="arrive-box">
            <span class="time">${f.arriveTime}</span>
            <span class="city"></span>
          </div>
        </div>
      </div>
      <div class="price-box">
        <span class="price">¥${f.price}</span>
        <span class="cabin-class">经济舱</span>
      </div>
    </div>
  `;
}

export function buildCtripFlightPageHTML(): string {
  return `
    <html>
      <head><title>北京到上海机票</title></head>
      <body>
        <div class="search-date">2026-05-20</div>
        <div class="flight-list-container">
          ${MOCK_FLIGHTS.map(buildFlightCard).join('\n')}
        </div>
      </body>
    </html>
  `;
}
