## ADDED Requirements

### Requirement: Step card 1 has decorative circles
第一张三步卡片（聊背景）SHALL 在容器内包含两个绝对定位的装饰圆形：右上角金色半透明 (`bg-[#D4A843]/10`, `-top-10 -right-10 w-32 h-32`) 和左下角 Teal 半透明 (`bg-[#4ECDC4]/10`, `-bottom-8 -left-8 w-24 h-24`)。容器 MUST 设置 `overflow-hidden` 和 `relative`。

#### Scenario: Decorative circles render on step card 1
- **WHEN** 用户查看首页三步卡片区域
- **THEN** 第一张卡片右上角和左下角显示半透明装饰圆形，不遮挡文字内容

### Requirement: Step cards 2-3 have hover gradient bar
第二三张三步卡片 SHALL 在顶部包含一条渐变装饰条 (`h-1 bg-gradient-to-r from-[#4ECDC4] to-[#D4A843]`)，默认 `opacity-0`，hover 时 `opacity-100`。容器 MUST 使用 `group` class，装饰条使用 `group-hover:opacity-100`。

#### Scenario: Hover reveals gradient bar on light mode
- **WHEN** 用户在浅色模式下 hover 第二或第三张卡片
- **THEN** 卡片顶部出现 Teal→金色渐变条，卡片上移 1 单位 (`-translate-y-1`)，阴影增强

#### Scenario: Dark mode hover also works
- **WHEN** 用户在深色模式下 hover 第二或第三张卡片
- **THEN** 同样出现渐变条和上移效果，背景为 `dark:bg-[#0F1419]`

### Requirement: Step card icons have colored background blocks
三步卡片的图标 SHALL 放在彩色圆角方块内，而非直接显示 emoji。配色：Step01 金色 `bg-[#D4A843]/15`、Step02 Teal `bg-[#4ECDC4]/15`、Step03 琥珀 `bg-amber-100`。深色模式下使用对应的低不透明度变体。方块 MUST 使用 `rounded-xl` 圆角。

#### Scenario: Icon backgrounds are visible
- **WHEN** 用户查看三步卡片
- **THEN** 每个步骤的 emoji 图标显示在对应颜色的圆角方块背景上

### Requirement: Professor card has hover gradient bar
教授卡片 SHALL 在顶部包含渐变装饰条 (`h-1 bg-gradient-to-r from-[#D4A843]/60 to-[#4ECDC4]/60`)，默认隐藏，hover 时显示。卡片 MUST hover 时上移、阴影增强、边框高亮 (`hover:border-[#D4A843]/30`)。

#### Scenario: Professor card hover effect in light mode
- **WHEN** 用户在浅色模式下 hover 教授卡片
- **THEN** 卡片顶部出现金色→Teal 渐变条，卡片上移，阴影增强，边框变为金色半透明

#### Scenario: Professor card hover in dark mode
- **WHEN** 用户在深色模式下 hover 教授卡片
- **THEN** 同样出现渐变条，背景为 `dark:bg-[#0F1419]`

### Requirement: Professor research tags use amber fill style
教授卡片的研究方向标签 SHALL 使用 `bg-amber-50 text-amber-700` 填充样式（深色模式 `dark:bg-amber-900/20 dark:text-amber-400`），MUST NOT 使用 border 边框样式。圆角使用 `rounded-md`。

#### Scenario: Research tags appear as amber pills
- **WHEN** 用户查看教授卡片的研究方向标签
- **THEN** 标签显示为 amber 色填充背景，无边框，文字为 `amber-700`

### Requirement: Professor detail button has fill hover
"查看详情"按钮 SHALL 使用 `bg-gray-50 text-[#1A1A2E]` 默认样式，hover 时变为 `bg-[#1A1A2E] text-white`。深色模式下默认 `dark:bg-white/5 dark:text-[#D4A843]`，hover `dark:bg-[#D4A843] dark:text-[#080C10]`。圆角使用 `rounded-xl`。

#### Scenario: Detail button hover fills dark
- **WHEN** 用户 hover "查看详情"按钮
- **THEN** 按钮背景从浅灰变为深海军蓝，文字变白

### Requirement: Professor stats use two-column layout with divider
教授卡片底部统计行 SHALL 使用 `grid grid-cols-2` 两列布局，列之间有分割线。

#### Scenario: Stats display in two columns
- **WHEN** 教授有 h-index 和论文数/引用数
- **THEN** 统计数据分两列显示，列间有竖线分割
