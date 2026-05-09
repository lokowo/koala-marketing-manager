import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const { data: professors, error } = await supabase
    .from('professors')
    .select('id, name, university, position_title, faculty, research_areas, h_index, paper_count, citation_count')
    .is('research_embedding', null)
    .eq('verification_status', 'Verified')
    .order('h_index', { ascending: false, nullsFirst: false })
    .limit(1000);

  if (error || !professors) {
    console.error('Failed to fetch professors:', error);
    return;
  }

  console.log(`Generating embeddings for ${professors.length} professors...`);
  let done = 0;
  let failed = 0;

  for (let i = 0; i < professors.length; i += 50) {
    const batch = professors.slice(i, i + 50);

    const texts = batch.map(p => {
      const parts = [
        `Professor ${p.name} at ${p.university}`,
        p.position_title ? `Position: ${p.position_title}` : '',
        p.faculty ? `Faculty/Department: ${p.faculty}` : '',
        p.research_areas?.length ? `Research areas: ${p.research_areas.join(', ')}` : '',
        p.h_index ? `H-index: ${p.h_index}` : '',
        p.paper_count ? `Publications: ${p.paper_count} papers` : '',
        p.citation_count ? `Citations: ${p.citation_count}` : '',
      ].filter(Boolean);
      return parts.join('. ');
    });

    try {
      const res = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });

      for (let j = 0; j < batch.length; j++) {
        const { error: updateError } = await supabase
          .from('professors')
          .update({ research_embedding: `[${res.data[j].embedding.join(',')}]` })
          .eq('id', batch[j].id);

        if (updateError) {
          console.error(`Failed to update ${batch[j].name}:`, updateError.message);
          failed++;
        } else {
          done++;
        }
      }

      console.log(`  Progress: ${done}/${professors.length} (${failed} failed)`);
    } catch (e) {
      console.error(`Batch failed:`, (e as Error).message);
      failed += batch.length;
      await sleep(5000);
    }

    await sleep(200);
  }

  console.log(`\nDone! ${done} embeddings generated, ${failed} failed.`);
}

main().catch(console.error);
