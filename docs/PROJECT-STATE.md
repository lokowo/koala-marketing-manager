# Koala PhD 项目状态文档
> 最后更新: 2026-05-25 | 版本: V4.2

## 项目概览
**Koala PhD（考拉博士）** — 澳洲 PhD 留学 AI 智能顾问平台
- 官网: koalaphd.com / koalastudyadvisors.net
- 部署: Vercel (项目 assa2)
- 数据库: Supabase (项目 geolbgirpkzxrdvozmqw, ap-northeast-1)
- GitHub: jun.he@assainvest.com
- Vercel: renehee-5718
- 技术栈: Next.js 16 + Supabase + Stripe + Tailwind CSS
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
- Koala PhD 差异化: 全澳38所大学(7,886 Verified教授 / 24,489总量，数据审计清洗中) + 1536维embedding + 5维LLM重排 | 对话式AI顾问 | 10位真实教授关系 | 双向高亮套磁信 | 模糊记忆系统

## 技术架构

### 教授匹配: 3层
pgvector 语义搜索 → Claude 5维LLM重排 → 关键词兜底

### 教授数据刷新: 3数据源
Semantic Scholar API(免费) + ARC Data Portal(免费JSON) + OpenAlex(免费key)
- 用时刷新(Just-in-time): 用户点生成套磁信时，检查 last_refreshed_at > 30天则触发
- 后台同步(Background Sync): cron job 每周日凌晨3点运行

### 模糊记忆系统: 3层
Layer 1 模糊记忆(user_memories) → Layer 2 结构化合成(user_profiles) → Layer 3 可视化知识卡
- 详见 docs/MEMORY-TECH.md

### 套磁信生成: 7环节
教授刷新 → 学生画像 → 匹配选择 → Prompt组装(学生+教授+论文+grants) → LLM生成 → 双向标注 → 积分扣除 → 存cold_emails

### 语音输入
Web Speech API(免费,30秒上限) → 失败时 Whisper API fallback($0.006/分钟)

### 海报编辑器: 纯 Canvas 2D
fabric.js 已移除，改用 HTML5 Canvas 2D API + CSS object-fit:contain 预览
- 详见 docs/POSTER-DESIGN-SPEC.md (V1.3)

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

## 页面规模

### 前台 C 端 (/koala/*)
26 个页面: home, chat, professors, blog, discover, insights, matches, messages, my-applications, my-documents, my-emails, my-profile, my-profile/academic, my-profile/memories, my-progress, pricing, professor-portal, auth, auth/forgot-password, auth/reset-password, tools, tools/niv 等

### Admin 后台 (/dashboard/koala/*)
38 个页面: admin-overview, analytics, blog, commission-rates, commission-review, faq, feedback, feedback-flywheel, grants, growth, handoff, knowledge-base, kpi, kpi-settings, kpi-targets, leads, marketing-tools, my-logs, notifications, ola-templates, professors, professor-insights, scholarships, settings, tier-management, sales-agents, sales-funnel, sales-overview, university-distribution 等

### Sales 后台 (/dashboard/sales/*)
9 个页面: promo-center(含海报编辑器), channel-analytics, my-commissions, my-kpi, my-logs, promo-tools, referral-users, settings, surveys

### 公开页面
- /privacy-policy — 隐私政策(中英双语)
- /terms — 服务条款(中英双语)
- /professor/[slug] — 教授个人主页
- /professor/claim — 教授认领落地页
- /s/[code] — 调研问卷
- /r/[code] — 推广跳转

## 已完成功能清单

### Phase 0-5: 基础功能 (23项Bug修复)
全部完成

### Phase 6: 核心产品优化 (37项)

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
- [x] 首页多维推荐 + 全站文案统一(覆盖全澳38所大学)

### Phase 7 (P2): 增长功能
- [x] 后台定期同步 cron job (每周日凌晨3点)
- [x] 批量/选择性套磁信生成 (SSE streaming + checkbox)
- [x] 教授视角预览 (AI模拟教授读信, Elite专属)
- [x] 教授招生帖发布 (dashboard Tab3 + 首页🔥标签)
- [x] 反馈飞轮基础设施 (admin报告 + 500条训练就绪标志)
- [x] 套磁信底部水印获客 (professor/claim 落地页)

### Phase 8 (P3): Gmail 集成 + 推广工具 + 合规 ✅ 完成
- [x] Gmail OAuth 后端: connect、callback、send、status API (app/api/auth/gmail/)
- [x] Gmail OAuth 前端: profile页面连接按钮 + ColdEmailCard 发送按钮
- [x] 3步发送向导: 预览 → 确认 → 发送 (含 PDF 附件支持)
- [x] Google OAuth 登录/注册: 所有认证页面支持 Google 一键登录
- [x] 海报编辑器重构: fabric.js → 纯 HTML5 Canvas 2D API
- [x] 海报编辑器增强: 逐元素文字控制(标题字号/颜色、副标题字号、卖点编辑/字号) + 布局预设(紧凑/标准/宽松)
- [x] 海报设计规范文档 (docs/POSTER-DESIGN-SPEC.md V1.3)
- [x] 左侧面板滚动修复: 所有断点可滚动到底部所有控制项
- [x] 隐私政策页面 (/privacy-policy): 中英双语, Gmail集成声明, 数据删除权利
- [x] 服务条款页面 (/terms): 中英双语, 教育辅助工具免责, NSW法律管辖
- [x] 研究景观公开页 (/koala/insights): 全澳38所大学教授数据可视化聚合

### Phase 9.1: Ola 对话 Session 持久化 ✅ 完成 (2026-05-24)
- [x] /api/ola/conversations 新 API: 从 ai_conversations 读写对话 (GET by mode/sessionId, DELETE)
- [x] /api/ola/sessions 修复: 从 ai_conversations 查询取代不存在的 chat_messages 表
- [x] /api/ai/chat saveConversationAsync 改 upsert: 接收前端 sessionId, 同 session 更新同一行
- [x] page.tsx 初始化: 登录用户从 DB 恢复最近 session 消息 + sessionId
- [x] page.tsx 模式切换: 切 mode 自动加载该模式最近会话, sessionId 等 remote 返回后才赋值(修复竞态)
- [x] page.tsx callApi: 发送 sessionId 到后端, 移除已失效的 saveRemoteMessages
- [x] ChatHistorySidebar: 从 ai_conversations 获取 session 列表, 点击加载对应 session 消息
- [x] 新对话: 生成新 sessionId + 清空消息, 清除按钮清理 DB + localStorage
- [x] FAQ 命中也持久化到 ai_conversations (saveFAQConversationAsync), 历史侧栏可见

### Phase 9.2: FAQ 免 LLM 拦截 ✅ 完成 (2026-05-24)
- [x] ola-faq.ts 已有语义匹配引擎 (tokenize + synonym expansion + keyword overlap score)
- [x] route.ts FAQ 拦截阈值从 0.5 提升到 0.85, 高置信直接返回跳过 Claude
- [x] FAQ 命中记录到 ai_conversations (source 可追踪), 不再丢失历史
- [x] ola_faq 表从 10 条扩充到 15 条, 新增: 导师匹配使用方法、套磁信流程、6模式功能介绍、PhD学制、英语要求

### Phase 9 (P4-1): 学术 CV 生成 ✅ 完成 (2026-05-24)
- [x] CV 数据收集+生成 API (POST /api/user/cv/generate): 从 user_profiles 取已有数据 + body 补充信息, Claude 润色, 存 generated_documents(type='cv')
- [x] CV PDF 生成 API (POST /api/user/cv/pdf): @react-pdf/renderer, Times-Roman, A4, 姓名居中+分段横线分隔
- [x] CV 编辑 API (PATCH /api/user/cv/[id]): 更新 content 各分段, status toggle draft/final
- [x] AcademicCVCard 组件 (app/koala/components/AcademicCVCard.tsx): 6分段可编辑+AI润色+PDF下载+保存
- [x] my-documents 页面增加 CV 类型: 新建时选"学术CV"一键生成, 列表展示+编辑
- [x] ColdEmailCard CV 附件改用 generated_documents 存储的 CV (优先), 兜底旧版 on-the-fly 生成
- [x] usageTracker Pro 档 CV 限额修正: 3→无限 (与 PROJECT-STATE 定价表对齐)

### Phase 9.3 (P4-2): 90秒 Profile Capture + 邮件 Handoff ✅ 完成 (2026-05-24)
- [x] 90秒 profile capture: 3+条用户消息后检测 user_profiles 缺失字段, Ola 逐条追问 (研究方向/学历/目标学位/本校), 可跳过
- [x] 用户回答通过正常 callApi 流入后端 extractAndUpdateProfile, 自动填充 user_profiles
- [x] PROFILE_QUESTIONS 常量: 4个问题各带快捷回复按钮, 跳过不再追问
- [x] 邮件 handoff 三触发: 关键词("转人工/真人/顾问"等), 连续2次差评, header 转人工按钮
- [x] OlaHandoffCard 组件: collect_email → submitting → done 三态, 已登录自动提交, 未登录收集邮箱
- [x] handoff POST /api/ola/handoff: 插入 handoff_requests + Resend 发邮件通知 info@koalaphd.com
- [x] 完成状态显示顾问联系时间(24h) + 微信号 KoalaStudyAdvisor
- [x] handoffCard 消息类型在 message list 中正确渲染 OlaHandoffCard 组件

### Phase 9.5: 推荐信系统验证 + chat TS 修复 ✅ 完成 (2026-05-25)
- [x] 推荐信生成 API 实测 (POST /api/user/recommendation-letter/generate): 修复 DB insert 失败时仍 increment usage 的 bug
- [x] 推荐信 buildStudentSummary 运算符优先级 bug: `e.endDate ?? e.isCurrent ? ...` → `e.endDate ?? (e.isCurrent ? ...)`
- [x] 推荐信完整流程验证: generate API + PDF 导出 + RecommendationLetterCard 编辑/保存 + my-documents 页面集成
- [x] chat/page.tsx TypeScript 验证: `npx tsc --noEmit` 零错误通过

### Phase 9.4: Ola 浮动吉祥物 ✅ 完成 (2026-05-24)
- [x] OlaFloatingMascot 独立组件 (app/components/OlaFloatingMascot.tsx)
- [x] 入场动画: 页面加载 0.3s 后从右侧滑入右下角, 0.4s transition
- [x] 站立状态: CSS @keyframes float 呼吸浮动 (3s 周期)
- [x] 气泡消息: 6条预设文案轮播 (匹配导师/套磁信/科研/面试/规划/RP), 4s 显示 + 4s 间隔
- [x] 气泡点击跳转对应 Ola 聊天模式 (/koala/chat?mode=xxx)
- [x] 拖拽功能: Pointer Events 实现, 位置持久化到 localStorage
- [x] 关闭/召唤: 右上角 x 关闭, 右下角小圆按钮召唤, 状态持久化
- [x] 气泡自适应方向: 左半屏→气泡左对齐, 右半屏→气泡右对齐
- [x] 深色模式适配, 集成到首页 HomeClient.tsx

### E2E 端到端测试脚本 ✅ 完成 (2026-05-25)
- [x] scripts/e2e-test.ts: 7步完整用户流程测试 (npx tsx scripts/e2e-test.ts)
  - Step 1: 聊天启动 (POST /api/ai/chat, mode=path)
  - Step 2: Profile capture (3轮对话 + DB验证)
  - Step 3: 教授匹配 (matchedProfessors 结构化返回)
  - Step 4: Academic CV 生成 (POST /api/user/cv/generate)
  - Step 5: Research Proposal 生成 (POST /api/user/research-proposal/generate, 6段结构验证)
  - Step 6: 套磁信生成 (POST /api/chat/generate-cold-email, subject+body验证)
  - Step 7: cold_emails 表记录验证 (status=draft)
- [x] 认证方案: Supabase auth cookie 构建 (base64url + chunking, 兼容 @supabase/ssr v0.10)
- [x] 测试用户自动创建/复用 (test@koalaphd.com, elite tier)
- [x] 修复 cold_emails 表缺失 student_snapshot / professor_snapshot 列的 bug

### 教授数据审计 + 文案更新 (2026-05-25)
- [x] 数据审计: 38所大学, 24,489条, 仅7,886 Verified(32.2%), 16,334条 OpenAlex-only 可疑数据(66.7%)
- [x] Adelaide 脏数据: 2,065条粒子物理论文合著者被 OpenAlex 误关联(同一批 research_areas)
- [x] 批量升级: 9条 UNSW Pending+有官网来源+有邮箱的记录升级为 Verified (→ 7,886 Verified)
- [x] 全站文案: "24,000+位教授" → "覆盖全澳38所大学" (首页hero/CTA/SEO/海报/邮件/FAQ/AI persona 共15处)
- [x] 首页底部计数器: 移除教授具体数量卡片, 保留"38 澳洲大学"和"30s 智能匹配"

### 博客生成系统性能优化 ✅ 完成 (2026-05-25)
- [x] 性能审计: generate 25-40s (Sonnet中文15-30s + Haiku翻译+SEO并行5-10s), generate-professor 30-65s (web验证10-30s + Sonnet中文15-30s + Haiku并行5s)
- [x] 优化一并行化: generate翻译+SEO已并行; generate-professor papers+grants DB读取改 Promise.allSettled 并行; 翻译+SEO增加 withTimeout 60s 包裹
- [x] 优化二封面图Fire-and-Forget: 新增 cover_image_status 列 (none/generating/done/failed); generate-cover 成功写done、失败写failed; 文章insert时预设generating; 前端可通过 GET /api/blog/[id] 轮询状态
- [x] 优化三错误隔离: 批量生成单篇独立try-catch、失败不中断后续; 所有AI调用增加 withTimeout (中文120s/翻译+SEO 60s/JSON修复30s/验证60s); safeParseJSON 统一清洗 markdown code fences + 末尾逗号
- [x] generate-professor maxDuration=300 + safeParseJSON + withTimeout + cookie转发封面图请求
- [x] professors/[id]/generate-blog maxDuration=300
- [x] 友好错误信息: 超时→504+中文描述, JSON异常→提示重试, 429→"操作太频繁"

## 待完成项目 (P4 路线图)

### 高优先级
- [ ] 教授反馈飞轮算法优化 (需500+条 professor_feedback 数据后启动)
- [ ] Ola 对话自然度持续优化 (基于 chat_feedback 数据分析)
- [ ] 教授规模化获客 (教授推荐教授 + ARC Grant触发邀请)
- [ ] Google OAuth 审核通过 (gmail.send scope 需要 Google 安全审核)

### 中优先级
- [ ] 套磁信 A/B 测试 (同一教授生成多版本,追踪回复率)
- [ ] 学生端仪表盘 (申请进度可视化 + 时间线)
- [x] 推荐信生成 ✅ (API+前端+PDF 已验证完成, Phase 9.5)
- [ ] 移动端 PWA 优化 (离线缓存 + push notification)

### 低优先级
- [ ] 多国扩展 (加拿大/英国教授数据)
- [ ] 教授端 Dashboard 增强 (学生申请管理 + 数据分析)
- [ ] AI 模型微调 (基于 chat_feedback + professor_feedback 数据)

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
