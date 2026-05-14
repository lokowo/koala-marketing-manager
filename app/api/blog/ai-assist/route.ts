import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '../../../lib/auth';

const COVER_IMAGE_PROMPTS: Record<string, string> = {
  phd_guide: 'professional photo of international students studying at Australian university library',
  application: 'document preparation for PhD application, laptop with research papers',
  scholarship: 'graduation cap on Australian dollar bills, scholarship concept',
  visa: 'Australian passport and student visa documents',
  supervisor: 'professor and student discussing research in modern university office',
  research: 'scientific research laboratory with modern equipment',
  student_life: 'international students enjoying campus life at Australian university',
  news: 'Australian university campus aerial view',
  professor_spotlight: 'distinguished professor in modern university research lab',
};

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    const { action, content, category, title, style, wordCount, platform } = await req.json();
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    if (action === 'recommend_category') {
      const resp = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: `Based on this article content, recommend the most appropriate category.\nTitle: ${title}\nContent preview: ${(content || '').slice(0, 500)}\n\nAvailable: phd_guide, application, scholarship, visa, supervisor, research, student_life, news, professor_spotlight.\nReturn ONLY a JSON object: {"category": "key", "reason": "一句话理由"}` }],
        system: 'You are a content strategist for Koala PhD (koalaphd.com), an academic matching platform connecting Chinese students with Australian PhD supervisors. Return valid JSON only.',
      });
      const text = resp.content[0].type === 'text' ? resp.content[0].text : '{}';
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      return Response.json(JSON.parse(cleaned));
    }

    if (action === 'generate_tags') {
      const resp = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: `Generate 5-8 relevant tags for a blog article on Koala PhD (koalaphd.com) about Australian PhD application and academic life.\nTitle: ${title}\nCategory: ${category}\nContent preview: ${(content || '').slice(0, 500)}\n\nMix Chinese and English tags. Include relevant: 澳洲PhD, supervisor, scholarship keywords where appropriate. Return ONLY a JSON array of strings.` }],
        system: 'Return valid JSON array only.',
      });
      const text = resp.content[0].type === 'text' ? resp.content[0].text : '[]';
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      return Response.json({ tags: JSON.parse(cleaned) });
    }

    if (action === 'translate') {
      const resp = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: `Translate the following Chinese blog article to English. Keep markdown format. Context: this is content from Koala PhD, an academic matching platform for Australian PhD applications.\n\nTitle: ${title}\nContent:\n${content}\n\nReturn JSON: {"titleEn": "...", "excerptEn": "one sentence summary", "contentEn": "full translation"}` }],
        system: 'Professional translator. Return valid JSON only.',
      });
      const text = resp.content[0].type === 'text' ? resp.content[0].text : '{}';
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      return Response.json(JSON.parse(cleaned));
    }

    if (action === 'cover_prompt') {
      const prompt = COVER_IMAGE_PROMPTS[category] || COVER_IMAGE_PROMPTS.phd_guide;
      return Response.json({ prompt, category });
    }

    if (action === 'polish') {
      const styleMap: Record<string, string> = {
        news: '新闻报道风格：客观、专业、简洁有力，用第三人称叙述，多用数据和事实支撑',
        social: '社交媒体/小红书风格：活泼亲切、使用短句、适当加入emoji、开头抓眼球、分段清晰',
        academic: '学术科普风格：严谨但通俗易懂，用类比解释专业概念，保持学术准确性',
        casual: '轻松对话风格：像朋友聊天一样，口语化、有温度、可以用"你"直接称呼读者',
      };

      const platformMap: Record<string, string> = {
        wechat: '微信公众号：段落分明、小标题清晰、适合长阅读、可加粗重点',
        xiaohongshu: '小红书：短段落、多换行、emoji点缀、开头要有吸引力、结尾带互动',
        blog: '博客网站：结构化、可用Markdown标题和列表、适合深度阅读',
        linkedin: 'LinkedIn：专业商务风格、英文思维、突出价值和洞察、适当用数据',
      };

      const styleInstruction = styleMap[style || ''] || styleMap.casual;
      const platformInstruction = platformMap[platform || ''] || '';
      const wordInstruction = wordCount && wordCount !== 'unlimited'
        ? `目标字数约 ${wordCount} 字（±15%），如原文过长请精简，过短请扩充`
        : '字数不限，保持内容完整';

      const truncatedContent = (content || '').slice(0, 5000);

      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: `你是 Koala PhD (koalaphd.com) 的专业内容编辑。你的任务是润色用户提供的原始文章内容。

润色要求：
1. 语言风格：${styleInstruction}
2. ${wordInstruction}
${platformInstruction ? `3. 平台适配：${platformInstruction}` : ''}

规则：
- 保留原文的核心信息和观点，不要编造新内容
- 保持 Markdown 格式
- 不要加任何前缀说明（如"以下是润色后的内容"），直接输出润色后的正文
- 如果原文提到了具体数据、人名、学校名，必须原样保留`,
        messages: [{ role: 'user', content: `请润色以下内容：\n\n${truncatedContent}` }],
      });

      const polished = resp.content[0].type === 'text' ? resp.content[0].text : '';
      return Response.json({ polished, truncated: (content || '').length > 5000 });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[blog/ai-assist]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
