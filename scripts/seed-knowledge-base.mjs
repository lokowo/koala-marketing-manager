import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
    dimensions: 1536,
  });
  return res.data[0].embedding;
}

const KNOWLEDGE_ENTRIES = [
  // === Go8 大学 (8条) ===
  {
    source_title: 'University of Melbourne PhD 申请指南',
    source_type: 'guide',
    content: 'University of Melbourne 是澳洲排名第一的大学，PhD 申请竞争激烈。优势学科包括医学、工程、计算机科学和商学。申请要求：Honours 一等或同等学历，雅思 7.0（写作 7.0）。RTP 奖学金每年 3 月和 8 月截止，覆盖学费+生活津贴（2024 年约 $35,000/年）。建议提前 6-12 个月联系导师。',
  },
  {
    source_title: 'University of Sydney PhD 申请指南',
    source_type: 'guide',
    content: 'University of Sydney 以人文社科和医学见长，PhD 录取注重研究经历和 RP 质量。申请要求：Masters by Research 或 Honours First Class，雅思 7.0。Sydney 的 SUPRA 奖学金和 International Scholarship 每年竞争激烈，录取率约 15%。工程和 CS 方向导师较多有 ARC 项目资助。',
  },
  {
    source_title: 'UNSW Sydney PhD 申请指南',
    source_type: 'guide',
    content: 'UNSW 工程和计算机科学实力突出，Scientia PhD Scholarship 是全澳最慷慨的奖学金之一（学费+$50,000/年津贴+$10,000 研究经费）。申请要求：GPA 3.7+/4.0，强科研背景。UNSW 鼓励跨学科研究，与行业联系紧密。每年 Scientia 仅录取约 50 人。',
  },
  {
    source_title: 'ANU PhD 申请指南',
    source_type: 'guide',
    content: 'Australian National University 位于堪培拉，研究密度全澳最高。优势领域：天文物理、政治学、亚太研究、计算机科学。ANU PhD Scholarship 覆盖率高（约 90% 的 PhD 学生有奖学金）。申请灵活度大，全年可递交。与政府机构合作项目多，适合政策研究方向。',
  },
  {
    source_title: 'University of Queensland PhD 申请指南',
    source_type: 'guide',
    content: 'University of Queensland (UQ) 位于布里斯班，生物医学和环境科学世界领先。UQ 的 Graduate School Research Scholarship 每年 3 轮截止。优势：生物医学（特别是疫苗研究）、采矿工程、环境可持续发展。中国学生占比约 12%，城市生活成本比悉尼低 20-30%。',
  },
  {
    source_title: 'Monash University PhD 申请指南',
    source_type: 'guide',
    content: 'Monash University 是澳洲最大的大学之一，药学全球第一。PhD 申请看重发表记录和行业合作经验。Monash Graduate Scholarship (MGS) 和 MIPRS 是主要奖学金。医药健康、材料科学和教育学方向资助充足。墨尔本 Clayton 校区设施一流。',
  },
  {
    source_title: 'University of Western Australia PhD 申请指南',
    source_type: 'guide',
    content: 'University of Western Australia (UWA) 位于珀斯，海洋科学、采矿工程和农业科学世界领先。UIPA 和 Ad Hoc 奖学金相对容易获得（竞争人数少）。珀斯生活成本适中，矿业相关 PhD 就业前景好。适合环境科学、地质学、工程方向的申请者。',
  },
  {
    source_title: 'University of Adelaide PhD 申请指南',
    source_type: 'guide',
    content: 'University of Adelaide 是 Go8 中录取门槛相对友好的选择，葡萄酒酿造学和农业科学全球知名。Adelaide Scholarship International (ASI) 每年两轮。优势：食品科学、机械工程、音乐。南澳州有额外州担保移民加分，适合有移民规划的申请者。生活成本全 Go8 最低。',
  },
  // === 申请流程 (5条) ===
  {
    source_title: '澳洲 PhD 申请完整流程',
    source_type: 'guide',
    content: '澳洲 PhD 申请流程：1) 确定研究方向和目标院校（提前 12 个月）；2) 研究潜在导师并发送套磁信（提前 9-12 个月）；3) 准备 Research Proposal 2000-5000 字（提前 6-9 个月）；4) 准备申请材料（成绩单、推荐信 2-3 封、CV、英语成绩）；5) 提交正式申请；6) 等待审核（4-12 周）；7) 收到 offer 后申请签证。',
  },
  {
    source_title: 'Research Proposal 写作要点',
    source_type: 'guide',
    content: 'Research Proposal 是 PhD 申请最核心的文件。结构：Background & Literature Review（300-500 字）、Research Questions/Aims（200 字）、Methodology（500-1000 字）、Timeline（包含 milestone）、Expected Contribution（200 字）、References（15-30 篇）。切忌：范围太大、没有明确问题、方法论不可行。建议找导师 review 至少 2 轮。',
  },
  {
    source_title: '澳洲 PhD 奖学金类型汇总',
    source_type: 'guide',
    content: '主要奖学金：1) RTP (Research Training Program) — 政府资助，覆盖学费+$28,854/年生活费（2024），全年开放；2) CSC (中国国家留学基金委) — 与多所澳洲大学有联培协议，需回国服务 2 年；3) 大学专项奖学金（如 UNSW Scientia、Melbourne Research Scholarship）；4) ARC 项目资助 — 导师有 ARC grant 可直接资助学生；5) 行业联合奖学金 — 与企业合作项目。申请策略：同时申请 2-3 种，RTP 是保底。',
  },
  {
    source_title: '英语成绩要求与豁免条件',
    source_type: 'guide',
    content: '澳洲 PhD 英语要求：雅思总分 6.5-7.0（各学校不同），写作通常要求 6.5+。豁免条件：1) 英语国家本科/硕士学位（2 年以上全日制）；2) 在英语授课大学完成学位（需学校确认信）；3) 部分学校接受 PTE 65+。如果分数差 0.5 分，可以通过 bridging course 补足（10-20 周）。理工科通常要求低于文科。建议：雅思写作不够可以先考 PTE。',
  },
  {
    source_title: '澳洲 500 学生签证申请要点',
    source_type: 'guide',
    content: 'PhD 签证（Subclass 500）要点：1) 拿到 full offer + CoE 后申请；2) GTE (Genuine Temporary Entrant) 声明是关键 — 解释为何选澳洲、学成后计划；3) 资金证明：学费 + 生活费 $21,041/年（2024）+ 往返机票，或提供奖学金 offer；4) OSHC 保险；5) 体检（中国约 1000 RMB）；6) 审批周期 4-8 周。PhD 签证有效期覆盖全程（3-4 年）。配偶可申请 dependent 签证。',
  },
  // === 套磁信 (3条) ===
  {
    source_title: '套磁信写作黄金公式',
    source_type: 'guide',
    content: '套磁信结构（5 段式）：1) 开头 — 说明来意+你是谁（2 句）；2) 为什么选这位导师 — 引用 1-2 篇对方的论文，说明与你的研究兴趣的联系（3-4 句）；3) 你的背景 — 相关研究经历、发表、技能（3-4 句）；4) 研究构想 — 简述你想做什么研究方向（2-3 句）；5) 收尾 — 请求讨论机会，附 CV。总字数 250-350 字。切忌：模板化、太长、没有具体引用导师工作。',
  },
  {
    source_title: '套磁信常见错误与避坑',
    source_type: 'guide',
    content: '10 大套磁信错误：1) 群发模板（教授一眼看出）；2) 称呼错误（Dr. vs Prof.）；3) 没有读对方的论文就硬套；4) 太长（超过 400 字没人看）；5) 只谈自己不谈对方研究；6) 语法错误（用 Grammarly 检查）；7) 附件太多（只附 CV，其他 offer 后再发）；8) 错误时间发送（避开假期、学期末）；9) 没有后续跟进（等 7-10 天后 follow up）；10) 标题不吸引人（用「Prospective PhD Student — [Your Research Area]」）。',
  },
  {
    source_title: '套磁最佳时机与跟进策略',
    source_type: 'guide',
    content: '最佳套磁时机：开学前 6-9 个月。澳洲 2 月入学：前一年 5-8 月套磁；7 月入学：前一年 10 月-当年 1 月。避开：12 月-1 月（澳洲暑假）、学期考试周。跟进策略：第一封没回复等 7-10 工作日，简短 follow up（3 句话：提醒+补充信息+再次请求）。最多跟进 2 次。如果 3 封都没回复，大概率不感兴趣，换目标。回复率参考：10 封套磁预期 3-4 封回复。',
  },
  // === 平台使用 (3条) ===
  {
    source_title: 'Koala PhD 平台功能介绍',
    source_type: 'guide',
    content: 'Koala PhD 是澳洲 PhD 申请一站式平台。核心功能：1) AI 学术顾问「考拉学长」— 24小时解答申请问题；2) 教授匹配 — 基于你的背景智能推荐合适导师；3) 套磁信生成 — AI 生成个性化套磁信（$1/封）；4) 教授数据库 — 澳洲大学在研教授信息，包含研究方向、在招状态、联系方式。所有教授数据标注信息来源，确保准确。',
  },
  {
    source_title: 'Koala PhD AI 对话模式说明',
    source_type: 'guide',
    content: 'AI 考拉学长有 4 种模式：1) 路径评估 — 评估你的 PhD 申请竞争力（0-100 分），给出各维度分数和提升建议；2) 科研深潜 — 提供学术论文检索、研究方向分析、文献综述辅助，回答基于真实数据（带引用）；3) 陪伴模式 — 申请过程中的情绪支持和日常问答；4) 文案模式 — 帮你打磨 PS、CV、RP 的语言表达。每种模式使用不同的 AI 策略确保回答质量。',
  },
  {
    source_title: '如何使用教授匹配功能',
    source_type: 'guide',
    content: '使用教授匹配步骤：1) 在 AI 对话中选择「路径评估」模式；2) 回答 3-5 个关于你背景的问题（学历、GPA、研究兴趣、发表情况）；3) AI 会推荐 5-10 位匹配度最高的教授，附带匹配原因和联系建议；4) 点击教授卡片查看详细信息（研究方向、在研项目、论文列表）；5) 如果满意可以一键生成套磁信。匹配算法基于研究方向相似度、导师招生状态、资助情况综合计算。',
  },
];

async function main() {
  console.log(`Seeding ${KNOWLEDGE_ENTRIES.length} knowledge entries...`);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < KNOWLEDGE_ENTRIES.length; i++) {
    const entry = KNOWLEDGE_ENTRIES[i];
    process.stdout.write(`  [${i + 1}/${KNOWLEDGE_ENTRIES.length}] ${entry.source_title}...`);

    try {
      const embedding = await generateEmbedding(`${entry.source_title}\n${entry.content}`);

      const { error } = await supabase.from('knowledge_chunks').insert({
        source_type: entry.source_type,
        source_title: entry.source_title,
        content: entry.content,
        embedding: JSON.stringify(embedding),
      });

      if (error) {
        console.log(` FAILED: ${error.message}`);
        failed++;
      } else {
        console.log(' OK');
        success++;
      }
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
      failed++;
    }

    // Rate limit: ~16 req/sec max for OpenAI
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nDone! ${success} inserted, ${failed} failed.`);
}

main().catch(console.error);
