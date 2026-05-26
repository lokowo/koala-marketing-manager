import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const CREDIT_COSTS: Record<string, number> = {
  unlock_profile: 10,
  generate_letter: 20,
  send: 0,
  relay: 5,
  request_contact: 15,
  decline: 0,
};

async function getBalance(userId: string): Promise<number> {
  const { data } = await db
    .from('user_profiles')
    .select('credits_remaining')
    .eq('id', userId)
    .single();
  return data?.credits_remaining ?? 0;
}

async function deductCredits(userId: string, amount: number, description: string): Promise<boolean> {
  const balance = await getBalance(userId);
  if (balance < amount) return false;
  const newBalance = balance - amount;
  await db.from('user_profiles').update({
    credits_remaining: newBalance,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);
  await db.from('credit_transactions').insert({
    user_id: userId,
    amount: -amount,
    balance_after: newBalance,
    type: 'matchmaking',
    description,
    reference_id: `matchmaking_${userId}_${Date.now()}`,
  });
  return true;
}

async function notify(userId: string, type: string, title: string, body: string, relatedId?: string) {
  await db.from('ola_notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    related_id: relatedId ?? null,
  });
}

// GET — find matches for current user
export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find discoverable users with similar interests, excluding self
    const { data: myProfile } = await db
      .from('ola_social_profiles')
      .select('city, interests, looking_for')
      .eq('user_id', user.id)
      .single();

    if (!myProfile) {
      return Response.json({ error: 'Please set up your social profile first' }, { status: 400 });
    }

    // Get existing introduction targets to exclude
    const { data: existingIntros } = await db
      .from('ola_introductions')
      .select('to_user_id')
      .eq('from_user_id', user.id);
    const excludeIds = [user.id, ...(existingIntros ?? []).map((r: { to_user_id: string }) => r.to_user_id)];

    // Find discoverable profiles
    const { data: candidates } = await db
      .from('ola_social_profiles')
      .select('user_id, city, interests, looking_for, about_me, ola_description')
      .eq('is_discoverable', true)
      .not('user_id', 'in', `(${excludeIds.join(',')})`)
      .limit(20);

    if (!candidates?.length) {
      return Response.json({ matches: [] });
    }

    // Score candidates by shared interests & city
    const myInterests = new Set((myProfile.interests ?? []) as string[]);
    const myCity = (myProfile.city ?? '') as string;

    type Candidate = { user_id: string; city: string | null; interests: string[] | null; looking_for: string | null; about_me: string | null; ola_description: string | null };

    const scored = (candidates as Candidate[]).map(c => {
      let score = 0;
      const theirInterests = c.interests ?? [];
      for (const i of theirInterests) {
        if (myInterests.has(i)) score += 10;
      }
      if (c.city && c.city === myCity) score += 5;
      return { ...c, score };
    }).sort((a, b) => b.score - a.score).slice(0, 3);

    // Fetch display_name + university for matched users
    const matchedIds = scored.map(s => s.user_id);
    const { data: profiles } = await db
      .from('user_profiles')
      .select('id, display_name, university, target_field, degree_level')
      .in('id', matchedIds);

    const profileMap = new Map<string, { display_name: string | null; university: string | null; target_field: string | null; degree_level: string | null }>();
    for (const p of (profiles ?? [])) {
      profileMap.set(p.id, p);
    }

    const matches = scored.map(s => {
      const p = profileMap.get(s.user_id);
      return {
        userId: s.user_id,
        city: s.city,
        interests: s.interests,
        lookingFor: s.looking_for,
        aboutMe: s.about_me,
        olaDescription: s.ola_description,
        displayName: p?.display_name ? p.display_name.charAt(0) + '**' : '匿名同学',
        university: p?.university ?? null,
        targetField: p?.target_field ?? null,
        degreeLevel: p?.degree_level ?? null,
        score: s.score,
      };
    });

    return Response.json({ matches });
  } catch (error) {
    console.error('[matchmaking GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — perform matchmaking actions
export async function POST(request: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, targetUserId, introductionId, message } = body as {
      action: string;
      targetUserId?: string;
      introductionId?: string;
      message?: string;
    };

    if (!action || !CREDIT_COSTS.hasOwnProperty(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const cost = CREDIT_COSTS[action];

    // Check balance before any paid action
    if (cost > 0) {
      const balance = await getBalance(user.id);
      if (balance < cost) {
        return Response.json({
          error: 'insufficient_credits',
          required: cost,
          balance,
          message: `此操作需要 ${cost} 积分，你当前余额 ${balance} 积分`,
        }, { status: 402 });
      }
    }

    switch (action) {
      case 'unlock_profile': {
        if (!targetUserId) return Response.json({ error: 'Missing targetUserId' }, { status: 400 });

        // Find or create introduction
        let { data: intro } = await db
          .from('ola_introductions')
          .select('id, from_unlocked_profile')
          .eq('from_user_id', user.id)
          .eq('to_user_id', targetUserId)
          .single();

        if (intro?.from_unlocked_profile) {
          return Response.json({ error: 'Profile already unlocked' }, { status: 400 });
        }

        if (!intro) {
          const { data: newIntro } = await db
            .from('ola_introductions')
            .insert({ from_user_id: user.id, to_user_id: targetUserId, status: 'draft' })
            .select('id')
            .single();
          intro = { id: newIntro.id, from_unlocked_profile: false };
        }

        const ok = await deductCredits(user.id, cost, `解锁用户资料 (${targetUserId.slice(0, 8)})`);
        if (!ok) return Response.json({ error: 'insufficient_credits' }, { status: 402 });

        await db.from('ola_introductions').update({ from_unlocked_profile: true }).eq('id', intro.id);

        // Fetch full social profile for unlocked user
        const { data: fullProfile } = await db
          .from('ola_social_profiles')
          .select('city, interests, looking_for, about_me, ola_description, weekend_activities, pets')
          .eq('user_id', targetUserId)
          .single();
        const { data: userProfile } = await db
          .from('user_profiles')
          .select('display_name, university, target_field, degree_level')
          .eq('id', targetUserId)
          .single();

        return Response.json({
          ok: true,
          introductionId: intro.id,
          profile: { ...fullProfile, ...userProfile },
          creditsSpent: cost,
        });
      }

      case 'generate_letter': {
        if (!targetUserId) return Response.json({ error: 'Missing targetUserId' }, { status: 400 });

        const ok = await deductCredits(user.id, cost, `生成介绍信 (${targetUserId.slice(0, 8)})`);
        if (!ok) return Response.json({ error: 'insufficient_credits' }, { status: 402 });

        // Find or create introduction
        let { data: intro } = await db
          .from('ola_introductions')
          .select('id')
          .eq('from_user_id', user.id)
          .eq('to_user_id', targetUserId)
          .single();

        if (!intro) {
          const { data: newIntro } = await db
            .from('ola_introductions')
            .insert({ from_user_id: user.id, to_user_id: targetUserId, status: 'draft' })
            .select('id')
            .single();
          intro = newIntro;
        }

        // Fetch both profiles for AI letter generation context
        const [{ data: fromSocial }, { data: toSocial }, { data: fromProfile }, { data: toProfile }] = await Promise.all([
          db.from('ola_social_profiles').select('city, interests, looking_for, about_me').eq('user_id', user.id).single(),
          db.from('ola_social_profiles').select('city, interests, looking_for, about_me').eq('user_id', targetUserId).single(),
          db.from('user_profiles').select('display_name, university, target_field').eq('id', user.id).single(),
          db.from('user_profiles').select('display_name, university, target_field').eq('id', targetUserId).single(),
        ]);

        const letter = generateIntroLetter(fromProfile, fromSocial, toProfile, toSocial);

        await db.from('ola_introductions').update({
          intro_letter: letter,
          credits_spent_from: cost,
          status: 'letter_ready',
        }).eq('id', intro.id);

        return Response.json({ ok: true, introductionId: intro.id, letter, creditsSpent: cost });
      }

      case 'send': {
        if (!introductionId) return Response.json({ error: 'Missing introductionId' }, { status: 400 });

        const { data: intro } = await db
          .from('ola_introductions')
          .select('id, to_user_id, intro_letter, status')
          .eq('id', introductionId)
          .eq('from_user_id', user.id)
          .single();

        if (!intro) return Response.json({ error: 'Introduction not found' }, { status: 404 });
        if (!intro.intro_letter) return Response.json({ error: 'Generate letter first' }, { status: 400 });

        await db.from('ola_introductions').update({ status: 'sent' }).eq('id', intro.id);

        await notify(
          intro.to_user_id,
          'introduction_received',
          '有人想认识你！',
          '学姐帮你牵线了一位同学，快来看看吧～',
          intro.id,
        );

        return Response.json({ ok: true });
      }

      case 'relay': {
        if (!introductionId || !message) return Response.json({ error: 'Missing introductionId or message' }, { status: 400 });

        const { data: intro } = await db
          .from('ola_introductions')
          .select('id, from_user_id, to_user_id, status')
          .eq('id', introductionId)
          .single();

        if (!intro) return Response.json({ error: 'Introduction not found' }, { status: 404 });
        if (intro.from_user_id !== user.id && intro.to_user_id !== user.id) {
          return Response.json({ error: 'Not authorized' }, { status: 403 });
        }

        const ok = await deductCredits(user.id, cost, `转发消息 (${introductionId.slice(0, 8)})`);
        if (!ok) return Response.json({ error: 'insufficient_credits' }, { status: 402 });

        await db.from('ola_messages').insert({
          introduction_id: introductionId,
          from_user_id: user.id,
          message,
          credits_spent: cost,
        });

        await db.from('ola_introductions').update({
          follow_up_count: (intro.follow_up_count ?? 0) + 1,
          last_follow_up_at: new Date().toISOString(),
        }).eq('id', intro.id);

        const targetId = user.id === intro.from_user_id ? intro.to_user_id : intro.from_user_id;
        await notify(targetId, 'new_message', '你有新消息', '学姐帮你转达了一条消息～', introductionId);

        return Response.json({ ok: true, creditsSpent: cost });
      }

      case 'request_contact': {
        if (!introductionId) return Response.json({ error: 'Missing introductionId' }, { status: 400 });

        const { data: intro } = await db
          .from('ola_introductions')
          .select('id, from_user_id, to_user_id, status')
          .eq('id', introductionId)
          .single();

        if (!intro) return Response.json({ error: 'Introduction not found' }, { status: 404 });

        const ok = await deductCredits(user.id, cost, `请求交换联系方式 (${introductionId.slice(0, 8)})`);
        if (!ok) return Response.json({ error: 'insufficient_credits' }, { status: 402 });

        await db.from('ola_introductions').update({ status: 'contact_requested' }).eq('id', intro.id);

        const targetId = user.id === intro.from_user_id ? intro.to_user_id : intro.from_user_id;
        await notify(targetId, 'contact_request', '有人想和你交换联系方式', '学姐觉得你们很合适，要不要互加个微信？', introductionId);

        return Response.json({ ok: true, creditsSpent: cost });
      }

      case 'decline': {
        if (!introductionId) return Response.json({ error: 'Missing introductionId' }, { status: 400 });

        await db.from('ola_introductions').update({
          status: 'declined',
          declined_reason: message ?? null,
        }).eq('id', introductionId);

        return Response.json({ ok: true });
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[matchmaking POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateIntroLetter(
  fromProfile: { display_name?: string; university?: string; target_field?: string } | null,
  fromSocial: { city?: string; interests?: string[]; looking_for?: string; about_me?: string } | null,
  toProfile: { display_name?: string; university?: string; target_field?: string } | null,
  toSocial: { city?: string; interests?: string[]; looking_for?: string; about_me?: string } | null,
): string {
  const fromName = fromProfile?.display_name ?? '一位同学';
  const toName = toProfile?.display_name ?? '一位同学';
  const fromUni = fromProfile?.university ?? '某大学';
  const toUni = toProfile?.university ?? '某大学';
  const fromField = fromProfile?.target_field ?? '未填写';
  const toField = toProfile?.target_field ?? '未填写';

  const sharedInterests = (fromSocial?.interests ?? []).filter(i =>
    (toSocial?.interests ?? []).includes(i)
  );

  const commonGround = sharedInterests.length > 0
    ? `你们都对 ${sharedInterests.slice(0, 3).join('、')} 感兴趣`
    : '学姐觉得你们的背景很互补';

  const sameCity = fromSocial?.city && fromSocial.city === toSocial?.city
    ? `而且你们都在 ${fromSocial.city}，线下约个咖啡很方便哦～`
    : '';

  return `嗨 ${toName}！学姐帮你介绍一位同学认识～

这是 ${fromName}，来自 ${fromUni}，研究方向是 ${fromField}。${commonGround}。${sameCity}

${fromSocial?.about_me ? `TA 的自我介绍：「${fromSocial.about_me}」` : ''}

学姐觉得你们聊聊一定会有收获的！要不要打个招呼？`.trim();
}
