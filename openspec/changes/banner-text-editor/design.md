## 数据结构

```typescript
interface TextLayer {
  id: string;
  text: string;
  fontSize: number;      // 12-60
  fontWeight: 'normal' | 'bold';
  color: string;         // hex
  x: number;             // 0-100 百分比
  y: number;             // 0-100 百分比
  direction: 'horizontal' | 'vertical';
}

interface OverlayConfig {
  layers: TextLayer[];
  backdropOpacity: number; // 0-100
}
```

DB: `overlay_config JSONB DEFAULT NULL`

## 编辑器布局

左侧图层列表 + 右侧实时预览，图层可折叠展开。

## 图层控制项

- 文字内容 input
- 字体大小 range slider 12-60
- 粗细 两按钮切换
- 颜色 预设 4 色 + 自定义 color input
- 方向 横排/竖排切换
- 删除按钮

## 拖拽实现

鼠标/触摸拖拽文字位置，更新 x/y 百分比值。
