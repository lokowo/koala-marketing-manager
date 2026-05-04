import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const COVER_IMAGE_PROMPTS: Record<string, string> = {
  phd_guide: 'professional photo of international students studying at Australian university library',
  application: 'document preparation for PhD application, laptop with research papers',
  scholarship: 'graduation cap on Australian dollar bills, scholarship concept',
  visa: 'Australian passport and student visa documents',
  supervisor: 'professor and student discussing research in modern university office',
  research: 'scientific research laboratory with modern equipment',
  student_life: 'international students enjoying campus life at Australian university',
  news: 'Australian university campus aerial view',
};

export async function POST(req: NextRequest) {
  try {
    const { action, content, category, title } = await req.json();
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    if (action === 'recommend_category') {
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: `Based on this article content, recommend the most appropriate category.\nTitle: ${title}\nContent preview: ${(content || '').slice(0, 500)}\n\nAvailable: phd_guide, application, scholarship, visa, supervisor, research, student_life, news.\nReturn ONLY a JSON object: {"category": "key", "reason": "一句话理由"}` }],
        system: 'Return valid JSON only.',
      });
      const text = resp.content[0].type === 'text' ? resp.content[0].text : '{}';
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      return Response.json(JSON.parse(cleaned));
    }

    if (action === 'generate_tags') {
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: `Generate 5-8 relevant tags for a blog article about Australian PhD study.\nTitle: ${title}\nCategory: ${category}\nContent preview: ${(content || '').slice(0, 500)}\n\nMix Chinese and English tags. Return ONLY a JSON array of strings.` }],
        system: 'Return valid JSON array only.',
      });
      const text = resp.content[0].type === 'text' ? resp.content[0].text : '[]';
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      return Response.json({ tags: JSON.parse(cleaned) });
    }

    if (action === 'translate') {
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: `Translate the following Chinese blog article to English. Keep markdown format.\n\nTitle: ${title}\nContent:\n${content}\n\nReturn JSON: {"titleEn": "...", "excerptEn": "one sentence summary", "contentEn": "full translation"}` }],
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

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[blog/ai-assist]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
