import { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '../../lib/supabase/server';
import InsightsClient from './InsightsClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '澳洲 PhD 研究洞察',
  description: '覆盖澳洲 38 所大学、24,000+ 位教授与研究员的研究方向分布、大学分组及招生趋势数据。用 AI 找到你的理想导师。',
  keywords: [
    '澳洲PhD', 'PhD研究方向', '澳洲大学排名', 'Go8', '澳洲博士',
    'Australian PhD', 'research landscape', 'PhD supervisor Australia',
    '导师推荐', '博士申请', 'PhD招生',
  ],
  openGraph: {
    title: '澳洲 PhD 研究洞察 | Koala PhD',
    description: '24,000+ 位澳洲学者研究方向分布、38 所大学招生趋势一图看懂',
    type: 'article',
  },
};

const UNIVERSITY_GROUPS: Record<string, string[]> = {
  Go8: ['University of Melbourne', 'University of Sydney', 'Australian National University', 'University of Queensland', 'University of New South Wales', 'Monash University', 'University of Western Australia', 'University of Adelaide'],
  ATN: ['University of Technology Sydney', 'RMIT University', 'Curtin University', 'Queensland University of Technology', 'University of South Australia'],
  IRU: ['Griffith University', 'James Cook University', 'La Trobe University', 'Murdoch University', 'Flinders University', 'Charles Darwin University', 'Western Sydney University'],
  RUN: ['University of New England', 'University of Southern Queensland', 'University of the Sunshine Coast', 'Central Queensland University', 'Southern Cross University', 'Federation University'],
};

function classifyUniversity(name: string): string {
  for (const [group, unis] of Object.entries(UNIVERSITY_GROUPS)) {
    if (unis.some(u => name.includes(u))) return group;
  }
  return 'Other';
}

export interface ResearchArea {
  area: string;
  count: number;
}

export interface UniEntry {
  name: string;
  shortName: string;
  count: number;
}

export interface UniGroup {
  group: string;
  label: string;
  subtotal: number;
  universities: UniEntry[];
}

export interface InsightsData {
  totalProfessors: number;
  totalUniversities: number;
  acceptingRate: number;
  acceptingCount: number;
  topResearchAreas: ResearchArea[];
  universityGroups: UniGroup[];
}

const GROUP_LABELS: Record<string, string> = {
  Go8: 'Go8 八大名校',
  ATN: 'ATN 科技联盟',
  IRU: 'IRU 创新研究联盟',
  RUN: 'RUN 地区大学联盟',
  Other: '其他大学',
};

async function fetchAllProfessors() {
  const PAGE = 1000;
  const all: Array<{ university: string; research_areas: string[]; accepting_students: string | null }> = [];
  let from = 0;
  while (true) {
    const { data } = await db
      .from('professors')
      .select('university, research_areas, accepting_students')
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function fetchInsightsData(): Promise<InsightsData> {
  const [professors, uniResult] = await Promise.all([
    fetchAllProfessors(),
    db.from('universities').select('name, short_name, group_label'),
  ]);

  const universities = uniResult.data ?? [];
  const totalProfessors = professors.length;

  const areaCounts: Record<string, number> = {};
  const profCountByUni: Record<string, number> = {};

  for (const p of professors) {
    const uni = p.university;
    if (uni) profCountByUni[uni] = (profCountByUni[uni] || 0) + 1;

    const areas: string[] = p.research_areas ?? [];
    for (const area of areas) {
      if (!area || typeof area !== 'string') continue;
      const normalized = area.trim();
      if (normalized.length < 3) continue;
      areaCounts[normalized] = (areaCounts[normalized] || 0) + 1;
    }
  }

  const topResearchAreas = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([area, count]) => ({ area, count }));

  const GROUP_ORDER = ['Go8', 'ATN', 'IRU', 'RUN', 'Other'];
  const grouped: Record<string, UniEntry[]> = {};

  for (const u of universities) {
    const g = u.group_label || classifyUniversity(u.name);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push({
      name: u.name,
      shortName: u.short_name || u.name,
      count: profCountByUni[u.name] || 0,
    });
  }

  const universityGroups = GROUP_ORDER
    .filter(g => grouped[g]?.length)
    .map(g => ({
      group: g,
      label: GROUP_LABELS[g] || g,
      subtotal: grouped[g].reduce((s, u) => s + u.count, 0),
      universities: grouped[g].sort((a, b) => b.count - a.count),
    }));

  const acceptingCount = professors.filter(
    (p: { accepting_students: string | null }) =>
      p.accepting_students === 'yes' || p.accepting_students === 'likely',
  ).length;
  const acceptingRate = totalProfessors > 0
    ? Math.round((acceptingCount / totalProfessors) * 1000) / 10
    : 0;

  return {
    totalProfessors,
    totalUniversities: universities.length,
    acceptingRate,
    acceptingCount,
    topResearchAreas,
    universityGroups,
  };
}

export default async function InsightsPage() {
  const data = await fetchInsightsData();

  return (
    <div className="min-h-screen pb-24 bg-gray-50 dark:bg-[#080c10]">
      {/* Hero */}
      <div className="px-4 pt-8 pb-6 max-w-2xl mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-gray-900 dark:text-[#e8e4dc]">
          澳洲 PhD 研究洞察
        </h1>
        <p className="text-sm text-gray-500 dark:text-[#6a7a7e] mt-2">
          基于 Koala PhD 学者数据库实时聚合 · 每小时更新
        </p>
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-3 gap-3 px-4 max-w-2xl mx-auto mb-8">
        <div className="rounded-xl bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 p-4 text-center">
          <p className="text-2xl md:text-3xl font-light tabular-nums text-gray-900 dark:text-[#e8e4dc]">
            {data.totalProfessors.toLocaleString()}
            <span className="text-lg text-gray-400 dark:text-[#6a7a7e]">+</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-[#6a7a7e] mt-1">在库学者</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 p-4 text-center">
          <p className="text-2xl md:text-3xl font-light tabular-nums text-gray-900 dark:text-[#e8e4dc]">
            {data.totalUniversities}
          </p>
          <p className="text-xs text-gray-500 dark:text-[#6a7a7e] mt-1">覆盖大学</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 p-4 text-center">
          <p className="text-2xl md:text-3xl font-light tabular-nums text-gray-900 dark:text-[#e8e4dc]">
            {data.acceptingRate}<span className="text-lg text-gray-400 dark:text-[#6a7a7e]">%</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-[#6a7a7e] mt-1">正在招生</p>
        </div>
      </div>

      <InsightsClient data={data} />

      {/* CTA */}
      <div className="px-4 pt-8 pb-4 max-w-2xl mx-auto text-center">
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-light text-gray-900 dark:text-[#e8e4dc] mb-2">
            用 AI 找到你的理想导师
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#6a7a7e] mb-5 max-w-md mx-auto">
            告诉 Ola 你的研究兴趣，AI 帮你从 {data.totalProfessors.toLocaleString()} 位学者中精准匹配
          </p>
          <Link
            href="/koala/chat"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-full no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition-opacity min-h-[44px]"
          >
            开始对话
          </Link>
        </div>
      </div>

      {/* Data source note */}
      <div className="text-center text-[10px] text-gray-400 dark:text-[#6a7a7e]/60 px-4 mt-4">
        数据来源: ARC Portal · Semantic Scholar · OpenAlex · 大学官网 | &copy; 2026 Koala PhD
      </div>
    </div>
  );
}
