import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  date: string;
  name: string;
  name_cn: string;
  category: string;
  ola_mood: string | null;
  ola_comment: string | null;
  year: number | null;
  is_recurring: boolean | null;
}

interface LocalEvent {
  id: string;
  city: string;
  event_name: string;
  event_name_cn: string | null;
  venue: string | null;
  event_date: string;
  event_time: string | null;
  category: string;
  description: string | null;
  ola_comment: string | null;
}

interface Venue {
  id: string;
  city: string;
  category: string;
  name: string;
  name_cn: string | null;
  address: string | null;
  vibe: string | null;
  ola_comment: string | null;
  price_level: string | null;
  best_for: string | null;
  website: string | null;
}

type TimeOfDay = 'morning' | 'noon' | 'afternoon' | 'evening' | 'late_night' | 'deep_night';

interface TimeContext {
  aestHour: number;
  timeOfDay: TimeOfDay;
  dayOfWeek: number; // 0=Sun … 6=Sat
  isFridayAfternoon: boolean;
  isWeekend: boolean;
  dateStr: string; // YYYY-MM-DD in AEST
}

// ─── Time Helpers ───────────────────────────────────────────────────────────

function getAESTContext(): TimeContext {
  const now = new Date();
  const aest = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  const hour = aest.getHours();
  const dow = aest.getDay();
  const y = aest.getFullYear();
  const m = String(aest.getMonth() + 1).padStart(2, '0');
  const d = String(aest.getDate()).padStart(2, '0');

  let timeOfDay: TimeOfDay;
  if (hour >= 2 && hour < 6) timeOfDay = 'deep_night';
  else if (hour >= 6 && hour < 11) timeOfDay = 'morning';
  else if (hour >= 11 && hour < 14) timeOfDay = 'noon';
  else if (hour >= 14 && hour < 18) timeOfDay = 'afternoon';
  else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
  else timeOfDay = 'late_night'; // 22-2

  return {
    aestHour: hour,
    timeOfDay,
    dayOfWeek: dow,
    isFridayAfternoon: dow === 5 && hour >= 14,
    isWeekend: dow === 0 || dow === 6 || (dow === 5 && hour >= 14),
    dateStr: `${y}-${m}-${d}`,
  };
}

function getGreetingInstruction(t: TimeContext): string {
  switch (t.timeOfDay) {
    case 'morning': return '现在是早上，用温暖的方式打招呼："早上好～"或"早！今天精神怎么样？"';
    case 'noon': return '现在是中午，关心用户吃饭："吃饭了没？别光顾着学习忘了吃饭哦～"';
    case 'afternoon': return '现在是下午，正常对话即可。';
    case 'evening': return '现在是晚上，用温暖关怀的语气，偶尔提醒别太晚："晚上好～今天辛苦了"';
    case 'late_night': return '现在是深夜了，温柔催用户睡觉："这么晚了还不睡？学姐要没收你手机了！不过…既然来了就聊会儿吧"';
    case 'deep_night': return '现在是凌晨！必须强烈催睡觉："天呐你还醒着？！必须去睡觉！身体要紧！学姐命令你马上放下手机！"';
  }
}

// ─── DB Queries ─────────────────────────────────────────────────────────────

export async function getTodayCalendar(
  supabase: SupabaseClient,
  dateStr: string,
): Promise<CalendarEvent | null> {
  const { data } = await supabase
    .from('ola_calendar' as 'user_profiles')
    .select('*')
    .eq('date', dateStr as never)
    .limit(1)
    .maybeSingle();

  return data ? (data as unknown as CalendarEvent) : null;
}

export async function getUpcomingEvents(
  supabase: SupabaseClient,
  city: string,
  days = 7,
): Promise<LocalEvent[]> {
  const now = new Date();
  const aest = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  const y = aest.getFullYear();
  const m = String(aest.getMonth() + 1).padStart(2, '0');
  const d = String(aest.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  const future = new Date(aest);
  future.setDate(future.getDate() + days);
  const fy = future.getFullYear();
  const fm = String(future.getMonth() + 1).padStart(2, '0');
  const fd = String(future.getDate()).padStart(2, '0');
  const futureStr = `${fy}-${fm}-${fd}`;

  const { data } = await supabase
    .from('ola_events' as 'user_profiles')
    .select('id, city, event_name, event_name_cn, venue, event_date, event_time, category, description, ola_comment')
    .eq('city', city.toLowerCase() as never)
    .eq('is_active', true as never)
    .gte('event_date', todayStr as never)
    .lte('event_date', futureStr as never)
    .order('event_date', { ascending: true })
    .limit(10);

  return (data as unknown as LocalEvent[]) ?? [];
}

export async function getWeekendSuggestion(
  supabase: SupabaseClient,
  city: string,
): Promise<{ venue: Venue | null; events: LocalEvent[] }> {
  const { data: venues } = await supabase
    .from('ola_local_knowledge' as 'user_profiles')
    .select('*')
    .eq('city', city.toLowerCase() as never)
    .eq('is_active', true as never);

  const allVenues = (venues as unknown as Venue[]) ?? [];
  const venue = allVenues.length > 0
    ? allVenues[Math.floor(Math.random() * allVenues.length)]
    : null;

  const now = new Date();
  const aest = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  const dow = aest.getDay();

  // Find next Saturday & Sunday
  const daysToSat = dow === 6 ? 0 : (6 - dow) % 7;
  const sat = new Date(aest);
  sat.setDate(sat.getDate() + daysToSat);
  const sun = new Date(sat);
  sun.setDate(sun.getDate() + 1);

  const fmt = (dt: Date) => {
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const { data: evts } = await supabase
    .from('ola_events' as 'user_profiles')
    .select('id, city, event_name, event_name_cn, venue, event_date, event_time, category, description, ola_comment')
    .eq('city', city.toLowerCase() as never)
    .eq('is_active', true as never)
    .gte('event_date', fmt(sat) as never)
    .lte('event_date', fmt(sun) as never)
    .order('event_date', { ascending: true })
    .limit(5);

  return { venue, events: (evts as unknown as LocalEvent[]) ?? [] };
}

export async function getVenueByContext(
  supabase: SupabaseClient,
  keywords: string[],
  city = 'sydney',
): Promise<Venue[]> {
  const { data: allVenues } = await supabase
    .from('ola_local_knowledge' as 'user_profiles')
    .select('*')
    .eq('city', city.toLowerCase() as never)
    .eq('is_active', true as never);

  if (!allVenues) return [];

  const venues = allVenues as unknown as Venue[];
  const lowerKw = keywords.map(k => k.toLowerCase());

  const scored = venues.map(v => {
    let score = 0;
    const searchable = [
      v.name, v.name_cn, v.category, v.vibe, v.best_for, v.ola_comment,
    ].filter(Boolean).join(' ').toLowerCase();
    for (const kw of lowerKw) {
      if (searchable.includes(kw)) score += 1;
    }
    return { venue: v, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.venue);
}

// ─── Prompt Builder ─────────────────────────────────────────────────────────

export async function buildLocalKnowledgePrompt(
  supabase: SupabaseClient,
  city = 'sydney',
): Promise<string> {
  const time = getAESTContext();
  const parts: string[] = [];

  parts.push(`## 🕐 当前时间与问候`);
  parts.push(`澳洲东部时间（AEST）：${time.dateStr} ${String(time.aestHour).padStart(2, '0')}:00`);
  parts.push(`星期${['日', '一', '二', '三', '四', '五', '六'][time.dayOfWeek]}`);
  parts.push(getGreetingInstruction(time));

  if (time.isFridayAfternoon) {
    parts.push('🎉 周五下午了！自动推荐夜生活/周末活动，嗨起来的语气！');
  }

  // Today's calendar
  const calendar = await getTodayCalendar(supabase, time.dateStr);
  if (calendar) {
    parts.push('');
    parts.push(`## 🗓 今日特殊日：${calendar.name_cn}（${calendar.name}）`);
    if (calendar.ola_comment) parts.push(`学姐打招呼方式：${calendar.ola_comment}`);
    if (calendar.ola_mood) parts.push(`今日情绪基调：${calendar.ola_mood}`);
    parts.push('在对话开头自然融入今天的节日/纪念日，不要生硬。');
  }

  // Upcoming events
  const events = await getUpcomingEvents(supabase, city, 7);
  if (events.length > 0) {
    parts.push('');
    parts.push('## 📅 本周活动（可在聊天中自然提到）');
    for (const e of events) {
      const line = `- ${e.event_date} ${e.event_time ?? ''} | ${e.event_name_cn ?? e.event_name} @ ${e.venue ?? city}`;
      parts.push(line.trim());
      if (e.ola_comment) parts.push(`  学姐推荐语：${e.ola_comment}`);
    }
  }

  // Weekend suggestion (Friday 14:00+ or weekend)
  if (time.isWeekend) {
    const weekend = await getWeekendSuggestion(supabase, city);
    parts.push('');
    parts.push('## 🎶 周末推荐');
    if (weekend.venue) {
      const v = weekend.venue;
      parts.push(`场所：${v.name_cn ?? v.name}（${v.name}）`);
      if (v.address) parts.push(`地址：${v.address}`);
      if (v.vibe) parts.push(`氛围：${v.vibe}`);
      if (v.price_level) parts.push(`价位：${v.price_level}`);
      if (v.ola_comment) parts.push(`学姐评价：${v.ola_comment}`);
    }
    if (weekend.events.length > 0) {
      parts.push('本周末活动：');
      for (const e of weekend.events) {
        parts.push(`- ${e.event_date} ${e.event_time ?? ''} | ${e.event_name_cn ?? e.event_name} @ ${e.venue ?? city}`);
      }
    }
    parts.push('当用户聊到无聊/周末计划时，自然推荐以上内容。');
  }

  return parts.join('\n');
}
