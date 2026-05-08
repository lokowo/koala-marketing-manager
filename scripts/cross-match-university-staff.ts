import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const UNIVERSITY_DIRECTORIES: Record<string, { name: string; searchUrl: string; type: 'api' | 'web' }> = {
  'University of Melbourne': {
    name: 'Find an Expert',
    searchUrl: 'https://findanexpert.unimelb.edu.au/api/search?query={name}&type=researcher',
    type: 'api',
  },
  'University of Sydney': {
    name: 'Sydney Research',
    searchUrl: 'https://www.sydney.edu.au/research/search.html?search={name}',
    type: 'web',
  },
  'University of Queensland': {
    name: 'UQ Researchers',
    searchUrl: 'https://researchers.uq.edu.au/search?query={name}',
    type: 'web',
  },
  'UNSW Sydney': {
    name: 'UNSW Research',
    searchUrl: 'https://research.unsw.edu.au/people?query={name}',
    type: 'web',
  },
  'Monash University': {
    name: 'Monash Research',
    searchUrl: 'https://research.monash.edu/en/persons/?search={name}',
    type: 'web',
  },
  'Australian National University': {
    name: 'ANU Researchers',
    searchUrl: 'https://researchers.anu.edu.au/search?query={name}',
    type: 'web',
  },
  'University of Western Australia': {
    name: 'UWA Research',
    searchUrl: 'https://research-repository.uwa.edu.au/en/persons/?search={name}',
    type: 'web',
  },
  'University of Adelaide': {
    name: 'Adelaide Researchers',
    searchUrl: 'https://researchers.adelaide.edu.au/search?query={name}',
    type: 'web',
  },
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function crossMatchUniversity(universityName: string, directory: typeof UNIVERSITY_DIRECTORIES[string]) {
  console.log(`\n🏫 Processing: ${universityName}`);

  const { data: pendingProfs, error } = await supabase
    .from('professors')
    .select('id, name, h_index, paper_count')
    .eq('university', universityName)
    .eq('verification_status', 'Pending')
    .order('h_index', { ascending: false })
    .limit(500);

  if (error) {
    console.error(`  ❌ Failed to fetch professors for ${universityName}:`, error.message);
    return { verified: 0, notFound: 0 };
  }

  if (!pendingProfs || pendingProfs.length === 0) {
    console.log(`  ⏭️  No pending professors for ${universityName}`);
    return { verified: 0, notFound: 0 };
  }

  console.log(`  📋 Found ${pendingProfs.length} pending professors`);

  let verified = 0;
  let notFound = 0;

  for (const prof of pendingProfs) {
    try {
      const searchUrl = directory.searchUrl.replace('{name}', encodeURIComponent(prof.name));

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `I searched for "${prof.name}" on the ${universityName} staff directory at ${searchUrl}. Based on your knowledge, is ${prof.name} currently a faculty member (Professor, Associate Professor, Senior Lecturer, or Research Fellow) at ${universityName}?

          Reply with ONLY a JSON object:
          {"found": true/false, "position": "Professor/Associate Professor/Senior Lecturer/Research Fellow/null", "faculty": "their department or null"}

          If you're not sure, reply {"found": false, "position": null, "faculty": null}`,
        }],
      });

      const text = (response.content[0] as { type: string; text: string }).text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        notFound++;
        continue;
      }

      const result = JSON.parse(jsonMatch[0]) as { found: boolean; position: string | null; faculty: string | null };

      if (result.found && result.position) {
        await supabase.from('professors')
          .update({
            verification_status: 'Verified',
            position_title: result.position,
            faculty: result.faculty || null,
          })
          .eq('id', prof.id);
        verified++;
        console.log(`  ✅ ${prof.name} → ${result.position}`);
      } else {
        notFound++;
      }

      await sleep(500);
    } catch (e) {
      console.error(`  ❌ Error checking ${prof.name}:`, (e as Error).message);
    }
  }

  console.log(`  📊 ${universityName}: verified ${verified}, not found ${notFound}`);
  return { verified, notFound };
}

async function main() {
  console.log('🐨 Cross-matching university staff directories...\n');

  let totalVerified = 0;
  let totalNotFound = 0;

  for (const [uniName, directory] of Object.entries(UNIVERSITY_DIRECTORIES)) {
    const { verified, notFound } = await crossMatchUniversity(uniName, directory);
    totalVerified += verified;
    totalNotFound += notFound;
  }

  console.log(`\n✨ Done! Total verified: ${totalVerified}, not found: ${totalNotFound}`);
}

main().catch(console.error);
