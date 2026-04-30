import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { count: total } = await sb.from('professors').select('*', { count: 'exact', head: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: papers } = await (sb as any).from('papers').select('*', { count: 'exact', head: true });
  const { data: unis } = await sb.from('professors').select('university');
  const uniCounts: Record<string, number> = {};
  (unis || []).forEach((r) => {
    const u = (r as { university: string }).university;
    uniCounts[u] = (uniCounts[u] || 0) + 1;
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total professors : ${total}`);
  console.log(`  Papers (SS)      : ${papers ?? 0}`);
  console.log('  By university:');
  Object.entries(uniCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([u, c]) => console.log(`    ${String(c).padStart(4)}  ${u}`));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(console.error);
