## ADDED Requirements

### Requirement: Card backgrounds use only two standard dark variants
所有卡片/区块背景在深色模式下 SHALL 使用 `dark:bg-white/5`（轻卡片）或 `dark:bg-[#0F1419]`（重卡片/独立区块）。MUST NOT 使用 `dark:bg-white/[0.04]`、`dark:bg-white/[0.06]`、`dark:bg-[#111c28]`。

#### Scenario: No non-standard card backgrounds remain
- **WHEN** 在 `app/koala/` 下 grep `dark:bg-white/\[0\.04\]` 或 `dark:bg-white/\[0\.06\]` 或 `dark:bg-\[#111c28\]`
- **THEN** 结果为零

### Requirement: my-profile CARD_CLS uses standard dark background
my-profile 的 CARD_CLS 常量 SHALL 使用 `dark:bg-white/5` 替代 `dark:bg-[#D4A843]/[0.06]`。

#### Scenario: CARD_CLS uses white/5
- **WHEN** 查看 my-profile/page.tsx 的 CARD_CLS 定义
- **THEN** 深色背景为 `dark:bg-white/5`

### Requirement: Inline styles have dark mode handling
所有使用 `style={{ background: ... }}` 或 `style={{ color: ... }}` 的元素 SHALL 有深色模式对应方案（Tailwind class 或条件逻辑）。

#### Scenario: No blind inline colors in dark mode
- **WHEN** 切换到深色模式
- **THEN** 所有 inline style 颜色在深色背景上可读且美观

### Requirement: Professor portal uses gold palette instead of blue
professor-portal 的 H-index 徽章和强调色 SHALL 使用金色系（`dark:bg-[#D4A843]/10`、`dark:text-[#D4A843]`）替代蓝色系（`dark:bg-blue-900/30`、`dark:text-blue-400`）。

#### Scenario: No blue accent colors in professor portal dark mode
- **WHEN** 在 professor-portal/page.tsx 中 grep `blue`
- **THEN** 仅用于 `bg-blue-600`（蓝色头像圆形和 CTA 按钮，这是功能性颜色可保留）
