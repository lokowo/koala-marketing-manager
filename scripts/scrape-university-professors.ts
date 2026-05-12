import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropic = new Anthropic();

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// 每所大学的学院/学部列表
const UNIVERSITY_FACULTIES: Record<string, string[]> = {
  'UNSW Sydney': [
    'Engineering - Computer Science and Engineering',
    'Engineering - Electrical Engineering and Telecommunications',
    'Engineering - Mechanical and Manufacturing Engineering',
    'Engineering - Civil and Environmental Engineering',
    'Engineering - Chemical Engineering',
    'Engineering - Biomedical Engineering',
    'Engineering - Mining and Energy',
    'Science - Mathematics and Statistics',
    'Science - Physics',
    'Science - Chemistry',
    'Science - Biological Sciences',
    'Science - Psychology',
    'Science - Aviation',
    'Business School - Accounting and Auditing',
    'Business School - Finance',
    'Business School - Information Systems',
    'Business School - Management',
    'Business School - Marketing',
    'Business School - Economics',
    'Medicine and Health',
    'Law and Justice',
    'Arts, Design and Architecture',
    'Built Environment',
  ],
  'University of Sydney': [
    'Faculty of Engineering - Computer Science',
    'Faculty of Engineering - Electrical and Information Engineering',
    'Faculty of Engineering - Civil Engineering',
    'Faculty of Science - Mathematics and Statistics',
    'Faculty of Science - Physics',
    'Faculty of Science - Chemistry',
    'Business School',
    'Faculty of Medicine and Health',
    'Sydney Law School',
    'Faculty of Arts and Social Sciences',
    'Faculty of Architecture',
  ],
  'University of Melbourne': [
    'Faculty of Engineering and IT - Computing and Information Systems',
    'Faculty of Engineering and IT - Electrical and Electronic Engineering',
    'Faculty of Engineering and IT - Mechanical Engineering',
    'Faculty of Science - Mathematics and Statistics',
    'Faculty of Science - Physics',
    'Faculty of Science - Chemistry',
    'Melbourne Business School',
    'Faculty of Medicine',
    'Melbourne Law School',
    'Faculty of Arts',
  ],
  // 可以继续添加更多大学...先从 Go8 + 主要大学开始
};

interface ScrapedProfessor {
  name: string;
  position: string;
  faculty: string;
  email?: string;
  researchAreas?: string[];
  profileUrl?: string;
}

async function scrapeFaculty(university: string, faculty: string): Promise<ScrapedProfessor[]> {
  console.log(`  🔍 Searching: ${faculty}`);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Search for all academic staff (professors, associate professors, senior lecturers, lecturers) in the ${faculty} department at ${university}, Australia.

Find the official staff/people page for this department and list ALL faculty members you can find.

Return ONLY a JSON array of professors. Each entry should have:
- name: full name in English
- position: their exact title (Professor, Associate Professor, Senior Lecturer, Lecturer)
- email: if publicly available
- researchAreas: array of 2-3 research interests
- profileUrl: their official university staff page URL

Format: [{"name":"...","position":"...","email":"...","researchAreas":["..."],"profileUrl":"..."}]

IMPORTANT:
- Only include people who are currently listed on the university website
- Only include academic/research staff, not admin staff
- Include as many as you can find
- Return ONLY the JSON array, nothing else`
      }],
    });

    // 从回复中提取 JSON
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textBlocks = response.content.filter((b: any) => b.type === 'text');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fullText = textBlocks.map((b: any) => b.text).join('\n');

    // 找到 JSON 数组
    const jsonMatch = fullText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log(`    ⚠️ No JSON found in response`);
      return [];
    }

    const professors = JSON.parse(jsonMatch[0]) as ScrapedProfessor[];
    console.log(`    ✅ Found ${professors.length} staff members`);
    return professors.map(p => ({ ...p, faculty }));
  } catch (e) {
    console.error(`    ❌ Error:`, (e as Error).message);
    return [];
  }
}

async function saveToDatabase(professors: ScrapedProfessor[], university: string) {
  let saved = 0;
  let skipped = 0;

  for (const prof of professors) {
    // 检查是否已存在
    const { data: existing } = await supabase
      .from('professors')
      .select('id')
      .eq('name', prof.name)
      .eq('university', university)
      .maybeSingle();

    if (existing) {
      // 已存在但可能缺少信息，更新
      const updates: Record<string, unknown> = {};
      if (prof.email) updates.email = prof.email;
      if (prof.position) updates.position_title = prof.position;
      if (prof.faculty) updates.faculty = prof.faculty;
      if (prof.profileUrl) updates.profile_url = prof.profileUrl;
      if (prof.researchAreas?.length) updates.research_areas = prof.researchAreas;
      updates.verification_status = 'Verified';

      if (Object.keys(updates).length > 0) {
        await supabase.from('professors').update(updates).eq('id', existing.id);
      }
      skipped++;
      continue;
    }

    // 新教授，插入
    const { error } = await supabase.from('professors').insert({
      name: prof.name,
      university,
      position_title: prof.position || 'Lecturer',
      faculty: prof.faculty,
      email: prof.email || null,
      research_areas: prof.researchAreas || [],
      profile_url: prof.profileUrl || null,
      verification_status: 'Verified',
      data_sources: ['university_website'],
    });

    if (error) {
      if (error.code !== '23505') console.error(`    ❌ ${prof.name}:`, error.message);
      skipped++;
    } else {
      saved++;
    }
  }

  return { saved, skipped };
}

async function main() {
  // 可以通过命令行参数指定大学
  const targetUni = process.argv[2] || 'UNSW Sydney';
  const faculties = UNIVERSITY_FACULTIES[targetUni];

  if (!faculties) {
    console.error(`University "${targetUni}" not found. Available: ${Object.keys(UNIVERSITY_FACULTIES).join(', ')}`);
    return;
  }

  console.log(`🐨 Koala PhD — Scraping professors from ${targetUni}`);
  console.log(`📚 ${faculties.length} faculties to search\n`);

  let totalSaved = 0;
  let totalSkipped = 0;

  for (let i = 0; i < faculties.length; i++) {
    const faculty = faculties[i];
    console.log(`\n[${i + 1}/${faculties.length}] ${faculty}`);

    const professors = await scrapeFaculty(targetUni, faculty);

    if (professors.length > 0) {
      const { saved, skipped } = await saveToDatabase(professors, targetUni);
      totalSaved += saved;
      totalSkipped += skipped;
      console.log(`    💾 Saved: ${saved}, Updated/Skipped: ${skipped}`);
    }

    // rate limit: 每个学院之间等 3 秒
    await sleep(3000);
  }

  console.log(`\n==========================================`);
  console.log(`✅ Done! New professors: ${totalSaved}, Updated: ${totalSkipped}`);

  // 统计
  const { count } = await supabase
    .from('professors')
    .select('*', { count: 'exact', head: true })
    .eq('university', targetUni)
    .eq('verification_status', 'Verified');

  console.log(`📊 ${targetUni} total verified professors: ${count}`);
}

main().catch(console.error);
