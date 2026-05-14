## ADDED Requirements

### Requirement: Related blog articles
详情页 SHALL 展示与该教授相关的已发布博客文章。

#### Scenario: Blog matches by title
- **WHEN** blog_posts 中有 title 包含教授名字且 status='published'
- **THEN** 详情页显示文章链接卡片（标题 + 分类）

#### Scenario: No matching blogs
- **WHEN** 没有匹配的博客文章
- **THEN** 该区块不显示

### Requirement: Similar professors recommendation
详情页 SHALL 展示 2-3 位同研究方向的其他教授。

#### Scenario: Overlapping research areas
- **WHEN** 有其他教授的 research_areas 与当前教授有交集
- **THEN** 显示最多 3 位推荐教授卡片（名字、学校、匹配方向 tag），按 opportunity_score 降序

#### Scenario: No similar professors
- **WHEN** 没有研究方向重叠的其他教授
- **THEN** 该区块不显示

### Requirement: Application tips template
详情页 SHALL 根据教授数据生成申请建议文案（不调用 AI）。

#### Scenario: Professor with active grants and accepting students
- **WHEN** grant_status='Active' 且 accepting_students='yes'
- **THEN** 显示积极的申请建议，提及经费和招生机会

#### Scenario: Professor with no grant info
- **WHEN** grant_status 不是 'Active' 且 accepting_students 未知
- **THEN** 显示通用申请建议

### Requirement: AI summary display
详情页 SHALL 在头像卡片下方展示 AI 简介区块。

#### Scenario: Summary available
- **WHEN** 教授有 ai_summary
- **THEN** 显示简介文本 + "AI 生成" 标注

#### Scenario: Summary loading
- **WHEN** ai_summary 为 null 且用户访问页面
- **THEN** 客户端触发生成，显示 loading 态，完成后渲染
