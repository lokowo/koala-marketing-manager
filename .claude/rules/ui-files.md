---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.css"
  - "**/*.scss"
  - "components/**"
  - "app/**/page.tsx"
---

# UI 文件修改规则

修改任何 UI 文件前，你必须：

1. 先读取 `docs/DESIGN.md`，确认颜色变量、字号、间距规范
2. 检查该组件是否涉及数据指标展示 → 如果是，确保有 ℹ️ tooltip（从 `lib/metrics-glossary.ts` 取文案）
3. 检查是否涉及 sales agent 展示 → 如果是，使用 `display_name` 而非 `user_id`
4. 检查是否有详情页 → 如果是，确保有返回按钮
5. 深色模式：所有颜色使用 CSS 变量，禁止硬编码 hex 值
