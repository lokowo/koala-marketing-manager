# Koala PhD — 完整产品规则文档 (PRD v2.0)
# 适用于 Claude Code / AI Coding Agent 的项目上下文
# 更新日期：2026-04-28
# 网站：koalastudy.net

---

## 〇、一句话定义

**Koala 是一个 AI PhD Advisor：通过深度理解学生背景 + 精准匹配澳洲教授 + 低价定制套磁信，颠覆传统留学中介模式。**

核心链路：AI 了解学生 → 免费展示教授匹配列表 → 付费生成定制套磁信（AUD 1/封）→ 一键批量发送 → 订阅持续服务。

---

# 一、商业模式（新版）

## 1.1 收入结构

| 层级 | 内容 | 价格 | 目的 |
|---|---|---|---|
| 免费 | AI 背景诊断 + CV/成绩单解析 + Research Readiness Score + 教授匹配列表（10位）+ 1封免费套磁信 + AI 陪伴对话 + 每日任务体验 | $0 | 获客、建立信任 |
| 单封套磁信 | 针对特定教授的深度定制套磁信（含 subject line + body + mini proposal pitch + follow-up 版本 + risk note） | AUD 1-3/封（Promotion 期间免费或 $0.99） | 核心付费点、低门槛颠覆中介 |
| 套磁包 | 10封 $9.9 / 30封 $19.9 / 100封 $49 | 批量折扣 | 提高 ARPU |
| 月度订阅 Koala Companion | 每周教授推荐 + 不限 AI 对话 + 每月邮件额度 + RP 方向优化 + follow-up 提醒 + persona 陪伴 | AUD 19.9 / 49 / 99 月 | 持续收入、长期粘性 |
| 人工深度咨询 | AI 生成 + Koala 顾问团队人工审核 + 完整申请策略 | AUD 999+ | 高端转化 |

**关键洞察**：传统中介收费 5-20 万人民币，Koala 把"找教授+写套磁信"这个环节降到 1 块钱一封，直接颠覆行业门槛。用户先用免费功能被 AI 打动，然后花极低成本试错，最终高匹配用户会主动寻求深度咨询。

## 1.2 引导到真人团队的设计

**不是每条消息都推销，而是在自然转折点引导：**

| 触发时机 | 引导方式 |
|---|---|
| 用户上传简历后 AI 发现"科研经历可以深度包装" | "你的背景有几个很有意思的包装角度，如果想要更精准的策略，可以预约 Koala 学术顾问聊 30 分钟" |
| 用户生成第 3 封套磁信后 | "你已经锁定了 3 位教授，套磁信已生成。如果你想要一个完整的申请 campaign + 人工审核，我们的顾问团队可以帮到你" |
| 用户在陪伴模式聊了 30 分钟焦虑 | "我能陪你聊，但有些决策需要真人帮你分析全局。要不要跟我们团队约个时间？" |
| 教授匹配分数 > 85% 且有 Industry 项目 | "这位教授的匹配度非常高，而且有 Industry 项目经费。这种机会建议尽快跟我们团队聊一下具体推进策略" |
| 用户完成每日任务连续 7 天 | "你已经坚持了一周，进展很棒。下一步如果想加速，可以预约一次免费的策略咨询" |

**引导入口统一格式**：
```
📞 预约 Koala 学术顾问
微信：KoalaStudy
邮箱：info@koalastudy.net
"Koala 背后是一个真实的澳洲产学研科研机构团队"
```

## 1.3 红线（绝对不能做的事）

1. 绝不说"保录取""保奖学金""保签证""100%成功率"
2. 绝不暗示"交钱就能免学费"
3. 绝不说"名额有限""最后X个名额"
4. 绝不编造教授信息——查不到就说"目前数据库暂无"
5. 绝不声称"我们跟教授有关系""我们能内推"
6. 绝不用"中介""机构"——用"学术顾问团队""产学研科研机构"
7. 绝不提供移民法律建议——引导咨询持牌移民律师
8. 所有公开内容经过 compliance check

---

# 二、C端前台设计

## 2.1 核心原则

1. **极简**——前端尽可能简单，主体就是 AI 对话
2. **AI 为核心**——用户进来第一件事是跟 Koala 对话，不是浏览页面
3. **移动端优先**——用户从小红书引流过来，一定是手机
4. **有趣味**——AI 有人格、有情绪价值、有成就系统、有每日任务

## 2.2 页面结构

```
底部 Tab 导航（5 个）：

[🐨 Koala]  [🏠 首页]  [👨‍🔬 教授]  [📰 博客]  [⚙ 工具]

🐨 Koala（默认 Tab，核心体验）
├── AI 对话全屏界面
├── 四模式 Tab：🎯路径评估 | 🔬科研深潜 | 💬陪伴 | ✍️文案
├── 文件上传（CV + 成绩单）
├── 教授匹配列表（对话中嵌入展示）
├── 套磁信生成 + 购买 + 一键发送
├── 每段回答反馈按钮
├── 对话导出（PDF/Markdown/打印）
└── 每日任务 + 成就进度条

🏠 首页
├── Hero：AI 对话入口（大按钮 + 四模式快捷入口）
├── "AUD 1 一封定制套磁信，颠覆中介模式"
├── 数据看板（教授数/项目数/覆盖大学数）
├── 教授精选（横滑）
├── 最新博客
├── 定价入口
└── Footer

👨‍🔬 教授
├── 列表页（搜索/筛选/排序）
└── 详情页
    ├── 教授信息 + Reference
    ├── Opportunity Signal 评分
    ├── "问 Koala" + "生成套磁信" 按钮
    └── 分享栏

📰 博客
├── 7 分类
└── 文章详情 + 分享

⚙ 工具
├── NIV 签证评估
├── PhD 难度自评
├── 定价页面
└── 个人设置 / 订阅管理
```

---

# 三、AI 人格设计

## 3.1 核心人格：考拉学长（统一入口）

Phase 1 只有一个统一人格"考拉学长"，但这个人格**不是一成不变的**——它会**模仿用户的说话方式**。

### 自适应语气引擎

```
检测维度：
1. 语言习惯：用户说中文/英文/中英混合 → AI 匹配
2. 句子长度：用户发短句（"均分78 工科"）→ AI 也简短干练
               用户发长段（详细描述经历）→ AI 也展开分析
3. 语气词频率：用户用"哈""呀""～""😅" → AI 也适当加入
                用户纯文字无表情 → AI 也保持简洁
4. 专业程度：用户用专业术语（"h-index""Q1"）→ AI 提高专业深度
              用户用日常语言（"论文""学校排名"）→ AI 用通俗解释
5. 情绪状态：用户表达焦虑/沮丧 → AI 切换到温暖鼓励模式
              用户状态积极/着急 → AI 切换到高效行动模式
6. 对话阶段：初次对话 → 热情但不过度
              多次回访 → 像老朋友，"你上次说想看量子方向的教授，我帮你找了几个新的"

实现方式：
- 前 3 轮对话，AI 观察用户风格
- 第 4 轮起，Claude System Prompt 动态追加：
  "用户的说话风格特征：[简短/详细]、[专业/日常]、[有表情/无表情]、[焦虑/积极]。
   请匹配用户的风格回复。用户喜欢看到像自己的人。"
```

### 情绪价值设计

AI 不只是工具，必须让用户感到被理解：

```
反馈示例（根据场景自动触发）：

[用户说自己均分低]
"均分不是唯一的衡量标准。很多 Industry 项目看的是你的背景能不能和课题对上号，而不是成绩单上的数字。"

[用户说没有论文]
"没有论文不代表你没有研究能力。你做过的课程项目、实习经历，都可以被包装成 applied research。我们来看看你有什么可以用的。"

[用户拖延没行动]
"今天不用做太多。我们只完成一件小事：把你简历里最像 research 的经历找出来。完成后你就离第一封套磁信只差一步了。"

[用户收到教授回复]
"🎉 恭喜！这说明你的邮件引起了教授注意。下一步我帮你写一封 follow-up，趁热打铁。"

[用户被教授拒绝]
"别灰心，一封没回不代表什么。PhD 申请本来就是概率游戏，我们多发几个方向不同的教授，总会有匹配的。"
```

## 3.2 Phase 2 拓展：多 Persona（基于用户行为自动推荐）

```
Phase 2 在积累足够用户数据后，自动识别用户类型并推荐 Persona：

检测逻辑：
├── 用户对话干练、发短句、要结果 → 推荐"学长型"（行动派）
├── 用户表达焦虑、发长段、有很多"...""😢" → 推荐"学姐型"（温暖型）
├── 用户问很多 Grant/经费/奖学金问题 → 推荐"Grant Hunter"
├── 用户拖延、隔很久才回来 → 推荐"Research Buddy"（任务派）
├── 用户问 ROI、比较 PhD vs 工作 → 推荐"策略官"
└── 用户用专业术语讨论学术问题 → 推荐"教授型"

推荐方式：不强制切换，而是在对话中自然提示：
"我注意到你比较关注 funding 方面的机会。你要不要试试我的 Grant Hunter 模式？我会重点帮你找有经费信号的教授。"

用户也可以随时手动切换。
```

---

# 四、教授数据自动采集（全自动化）

## 4.1 数据来源（综合检索，不止一个 API）

```
Source 1: ARC Data Portal API（政府经费数据）
├── 自动获取所有活跃 ARC 项目的 PI 信息
├── 覆盖 Engineering / CS / Materials 方向
├── 字段：PI 姓名、机构、项目标题、经费、时间
└── 频率：每周日自动同步

Source 2: Semantic Scholar API（学术指标）
├── 补全 h-index、论文数、引用数、近期论文
├── 匹配逻辑：PI 姓名 + 机构名
└── 频率：每周与 Source 1 同步

Source 3: 大学官网自动爬取（新增）
├── 目标：每所澳洲大学的 Staff Directory / People 页面
├── 提取：所有 Engineering / CS / Materials 相关院系的 staff
├── 字段：姓名、职称（Professor / A/Prof / Senior Lecturer / Lecturer / Research Fellow）
├── 重点识别：
│   ├── "Accepting HDR students" 标记
│   ├── "Research opportunities" 标记
│   ├── 个人主页链接
│   └── Lab 页面链接
├── 技术：Playwright 或 Puppeteer headless browser
├── 不是每所大学都有 API，大部分需要爬网页
├── 澳洲总共约 43 所大学，目标院系约 100-150 个网页
└── 频率：每月全量爬取一次

Source 4: LinkedIn 公开信息（补充）
├── 搜索教授 LinkedIn 主页
├── 提取：education history、current position、connections、recent posts
├── 注意：不爬取受保护的内容，只用公开可见的信息
├── 技术：Google 搜索 "site:linkedin.com {professor name} {university}"
└── 频率：教授首次入库时执行一次

Source 5: Google Scholar（补充学术数据）
├── 获取教授的 Google Scholar Profile
├── 补全：h-index（如果 Semantic Scholar 没匹配到）、i10-index、引用总数
└── 技术：SerpAPI 或 Google Scholar Scraper
```

## 4.2 教授 ≠ 仅限 Professor

**重要**：数据库不只收录 Professor。任何能带研究生的人都应该收录：

| 职称 | 英文 | 能否带 PhD | 能否带 MRes | 优先级 |
|---|---|---|---|---|
| Professor | Professor | ✅ | ✅ | 高 |
| 副教授 | Associate Professor | ✅ | ✅ | 高 |
| 高级讲师 | Senior Lecturer | ✅（通常需要作为 co-supervisor） | ✅ | 中 |
| 讲师 | Lecturer | ❌（通常） | ✅ | 中 |
| 研究员 | Research Fellow / Senior Research Fellow | ✅（如果有资格） | ✅ | 高（新人更需要学生） |
| 博士后 | Postdoctoral Fellow | ❌ | ❌ | 低 |

数据库中必须**清楚标注职称**，不能统一叫"教授"。前端展示时使用真实职称。

## 4.3 Opportunity Signal 评分（自动计算）

每位教授入库时自动计算 Opportunity Score（0-100）：

```
Career Stage Signal（0-20分）
├── 新入职 Lecturer / ECR / Research Fellow: +20
│   → 需要建团队、完成学校 KPI
├── Senior Lecturer with active lab: +15
├── Associate Professor: +10
├── Established Full Professor: +5

Grant Signal（0-30分）
├── ARC Linkage / Industry Grant within 2 years: +30
│   → 有项目交付压力，需要学生
├── ARC Discovery Project within 2 years: +20
├── Large industry collaboration: +25
├── Old grant (>3 years): +5
├── No public grant: 0

Interdisciplinary Gap Signal（0-20分）
├── 项目标题包含跨学科关键词: +15
│   （如材料教授的项目需要"sensor design""data analytics""system integration"）
├── 合作方来自不同领域: +10
├── 纯本领域项目: +5
→ 这是核心洞察：一个材料教授拿了大 Grant，
  他不只需要材料学生，可能需要做电路、AI、项目管理的人

Publication Momentum Signal（0-15分）
├── 近 2 年 5+ 篇论文: +10
├── 多名学生共同作者: +5
├── Lab page 活跃: +5

Explicit PhD Opening Signal（0-15分）
├── 官网明确写 "Accepting PhD students": +15
├── 列出 HDR supervision: +10
├── 无说明: 0

总分 = Career + Grant + Interdisciplinary + Publication + Explicit
```

前端展示时**不显示具体分数**，而是用语言表达：

```
Opportunity Score > 70: "公开资料显示，该方向近期存在较强的研究机会信号"
Opportunity Score 40-70: "该方向可能存在研究机会，建议进一步了解"
Opportunity Score < 40: "目前公开信息有限，可以尝试联系了解"
```

## 4.4 采集管线监控（替代 Discovery Center）

后台不再有手动搜索的 Discovery Center，改为**采集管线监控面板**：

```
/dashboard/koala/pipeline

显示：
├── 上次全量采集时间
├── 本周新增教授数
├── 本周更新教授数
├── 待人工审核数（Semantic Scholar 匹配置信度 < 70%）
├── API 状态（ARC API / Semantic Scholar / 各大学官网爬虫）
├── API 用量统计
├── 错误日志
├── [一键触发全量采集] 按钮
├── [手动补充教授] 入口（填姓名+学校 → 自动搜索 → 人工确认）
└── 知识库同步状态

手动补充教授流程：
1. Admin 输入教授姓名 + 大学名
2. 系统自动搜索：大学官网 + Semantic Scholar + ARC Portal + LinkedIn
3. 返回搜索结果
4. Admin 确认/修正 → 入库
```

---

# 五、教授匹配逻辑

## 5.1 Match Score 五维公式

```
Professor Match Score =
  Academic Fit      25%    专业方向接近程度
  Skill Fit         25%    学生技能能否补项目短板
  Opportunity Signal 25%   教授近期是否可能需要学生
  Proposal Potential 15%   学生背景能否写出合理 RP
  Communication Fit  10%   是否容易写出针对性套磁信

Academic Fit 计算：
├── 学生专业与教授研究方向的 embedding 相似度
├── 学生课程关键词与教授论文标题的重叠度
└── 跨专业合理性评估（某些跨学科组合是合理的，如 EE→量子传感）

Skill Fit 计算（核心差异化）：
├── 分析教授 Grant 项目的需求（从项目摘要推理）
├── 分析学生简历中的技能
├── 匹配：教授项目需要什么 + 学生能做什么
└── 重点识别：教授领域学生不太可能有的技能（= 跨学科机会）

例子：
材料教授 Grant 做"可扩展量子传感器阵列"
→ 推理：需要 MEMS 器件设计 + 电路仿真 + 数据采集系统
→ 一个电子信息本科生的 Skill Fit 可能比材料本科生更高
→ 这就是"跨学科进组"的精准匹配
```

## 5.2 匹配结果展示（前端，免费）

```
教授匹配列表（对话中嵌入 or 独立页面，免费展示前 10 位）：

┌─────────────────────────────────┐
│ 🎯 为你匹配的澳洲教授           │
│                                 │
│ #1 Prof. Liwei Chen · UNSW     │
│    量子传感 · MEMS               │
│    Match Score: 87%              │
│    Opportunity: 🟢 较强信号       │
│    "电子信息背景与该教授的        │
│     MEMS 项目需求高度匹配"       │
│    [🔓 免费] [✉️ 生成套磁信 $1]  │
│                                 │
│ #2 A/Prof. Kai Zheng · UTS     │
│    ...                          │
│                                 │
│ #3 Prof. Rui Deng · UQ         │
│    ...                          │
│                                 │
│ 查看完整 10 位教授 →             │
│                                 │
│ 想解锁更多教授或深度策略？        │
│ [📞 预约 Koala 学术顾问]         │
└─────────────────────────────────┘

免费可见：教授姓名、学校、方向、匹配分数、简短理由
付费解锁：针对该教授的定制套磁信（$1/封）
```

---

# 六、套磁信系统（核心付费功能）

## 6.1 套磁信生成逻辑

```
每封套磁信基于：
1. 学生完整 Profile（AI 分析的背景、技能、动机）
2. 教授的研究方向 + 近期论文 + Grant 项目
3. 教授项目的跨学科需求推理
4. 学生与教授之间的具体匹配点

输出内容（一封完整套磁信包含）：
├── Subject Line（引起注意、不像群发）
├── Opening（为什么联系这位教授——具体引用他的研究）
├── Student Background（把学生经历转化为研究价值）
├── Research Fit（学生的技能如何补教授项目短板）
├── Mini Proposal Pitch（一句话描述可能的 RP 方向）
├── Soft CTA（请求 meeting 或询问 HDR opportunity）
├── Follow-up 版本（2 周后如果没回复的跟进邮件）
└── Risk Note（内部提醒，不发给教授："该教授可能xxx，建议xxx"）

关键要求：
- 绝不出现"保录取""guaranteed"等词
- 绝不一开口就问奖学金
- 必须引用教授具体的研究/论文/项目
- 每封信都是完全不同的（不是模板替换变量）
- 语气专业、简洁、自然
```

## 6.2 一键发送功能

```
用户生成套磁信后：
├── [📋 复制] → 用户自己去发
├── [📧 一键发送] → 系统代发（Phase 2）
│   ├── 需要用户先绑定自己的邮箱（Gmail / Outlook OAuth）
│   ├── 以用户自己的邮箱名义发出
│   ├── 系统只是代为发送，不用 Koala 的邮箱
│   ├── 追踪：是否打开、是否回复
│   └── 自动触发 follow-up 提醒
└── [📦 批量发送] → 选择多位教授 → 生成多封 → 一键全发
    ├── 每封都是完全不同的内容（不是同一封发 100 个人）
    ├── 发送间隔随机（避免被识别为批量发送）
    └── 限制每天最多发送 10 封（保护用户邮箱信誉）
```

## 6.3 定价与购买流程

```
用户在对话中看到匹配的教授 → 点"生成套磁信"
  ↓
如果是第一封 → 免费生成（体验）
  ↓
第二封起 → 弹出购买提示：
  ┌────────────────────────┐
  │ ✉️ 生成套磁信            │
  │                        │
  │ 单封：AUD 1.00          │
  │ 10封包：AUD 9.90 (省$0.1/封) │
  │ 30封包：AUD 19.90       │
  │ 100封包：AUD 49.00      │
  │                        │
  │ 🎉 新用户优惠：前3封 $0.99 │
  │                        │
  │ [购买积分] [月度订阅更划算 →] │
  └────────────────────────┘

积分系统：
├── 用户预充值积分（1 积分 = 1 封套磁信）
├── 积分不过期
├── 月度订阅包含每月 N 封额度
└── 积分余额在 AI 对话界面右上角显示
```

---

# 七、趣味机制与粘性设计

## 7.1 每日小任务系统

```
目的：让用户愿意每天花 5-10 分钟碎片化时间在 Koala 上

Day 1: 上传 CV → AI 找到 3 个可包装的研究亮点
Day 2: 选择 3 个感兴趣的研究方向
Day 3: AI 推荐 5 位最匹配的教授
Day 4: 生成第一封免费套磁信
Day 5: 优化 Research Proposal 的一句话总结
Day 6: 复制/发送第一批邮件
Day 7: 复盘本周进度 → AI 给出下周计划

任务完成后 AI 反馈：
"✅ 今天的任务完成了！你已经比 80% 的申请者走得更快。明天我帮你写第一封套磁信。"
```

## 7.2 成就系统

```
用户可获得徽章：
├── 🏅 First CV Uploaded — 第一步永远最难
├── 🎯 First Professor Matched — 找到你的学术命中注定
├── ✉️ First Email Generated — 套磁之路正式开启
├── 📬 First Reply Received — 教授注意到你了！
├── 🔬 Research Angle Unlocked — 你的 RP 方向有了
├── 🏆 Grant Hunter — 找到了有经费的教授
├── 📊 RP Starter — Research Proposal 初稿完成
├── 🚀 Outreach Campaign Ready — 10 封套磁信已就绪
└── 💎 PhD Pathway Clear — 完整路径规划完成

成就在 AI 对话中自然弹出：
"🏅 恭喜获得 'First Professor Matched' 徽章！
 你已经找到了第一位匹配教授。继续加油，
 下一个目标是生成你的第一封套磁信。"
```

## 7.3 Progress Bar（进度追踪）

```
在 AI 对话界面顶部或"我的"页面显示：

Research Readiness:  ████████░░ 72/100
Professors Matched:  12 位
Emails Generated:    5 封
Emails Sent:         2 封
Replies Received:    1 封
RP Angle Completed:  ██████░░░░ 60%

进度条随用户操作实时更新，给用户成就感
```

---

# 八、科研深潜模式（知识库交互）

## 8.1 工作方式

```
用户提问 → 三源并行检索 → Claude 综合回答

Source A: Semantic Scholar API（实时论文）
Source B: Koala 知识库 pgvector（预存综述/教材/FAQ）
Source C: 教授数据库 tag 检索（澳洲相关教授）

回答结构：
1. 直接回答（2-3 句核心答案）
2. 详细分析（分段 + 每段标注 [Source] + 置信度 🟢🟡🔴⚠）
3. 延伸阅读（5 篇推荐论文，含 DOI 链接）
4. 澳洲教授关联（可选，匹配到才显示）
5. 反馈按钮：[👍] [🤔] [👎] [📝]
```

## 8.2 反幻觉四层机制

```
Layer 1: 检索约束 — 只基于检索结果回答，查不到就说"不知道"
Layer 2: 引用强制 — 每个技术论点标注 [Source]，无来源标 ⚠
Layer 3: 置信度标注 — 🟢多论文共识 🟡少量文献 🔴推理 ⚪未知
Layer 4: 用户反馈 — 👎→审核队列→知识库修正
```

## 8.3 知识库自动建设

```
自动入库来源：
├── 教授论文摘要（Semantic Scholar 采集时同步向量化）
├── ARC 项目摘要（ARC 同步时处理）
├── 博客文章（发布时自动向量化）
├── FAQ 种子内容（koalastudy.net Q&A 一次性导入）
└── 用户反馈修正（Admin 审核后纳入）

增长飞轮：
用户提问 → AI 回答 → 反馈 → 薄弱领域识别 → 知识库补充 → 质量提升
```

---

# 九、后台功能模块

```
/dashboard
├── 仪表盘（线索/对话/收入/教授更新 统计）
│
├── /dashboard/koala/pipeline（采集管线监控）
│   ├── 上次采集时间 + 新增/更新数量
│   ├── API 状态 + 错误日志
│   ├── [一键全量采集] [手动补充教授]
│   └── 知识库同步状态
│
├── /dashboard/koala/professors（教授管理）
│   ├── 全部自动采集，Admin 做审核
│   ├── 待审核队列
│   └── 每位教授可微调 AI 生成的摘要
│
├── /dashboard/koala/grants（经费追踪）
│   └── ARC 项目列表 + 自动关联教授
│
├── /dashboard/koala/leads（线索管理）
│   ├── 来源 / AI评分 / 状态 / 文件
│   ├── 完整对话记录
│   └── 简历/成绩单下载
│
├── /dashboard/koala/content-generator（内容生成器）
│   ├── 从教授/Grant/话题生成博客文章
│   ├── 自动生成三平台社媒版本
│   └── 敏感词自动检查
│
├── /dashboard/koala/publishing（发布管理）
│   └── 各平台发布效果追踪
│
├── /dashboard/koala/feedback（反馈分析）
│   ├── 按模式的 👍/👎 统计
│   ├── 高频问题排行
│   └── 知识库更新建议
│
├── /dashboard/koala/knowledge-base（知识库管理）
│   ├── 查看/搜索/删除 chunks
│   ├── 手动上传论文
│   └── 测试搜索
│
└── /dashboard/koala/revenue（收入统计）
    ├── 套磁信购买数 / 收入
    ├── 订阅用户数
    ├── 转化率（免费→付费）
    └── 退款率
```

---

# 十、数据模型补充

## 10.1 新增/修改的数据表

```sql
-- 用户积分/订阅
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  credit_balance INTEGER DEFAULT 1,  -- 新用户送 1 积分（1封免费套磁信）
  subscription_tier TEXT,  -- null / 'basic' / 'pro' / 'premium'
  subscription_monthly_credits INTEGER DEFAULT 0,
  subscription_expires_at TIMESTAMPTZ,
  total_credits_purchased INTEGER DEFAULT 0,
  total_credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 套磁信记录
CREATE TABLE outreach_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  professor_id UUID REFERENCES professors(id),
  match_id UUID,  -- 对应的 match 记录
  
  subject_line TEXT NOT NULL,
  email_body TEXT NOT NULL,
  followup_body TEXT,
  
  tone TEXT,  -- 'professional' / 'warm' / 'direct' / 'academic'
  purpose TEXT,  -- 'PhD' / 'MRes' / 'RA' / 'Scholarship'
  
  risk_note TEXT,  -- 内部提醒，不发给教授
  
  status TEXT DEFAULT 'draft',  -- 'draft' / 'copied' / 'sent' / 'replied' / 'no_reply'
  sent_at TIMESTAMPTZ,
  reply_received_at TIMESTAMPTZ,
  
  credits_used INTEGER DEFAULT 1,
  was_free BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户成就
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  achievement_key TEXT NOT NULL,  -- 'first_cv' / 'first_match' / 'first_email' etc
  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 每日任务
CREATE TABLE daily_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  day_number INTEGER,  -- Day 1, Day 2...
  task_key TEXT NOT NULL,
  task_title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunity Signal 评分
ALTER TABLE professors ADD COLUMN IF NOT EXISTS
  opportunity_score INTEGER DEFAULT 0;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS
  opportunity_breakdown JSONB;  -- {career: 20, grant: 30, interdisciplinary: 15, publication: 10, explicit: 0}
ALTER TABLE professors ADD COLUMN IF NOT EXISTS
  position_title TEXT;  -- "Professor" / "Associate Professor" / "Senior Lecturer" / "Lecturer" / "Research Fellow"
ALTER TABLE professors ADD COLUMN IF NOT EXISTS
  linkedin_url TEXT;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS
  lab_url TEXT;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS
  accepting_students TEXT;  -- 'yes' / 'no' / 'unknown'（从官网爬取）
```

---

# 十一、开发原则（给 Claude Code 的指令）

```
1. Koala 不是传统留学网站，是 AI PhD Advisor + 教授匹配 + 套磁自动化平台
2. C端前台极简，主体是 AI 对话
3. AI 必须有人格、情绪价值、自适应语气
4. 教授匹配列表免费，套磁信收费（$1/封）
5. 后台是 Research Intelligence 系统，全自动采集
6. 数据来源必须标注 Reference，不编造
7. 所有公开内容经过 compliance check
8. API key 只在 .env.local，不进前端
9. 自动采集信息经人工审核再发布
10. AI 的核心价值 = 理解学生 + 理解教授 + 精准匹配 + 陪伴推进
11. 低价套磁信是颠覆中介的关键——不能做成高价产品
12. 一键发送不是垃圾邮件——每封都是完全定制的，只是代发
13. 用户粘性来自趣味性（任务/成就/进度）+ 情绪价值（AI 像人）
14. 移动端优先——所有设计先为手机考虑
```

---

# 十二、与原文档的差异说明

| 原文档 | 本文档修正 |
|---|---|
| 6 个 AI Persona | Phase 1 统一人格 + 自适应语气引擎 |
| Discovery Center 手动搜索 | 改为采集管线监控面板 + 多源自动化 |
| 只搜索 Professor | 扩展到所有能带研究生的职称 |
| 只用 ARC API + Semantic Scholar | 新增：大学官网爬取 + LinkedIn + Google Scholar |
| 批量 Campaign 作为高端功能 | 套磁信 $1/封作为核心付费，批量是正常用法 |
| 15+ 数据表 | 精简 + 新增 credits / achievements / daily_tasks |
| 无 Opportunity Signal 评分 | 新增五维自动评分系统 |
| AI 语气固定 | 新增自适应语气引擎（模仿用户） |
| 无趣味机制 | 新增每日任务 + 成就 + 进度条 |
| 无引导到真人团队设计 | 新增 5 个自然引导触发时机 |
