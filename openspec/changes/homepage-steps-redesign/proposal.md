## Why

首页"三步搞定 PhD 申请"卡片区域视觉质量不达标：三张卡片高度不一致、白色卡片缺乏吸引力、箭头太小太淡、整体像草稿而非成品。需要重新设计使其达到产品级别的视觉效果。

## What Changes

- 三张卡片等高：使用 flex stretch 确保一致高度
- 统一卡片内容结构：图标 → STEP 标签 → 标题 → 描述 → 功能亮点 → 分割线 → 底部信息
- 第一张深色卡片增加装饰元素（半透明考拉图标）
- 第二三张卡片增加更多内容填充（关键数字、功能亮点图标列表）
- 箭头改为更明显样式（更大、虚线连接线）
- hover 效果增强：上移 + 阴影 + 顶部渐变色条
- 三张卡片添加点击跳转（聊背景→path / AI匹配→discover / 写申请信→write）
- 深色模式全面适配

## Capabilities

### New Capabilities
（无新 capability — 纯 UI 样式重构）

### Modified Capabilities
（无 spec 级别变更）

## Impact

- `app/koala/home/HomeClient.tsx` — 三步卡片区域（约 line 345-430）完全重写
- 不涉及 API / 数据库 / 业务逻辑变更
