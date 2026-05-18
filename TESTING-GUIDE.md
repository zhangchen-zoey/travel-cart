# Travel Cart 浏览器验证指南

## 环境准备

1. 打开终端，启动后端 API：
   ```bash
   cd /home/ubuntu/projects/travel-cart-api && PORT=3010 npx tsx src/index.ts
   ```
2. 打开浏览器访问 http://localhost:3010/health ，页面应显示 `ok`

## 安装 Chrome 扩展

1. 在 Chrome 地址栏输入 `chrome://extensions` 并回车
2. 打开右上角的 **「开发者模式」** 开关
3. 点击左上角 **「加载已解压的扩展程序」**
4. 选择目录：`/home/ubuntu/projects/travel-cart/dist/`
5. 确认扩展出现在列表中，且没有红色报错信息

## 验证 Task 1: Content Script 注入

1. 打开携程机票搜索结果页：https://flights.ctrip.com/online/list/oneway-sha-bjs
2. 页面加载完成后，观察航班卡片右侧是否出现蓝色 **[+ 行程单]** 按钮
3. 点击该按钮，应变为 **✓ 已添加**
4. 打开携程酒店详情页：https://hotels.ctrip.com/hotels/detail/?hotelId=436521
5. 同样观察是否出现 **[+ 行程单]** 按钮，点击后变为 **✓ 已添加**

## 验证 Task 2: Side Panel

1. 点击浏览器右上角的扩展图标，打开 Side Panel（侧边栏）
2. 确认刚才添加的机票/酒店卡片显示在时间轴中
3. 修改顶部的出发日期 → 观察卡片是否变灰并显示 **[🔄 待更新]**
4. 等待几秒，价格应自动刷新（后台会短暂打开一个 Ghost Tab 然后自动关闭）

## 验证 Task 3: 状态机翻转

1. 点击侧边栏底部的 **[一键前往下单]**
2. 观察卡片是否翻转为「对账模式」（出现 Checkbox + 预订按钮）
3. 点击 **[去携程App预订]** → 确认跳转到携程对应页面
4. 返回侧边栏，勾选 ✓ → 确认卡片模糊折叠（表示已完成）

## 验证 H5 分享

1. 在侧边栏中点击 **[分享行程]**
2. 复制生成的短链接
3. 在手机或另一个浏览器中打开该短链 → 确认显示只读行程页面

## 已知限制 & 注意事项

- Content Script 的 DOM 选择器基于携程页面结构推测，实际页面可能需要微调
- Ghost Tab 抓取可能触发携程验证码，此时卡片会显示 **[🔒 安全验证]**
- 后端默认运行在 3010 端口（3002 被旧项目占用）
- H5 分享功能需要后端正常运行

## 常见问题

| 问题 | 排查方法 |
|------|----------|
| 按钮没出现 | 按 F12 打开开发者工具，查看 Console 是否有 Content Script 加载错误 |
| Side Panel 打不开 | 确认 `manifest.json` 中 `side_panel` 配置正确 |
| 价格不刷新 | 确认后端 API 运行中，在 Network 面板检查请求是否正常发出 |
