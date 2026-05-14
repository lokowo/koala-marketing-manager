## 1. 重写三步卡片区域

- [x] 1.1 重写 HomeClient.tsx 三步卡片数据结构和 JSX（line ~345-430），统一卡片内容结构（图标→标签→标题→描述→亮点→分割线→底部信息）
- [x] 1.2 确保三张卡片等高（flex stretch + flex-col + h-full + mt-auto 底部对齐）
- [x] 1.3 第一张深色卡片保留装饰元素（圆形、考拉水印），所有卡片 hover 顶部渐变条改为 Tailwind class
- [x] 1.4 箭头改为更明显样式：虚线段 border-dashed + size-6 ArrowRight + w-12 容器
- [x] 1.5 深色模式适配：所有颜色使用 dark: 前缀

## 2. 验证

- [x] 2.1 `npm run build` 确认无编译错误
