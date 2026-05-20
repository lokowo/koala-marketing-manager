## Why

`/koala/pricing` 页面已存在且功能完整（订阅、充值包、升降级、FAQ、购买记录），但 `/koala/tools` 仍然混合了免费工具和充值内容，导致用户困惑。同时导航栏没有"定价"入口，用户无法直接到达定价页。需要清理 tools 页面、添加全站入口。

## What Changes

- 从 `/koala/tools` 页面移除积分充值包区域（保留免费工具箱 + "查看订阅套餐"CTA + 人工咨询 + 免费工具提醒）
- 在 TopNavBar 添加"定价"链接 → `/koala/pricing`
- 在"我的"页面积分区域添加"充值/订阅 →"按钮 → `/koala/pricing`
- 更新 tools 页面标题从"工具 & 定价"改为"免费工具箱"

## Capabilities

### New Capabilities

### Modified Capabilities
- `credit-purchase-ui`: 从 tools 页移除充值 UI，添加全站导航入口到已有的 pricing 页

## Impact

- **文件**: `app/koala/tools/page.tsx`（移除充值部分）、`app/koala/components/TopNavBar.tsx`（加定价链接）、`app/koala/my-profile/page.tsx`（加充值按钮）
- **风险**: 低——pricing 页已存在，仅调整入口和清理冗余
