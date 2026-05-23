import { type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang } = (await request.json()) as {
      text?: string;
      targetLang?: 'en' | 'zh' | 'both';
    };

    if (!text || text.trim().length === 0) {
      return Response.json({ error: 'Missing text' }, { status: 400 });
    }

    if (text.length > 2000) {
      return Response.json({ error: 'Text too long (max 2000 chars)' }, { status: 400 });
    }

    const lang = targetLang ?? 'en';

    let instruction: string;
    if (lang === 'both') {
      instruction = `Polish this text written by a university professor for their public academic profile page. Make it sound professional, warm, and approachable to prospective PhD students. Return JSON: {"en": "polished English version", "zh": "polished Chinese version"}. No markdown fencing.`;
    } else if (lang === 'zh') {
      instruction = `Polish this text written by a university professor for their public academic profile page. Translate to Chinese if needed. Make it sound professional, warm, and approachable to prospective PhD students. Return JSON: {"polished": "the polished Chinese text"}. No markdown fencing.`;
    } else {
      instruction = `Polish this text written by a university professor for their public academic profile page. Translate to English if needed. Make it sound professional, warm, and approachable to prospective PhD students. Return JSON: {"polished": "the polished English text"}. No markdown fencing.`;
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: 'You are an academic writing assistant. Output only valid JSON, no markdown code fences.',
      messages: [{ role: 'user', content: `${instruction}\n\nOriginal text:\n${text}` }],
    });

    const raw = (response.content[0] as { type: 'text'; text: string }).text.trim();

    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, ''));

      if (lang === 'both') {
        return Response.json({ polished_en: parsed.en, polished_zh: parsed.zh });
      }
      return Response.json({ polished_text: parsed.polished ?? parsed.en ?? parsed.zh ?? raw });
    } catch {
      return Response.json({ polished_text: raw });
    }
  } catch (e) {
    console.error('[professor/ai-polish]', e);
    return Response.json({ error: 'AI service error' }, { status: 500 });
  }
}
