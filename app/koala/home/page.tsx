'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, ChevronRight, Star } from 'lucide-react';
import type { Professor } from '../../lib/types';

interface FeaturedProf {
  id: string;
  name: string;
  university: string;
  field: string;
  rating: number;
}

interface BlogPost {
  id: string;
  tag: string;
  date: string;
  title: string;
  excerpt: string;
}

export default function HomePage() {
  const [featuredProfs, setFeaturedProfs] = useState<FeaturedProf[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    fetch('/api/professors?limit=4')
      .then(r => r.json())
      .then(d => {
        const list: Professor[] = d.professors ?? d.data ?? [];
        setFeaturedProfs(list.slice(0, 4).map((p, i) => ({
          id: p.id,
          name: `${p.positionTitle ? p.positionTitle + ' ' : ''}${p.name}`,
          university: p.university,
          field: (p.researchAreas ?? []).slice(0, 2).join(' / ') || p.faculty || '',
          rating: [4.9, 4.8, 4.7, 4.8][i] ?? 4.7,
        })));
      })
      .catch(() => {});

    fetch('/api/blog?limit=2')
      .then(r => r.json())
      .then(d => {
        const posts = d.posts ?? [];
        setBlogPosts(posts.map((p: { id: string; tag: string; date: string; title: string; excerpt: string }) => ({
          id: p.id,
          tag: p.tag,
          date: new Date(p.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }),
          title: p.title,
          excerpt: p.excerpt,
        })));
      })
      .catch(() => {});
  }, []);

  const fallbackProfs: FeaturedProf[] = [
    { id: '1', name: 'Prof. Zhang Wei', university: 'University of Sydney', field: 'Computer Science', rating: 4.9 },
    { id: '2', name: 'Prof. Li Mei', university: 'UNSW Sydney', field: 'Machine Learning', rating: 4.8 },
    { id: '3', name: 'Prof. Chen Hao', university: 'University of Melbourne', field: 'Biomedical', rating: 4.7 },
  ];

  const displayProfs = featuredProfs.length > 0 ? featuredProfs : fallbackProfs;

  const fallbackPosts: BlogPost[] = [
    { id: '1', tag: '留学申请', date: '2024年3月15日', title: '2024 年 CS 硕士申请：如何写出打动招生官的 SOP', excerpt: '从结构、故事到细节打磨，这篇深度指南将帮你把个人陈述写出层次感与说服力…' },
    { id: '2', tag: '选校攻略', date: '2024年3月12日', title: '美国 Top 30 商学院选校全解析：冲刺、匹配与保底', excerpt: '从 GMAT 分数线到校友资源，全面对比顶尖商学院特色，帮你制定精准选校策略…' },
  ];

  const displayPosts = blogPosts.length > 0 ? blogPosts : fallbackPosts;

  return (
    <div style={{ background: '#faf6ec', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header */}
      <header className="flex px-6 pt-4 pb-2 justify-between items-center">
        <div className="w-8" />
        <div className="flex items-center gap-2">
          <div
            className="size-8 rounded-full flex justify-center items-center"
            style={{ background: '#1a2332' }}
          >
            <span className="text-base leading-6">🐨</span>
          </div>
          <span className="font-bold text-base leading-6 tracking-tight" style={{ color: '#1a2332' }}>
            考拉学长
          </span>
        </div>
        <button className="relative size-9 flex justify-center items-center">
          <Bell className="size-5" style={{ color: '#1a2332' }} />
          <span
            className="size-2 rounded-full absolute right-1 top-1"
            style={{ background: '#c4a050' }}
          />
        </button>
      </header>

      <main className="flex px-6 pt-4 pb-4 flex-col gap-6">
        {/* Hero CTA */}
        <Link
          href="/koala/chat"
          className="rounded-2xl flex p-6 justify-between items-center w-full no-underline"
          style={{
            background: '#1a2332',
            boxShadow: '0 10px 30px -8px rgba(196,160,80,0.45)',
          }}
        >
          <div className="flex flex-col items-start gap-1">
            <span className="font-medium opacity-70 text-xs leading-4" style={{ color: '#c4a050' }}>
              AI 智能助手 · 24/7 在线
            </span>
            <span className="font-bold text-lg leading-7" style={{ color: '#c4a050' }}>
              和考拉学长开始对话 🐨
            </span>
          </div>
          <div
            className="size-10 rounded-full flex justify-center items-center"
            style={{ background: 'rgba(196,160,80,0.15)' }}
          >
            <ArrowRight className="size-5" style={{ color: '#c4a050' }} />
          </div>
        </Link>

        {/* Featured Professors */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg leading-7" style={{ color: '#1a2332' }}>推荐教授</h2>
            <Link
              href="/koala/professors"
              className="font-semibold text-xs leading-4 flex items-center gap-1 no-underline"
              style={{ color: '#c4a050' }}
            >
              查看全部
              <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="overflow-x-auto flex -mx-6 px-6 pb-2 gap-4">
            {displayProfs.map(p => (
              <Link
                key={p.id}
                href={`/koala/professors/${p.id}`}
                className="shrink-0 rounded-2xl bg-white flex p-4 flex-col items-center gap-2 w-44 no-underline"
                style={{ boxShadow: '0 6px 20px -8px rgba(196,160,80,0.35)' }}
              >
                <div
                  className="size-16 ring-2 rounded-full overflow-hidden flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ borderColor: '#c4a050', background: '#f2ead6' }}
                >
                  👨‍🔬
                </div>
                <span className="font-bold text-sm leading-5 text-center" style={{ color: '#1a2332' }}>
                  {p.name}
                </span>
                <span className="text-center text-[10px]" style={{ color: '#8a8a8a' }}>
                  {p.university}
                  {p.field && <><br />{p.field}</>}
                </span>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="size-3 fill-current" style={{ color: '#c4a050' }} />
                  ))}
                  <span className="font-semibold text-[10px] ml-1" style={{ color: '#1a2332' }}>
                    {p.rating.toFixed(1)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Blog */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg leading-7" style={{ color: '#1a2332' }}>最新博客</h2>
            <Link
              href="/koala/blog"
              className="font-semibold text-xs leading-4 flex items-center gap-1 no-underline"
              style={{ color: '#c4a050' }}
            >
              更多
              <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {displayPosts.map(b => (
              <Link
                key={b.id}
                href="/koala/blog"
                className="rounded-2xl bg-white flex p-4 flex-col gap-2 no-underline"
                style={{ boxShadow: '0 6px 20px -8px rgba(196,160,80,0.35)' }}
              >
                <div className="flex justify-between items-center">
                  <span
                    className="font-semibold rounded-full text-white text-[10px] px-2 py-1"
                    style={{ background: '#c4a050' }}
                  >
                    {b.tag}
                  </span>
                  <span className="text-[10px]" style={{ color: '#b0b0b0' }}>{b.date}</span>
                </div>
                <h3 className="leading-snug font-bold text-sm leading-5" style={{ color: '#1a2332' }}>
                  {b.title}
                </h3>
                <p className="leading-relaxed text-xs leading-4" style={{ color: '#8a8a8a' }}>
                  {b.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
