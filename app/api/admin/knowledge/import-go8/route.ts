import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';
import { createEmbeddingsBatch } from '../../../../lib/server/embedding';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const GO8_ENTRIES = [
  {
    source_title: 'University of Sydney (USYD) — PhD 申请完整指南',
    source_type: 'guide' as const,
    content: `悉尼大学 PhD 申请指南

【基本信息】
- QS 2025 排名：全球第 18，澳洲第 1（US News）
- 学制：3-4 年（全日制），最长 4.5 年
- 入学时间：全年 4 个 Research Period（RP1-RP4），主要在 RP2（3月）和 RP3（7月）入学

【申请要求】
- 学术：荣誉学位一等（H1，即 80%+）或同等学历；有研究经验
- 英语：IELTS 总分 6.5（单项不低于 6.0）或 PTE 61（单项不低于 54）；部分专业要求更高
- 材料：学术成绩单、学位证、CV、研究计划（Research Proposal）、导师支持信、2封推荐信
- 重要：必须先联系导师并获得初步同意（Supervisor Acceptance）再提交申请

【奖学金】
- RTP Fee Offset：免全部学费，最长 3.5 年
- USYDIS（University of Sydney International Stipend）：生活津贴 AUD 42,754/年（2026），含 OSHC 医保、论文津贴（最高 AUD 840）、每年 20 天休假
- 申请方式：在提交 HDR 申请时勾选 RTP consideration 即可，无需单独申请
- 截止日期：RP1&2（2027入学）→ 2026年9月11日；RP3&4 → 2026年12月18日

【申请建议】
- 提前 3-6 个月联系导师，准备充分的 Research Proposal
- 悉尼大学看重导师匹配度和研究潜力，GPA 不是唯一标准
- 中国学生注意：如走 CSC 公派，需导师在 LOA 中明确表示愿意作为共同导师`,
  },
  {
    source_title: 'University of Melbourne (UniMelb) — PhD 申请完整指南',
    source_type: 'guide' as const,
    content: `墨尔本大学 PhD 申请指南

【基本信息】
- QS 2025 排名：全球第 13，澳洲第 1
- 学制：3-4 年全日制
- 入学时间：全年滚动录取，主要 2 月和 7 月入学

【申请要求】
- 学术：H1 荣誉学位（80%+）或研究型硕士，有高质量研究成果者优先
- 英语：IELTS 总分 6.5（单项 6.0）；部分学院如 Arts 要求 7.0
- 材料：成绩单、学位证、CV、Research Proposal（2000-3000 字）、导师确认信、2 封推荐信
- 关键：Melbourne 非常看重 Research Proposal 的质量，建议提前与导师讨论和修改

【奖学金】
- Melbourne Research Scholarship (MRS)：国际学生全额奖学金，含学费减免 + 生活津贴（约 AUD 40,000/年）
- Graduate Research Scholarships (GRS)：部分学院专项奖学金
- RTP（联邦政府）：学费减免 + 生活津贴
- 申请方式：提交 PhD 申请时自动被考虑
- 截止日期：通常 10 月 31 日（次年入学），部分学院有额外截止日

【申请建议】
- Melbourne 是 Go8 中对 Research Proposal 要求最高的，建议投入充足时间准备
- 强烈建议提前发表至少 1 篇期刊论文或会议论文
- 部分学院（如工程、医学）竞争极其激烈，提前 6 个月以上开始准备`,
  },
  {
    source_title: 'UNSW Sydney — PhD 申请完整指南',
    source_type: 'guide' as const,
    content: `新南威尔士大学 PhD 申请指南

【基本信息】
- QS 2025 排名：全球第 19
- 学制：3-4 年全日制，三学期制（T1/T2/T3）
- 入学时间：每年 3 个 Term，灵活入学

【申请要求】
- 学术：荣誉学位一等或同等（通常 GPA 3.7/4.0 或 85%+），研究经验
- 英语：IELTS 总分 6.5（单项 6.0）；部分专业更高
- 材料：成绩单、学位证、CV、Research Description（非正式 Proposal）、导师确认、推荐信
- 必须先联系导师并面试通过后再申请

【奖学金】
- University International Postgraduate Award (UIPA)：学费减免 + 生活津贴（约 AUD 40,000/年）
- Scientia PhD Scholarship：UNSW 顶级奖学金，除学费和津贴外还包含学术发展资金（AUD 10,000/年用于参加会议等）
- TFS (Tuition Fee Scholarship)：仅学费减免
- 截止日期：Term 1 — 通常前一年 8-9 月

【特色】
- UNSW 工程和计算机学院在澳洲排名顶尖，中国学生申请热度高
- Scientia PhD 竞争激烈但待遇极好，适合顶尖申请者
- UNSW 接受 CSC 联合培养博士

【申请建议】
- UNSW 导师面试环节非常重要，准备好讨论研究细节
- 工程学院特别看重相关行业经验
- 奖学金获得者需在 2 周内接受 offer`,
  },
  {
    source_title: 'Australian National University (ANU) — PhD 申请完整指南',
    source_type: 'guide' as const,
    content: `澳大利亚国立大学 PhD 申请指南

【基本信息】
- QS 2025 排名：全球第 30，位于堪培拉
- 学制：3-4 年全日制
- 入学时间：全年滚动录取

【申请要求】
- 学术：一等荣誉学位或同等，强调研究能力
- 英语：IELTS 总分 6.5（单项 6.0）
- 材料：成绩单、学位证、CV、Research Proposal、导师确认、推荐信

【奖学金】
- ANU HDR Fee Merit Scholarship：国际学生学费减免
- University Research Scholarship：生活津贴约 AUD 35,000/年
- ANU-CSC Scholarship：与中国国家留学基金委联合奖学金
- 截止日期：通常 8 月 31 日和 12 月底

【特色】
- ANU 作为国立大学，与联邦政府科研机构（CSIRO、DSTO 等）关系密切
- 研究实力在某些领域（天文、政治学、亚太研究）全球领先
- 校园位于堪培拉，生活成本低于悉尼墨尔本
- ANU-CSC 项目名额相对充足

【申请建议】
- ANU 适合偏学术/科研方向的学生
- 堪培拉就业机会相对少，适合真正想做学术的人
- CSC 申请者注意：ANU 是 CSC 合作院校，流程相对成熟`,
  },
  {
    source_title: 'University of Queensland (UQ) — PhD 申请完整指南',
    source_type: 'guide' as const,
    content: `昆士兰大学 PhD 申请指南

【基本信息】
- QS 2025 排名：全球第 40，位于布里斯班
- 学制：3-4 年全日制
- 入学时间：1月/5月/9月

【申请要求】
- 学术：荣誉一等（H1）或同等
- 英语：IELTS 总分 6.5（单项 6.0）
- 材料：成绩单、学位证、CV、Research Proposal、导师确认、推荐信

【奖学金】
- Graduate School Scholarship (UQGSS)：学费 + 生活津贴
- UQ Research Training Program (RTP)：联邦政府资助
- UQ-CSC Scholarship：与 CSC 联合奖学金
- 截止日期：通常 4 月和 10 月

【特色】
- 生物医学、环境科学、工程领域研究实力强
- 布里斯班生活成本比悉尼墨尔本低 20-30%
- UQ 的 Institute for Molecular Bioscience (IMB) 世界知名

【申请建议】
- UQ 对中国学生相对友好，CSC 名额充足
- 布里斯班气候好、生活舒适，适合安心做研究
- 建议在 Research Proposal 中体现对 UQ 具体研究组的了解`,
  },
  {
    source_title: 'Monash University — PhD 申请完整指南',
    source_type: 'guide' as const,
    content: `蒙纳士大学 PhD 申请指南

【基本信息】
- QS 2025 排名：全球第 37，位于墨尔本
- 学制：3-4 年全日制
- 入学时间：全年滚动录取，主要 2 月和 7 月

【申请要求】
- 学术：H1 或同等（中国 985/211 均分 80%+，双非 85%+）
- 英语：IELTS 总分 6.5（单项 6.0）
- 材料：成绩单、学位证、CV、Research Proposal（约 2000 字）、导师确认、2 封推荐信

【奖学金】
- Monash Graduate Scholarship (MGS)：学费减免
- Monash International Tuition Scholarship (MITS)：国际学生学费
- Graduate Research Stipend：生活津贴约 AUD 37,000/年
- Monash-CSC Joint Scholarship：与 CSC 联合
- 截止日期：通常 5 月和 10 月

【特色】
- Monash 药学和药理学全球第 1
- 在马来西亚和南非有海外校区，研究合作网络广
- Clayton 校区科研设施世界一流（同步辐射光源等）

【申请建议】
- Monash 对中国学生比较友好，成功率相对较高
- 药学、化学、材料科学方向强烈推荐
- 提前联系导师时可以提及对 Monash 特有设施的兴趣`,
  },
  {
    source_title: 'University of Western Australia (UWA) — PhD 申请完整指南',
    source_type: 'guide' as const,
    content: `西澳大学 PhD 申请指南

【基本信息】
- QS 2025 排名：全球第 77，位于珀斯
- 学制：3-4 年全日制
- 入学时间：全年滚动录取

【申请要求】
- 学术：H1 或同等
- 英语：IELTS 总分 6.5（单项 6.0）
- 材料：成绩单、学位证、CV、Research Proposal、导师确认、推荐信

【奖学金】
- UWA International Research Training Program (RTP)：学费 + 生活津贴（约 AUD 35,000/年）+ OSHC
- Ad Hoc Scholarships：各学院自有奖学金
- UWA-CSC Scholarship
- 截止日期：通常 8 月和 1 月

【特色】
- 海洋科学、采矿工程、农业科学澳洲领先
- 珀斯生活成本低、环境好、华人社区成熟
- UWA 的 Oceans Institute 在海洋研究领域世界知名

【申请建议】
- UWA 竞争相对较小，奖学金成功率高于东部 Go8
- 适合海洋/矿业/农业/环境方向的学生
- 珀斯与中国时差小（无时差），方便与国内沟通`,
  },
  {
    source_title: 'University of Adelaide — PhD 申请完整指南',
    source_type: 'guide' as const,
    content: `阿德莱德大学 PhD 申请指南

【基本信息】
- QS 2025 排名：全球第 82，位于阿德莱德
- 学制：3-4 年全日制
- 入学时间：全年滚动录取，主要 2 月和 7 月

【申请要求】
- 学术：H1 或同等（门槛相对灵活，看重导师推荐）
- 英语：IELTS 总分 6.5（单项 6.0）
- 材料：成绩单、学位证、CV、Research Proposal、导师确认、推荐信

【奖学金】
- Adelaide Graduate Research Scholarship (AGRS)：学费减免
- Adelaide Scholarship International (ASI)：学费 + 生活津贴 + OSHC，最慷慨的 Go8 奖学金之一
- RTP Scholarship
- 截止日期：通常 4 月和 8 月

【特色】
- 澳洲葡萄酒研究第一、食品科学强、机械工程有特色
- 阿德莱德是澳洲生活成本最低的首府城市
- PhD 毕业后可以获得南澳额外的移民加分
- 阿德莱德大学 2026 年与南澳大学合并为 Adelaide University，研究实力将进一步增强

【申请建议】
- Adelaide 是 Go8 中奖学金获取难度最低的，适合背景一般但有明确研究方向的学生
- 南澳移民加分是独特优势，适合有移民计划的学生
- 食品/葡萄酒/环境方向的同学首选`,
  },
  {
    source_title: 'Go8 大学 PhD 奖学金对比一览表',
    source_type: 'guide' as const,
    content: `Go8 澳洲八大 PhD 奖学金对比（2026 年）

| 大学 | 主要奖学金 | 年生活津贴 | 学费覆盖 | 申请难度 | 特殊优势 |
|------|----------|----------|---------|---------|--------|
| Melbourne | MRS | ~40,000 | 全免 | ★★★★★ | 排名最高 |
| Sydney | USYDIS | 42,754 | 全免 | ★★★★☆ | 津贴最高 |
| UNSW | UIPA/Scientia | ~40,000 | 全免 | ★★★★☆ | Scientia 含会议经费 |
| ANU | University Research | ~35,000 | 全免 | ★★★★☆ | CSC 名额多 |
| UQ | UQGSS | ~37,000 | 全免 | ★★★☆☆ | 生物医学强 |
| Monash | MGS | ~37,000 | 全免 | ★★★☆☆ | 药学全球第一 |
| UWA | RTP | ~35,000 | 全免 | ★★☆☆☆ | 竞争较小 |
| Adelaide | ASI | ~35,000 | 全免 | ★★☆☆☆ | 移民加分+最低生活成本 |

通用申请材料：学术成绩单 + 学位证 + CV + Research Proposal + 导师确认信 + 2封推荐信 + IELTS 6.5+

策略建议：
- 背景强（985 GPA 85+、有发表）→ 冲 Melbourne/Sydney/UNSW
- 背景中等（211 GPA 80+）→ UQ/Monash/ANU
- 背景一般但有研究潜力 → UWA/Adelaide（奖学金成功率高）
- 有移民计划 → Adelaide（南澳加分）/ UWA（西澳加分）
- 走 CSC 公派 → ANU/UQ/Monash（CSC 合作成熟）`,
  },
  {
    source_title: '澳洲 PhD 套磁信（Cold Email）写作完整指南',
    source_type: 'guide' as const,
    content: `澳洲 PhD 套磁信写作指南

【什么是套磁信】
套磁信（Cold Email）是申请者直接联系潜在导师的邮件，目的是：建立联系、表达研究兴趣、获取导师的初步同意（这在澳洲是申请 PhD 的前置条件）。

【为什么澳洲 PhD 必须套磁】
与英美不同，澳洲 PhD 是导师制——必须先找到愿意指导你的导师，拿到 Supervisor Acceptance Letter，才能正式提交申请。没有套磁 = 无法申请。

【套磁信结构（5 段式）】
1. 开头：一句话说明你是谁 + 为什么联系这位教授
2. 学术背景：简述你的学历、研究经验、发表情况
3. 研究匹配：具体说明你对教授哪个研究方向感兴趣 + 引用教授最近的论文
4. 你的研究想法：简述你想做的研究方向（2-3句，不需要完整 Proposal）
5. 收尾：礼貌请求视频会议或进一步讨论的机会

【禁忌】
- 群发模板（教授一看就知道）
- 不提教授的具体研究（最大禁忌）
- 邮件超过 300 字（教授没时间看长文）
- 附件超过 1 个（只附 CV，不要附 SOP/论文）
- 用 Dear Sir/Madam（必须用教授的名字）

【发送时机】
- 最佳：奖学金截止日前 3-6 个月
- 避开：圣诞假期（12月中-1月底）、澳洲学校假期
- 周二到周四发送，当地时间上午 9-11 点

【未回复怎么办】
- 等 7-10 天后发 Follow-up（简短，2-3 句）
- 最多 Follow-up 2 次
- 仍无回复 → 换同一学院其他教授

【回复率参考】
- 平均回复率：15-25%
- 有针对性的套磁信：30-40%
- 模板群发：<5%`,
  },
  {
    source_title: '澳洲 PhD 签证 Subclass 500 申请指南',
    source_type: 'guide' as const,
    content: `澳洲学生签证 Subclass 500（PhD 适用）申请指南

【概述】
所有在澳洲攻读 PhD 的国际学生都需要 Subclass 500 学生签证。PhD 签证有特殊优待。

【基本要求】
- 有效的 CoE（Confirmation of Enrolment）
- 财力证明（银行存款证明或奖学金证明）
- OSHC 海外学生医疗保险
- 英语成绩（IELTS/PTE）
- 无犯罪记录证明
- 体检
- GTE（Genuine Temporary Entrant）声明

【PhD 签证特殊优待】
- 签证时长：覆盖整个 PhD 学制 + 额外 6 个月
- 打工限制：PhD 学生无打工时间限制（非 PhD 学生限 48 小时/两周）
- 配偶签证：配偶可以获得无限制工作权利
- 子女教育：部分州（如 ACT、SA）PhD 学生子女可享受本地学费

【GTE 声明要点】
- 说明为什么选择这个专业方向
- 说明为什么选择澳洲（而非其他国家）
- 说明为什么选择这所大学和这位导师
- 说明学成后的计划（注意：不要明确说移民）
- 字数：500-800 字

【费用】
- 签证申请费：AUD 710（2026）
- OSHC：约 AUD 500-600/年（PhD 有奖学金者通常由学校覆盖）
- 体检费：约 AUD 300-400

【处理时间】
- 通常 4-8 周
- 建议在开学前至少 3 个月提交

【常见拒签原因】
- GTE 声明不够真诚
- 财力证明不足
- 英语成绩不达标
- 过往签证历史有问题`,
  },
  {
    source_title: 'CSC（国家留学基金委）澳洲 PhD 公派留学指南',
    source_type: 'guide' as const,
    content: `CSC 公派留学申请澳洲 PhD 指南

【什么是 CSC】
国家留学基金管理委员会（China Scholarship Council）提供全额奖学金资助中国学生到海外攻读博士学位。

【CSC 资助内容】
- 生活费：约 AUD 2,800/月（2026 年标准），免税
- 往返国际机票
- 签证费
- 部分学校免学费（需学校提供 Tuition Fee Waiver）

【申请条件】
- 中国国籍
- 应届硕士毕业生或在职人员（一般年龄不超过 35 岁）
- 外语条件：IELTS 6.5+ 或 WSK 合格
- 需获得国外大学的录取通知书（LOA）或导师邀请信

【申请流程（时间线）】
- 9-11月：联系澳洲导师，获取 LOA
- 12月-次年1月：向所在高校国际交流处提交申请
- 2-3月：校内评审
- 3-4月：国家留学基金委审核
- 5-6月：公布结果
- 9月左右：赴澳

【Go8 中的 CSC 合作院校】
- ANU：CSC-ANU 联合奖学金，学校免学费
- UQ：CSC-UQ 联合奖学金，学校免学费
- Monash：CSC-Monash 联合奖学金
- UNSW：接受 CSC 但无正式联合项目
- Sydney/Melbourne：接受 CSC 但需自行联系导师争取学费减免

【注意事项】
- LOA 中必须明确导师愿意作为共同导师（Co-supervisor）
- 部分澳洲导师对 CSC 学生存在疑虑（担心只来 1-2 年）
- 破解方法：表明你有意向毕业后留澳或在澳期间发表高质量论文
- CSC 有回国义务：资助结束后必须回国服务 2 年
- 可申请延期但不能放弃回国义务`,
  },
  {
    source_title: 'Koala PhD 平台功能完整介绍',
    source_type: 'guide' as const,
    content: `Koala PhD（考拉博士）平台功能介绍

【Ola AI 智能顾问】
- 24/7 在线的 PhD 申请 AI 顾问
- 可以回答选校、选导师、申请流程等所有问题
- 支持中英双语

【教授库】
- 收录 24,000+ 位澳洲大学教授信息
- 覆盖全部 Go8 大学
- 包含研究方向、H-index、招生状态等关键信息
- 支持按大学/研究方向/招生状态筛选
- AI 深度搜索：在网上自动搜索教授信息并建档
- 链接导入：粘贴教授主页链接，AI 自动提取信息

【AI 智能匹配】
- 根据你的研究兴趣、学术背景自动匹配最合适的导师
- 30 秒出结果
- 消耗 3 积分

【套磁信生成】
- 针对每位教授个性化生成专业套磁信
- 基于教授最新研究方向和你的背景定制
- 消耗 3 积分

【文书审阅】
- AI 审阅 CV / SOP / Research Proposal
- 给出评分 + 逐段修改建议
- 消耗 5 积分

【模拟面试】
- AI 模拟真实 PhD 面试场景
- 提供表现评分和改进建议
- 消耗 5 积分

【积分系统】
获取积分：
- 每日签到 +2
- 完善资料 80%+ → +20
- 上传简历 +10
- 邀请好友 +15（双方各得）
- 收藏教授 +5
- 首创基础信 免费
- 购买积分包（最低 AUD 4.99 / 50 积分）
- 月度订阅（Starter AUD 19.90/月 10 积分，Pro AUD 49/月 30 积分，Elite AUD 99/月 100 积分）`,
  },
  {
    source_title: 'Research Proposal 写作指南（澳洲 PhD 专用）',
    source_type: 'guide' as const,
    content: `澳洲 PhD Research Proposal 写作指南

【什么是 Research Proposal】
Research Proposal 是你向导师和大学展示研究计划的文档，通常 2000-3000 字。这是申请澳洲 PhD 最核心的材料。

【标准结构】
1. Title（标题）：简洁明确，反映研究内容
2. Background/Literature Review（背景/文献综述）：500-800 字
   - 该领域的现状是什么
   - 存在什么研究空白（Research Gap）
   - 为什么这个空白值得填补
3. Research Questions/Aims（研究问题/目标）：200-300 字
   - 1 个主研究问题 + 2-3 个子问题
   - 明确、可操作、可衡量
4. Methodology（研究方法）：500-800 字
   - 定量/定性/混合方法
   - 数据收集方式
   - 分析方法
5. Timeline（时间规划）：200 字或表格
   - 按年/学期划分里程碑
   - 体现可行性
6. Significance（研究意义）：200-300 字
   - 理论贡献
   - 实践应用
7. References（参考文献）：不计入字数

【常见错误】
- 话题太大太空泛（应该非常具体）
- 没有明确的 Research Gap
- 方法论描述模糊
- 没有时间规划
- 文献只引用老论文（应包含近 3 年文献）
- 与导师的研究方向不匹配

【关键建议】
- 写之前先读导师最近 5 篇论文
- Research Gap 要从导师的论文中找（这样导师有动力指导你）
- 让 2-3 个人 review 后再发给导师
- 不同大学可能有不同的格式要求，申请前检查`,
  },
  {
    source_title: '澳洲 PhD 面试常见问题及回答策略',
    source_type: 'guide' as const,
    content: `澳洲 PhD 面试完整指南

【面试形式】
- 通常是与潜在导师的视频面试（Zoom/Teams）
- 时长：30-60 分钟
- 语言：英语
- 一般在套磁后、正式申请前进行

【常见问题分类】

一、研究相关（最重要）
1. Can you tell me about your research interests?
   → 策略：具体说你想做什么，跟导师的研究怎么关联
2. Why are you interested in this particular topic?
   → 策略：说明个人经历 + 学术兴趣的结合
3. What is the gap in the current research?
   → 策略：展示你读过文献，能找到空白
4. How would you approach this research methodologically?
   → 策略：说明具体方法，不要太空泛

二、学术背景
5. Tell me about your master's thesis / undergraduate project.
   → 策略：简洁说明研究问题、方法、发现
6. Do you have any publications?
   → 策略：有就说，没有就说明在准备中的工作

三、动机与适配
7. Why Australia / Why this university?
   → 策略：具体原因（不要说"排名高"）
8. Why do you want to work with me specifically?
   → 策略：引用导师的具体论文/项目
9. What are your career plans after the PhD?
   → 策略：学术路线或产业路线都可以，要真诚

四、实际问题
10. How will you fund your studies?
    → 策略：说明奖学金申请计划或 CSC
11. When would you be able to start?
    → 策略：给出明确时间

【面试禁忌】
- 对导师的研究一无所知
- 回答太长（每个回答控制在 2 分钟内）
- 说"我对什么都感兴趣"（太泛了）
- 完全照读准备好的稿子

【面试后】
- 24 小时内发感谢邮件
- 如果导师说 I'd be happy to supervise you → 立刻开始准备正式申请
- 如果模糊 → 礼貌追问下一步`,
  },
];

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const titles = GO8_ENTRIES.map(e => e.source_title);
    const { data: existing } = await db
      .from('knowledge_chunks')
      .select('source_title')
      .in('source_title', titles);

    const existingTitles = new Set((existing ?? []).map((r: { source_title: string }) => r.source_title));
    const newEntries = GO8_ENTRIES.filter(e => !existingTitles.has(e.source_title));

    if (newEntries.length === 0) {
      return Response.json({ message: 'All 13 entries already exist', imported: 0, skipped: GO8_ENTRIES.length });
    }

    const BATCH = 5;
    let imported = 0;

    for (let i = 0; i < newEntries.length; i += BATCH) {
      const batch = newEntries.slice(i, i + BATCH);
      const texts = batch.map(e => `${e.source_title}\n${e.content}`);
      const embeddings = await createEmbeddingsBatch(texts);

      const rows = batch.map((entry, j) => ({
        source_title: entry.source_title,
        content: entry.content,
        source_type: entry.source_type,
        embedding: embeddings[j],
      }));

      const { error } = await db.from('knowledge_chunks').insert(rows);
      if (error) {
        console.error('[import-go8]', error);
      } else {
        imported += batch.length;
      }
    }

    return Response.json({
      message: `Import complete`,
      imported,
      skipped: GO8_ENTRIES.length - newEntries.length,
      total: GO8_ENTRIES.length,
    });
  } catch (error) {
    console.error('[import-go8]', error);
    return Response.json({ error: 'Import failed — check OpenAI API key' }, { status: 500 });
  }
}
