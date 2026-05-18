## ADDED Requirements

### Requirement: Pricing cards have shadows and hover effects
定价页所有卡片 SHALL 有 `shadow-sm`。积分包卡片和订阅 tier 卡片 SHALL hover 时上移 (`hover:-translate-y-1`) 并增强阴影 (`hover:shadow-lg`)。推荐积分包 SHALL 有 `ring-2 ring-[#D4A843]/40 shadow-md` 突出显示。所有样式 MUST 带 `dark:` 前缀。

#### Scenario: Pricing cards have visual depth in light mode
- **WHEN** 用户在浅色模式下访问定价页
- **THEN** 所有卡片有阴影，推荐套餐有金色 ring 突出

#### Scenario: Credit pack hover effect
- **WHEN** 用户 hover 积分包卡片
- **THEN** 卡片上移并阴影增强

### Requirement: My-profile stat cards have shadows and icon backgrounds
个人资料页统计卡片 SHALL 有 `shadow-sm`。统计图标 SHALL 放在彩色圆角方块内 (`w-9 h-9 rounded-xl bg-color/15`)。

#### Scenario: Profile stat cards have depth
- **WHEN** 用户在浅色模式下查看个人资料页
- **THEN** 统计卡片有阴影，图标有彩色背景方块

### Requirement: My-progress cards have shadows and achievement distinction
进度页 Research Readiness 卡片 SHALL 有 `shadow-sm`。统计网格卡片 SHALL 有 `shadow-sm`。解锁成就 SHALL 有 `ring-2 ring-[#D4A843]/30 shadow-sm`。锁定成就 SHALL 有 `opacity-40 grayscale`。

#### Scenario: Progress page cards have depth
- **WHEN** 用户在浅色模式下查看进度页
- **THEN** 所有卡片有阴影，解锁/锁定成就视觉区分明显

### Requirement: Professor-portal sections have shadows and hover
教授门户所有区块 SHALL 有 `shadow-sm`。Tab 按钮 SHALL 有 `hover:bg-gray-100 dark:hover:bg-white/10 transition-colors`。

#### Scenario: Professor portal has visual depth
- **WHEN** 教授在浅色模式下查看门户
- **THEN** 所有区块有阴影，Tab 按钮 hover 有背景变化

### Requirement: Tools tier cards aligned with free tools styling
工具页付费 tier 卡片 SHALL 有与免费工具区一致的阴影层级。推荐 tier SHALL 有 `shadow-md` 突出效果。所有 tier 卡片 SHALL hover 时上移。

#### Scenario: Tools tier cards match free tools visual quality
- **WHEN** 用户在浅色模式下查看工具页
- **THEN** 付费 tier 卡片阴影与免费工具卡片一致，推荐 tier 更突出
