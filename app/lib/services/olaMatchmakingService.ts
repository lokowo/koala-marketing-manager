import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AnonymousProfileCard {
  userId: string;
  city: string | null;
  field: string | null;
  interests: string[] | null;
  ola_description: string | null;
  about_me: string | null;
  looking_for: string;
}

export interface UnlockedProfileCard extends AnonymousProfileCard {
  pets: string | null;
  weekend_activities: string | null;
  age_range: string | null;
  relationship_status: string;
}

export interface CreditError {
  error: 'insufficient_credits';
  needed: number;
  remaining: number;
}

type ServiceResult<T> = T | CreditError;

function isCreditError(r: unknown): r is CreditError {
  return typeof r === 'object' && r !== null && (r as CreditError).error === 'insufficient_credits';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function deductCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
): Promise<CreditError | null> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('credits_remaining')
    .eq('id', userId)
    .single();

  const remaining = (profile as { credits_remaining: number } | null)?.credits_remaining ?? 0;
  if (remaining < amount) {
    return { error: 'insufficient_credits', needed: amount, remaining };
  }

  await supabase
    .from('user_profiles')
    .update({ credits_remaining: remaining - amount } as never)
    .eq('id', userId);

  return null;
}

async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  title: string,
  body: string,
  relatedId?: string,
): Promise<void> {
  await supabase
    .from('ola_notifications' as 'user_profiles')
    .insert({
      user_id: userId,
      type,
      title,
      body,
      related_id: relatedId ?? null,
    } as never);
}

// ─── 1. findMatchForUser ────────────────────────────────────────────────────

export async function findMatchForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<AnonymousProfileCard[]> {
  const { data: myProfile } = await supabase
    .from('user_profiles')
    .select('target_field')
    .eq('id', userId)
    .single();

  const { data: mySocial } = await supabase
    .from('ola_social_profiles' as 'user_profiles')
    .select('city, interests')
    .eq('user_id', userId)
    .single();

  const myCity = (mySocial as { city: string | null } | null)?.city;
  const myInterests: string[] = (mySocial as { interests: string[] | null } | null)?.interests ?? [];
  const myField = (myProfile as { target_field: string | null } | null)?.target_field;

  const { data: candidates } = await supabase
    .from('ola_social_profiles' as 'user_profiles')
    .select('user_id, city, interests, about_me, ola_description, looking_for, pets, weekend_activities, age_range, relationship_status')
    .eq('is_discoverable', true as never)
    .neq('user_id', userId);

  if (!candidates || candidates.length === 0) return [];

  type CandidateRow = {
    user_id: string; city: string | null; interests: string[] | null;
    about_me: string | null; ola_description: string | null; looking_for: string;
    pets: string | null; weekend_activities: string | null;
    age_range: string | null; relationship_status: string;
  };

  const rows = candidates as unknown as CandidateRow[];
  const candidateUserIds = rows.map(r => r.user_id);

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, target_field')
    .in('id', candidateUserIds);

  const fieldMap = new Map<string, string>();
  for (const p of (profiles ?? []) as { id: string; target_field: string | null }[]) {
    if (p.target_field) fieldMap.set(p.id, p.target_field);
  }

  const scored = rows.map(r => {
    let score = 0;
    if (myCity && r.city && r.city.toLowerCase() === myCity.toLowerCase()) score += 30;
    const theirField = fieldMap.get(r.user_id) ?? '';
    if (myField && theirField && (
      theirField.toLowerCase().includes(myField.toLowerCase()) ||
      myField.toLowerCase().includes(theirField.toLowerCase())
    )) score += 40;
    const theirInterests = r.interests ?? [];
    const common = myInterests.filter(i => theirInterests.includes(i));
    score += common.length * 10;
    return { ...r, field: fieldMap.get(r.user_id) ?? null, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 10).map(r => ({
    userId: r.user_id,
    city: r.city,
    field: r.field,
    interests: r.interests,
    ola_description: r.ola_description,
    about_me: r.about_me,
    looking_for: r.looking_for,
  }));
}

// ─── 2. unlockProfile ───────────────────────────────────────────────────────

const UNLOCK_COST = 10;

export async function unlockProfile(
  supabase: SupabaseClient,
  userId: string,
  targetUserId: string,
): Promise<ServiceResult<UnlockedProfileCard>> {
  const creditErr = await deductCredits(supabase, userId, UNLOCK_COST);
  if (creditErr) return creditErr;

  const { data: social } = await supabase
    .from('ola_social_profiles' as 'user_profiles')
    .select('*')
    .eq('user_id', targetUserId)
    .single();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('target_field')
    .eq('id', targetUserId)
    .single();

  const s = social as unknown as {
    user_id: string; city: string | null; interests: string[] | null;
    about_me: string | null; ola_description: string | null; looking_for: string;
    pets: string | null; weekend_activities: string | null;
    age_range: string | null; relationship_status: string;
  };

  // Mark unlock on any existing introduction between these users
  await supabase
    .from('ola_introductions' as 'user_profiles')
    .update({ from_unlocked_profile: true, updated_at: new Date().toISOString() } as never)
    .eq('from_user_id', userId)
    .eq('to_user_id', targetUserId);

  return {
    userId: s.user_id,
    city: s.city,
    field: (profile as { target_field: string | null } | null)?.target_field ?? null,
    interests: s.interests,
    ola_description: s.ola_description,
    about_me: s.about_me,
    looking_for: s.looking_for,
    pets: s.pets,
    weekend_activities: s.weekend_activities,
    age_range: s.age_range,
    relationship_status: s.relationship_status,
  };
}

// ─── 3. generateIntroLetter ─────────────────────────────────────────────────

const INTRO_LETTER_COST = 20;

export async function generateIntroLetter(
  supabase: SupabaseClient,
  fromUserId: string,
  toUserId: string,
  personalMessage?: string,
): Promise<ServiceResult<{ introductionId: string; letter: string }>> {
  const creditErr = await deductCredits(supabase, fromUserId, INTRO_LETTER_COST);
  if (creditErr) return creditErr;

  const [fromProfile, toProfile, fromSocial, toSocial] = await Promise.all([
    supabase.from('user_profiles').select('display_name, target_field, university, major').eq('id', fromUserId).single(),
    supabase.from('user_profiles').select('display_name, target_field, university, major').eq('id', toUserId).single(),
    supabase.from('ola_social_profiles' as 'user_profiles').select('city, interests, about_me, pets, weekend_activities').eq('user_id', fromUserId).single(),
    supabase.from('ola_social_profiles' as 'user_profiles').select('city, interests, about_me, pets, weekend_activities').eq('user_id', toUserId).single(),
  ]);

  type ProfileRow = { display_name: string | null; target_field: string | null; university: string | null; major: string | null };
  type SocialRow = { city: string | null; interests: string[] | null; about_me: string | null; pets: string | null; weekend_activities: string | null };

  const fp = fromProfile.data as unknown as ProfileRow | null;
  const tp = toProfile.data as unknown as ProfileRow | null;
  const fs = fromSocial.data as unknown as SocialRow | null;
  const ts = toSocial.data as unknown as SocialRow | null;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const result = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: `你是 Ola 学姐，正在帮两个留学生牵线认识。写一封轻松友好的介绍信，用第三人称介绍发起方给接收方。
规则：
- 不透露真名，用"一位朋友"或"学姐认识的一个人"代替
- 提到双方的共同点（城市、方向、兴趣）
- 语气像闺蜜介绍朋友，不是正式信函
- 150-250字，中文
- 如果有发起方的个人留言，自然融入`,
    messages: [{
      role: 'user',
      content: `发起方信息：
城市：${fs?.city ?? '未知'}
研究方向：${fp?.target_field ?? '未知'}
学校/专业：${fp?.university ?? ''}${fp?.major ? ' ' + fp.major : ''}
兴趣：${fs?.interests?.join('、') ?? '未知'}
自我介绍：${fs?.about_me ?? ''}
宠物：${fs?.pets ?? '无'}
周末活动：${fs?.weekend_activities ?? ''}
${personalMessage ? `个人留言：${personalMessage}` : ''}

接收方信息：
城市：${ts?.city ?? '未知'}
研究方向：${tp?.target_field ?? '未知'}
学校/专业：${tp?.university ?? ''}${tp?.major ? ' ' + tp.major : ''}
兴趣：${ts?.interests?.join('、') ?? '未知'}
自我介绍：${ts?.about_me ?? ''}

请写一封介绍信给接收方。`,
    }],
  });

  const letter = (result.content[0] as { type: 'text'; text: string }).text.trim();

  const { data: intro, error } = await supabase
    .from('ola_introductions' as 'user_profiles')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      intro_letter: letter,
      status: 'draft',
      credits_spent_from: INTRO_LETTER_COST,
    } as never)
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create introduction: ${error.message}`);

  return {
    introductionId: (intro as unknown as { id: string }).id,
    letter,
  };
}

// ─── 4. sendIntroduction ────────────────────────────────────────────────────

const SEND_COST = 5;

export async function sendIntroduction(
  supabase: SupabaseClient,
  introductionId: string,
  fromUserId: string,
): Promise<ServiceResult<{ success: true }>> {
  const creditErr = await deductCredits(supabase, fromUserId, SEND_COST);
  if (creditErr) return creditErr;

  const { data: intro } = await supabase
    .from('ola_introductions' as 'user_profiles')
    .select('to_user_id, intro_letter, credits_spent_from')
    .eq('id', introductionId)
    .single();

  if (!intro) throw new Error('Introduction not found');
  const row = intro as unknown as { to_user_id: string; intro_letter: string; credits_spent_from: number };

  await supabase
    .from('ola_introductions' as 'user_profiles')
    .update({
      status: 'sent',
      credits_spent_from: row.credits_spent_from + SEND_COST,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', introductionId);

  await createNotification(
    supabase,
    row.to_user_id,
    'intro_received',
    '学姐想介绍一个人给你认识',
    row.intro_letter ?? '学姐帮你牵线了一位新朋友，快来看看吧～',
    introductionId,
  );

  // Send email (fire-and-forget)
  sendIntroEmail(supabase, row.to_user_id, introductionId).catch(err =>
    console.error('[matchmaking] email failed:', err));

  return { success: true };
}

async function sendIntroEmail(supabase: SupabaseClient, toUserId: string, introductionId: string) {
  const { data: user } = await supabase.from('user_profiles').select('email, display_name').eq('id', toUserId).single();
  const email = (user as { email: string | null } | null)?.email;
  if (!email) return;

  const { sendWelcomeEmail } = await import('./emailService');
  // Reuse the welcome template pattern — sends a branded notification
  // In production, a dedicated intro email template would be better
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://koalaphd.com';

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'noreply@koalaphd.com',
    to: email,
    subject: '🐨 学姐想介绍一个人给你认识',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <p>Hi ${(user as { display_name: string | null })?.display_name ?? '同学'}，</p>
      <p>Ola 学姐帮你牵线了一位新朋友！你们有很多共同点哦～</p>
      <p>快来看看这封介绍信吧：</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${baseUrl}/koala/messages?intro=${introductionId}"
           style="display:inline-block;padding:12px 32px;background:#c4a050;color:#1a2332;font-weight:600;text-decoration:none;border-radius:24px;">
          查看介绍信
        </a>
      </p>
      <p style="color:#907858;font-size:12px;">— Ola 学姐 · Koala PhD</p>
    </div>`,
  });
}

// ─── 5. relayMessage ────────────────────────────────────────────────────────

const RELAY_COST = 5;

export async function relayMessage(
  supabase: SupabaseClient,
  introductionId: string,
  fromUserId: string,
  message: string,
): Promise<ServiceResult<{ messageId: string }>> {
  const creditErr = await deductCredits(supabase, fromUserId, RELAY_COST);
  if (creditErr) return creditErr;

  const { data: intro } = await supabase
    .from('ola_introductions' as 'user_profiles')
    .select('from_user_id, to_user_id')
    .eq('id', introductionId)
    .single();

  if (!intro) throw new Error('Introduction not found');
  const row = intro as unknown as { from_user_id: string; to_user_id: string };

  const toUserId = row.from_user_id === fromUserId ? row.to_user_id : row.from_user_id;

  const { data: msg, error } = await supabase
    .from('ola_messages' as 'user_profiles')
    .insert({
      introduction_id: introductionId,
      from_user_id: fromUserId,
      message,
      credits_spent: RELAY_COST,
    } as never)
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create message: ${error.message}`);

  await createNotification(
    supabase,
    toUserId,
    'relay_message',
    '学姐帮你传了一句话',
    `"${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"`,
    introductionId,
  );

  return { messageId: (msg as unknown as { id: string }).id };
}

// ─── 6. requestContact ──────────────────────────────────────────────────────

const CONTACT_REQUEST_COST = 10;

export async function requestContact(
  supabase: SupabaseClient,
  introductionId: string,
  fromUserId: string,
): Promise<ServiceResult<{ success: true }>> {
  const creditErr = await deductCredits(supabase, fromUserId, CONTACT_REQUEST_COST);
  if (creditErr) return creditErr;

  const { data: intro } = await supabase
    .from('ola_introductions' as 'user_profiles')
    .select('from_user_id, to_user_id')
    .eq('id', introductionId)
    .single();

  if (!intro) throw new Error('Introduction not found');
  const row = intro as unknown as { from_user_id: string; to_user_id: string };
  const toUserId = row.from_user_id === fromUserId ? row.to_user_id : row.from_user_id;

  await createNotification(
    supabase,
    toUserId,
    'contact_request',
    '学姐帮你问对方要联系方式了',
    '对方通过学姐牵线想要你的联系方式，你愿意的话可以分享给 ta～',
    introductionId,
  );

  await supabase
    .from('ola_introductions' as 'user_profiles')
    .update({ updated_at: new Date().toISOString() } as never)
    .eq('id', introductionId);

  return { success: true };
}

// ─── 7. declineIntroduction ─────────────────────────────────────────────────

export async function declineIntroduction(
  supabase: SupabaseClient,
  introductionId: string,
  userId: string,
  reason?: string,
): Promise<void> {
  await supabase
    .from('ola_introductions' as 'user_profiles')
    .update({
      status: 'declined',
      declined_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', introductionId);

  const { data: intro } = await supabase
    .from('ola_introductions' as 'user_profiles')
    .select('from_user_id')
    .eq('id', introductionId)
    .single();

  if (intro) {
    const fromId = (intro as unknown as { from_user_id: string }).from_user_id;
    if (fromId !== userId) {
      await createNotification(
        supabase,
        fromId,
        'intro_declined',
        '这次牵线没成功',
        '对方暂时不方便认识新朋友，不过别灰心，学姐再帮你看看其他人选～',
        introductionId,
      );
    }
  }
}

// ─── 8. autoFollowUp ───────────────────────────────────────────────────────

export async function autoFollowUp(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: intros } = await supabase
    .from('ola_introductions' as 'user_profiles')
    .select('id, to_user_id, follow_up_count')
    .eq('status', 'sent' as never)
    .lt('created_at', cutoff)
    .lt('follow_up_count', 2 as never);

  if (!intros || intros.length === 0) return 0;

  let count = 0;
  for (const intro of intros as unknown as { id: string; to_user_id: string; follow_up_count: number }[]) {
    await createNotification(
      supabase,
      intro.to_user_id,
      'intro_follow_up',
      '学姐来催你啦～',
      '之前介绍给你的朋友还在等你回复呢，去看看吧！',
      intro.id,
    );

    await supabase
      .from('ola_introductions' as 'user_profiles')
      .update({
        follow_up_count: intro.follow_up_count + 1,
        last_follow_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', intro.id);

    count++;
  }

  return count;
}
