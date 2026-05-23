import { type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { getProfessor } from '../../../lib/services/professorService';
import { checkUsage, incrementUsage } from '../../../lib/services/usageTracker';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return Response.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { coldEmailId } = body as { coldEmailId?: string };

    if (!coldEmailId) {
      return Response.json({ error: 'Missing coldEmailId' }, { status: 400 });
    }

    // Check usage limits
    const usage = await checkUsage(supabaseAdmin, user.id, 'email');
    if (!usage.allowed) {
      return Response.json(
        { error: '今日套磁信生成次数已用完', used: usage.used, limit: usage.limit },
        { status: 403 },
      );
    }

    // Fetch original email
    const { data: originalEmail, error: emailError } = await db
      .from('cold_emails')
      .select('*')
      .eq('id', coldEmailId)
      .eq('user_id', user.id)
      .single();

    if (emailError || !originalEmail) {
      return Response.json({ error: '原始邮件不存在' }, { status: 404 });
    }

    // Fetch professor's latest data
    const professor = await getProfessor(originalEmail.professor_id);
    if (!professor) {
      return Response.json({ error: '教授数据不存在' }, { status: 404 });
    }

    // Fetch latest papers for fresh talking points
    const { data: papers } = await db
      .from('papers')
      .select('title, year, citation_count, journal, abstract')
      .eq('professor_id', originalEmail.professor_id)
      .order('year', { ascending: false })
      .limit(3);

    // Fetch student profile for context
    const { data: profile } = await db
      .from('user_profiles')
      .select('display_name, university, major, degree_level, target_field, research_description')
      .eq('id', user.id)
      .single();

    const followUpCount = originalEmail.follow_up_count ?? 0;

    const prompt = `You are a PhD application follow-up email specialist.

## Context
The student previously sent this cold email to Professor ${professor.name} at ${professor.university}:

Subject: ${originalEmail.subject}
Body:
${originalEmail.body}

The email was sent ${originalEmail.sent_at ? `on ${new Date(originalEmail.sent_at as string).toLocaleDateString('en-US')}` : 'recently'}.
This will be follow-up #${followUpCount + 1}.

## Student
${profile ? `${profile.display_name ?? ''}, ${profile.major ?? ''} at ${profile.university ?? ''}, researching ${profile.target_field ?? 'N/A'}` : 'Student profile not available'}

## Professor's Latest Research
${papers && papers.length > 0
  ? papers.map((p: Record<string, unknown>) =>
      `- "${p.title}" (${p.year ?? 'n/a'}, ${p.journal ?? 'n/a'})`
    ).join('\n')
  : 'No recent papers found'}

Research areas: ${professor.researchAreas.join(', ')}
${professor.potentialRpTopics.length > 0 ? `Potential RP topics: ${professor.potentialRpTopics.join(', ')}` : ''}

## Requirements
1. Write a polite follow-up email (100-150 words, English)
2. Reference the original email briefly without repeating it
3. Add a NEW talking point — reference a recent paper, grant, or research direction not mentioned in the original
4. ${followUpCount === 0
    ? 'First follow-up: express continued interest, mention a specific new development'
    : 'Subsequent follow-up: keep it very brief, offer a specific question or proposal'}
5. End with a clear, low-pressure call to action (e.g., "Would a 15-minute video call work?")
6. Tone: professional, respectful of their time, not desperate

Return valid JSON only (no markdown fencing):
{
  "subject": "Re: [original subject, keep the Re: prefix]",
  "body": "Follow-up email body"
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: 'You are a PhD application email expert. Output only valid JSON, no markdown code fences.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (response.content[0] as { type: 'text'; text: string }).text.trim();
    let emailData: { subject: string; body: string };
    try {
      emailData = JSON.parse(text.replace(/```json|```/g, ''));
    } catch {
      return Response.json({ error: '跟进邮件生成格式错误，请重试' }, { status: 500 });
    }

    // Save follow-up email to cold_emails
    const { data: savedEmail } = await db
      .from('cold_emails')
      .insert({
        user_id: user.id,
        professor_id: originalEmail.professor_id,
        subject: emailData.subject,
        body: emailData.body,
        highlights: [],
        match_scores: originalEmail.match_scores ?? [],
        parent_email_id: coldEmailId,
        student_snapshot: originalEmail.student_snapshot,
        professor_snapshot: {
          name: professor.name,
          university: professor.university,
          research_areas: professor.researchAreas,
          h_index: professor.hIndex,
        },
      })
      .select('id')
      .single();

    // Update original email's follow_up_count
    await db
      .from('cold_emails')
      .update({ follow_up_count: followUpCount + 1 })
      .eq('id', coldEmailId)
      .eq('user_id', user.id);

    // Track usage
    await incrementUsage(supabaseAdmin, user.id, 'email', {
      professor_id: originalEmail.professor_id,
      type: 'follow_up',
      parent_email_id: coldEmailId,
    });

    return Response.json({
      id: savedEmail?.id ?? null,
      subject: emailData.subject,
      body: emailData.body,
      parentEmailId: coldEmailId,
      followUpNumber: followUpCount + 1,
    });
  } catch (e) {
    console.error('[generate-follow-up]', e);
    return Response.json({ error: '跟进邮件生成失败，请稍后再试' }, { status: 500 });
  }
}
