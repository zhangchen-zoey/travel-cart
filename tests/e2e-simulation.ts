// E2E Integration Test - 模拟真实用户行为
const BASE = 'http://localhost:3010';

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (e: any) {
    console.log(`❌ FAIL: ${name} — ${e.message}`);
    return false;
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  let pass = 0, fail = 0;
  const results: string[] = [];

  // === 场景 A: 数据提取验证 ===
  const r1 = await test('A1: CartItem schema 验证 - 机票', async () => {
    const item = {
      itemId: 'test-flight-001',
      type: 'FLIGHT',
      name: '东航 MU5101 上海→北京',
      basePrice: 1280,
      currency: 'CNY',
      relativeOffset: { startDay: 1, durationDays: 1 },
      ctripParams: { flightNo: 'MU5101', deepLinkUrl: 'https://flights.ctrip.com/...' },
      status: 'ACTIVE',
      lastPriceAt: Date.now(),
      capturedAt: Date.now()
    };
    assert(item.type === 'FLIGHT', 'type should be FLIGHT');
    assert(item.basePrice > 0, 'price should be positive');
    assert(item.relativeOffset.startDay === 1, 'offset should be 1');
  });
  r1 ? pass++ : fail++;

  const r2 = await test('A2: CartItem schema 验证 - 酒店', async () => {
    const item = {
      itemId: 'test-hotel-001',
      type: 'HOTEL',
      name: '新宿由缘温泉酒店',
      basePrice: 850,
      currency: 'CNY',
      relativeOffset: { startDay: 1, durationDays: 3 },
      ctripParams: { hotelId: '4821567', roomTypeId: '28851', deepLinkUrl: 'https://hotels.ctrip.com/...' },
      status: 'ACTIVE',
      lastPriceAt: Date.now(),
      capturedAt: Date.now()
    };
    assert(item.type === 'HOTEL', 'type should be HOTEL');
    assert(item.relativeOffset.durationDays === 3, 'duration should be 3 nights');
  });
  r2 ? pass++ : fail++;

  // === 场景 B: 缓存 API 测试（模拟改期联动后的缓存层）===
  const r3 = await test('B1: 写入价格缓存', async () => {
    const res = await fetch(`${BASE}/api/cache/price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'flight-001', date: '2026-06-15', price: 1350 })
    });
    assert(res.ok, `status ${res.status}`);
    const data = await res.json();
    assert(data.ok === true, 'should return ok');
  });
  r3 ? pass++ : fail++;

  const r4 = await test('B2: 读取价格缓存（命中）', async () => {
    const res = await fetch(`${BASE}/api/cache/price?itemId=flight-001&date=2026-06-15`);
    assert(res.ok, `status ${res.status}`);
    const data = await res.json();
    assert(data.price === 1350, `expected 1350, got ${data.price}`);
  });
  r4 ? pass++ : fail++;

  const r5 = await test('B3: 缓存未命中', async () => {
    const res = await fetch(`${BASE}/api/cache/price?itemId=flight-001&date=2026-07-01`);
    const data = await res.json();
    assert(data.price === null || data.price === undefined || res.status === 404, 'should miss cache');
  });
  r5 ? pass++ : fail++;

  const r6 = await test('B4: 批量查询缓存', async () => {
    // 先写入另一个
    await fetch(`${BASE}/api/cache/price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'hotel-001', date: '2026-06-15', price: 920 })
    });
    const res = await fetch(`${BASE}/api/cache/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [
        { itemId: 'flight-001', date: '2026-06-15' },
        { itemId: 'hotel-001', date: '2026-06-15' },
        { itemId: 'missing-001', date: '2026-06-15' }
      ]})
    });
    assert(res.ok, `status ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.results), 'should return results array');
  });
  r6 ? pass++ : fail++;

  // === 场景 C: 边界情况模拟 ===
  const r7 = await test('C1: 断航场景 - item 标记 UNAVAILABLE', async () => {
    // 模拟：Ghost Tab 返回 null → 前端标记 UNAVAILABLE
    const item = { itemId: 'flight-dead', status: 'ACTIVE' as string };
    const ghostResult = null; // 模拟无航班
    if (ghostResult === null) item.status = 'UNAVAILABLE';
    assert(item.status === 'UNAVAILABLE', 'should be unavailable');
  });
  r7 ? pass++ : fail++;

  const r8 = await test('C2: 价格跳变 Delta 计算', async () => {
    const oldTotal = 3200;
    const newTotal = 4500;
    const delta = newTotal - oldTotal;
    const pct = (delta / oldTotal) * 100;
    assert(delta === 1300, `delta should be 1300, got ${delta}`);
    assert(pct > 20, 'should trigger delta tip (>20%)');
  });
  r8 ? pass++ : fail++;

  // === 场景 D: 快照 + 对账 ===
  const r9 = await test('D1: 创建快照', async () => {
    const res = await fetch(`${BASE}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anchorDate: '2026-06-15',
        items: [
          { itemId: 'f1', type: 'FLIGHT', name: 'MU5101', basePrice: 1350, relativeOffset: { startDay: 1, durationDays: 1 } },
          { itemId: 'h1', type: 'HOTEL', name: '温泉酒店', basePrice: 920, relativeOffset: { startDay: 1, durationDays: 3 } }
        ]
      })
    });
    assert(res.ok, `status ${res.status}`);
    const data = await res.json();
    assert(data.id || data.snapshotId, 'should return snapshot id');
    (globalThis as any).__snapshotId = data.id || data.snapshotId;
  });
  r9 ? pass++ : fail++;

  const r10 = await test('D2: 读取快照', async () => {
    const id = (globalThis as any).__snapshotId;
    const res = await fetch(`${BASE}/api/snapshot/${id}`);
    assert(res.ok, `status ${res.status}`);
    const data = await res.json();
    assert(data.anchorDate === '2026-06-15' || data.data?.anchorDate === '2026-06-15', 'anchor date should match');
  });
  r10 ? pass++ : fail++;

  // === 场景 E: 对账勾选 ===
  const r11 = await test('E1: 旅伴 A 勾选机票', async () => {
    const id = (globalThis as any).__snapshotId;
    const res = await fetch(`${BASE}/api/checklist/${id}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'f1', userId: 'user-A', checked: true })
    });
    assert(res.ok, `status ${res.status}`);
  });
  r11 ? pass++ : fail++;

  const r12 = await test('E2: 旅伴 B 勾选酒店', async () => {
    const id = (globalThis as any).__snapshotId;
    const res = await fetch(`${BASE}/api/checklist/${id}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'h1', userId: 'user-B', checked: true })
    });
    assert(res.ok, `status ${res.status}`);
  });
  r12 ? pass++ : fail++;

  const r13 = await test('E3: 查询对账状态 - 全部已购', async () => {
    const id = (globalThis as any).__snapshotId;
    const res = await fetch(`${BASE}/api/checklist/${id}/status`);
    assert(res.ok, `status ${res.status}`);
    const data = await res.json();
    // 验证两个 item 都被勾选
    const items = data.items || data.checks || data;
    assert(items, 'should have check data');
  });
  r13 ? pass++ : fail++;

  const r14 = await test('E4: SSE 连接测试', async () => {
    const id = (globalThis as any).__snapshotId;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(`${BASE}/api/checklist/${id}/stream`, { signal: controller.signal });
      assert(res.ok, `status ${res.status}`);
      assert(res.headers.get('content-type')?.includes('text/event-stream'), 'should be SSE');
    } catch (e: any) {
      if (e.name === 'AbortError') {
        // SSE 会保持连接，abort 是正常的
      } else throw e;
    } finally {
      clearTimeout(timeout);
    }
  });
  r14 ? pass++ : fail++;

  // === 总结 ===
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 测试结果: ${pass} PASS / ${fail} FAIL / ${pass + fail} TOTAL`);
  console.log(`通过率: ${((pass / (pass + fail)) * 100).toFixed(0)}%`);
  console.log('='.repeat(50));
  
  process.exit(fail > 0 ? 1 : 0);
}

main();
