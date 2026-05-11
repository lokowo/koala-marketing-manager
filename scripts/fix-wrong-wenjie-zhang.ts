import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Find blog posts about the wrong Wenjie Zhang (bone regeneration)
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title_zh, title_en, content_zh')
    .or('title_zh.ilike.%张文杰%,title_zh.ilike.%骨再生%,content_zh.ilike.%骨再生%,content_zh.ilike.%bone regeneration%');

  if (error) {
    console.error('Query error:', error);
    return;
  }

  if (!posts || posts.length === 0) {
    console.log('No incorrect Wenjie Zhang articles found.');
    return;
  }

  console.log(`Found ${posts.length} potentially incorrect articles:`);
  for (const p of posts) {
    console.log(`  - [${p.id}] ${p.title_zh || p.title_en}`);
  }

  // Mark them as draft
  const ids = posts.map(p => p.id);
  const { error: updateError } = await supabase
    .from('blog_posts')
    .update({ status: 'draft' })
    .in('id', ids);

  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log(`\nMarked ${ids.length} articles as draft.`);
  }
}

main().catch(console.error);
