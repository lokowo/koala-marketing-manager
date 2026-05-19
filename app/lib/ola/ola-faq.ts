import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export interface FAQMatch {
  id: string;
  category: string;
  answer_zh: string;
  answer_en: string;
  rich_card_type: string | null;
  rich_card_data: Record<string, unknown> | null;
  score: number;
}

const SYNONYMS: Record<string, string[]> = {
  '积分': ['credits', 'points', '积分', 'credit'],
  '套磁信': ['cold email', 'contact letter', '套磁信', '套磁', 'email professor'],
  '价格': ['pricing', 'price', '多少钱', '价格', '怎么充值', '充值', 'cost', 'fee'],
  '奖学金': ['scholarship', '全奖', '奖学金', 'rtp', 'stipend'],
  '签证': ['visa', '签证', '500签证', 'subclass 500'],
  '教授': ['professor', '导师', '教授', 'supervisor'],
  '申请': ['apply', 'application', '申请', '怎么申请'],
  '面试': ['interview', '面试', 'phd面试'],
  '雅思': ['ielts', 'pte', '雅思', '英语'],
  '邀请': ['invite', '邀请码', '推荐好友', '邀请', 'referral'],
  'csc': ['csc', '公派', '留学基金委', '国家留学基金'],
  'go8': ['go8', '八大', 'group of eight'],
  'research proposal': ['research proposal', '研究计划', 'rp', '怎么写rp'],
  'ola': ['ola', '小欧', '你是谁', 'who are you'],
};

function tokenize(text: string): string[] {
  const lower = text.toLowerCase().trim();
  const tokens: string[] = [];

  for (const [, synonyms] of Object.entries(SYNONYMS)) {
    for (const syn of synonyms) {
      if (lower.includes(syn.toLowerCase())) {
        tokens.push(...synonyms.map(s => s.toLowerCase()));
        break;
      }
    }
  }

  const words = lower.split(/[\s,，。？！?!、;；:：]+/).filter(w => w.length > 0);
  for (const w of words) {
    if (!tokens.includes(w)) tokens.push(w);
  }

  return [...new Set(tokens)];
}

function scoreMatch(userTokens: string[], faqKeywords: string[]): number {
  const faqLower = faqKeywords.map(k => k.toLowerCase());
  let matched = 0;
  for (const kw of faqLower) {
    if (userTokens.some(t => t.includes(kw) || kw.includes(t))) {
      matched++;
    }
  }
  return faqLower.length > 0 ? matched / faqLower.length : 0;
}

export async function matchFAQ(message: string): Promise<FAQMatch | null> {
  const userTokens = tokenize(message);
  if (userTokens.length === 0) return null;

  const { data: faqs, error } = await db
    .from('ola_faq')
    .select('id, category, keywords, answer_zh, answer_en, rich_card_type, rich_card_data, priority')
    .eq('enabled', true);

  if (error || !faqs || faqs.length === 0) return null;

  let bestMatch: FAQMatch | null = null;
  let bestScore = 0;
  let bestPriority = -Infinity;

  for (const faq of faqs as Array<{
    id: string; category: string; keywords: string[];
    answer_zh: string; answer_en: string;
    rich_card_type: string | null; rich_card_data: Record<string, unknown> | null;
    priority: number;
  }>) {
    const score = scoreMatch(userTokens, faq.keywords);
    if (score >= 0.5 && (score > bestScore || (score === bestScore && faq.priority > bestPriority))) {
      bestScore = score;
      bestPriority = faq.priority;
      bestMatch = {
        id: faq.id,
        category: faq.category,
        answer_zh: faq.answer_zh,
        answer_en: faq.answer_en,
        rich_card_type: faq.rich_card_type,
        rich_card_data: faq.rich_card_data,
        score,
      };
    }
  }

  return bestMatch;
}
