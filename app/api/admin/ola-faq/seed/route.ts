import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const SEED_FAQS = [
  {
    category: 'pricing',
    keywords: ['价格', '多少钱', '怎么充值', '积分包', '订阅', 'pricing', 'price', 'subscription'],
    answer_zh: '💰 **Koala PhD 积分方案**\n\n**积分包（一次性购买）：**\n- 50 积分 — AUD 4.99\n- 150 积分 — AUD 12.99\n- 500 积分 — AUD 39.99\n\n**月度订阅：**\n- Starter AUD 19.90/月（含 10 积分）\n- Pro AUD 49/月（含 30 积分）\n- Elite AUD 99/月（含 100 积分）\n\n订阅用户享受优先客服和专属功能。',
    answer_en: '💰 **Koala PhD Credit Plans**\n\n**Credit Packs (one-time):**\n- 50 credits — AUD 4.99\n- 150 credits — AUD 12.99\n- 500 credits — AUD 39.99\n\n**Monthly Subscription:**\n- Starter AUD 19.90/mo (10 credits)\n- Pro AUD 49/mo (30 credits)\n- Elite AUD 99/mo (100 credits)',
    priority: 10,
  },
  {
    category: 'credits',
    keywords: ['积分', '怎么获取积分', '签到', '免费', 'credits', 'free', 'earn'],
    answer_zh: '🎯 **获取积分的方式**\n\n**免费获取：**\n- 每日签到 +2 积分\n- 完善个人资料（80%+）+20 积分\n- 上传简历 +10 积分\n- 邀请好友 +15 积分（双方各得）\n- 收藏教授 +5 积分\n- 首封基础套磁信 免费\n\n**付费购买：**\n积分包最低 AUD 4.99 / 50 积分。',
    answer_en: '🎯 **Ways to Earn Credits**\n\n**Free:**\n- Daily check-in +2\n- Complete profile (80%+) +20\n- Upload CV +10\n- Invite friends +15 (both get it)\n- Bookmark professor +5\n- First basic cold email FREE\n\n**Purchase:**\nCredit packs start at AUD 4.99 / 50 credits.',
    priority: 10,
  },
  {
    category: 'usage',
    keywords: ['怎么用', '怎么写套磁信', '怎么搜教授', '使用方法', 'how to use', 'tutorial'],
    answer_zh: '📖 **平台使用指南**\n\n1. **搜索教授** — 在学者库中按研究方向、大学搜索\n2. **AI 智能匹配** — 让 AI 根据你的背景推荐导师（3 积分）\n3. **生成套磁信** — 选择教授后一键生成个性化套磁信（3 积分）\n4. **文书审阅** — AI 审阅你的 CV/SOP/RP（5 积分）\n5. **模拟面试** — AI 模拟 PhD 面试场景（5 积分）\n\n随时问我任何 PhD 申请问题，免费回答！',
    answer_en: '📖 **How to Use Koala PhD**\n\n1. **Search Professors** — Browse by research area or university\n2. **AI Matching** — Get matched with supervisors (3 credits)\n3. **Generate Cold Email** — One-click personalized emails (3 credits)\n4. **Document Review** — AI reviews your CV/SOP/RP (5 credits)\n5. **Mock Interview** — Practice PhD interviews (5 credits)\n\nAsk me any PhD application question for free!',
    priority: 5,
  },
  {
    category: 'go8',
    keywords: ['Go8', '八大', '澳洲大学', '哪些大学', 'group of eight', 'australian universities'],
    answer_zh: '🏛️ **澳洲 Go8 八大名校**\n\n1. University of Melbourne — QS 13\n2. University of Sydney — QS 18\n3. UNSW Sydney — QS 19\n4. ANU — QS 30\n5. Monash University — QS 37\n6. University of Queensland — QS 40\n7. University of Western Australia — QS 77\n8. University of Adelaide — QS 82\n\n我们的学者库覆盖全部 Go8 大学，可以帮你匹配合适的导师！',
    answer_en: '🏛️ **Australia Go8 Universities**\n\n1. University of Melbourne — QS 13\n2. University of Sydney — QS 18\n3. UNSW Sydney — QS 19\n4. ANU — QS 30\n5. Monash University — QS 37\n6. University of Queensland — QS 40\n7. University of Western Australia — QS 77\n8. University of Adelaide — QS 82\n\nOur scholar database covers all Go8 universities!',
    priority: 5,
  },
  {
    category: 'process',
    keywords: ['申请流程', 'PhD申请', '怎么申请', 'application process', 'how to apply'],
    answer_zh: '📋 **澳洲 PhD 申请 6 步流程**\n\n1. **确定方向**（提前 12 个月）— 明确研究兴趣\n2. **联系导师**（提前 9-12 个月）— 发送套磁信\n3. **准备 RP**（提前 6-9 个月）— 2000-3000 字研究计划\n4. **准备材料** — 成绩单、推荐信、CV、英语成绩\n5. **提交申请** — 通过大学官网在线提交\n6. **等待结果**（4-12 周）— 拿到 offer 后申请签证\n\n需要我帮你匹配合适的导师吗？',
    answer_en: '📋 **6-Step PhD Application Process**\n\n1. **Define Direction** (12 months ahead)\n2. **Contact Supervisors** (9-12 months ahead)\n3. **Write Research Proposal** (6-9 months ahead)\n4. **Prepare Documents** — transcripts, references, CV, English test\n5. **Submit Application** — via university portal\n6. **Wait for Result** (4-12 weeks)\n\nWant me to match you with suitable supervisors?',
    priority: 5,
  },
  {
    category: 'company',
    keywords: ['考拉博士', 'Koala PhD', '你们做什么', '平台介绍', 'about', 'what do you do'],
    answer_zh: '🐨 **关于 Koala PhD**\n\nKoala PhD（考拉博士）是澳洲 PhD 申请一站式平台。\n\n**核心功能：**\n- 🤖 AI 学术顾问 24 小时在线\n- 📚 覆盖澳洲38所大学、23,500+位教授与研究员\n- ✉️ AI 个性化套磁信生成\n- 🎯 智能导师匹配\n- 📝 文书审阅 & 模拟面试\n\n**品牌定位：** 澳洲产学研科研机构\n**MARA 资质：** KSA 持有 MARA 注册资质',
    answer_en: '🐨 **About Koala PhD**\n\nKoala PhD is a one-stop platform for Australian PhD applications.\n\n**Core Features:**\n- 🤖 24/7 AI Academic Advisor\n- 📚 Covering 38 Australian universities with 23,500+ professors and researchers\n- ✉️ AI Personalized Cold Email Generation\n- 🎯 Smart Supervisor Matching\n- 📝 Document Review & Mock Interview',
    priority: 5,
  },
  {
    category: 'invite',
    keywords: ['邀请', '邀请码', '推荐好友', 'invite', 'referral', 'invite code'],
    answer_zh: '🎁 **邀请好友赚积分**\n\n1. 在「我的」页面找到你的专属邀请码\n2. 分享给好友\n3. 好友注册并输入你的邀请码\n4. 你和好友各获得 **15 积分**\n\n邀请越多，积分越多！',
    answer_en: '🎁 **Invite Friends, Earn Credits**\n\n1. Find your invite code in "My Profile"\n2. Share with friends\n3. Friend registers with your code\n4. Both of you get **15 credits**\n\nMore invites = more credits!',
    priority: 3,
  },
  {
    category: 'visa',
    keywords: ['签证', '500签证', 'GTE', 'visa', 'subclass 500', 'student visa'],
    answer_zh: '🛂 **澳洲 PhD 签证（Subclass 500）**\n\n**基本要求：** CoE + 财力证明 + OSHC + 英语成绩 + 体检 + GTE 声明\n\n**PhD 特殊优待：**\n- 签证覆盖全程 + 额外 6 个月\n- 无打工时间限制\n- 配偶可全职工作\n\n**费用：** 申请费 AUD 710\n**处理时间：** 4-8 周\n\n⚠️ 签证事务建议咨询持牌移民代理（MARA），我们可以推荐。',
    answer_en: '🛂 **Australian PhD Visa (Subclass 500)**\n\n**Requirements:** CoE + finances + OSHC + English + health check + GTE\n\n**PhD Benefits:**\n- Visa covers full duration + 6 months\n- No work hour restrictions\n- Spouse can work full-time\n\n**Fee:** AUD 710\n**Processing:** 4-8 weeks\n\n⚠️ For visa advice, consult a registered migration agent (MARA).',
    priority: 3,
  },
  {
    category: 'csc',
    keywords: ['CSC', '公派', '留学基金委', '国家留学基金', 'china scholarship council'],
    answer_zh: '🇨🇳 **CSC 公派留学申请澳洲 PhD**\n\n**资助内容：** 生活费约 AUD 2,800/月 + 国际机票 + 签证费\n\n**申请条件：** 中国籍、硕士毕业、IELTS 6.5+、需获澳洲大学 LOA\n\n**CSC 合作 Go8：**\n- ANU、UQ、Monash — 有正式联合奖学金\n- UNSW、Sydney、Melbourne — 接受但需自行争取学费减免\n\n**注意：** CSC 有回国服务 2 年义务\n\n想了解具体某所大学的 CSC 申请策略吗？',
    answer_en: '🇨🇳 **CSC Scholarship for Australian PhD**\n\n**Covers:** ~AUD 2,800/month + flights + visa fees\n\n**Requirements:** Chinese citizen, master\'s degree, IELTS 6.5+, need LOA from Australian uni\n\n**Go8 CSC Partners:**\n- ANU, UQ, Monash — formal joint scholarships\n- UNSW, Sydney, Melbourne — accepted but negotiate tuition waiver\n\n**Note:** 2-year return obligation after completion',
    priority: 3,
  },
  {
    category: 'proposal',
    keywords: ['research proposal', '研究计划', '怎么写RP', 'RP', 'proposal writing'],
    answer_zh: '📄 **Research Proposal 写作要点**\n\n**结构（2000-3000字）：**\n1. Background/Literature Review（500-800字）\n2. Research Questions（200-300字）\n3. Methodology（500-800字）\n4. Timeline（按年/学期）\n5. Significance（200-300字）\n6. References（15-30篇）\n\n**关键建议：**\n- 先读导师最近 5 篇论文\n- Research Gap 从导师论文中找\n- 让 2-3 人 review 后再发\n\n需要 AI 帮你审阅 RP 吗？（消耗 5 积分）',
    answer_en: '📄 **Research Proposal Writing Guide**\n\n**Structure (2000-3000 words):**\n1. Background/Literature Review (500-800w)\n2. Research Questions (200-300w)\n3. Methodology (500-800w)\n4. Timeline (by year/semester)\n5. Significance (200-300w)\n6. References (15-30 papers)\n\n**Key Tips:**\n- Read supervisor\'s last 5 papers\n- Find research gap from their work\n- Get 2-3 people to review before sending',
    priority: 3,
  },
  {
    category: 'interview',
    keywords: ['面试', 'PhD面试', '怎么准备面试', 'interview', 'interview prep'],
    answer_zh: '🎤 **PhD 面试准备要点**\n\n**形式：** Zoom/Teams 视频面试，30-60 分钟\n\n**必答题：**\n1. 你的研究兴趣是什么？\n2. 为什么选这个方向？\n3. 你发现了什么 Research Gap？\n4. 你的方法论是什么？\n5. 为什么选这位导师？\n\n**禁忌：**\n- ❌ 对导师研究一无所知\n- ❌ 每个回答超过 2 分钟\n- ❌ 说"我对什么都感兴趣"\n\n面试后 24 小时内发感谢信！\n\n需要 AI 模拟面试吗？（消耗 5 积分）',
    answer_en: '🎤 **PhD Interview Prep**\n\n**Format:** Zoom/Teams, 30-60 minutes\n\n**Must-answer Questions:**\n1. What are your research interests?\n2. Why this topic?\n3. What research gap did you find?\n4. What methodology will you use?\n5. Why this supervisor?\n\n**Don\'ts:**\n- ❌ Know nothing about supervisor\'s work\n- ❌ Answers longer than 2 minutes\n- ❌ Say "I\'m interested in everything"\n\nSend a thank-you email within 24 hours!',
    priority: 3,
  },
  {
    category: 'ielts',
    keywords: ['雅思', 'IELTS', 'PTE', '英语要求', 'english requirement', 'language'],
    answer_zh: '📝 **Go8 英语要求汇总**\n\n**通用标准：** IELTS 总分 6.5（单项 6.0）\n\n**部分例外：**\n- Melbourne Arts 学院要求 7.0\n- 部分专业写作要求 6.5+\n\n**替代考试：** PTE 61+（单项 54+）\n\n**豁免条件：**\n- 英语国家本科/硕士（2年+全日制）\n- 英语授课大学学位（需确认信）\n\n**分数差 0.5？** 可通过 bridging course 补足（10-20 周）\n\n💡 建议：雅思写作不够可以考 PTE（口语部分对中国学生更友好）',
    answer_en: '📝 **Go8 English Requirements**\n\n**Standard:** IELTS 6.5 overall (6.0 each band)\n\n**Exceptions:**\n- Melbourne Arts requires 7.0\n- Some programs require Writing 6.5+\n\n**Alternative:** PTE 61+ (54+ each)\n\n**Exemptions:**\n- Degree from English-speaking country (2+ years)\n- English-medium university degree\n\n**0.5 short?** Bridging courses available (10-20 weeks)',
    priority: 3,
  },
  {
    category: 'scholarship',
    keywords: ['奖学金', 'RTP', 'USYDIS', '全奖', 'scholarship', 'funding', 'stipend'],
    answer_zh: '🎓 **澳洲 PhD 奖学金类型**\n\n1. **RTP（政府资助）** — 学费减免 + 生活津贴约 AUD 35,000-42,000/年\n2. **大学专项** — 如 UNSW Scientia、Melbourne MRS、Sydney USYDIS\n3. **ARC 项目资助** — 导师有 ARC grant 可直接资助学生\n4. **CSC 联合** — 与中国留学基金委合作\n5. **行业联合** — 与企业合作项目\n\n**策略：** 同时申请 2-3 种，RTP 是保底\n\n想看各大学奖学金详细对比吗？',
    answer_en: '🎓 **Australian PhD Scholarship Types**\n\n1. **RTP (Government)** — tuition + ~AUD 35,000-42,000/year stipend\n2. **University-specific** — UNSW Scientia, Melbourne MRS, Sydney USYDIS\n3. **ARC Project Funding** — supervisor\'s ARC grant funds the student\n4. **CSC Joint** — with China Scholarship Council\n5. **Industry Joint** — corporate-partnered projects\n\n**Strategy:** Apply for 2-3 simultaneously, RTP as safety net',
    priority: 5,
  },
  {
    category: 'timeline',
    keywords: ['时间线', '什么时候申请', '截止日', 'timeline', 'deadline', 'when to apply'],
    answer_zh: '📅 **澳洲 PhD 申请时间规划**\n\n**2 月入学：**\n- 前一年 5-8 月：套磁联系导师\n- 前一年 8-10 月：准备 RP + 材料\n- 前一年 10-12 月：提交申请\n- 当年 1 月：签证\n\n**7 月入学：**\n- 前一年 10 月-当年 1 月：套磁\n- 当年 1-3 月：准备材料\n- 当年 3-5 月：提交申请\n- 当年 6 月：签证\n\n⚠️ 奖学金截止通常比入学提前 3-6 个月，注意查看各校具体日期！',
    answer_en: '📅 **PhD Application Timeline**\n\n**Feb intake:**\n- May-Aug (year before): Contact supervisors\n- Aug-Oct: Prepare RP + documents\n- Oct-Dec: Submit application\n- Jan: Visa\n\n**Jul intake:**\n- Oct-Jan: Contact supervisors\n- Jan-Mar: Prepare documents\n- Mar-May: Submit application\n- Jun: Visa\n\n⚠️ Scholarship deadlines are typically 3-6 months before intake!',
    priority: 3,
  },
  {
    category: 'ola',
    keywords: ['你是谁', '小欧', 'Ola', 'who are you', '自我介绍'],
    answer_zh: '👋 我是 **小欧 (Ola)**，Koala PhD 的 AI 学术顾问！\n\n我可以帮你：\n- 🔍 搜索和匹配澳洲教授\n- ✉️ 生成个性化套磁信\n- 📋 解答 PhD 申请问题\n- 📝 审阅文书 & 模拟面试\n\n我背后是覆盖澳洲38所大学、23,500+位教授与研究员的数据库和最新的学术信息。有什么想问的，尽管说！',
    answer_en: '👋 I\'m **Ola**, the AI Academic Advisor at Koala PhD!\n\nI can help you:\n- 🔍 Search and match Australian professors\n- ✉️ Generate personalized cold emails\n- 📋 Answer PhD application questions\n- 📝 Review documents & mock interviews\n\nI\'m backed by a database covering 38 Australian universities with 23,500+ professors and researchers. Ask me anything!',
    priority: 10,
  },
];

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: existing } = await db
      .from('ola_faq')
      .select('category')
      .limit(1);

    if (existing && existing.length > 0) {
      const { count } = await db.from('ola_faq').select('*', { count: 'exact', head: true });
      return Response.json({ message: `FAQ already seeded (${count} entries exist)`, seeded: 0 });
    }

    const { error } = await db.from('ola_faq').insert(SEED_FAQS);

    if (error) {
      console.error('[ola-faq seed]', error);
      return Response.json({ error: 'Failed to seed FAQs' }, { status: 500 });
    }

    return Response.json({ message: 'FAQ seeded successfully', seeded: SEED_FAQS.length });
  } catch (error) {
    console.error('[ola-faq seed]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
