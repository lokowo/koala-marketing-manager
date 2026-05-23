# Koala PhD 项目状态文档
> 最后更新: 2026-05-23 | 版本: V2.0

## 项目概览
**Koala PhD（考拉博士）** — 澳洲 PhD 留学 AI 智能顾问平台
- 官网: koalaphd.com / koalastudyadvisors.net
- 部署: Vercel (项目 assa2)
- 数据库: Supabase (项目 geolbgirpkzxrdvozmqw, ap-northeast-1)
- GitHub: jun.he@assainvest.com
- Vercel: renehee-5718
- 技术栈: Next.js + Supabase + Stripe + Tailwind
- 联系方式: info@koalastudyadvisors.net | WeChat: KoalaStudyAdvisor | 小红书: DrKoalaAU

## 产品/定价体系（勿修改）

### 积分包（一次性购买）
| 产品 | 价格 AUD | 积分 | 佣金率 |
|------|---------|------|--------|
| 入门包 | $4.99 | 50 | 15% |
| 标准包 | $9.99 | 120 | 18% |
| 专业包 | $19.99 | 280 | 20% |
| 旗舰包 | $49.99 | 800 | 20% |

### 订阅（月度循环）
| 产品 | 价格 AUD | 佣金率 |
|------|---------|--------|
| Starter | $19.90 | 20% |
| Pro | $49.00 | 22% |
| Elite | $99.00 | 25% |

### 功能限额映射
| 功能 | Free | Starter | Pro | Elite |
|------|------|---------|-----|-------|
| 对话轮数 | 10/天 | 无限 | 无限 | 无限 |
| 语音输入 | 5/天 | 无限 | 无限 | 无限 |
| 教授匹配 | 3/天 | 10/天 | 无限 | 无限 |
| 套磁信 | 1/总 | 5/月 | 15/月 | 无限 |
| CV生成 | 1/总 | 3/总 | 无限 | 无限 |

注意: 每个产品内 standard/partner/senior 三档佣金率目前相同，后续可差异化。

## 竞品分析
- ApplyKite (50,000+ 用户): 全球平台，关键词匹配，澳洲深度不足
- Koala PhD 差异化: 24,502教授 + 1536维embedding + 5维LLM重排 | 对话式AI顾问 | 38所澳洲大学 | 10位真实教授关系 | 双向高亮套磁信 | 模糊记忆系统

## 技术架构

### 教授匹配: 3层
pgvector 语义搜索 → Claude 5维LLM重排 → 关键词兜底

### 教授数据刷新: 3数据源
Semantic Scholar API(免费) + ARC Data Portal(免费JSON) + OpenAlex(免费key)
- 用时刷新(Just-in-time): 用户点生成套磁信时，检查 last_refreshed_at > 30天则触发
- 后台同步(Background Sync): cron job 待实现

### 模糊记忆系统: 3层
Layer 1 模糊记忆(user_memories) → Layer 2 结构化合成(user_profiles) → Layer 3 可视化知识卡
- 详见 docs/MEMORY-TECH.md

### 套磁信生成: 7环节
教授刷新 → 学生画像 → 匹配选择 → Prompt组装(学生+教授+论文+grants) → LLM生成 → 双向标注 → 积分扣除 → 存cold_emails

### 语音输入
Web Speech API(免费,30秒上限) → 失败时 Whisper API fallback($0.006/分钟)

## 数据库表清单

### 核心业务表
- professors: 教授数据(含 latest_papers, latest_grants, is_verified, slug 等)
- user_profiles: 用户学术画像(结构化)
- user_memories: 模糊记忆(自然语言片段, 9类分类)
- cold_emails: 套磁信(含 highlights, match_scores, follow_up_count)
- chat_feedback: 对话反馈(6题随机)
- user_usage_tracking: 用量追踪(按天, 含 subscription_tier)
- professor_feedback: 教授对学生的反馈(interested/not_suitable)
- sales_commission_rates: 佣金率配置(7产品)
- sales_visits: 扫码访问记录
- sales_referrals: 推荐购买记录

## 已完成功能清单 (Phase 0-6)

### Phase 0-5: 基础功能 (23项Bug修复)
全部完成

### Phase 6: 核心产品优化 (37项, 2026-05-23)

#### Ola 对话系统
- [x] 意图识别 + 画像提取 (extract-profile.ts)
- [x] ProfileCard 组件 + DB 持久化
- [x] ProfileCard → 匹配系统对接 (自动触发 searchProfessors)
- [x] Tool schema 补参数 (universityGroup + scholarshipRequired)
- [x] Ola prompt 优化: 知识库优先规则、学术引用格式、自然推荐、变现引导
- [x] 语音输入 30秒上限 + 计时器 + interimResults暂存 + Whisper fallback
- [x] searchProfessors tool 返回 latest_papers + ProfessorMatchCard 展示DOI
- [x] 对话反馈收集 (FeedbackCard + 6题随机 + API)

#### 模糊记忆系统
- [x] memoryService.ts: extractMemories + saveMemories + loadMemories + formatMemoriesForPrompt + syncToProfile + profileCardToMemories
- [x] 对话开始加载memories注入prompt
- [x] 每5轮异步提取新记忆
- [x] ProfileCard 确认后数据同步写入 user_memories
- [x] 记忆知识卡页面 (app/koala/my-profile/memories/page.tsx)

#### 套磁信生成系统
- [x] 教授数据刷新服务 (professorRefreshService.ts): Semantic Scholar + ARC
- [x] 套磁信生成API (POST /api/chat/generate-cold-email)
- [x] ColdEmailCard 组件: 5维匹配仪表盘 + 双向高亮(学生蓝#E6F1FB/教授绿#E1F5EE) + 4操作按钮
- [x] chat/page.tsx 全组件串联: handleGenerateColdEmail + 用量检查 + 加载动画
- [x] 套磁信管理页面 (app/koala/my-emails/page.tsx): 列表+状态标签+统计
- [x] Follow-up 生成API (POST /api/chat/generate-follow-up)
- [x] 草稿保存/更新 API (PATCH /api/user/cold-emails/[id])
- [x] UpgradePrompt 组件: 嵌入对话流不弹窗、不硬编码价格
- [x] Stripe webhook 同步 subscription_tier (3个事件)

#### CV 生成系统
- [x] 3版本: supervisor / scholarship / general
- [x] generate-cv API (POST /api/user/generate-cv)
- [x] generate-cv-pdf API (@react-pdf/renderer, Times-Roman, 72x90px照片区)
- [x] CVPreviewCard 组件: 3-tab切换、照片上传、AI增强标签、PDF下载
- [x] enhance-experience API: 根据专业方向重写经历

#### 教授端平台
- [x] 教授验证API (claim + verify 流程)
- [x] 教授个人主页 (/professor/[slug]): banner+头像+Verified+基础信息+招生状态+研究标签+「教授说」+AI润色+最新论文+「我在找」
- [x] 学生侧增强: Verified标签+查看主页链接+教授说摘要
- [x] AI润色API (POST /api/professor/ai-polish)
- [x] 学生推荐收件箱 + 教授反馈API
- [x] professor_feedback 表

#### 用量+定价
- [x] usageTracker 四档限额 (free/starter/pro/elite)
- [x] UpgradePrompt 升级提示 (不硬编码价格)
- [x] Stripe webhook syncUsageTrackingTier
- [x] 定价页面修复 (四档正确价格 $0/$19.90/$49/$99)

#### 基础设施
- [x] 6个数据库 migration (Supabase直接执行)
- [x] 测试数据硬删除 (sales_visits清零, referrals保留真实3条)
- [x] Footer 确认正确
- [x] 海报编辑器 (fabric.js + 6底图)
- [x] 首页多维推荐 + 全站文案统一(24,000+)

## 已完成项目 (P2)
- [x] 后台定期同步 cron job (每周日凌晨3点)
- [x] 批量/选择性套磁信生成 (SSE streaming + checkbox)
- [x] 教授视角预览 (AI模拟教授读信, Elite专属)
- [x] 教授招生帖发布 (dashboard Tab3 + 首页🔥标签)
- [x] 反馈飞轮基础设施 (admin报告 + 500条训练就绪标志)
- [x] 套磁信底部水印获客 (professor/claim 落地页)

## 待完成项目 (P2)
- [ ] 教授反馈飞轮算法优化 (需500+条数据后启动)
- [ ] Ola 对话自然度持续优化 (基于 chat_feedback 数据)
- [ ] 教授规模化获客 (教授推荐教授 + ARC Grant触发邀请)

## 工作方法论（对 claude.ai 对话的强制规则）

### 每次对话必须遵守的流程
1. 读 PROJECT-STATE.md — 先了解全貌再说话
2. 研究先行 — 任何新功能，先调研竞品/技术/现有代码，不假设
3. 检查现有系统 — 出指令前必须查数据库/代码中已有的相关功能，避免冲突
4. 方案给 Jay 拍板 — 列清楚做什么/为什么/怎么做，等确认后才出指令
5. 指令质量把控 — 每条≤1500字符，2-3功能，不出矛盾指令
6. 部署后必须检查 — 不跳过验证就出下一条指令
7. 所有决策写入文件 — 更新 PROJECT-STATE.md

### 容易犯的错误（自我提醒）
- 不查现有数据就设计新功能（如定价冲突事件）
- 连续出多条覆盖性指令造成混乱
- 跳过验证直接推进下一步
- 对话后期忘记前期约定的规则
- 不更新 PROJECT-STATE.md 就结束对话
