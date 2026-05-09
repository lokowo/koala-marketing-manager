import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  });
  return res.data[0].embedding;
}

function splitIntoChunks(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = '';
    }
    current += para + '\n\n';
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

const KNOWLEDGE_TOPICS = [
  {
    title: '澳洲 PhD 申请时间线',
    prompt: '详细介绍澳洲 PhD 申请的完整时间线，包括 2 月入学和 7 月入学两个周期，每个阶段需要做什么，提前多久开始准备。',
  },
  {
    title: '澳洲 PhD 奖学金大全',
    prompt: '详细介绍澳洲 PhD 的所有主要奖学金：RTP (Research Training Program)、CSC（中国国家留学基金委）、各 Go8 大学的专项奖学金、企业赞助奖学金。包括申请条件、金额、截止日期。',
  },
  {
    title: '澳洲 500 学生签证攻略',
    prompt: '详细介绍澳洲 PhD 500 签证的申请流程：GTE 信怎么写、资金证明要求、体检流程、审批时间、常见拒签原因。',
  },
  {
    title: '套磁信写作指南',
    prompt: '详细介绍如何给澳洲教授写套磁信：什么时候发（最佳时机）、邮件标题怎么写、正文结构（5 段式）、10 个常见错误、如何跟进（follow-up 策略）、真实成功案例。',
  },
  {
    title: 'Research Proposal 撰写指南',
    prompt: '详细介绍如何写 Research Proposal：结构（背景、研究问题、方法论、时间线、参考文献）、长度要求、各校的不同格式要求、评审标准、常见问题。',
  },
  {
    title: '导师面试准备指南',
    prompt: '详细介绍导师面试的准备：20 个最常见面试问题及回答策略、如何展示研究兴趣、如何问教授问题、面试后的感谢信、常见失败原因。',
  },
  {
    title: 'Go8 大学特点和申请策略',
    prompt: '分别介绍澳洲 Go8 八所大学（Melbourne, Sydney, UNSW, ANU, Queensland, Monash, Western Australia, Adelaide）的 PhD 申请特点：优势学科、申请难度、奖学金情况、城市生活、中国学生占比、特殊要求。',
  },
  {
    title: 'PhD 申请常见拒信原因',
    prompt: '详细分析 15 个最常见的 PhD 申请失败原因：研究方向不匹配、GPA 不够、没有科研经历、套磁信太模板化、RP 质量差、英语不达标等，以及每个原因的解决方案。',
  },
  {
    title: '澳洲 PhD 各学科热门方向',
    prompt: '介绍澳洲 PhD 目前最热门的研究方向：计算机科学（AI/ML/Cybersecurity）、工程（新能源/材料）、医学（cancer/mental health）、商科（fintech/sustainability）、教育、法律。每个方向的就业前景和资金情况。',
  },
  {
    title: '中国学生申请澳洲 PhD 特别指南',
    prompt: '针对中国学生的特别建议：如何解释中国的学历体系（985/211/双非）、GPA 转换、CSC 联培 vs 自费、中澳学术文化差异、如何处理推荐信、中文简历如何转英文。',
  },
];

async function main() {
  console.log(`Seeding knowledge base with ${KNOWLEDGE_TOPICS.length} topics...`);

  for (const topic of KNOWLEDGE_TOPICS) {
    console.log(`\nGenerating: ${topic.title}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `你是澳洲 PhD 申请专家。请${topic.prompt}\n\n要求：内容详实、有数据支撑、适合中国留学生阅读。`,
      }],
    });
    const content = (response.content[0] as { type: 'text'; text: string }).text;

    const chunks = splitIntoChunks(content, 500);
    console.log(`  Generated ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      const { error } = await supabase.from('knowledge_chunks').insert({
        source_type: 'guide',
        source_title: `[GUIDE] ${topic.title} (${i + 1}/${chunks.length})`,
        content: chunks[i],
        embedding: JSON.stringify(embedding),
      });
      if (error) {
        console.error(`  Failed to save chunk ${i + 1}:`, error.message);
      } else {
        console.log(`  Chunk ${i + 1}/${chunks.length} saved`);
      }
    }

    await sleep(1000);
  }

  console.log('\nKnowledge base seeded!');
}

main().catch(console.error);
