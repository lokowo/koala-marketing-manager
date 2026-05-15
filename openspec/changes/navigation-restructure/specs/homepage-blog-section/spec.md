## ADDED Requirements

### Requirement: Homepage displays blog preview section
首页（/koala/discover）SHALL 在教授滑卡内容下方展示博客预览板块，包含最新 3-6 篇已发布博客文章的卡片和"查看更多"链接。

#### Scenario: Blog section renders on homepage
- **WHEN** 用户访问首页（/koala/discover）
- **THEN** 页面底部展示博客预览板块，包含最多 6 篇最新已发布博客文章卡片

#### Scenario: Blog card displays key information
- **WHEN** 博客预览板块渲染
- **THEN** 每张博客卡片 SHALL 展示封面图、标题、分类标签和发布日期

#### Scenario: View more link navigates to blog list
- **WHEN** 用户点击"查看更多"链接
- **THEN** 跳转到 /koala/blog 博客列表页

### Requirement: Navigation bar shows exactly 4 items
导航栏（顶部和底部）SHALL 只显示 4 个导航项：首页 / Koala AI / 教授库 / 我的。

#### Scenario: Desktop top navigation renders 4 items
- **WHEN** 用户在桌面端查看顶部导航栏
- **THEN** 显示 4 个导航项：首页、Koala AI、教授库、我的

#### Scenario: Mobile bottom navigation renders 4 items
- **WHEN** 用户在移动端查看底部导航栏
- **THEN** 显示 4 个导航项：首页、Koala AI、教授库、我的

#### Scenario: Blog route remains accessible
- **WHEN** 用户直接访问 /koala/blog
- **THEN** 博客列表页正常显示，不受导航修改影响
