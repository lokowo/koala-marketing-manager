// MOCK DATA - replace with real Supabase query when blog_posts table has data
const MOCK_POSTS = [
  {
    id: 'phd-guide-2026',
    tag: 'PhD 指南',
    date: '2026-04-20',
    title: '澳洲 PhD 申请全流程：从选导师到发 Offer',
    excerpt: '详解如何通过套磁、Research Proposal、面试三关，拿到澳洲顶校 PhD 录取...',
    category: 'guide',
  },
  {
    id: 'arc-2026-results',
    tag: 'ARC 经费',
    date: '2026-04-15',
    title: '2026 ARC Discovery Project 结果解读',
    excerpt: '盘点本轮 ARC 资助重点方向，找到经费信号最强的教授...',
    category: 'funding',
  },
  {
    id: 'tfs-scholarship-guide',
    tag: '奖学金',
    date: '2026-04-10',
    title: 'TFS/RTP奖学金申请策略：2026年全攻略',
    excerpt: '澳洲政府奖学金申请时间线、材料准备和成功案例分析...',
    category: 'scholarship',
  },
  {
    id: 'cold-email-tips',
    tag: '套磁技巧',
    date: '2026-04-05',
    title: '套磁信回复率提升指南：10 个实操技巧',
    excerpt: '从主题行到结尾，每一句话都有讲究。高回复率套磁信的结构分析...',
    category: 'outreach',
  },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    let posts = MOCK_POSTS;
    if (category) {
      posts = posts.filter(p => p.category === category);
    }

    return Response.json({
      posts: posts.slice(0, limit),
      total: posts.length,
    });
  } catch (error) {
    console.error('[BLOG]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
