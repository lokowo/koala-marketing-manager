'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bell, ChevronRight, X } from 'lucide-react';
import BannerCarousel from '../../components/BannerCarousel';
import type { Professor } from '../../lib/types';
import { useAuth } from '../components/AuthContext';

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target <= 0) return;
    const totalFrames = Math.round(duration / 16);
    const step = Math.max(1, Math.ceil(target / totalFrames));
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

const CATEGORY_LABELS: Record<string, string> = {
  phd_guide: 'PhD指南',
  application: '申请攻略',
  scholarship: '奖学金',
  visa: '签证攻略',
  supervisor: '导师关系',
  research: '科研方法',
  student_life: '留学生活',
  news: '行业新闻',
  professor_spotlight: '教授推荐',
};

const UNI_COLORS: Record<string, { bg: string; fg: string; short: string }> = {
  'Australian National University':        { bg: '#c9a96e', fg: '#e8e4dc', short: 'ANU' },
  'University of Melbourne':               { bg: '#003087', fg: '#fff',    short: 'MEL' },
  'University of Sydney':                  { bg: '#cc0000', fg: '#fff',    short: 'SYD' },
  'UNSW Sydney':                           { bg: '#1a1a1a', fg: '#ffe600', short: 'NSW' },
  'University of Queensland':              { bg: '#51247a', fg: '#fff',    short: 'UQ'  },
  'Monash University':                     { bg: '#006dae', fg: '#fff',    short: 'MON' },
  'University of Western Australia':       { bg: '#003087', fg: '#fff',    short: 'UWA' },
  'University of Adelaide':                { bg: '#005a9c', fg: '#fff',    short: 'ADE' },
  'University of Technology Sydney':       { bg: '#00a3e0', fg: '#fff',    short: 'UTS' },
  'RMIT University':                       { bg: '#e60028', fg: '#fff',    short: 'RMT' },
  'Macquarie University':                  { bg: '#e8291c', fg: '#fff',    short: 'MAC' },
  'Queensland University of Technology':   { bg: '#005a9c', fg: '#fff',    short: 'QUT' },
  'Deakin University':                     { bg: '#00a86b', fg: '#fff',    short: 'DEA' },
  'Griffith University':                   { bg: '#d4380d', fg: '#fff',    short: 'GRF' },
  'La Trobe University':                   { bg: '#e84e1b', fg: '#fff',    short: 'LAT' },
  'University of Newcastle':               { bg: '#1f1646', fg: '#fff',    short: 'NEW' },
  'University of Wollongong':              { bg: '#1e5799', fg: '#fff',    short: 'WOL' },
  'Flinders University':                   { bg: '#004f9f', fg: '#fff',    short: 'FLI' },
  'Curtin University':                     { bg: '#cfb44b', fg: '#e8e4dc', short: 'CUR' },
  'James Cook University':                 { bg: '#005c84', fg: '#fff',    short: 'JCU' },
  'Swinburne University of Technology':    { bg: '#bb0000', fg: '#fff',    short: 'SWI' },
  'Western Sydney University':             { bg: '#e52020', fg: '#fff',    short: 'WSY' },
};

function getUniBadge(university: string) {
  if (UNI_COLORS[university]) return UNI_COLORS[university];
  const letters = university.replace(/University of |University /gi, '').slice(0, 3).toUpperCase();
  return { bg: '#5a6878', fg: '#fff', short: letters };
}

function fmtNum(n?: number): string {
  if (!n) return '';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

interface BlogPost {
  id: string;
  slug?: string;
  tag: string;
  date: string;
  title: string;
  excerpt: string;
  viewCount?: number;
}

const RESEARCH_AREAS = [
  { label: 'CS · AI', value: 'cs', emoji: '🤖' },
  { label: '医学健康', value: 'health', emoji: '🏥' },
  { label: '生命科学', value: 'bio', emoji: '🧬' },
  { label: '工程', value: 'eng', emoji: '⚙️' },
  { label: '心理神经', value: 'neuro', emoji: '🧠' },
  { label: '物理天文', value: 'physics', emoji: '🔭' },
  { label: '社科', value: 'soc', emoji: '📊' },
  { label: '地球科学', value: 'earth', emoji: '🌏' },
];

const STEP_LINKS = [
  { href: '/koala/chat?mode=path',     label: '聊背景' },
  { href: '/koala/chat?mode=research', label: 'AI匹配' },
  { href: '/koala/chat?mode=write',    label: '写申请信' },
];

export default function HomePage() {
  const router = useRouter();
  const { user, profile, showLogin, signOut } = useAuth();
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [profCount, setProfCount] = useState('4,200+');
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; read: boolean; created_at: string }[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const displayMatchCount = useCountUp(matchCount);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  function handleStepClick(href: string) {
    if (!user) {
      showLogin(() => router.push(href));
    } else {
      router.push(href);
    }
  }

  useEffect(() => {
    fetch('/api/professors?limit=6&sortBy=opportunity_score')
      .then(r => r.json())
      .then(d => {
        setProfessors(d.data ?? []);
        if (d.total) setProfCount(d.total.toLocaleString());
      })
      .catch(() => {});

    fetch('/api/stats/match-count')
      .then(r => r.json())
      .then(d => { if (d.count > 0) setMatchCount(d.count); })
      .catch(() => {});

    if (user) {
      fetch('/api/user/notifications?limit=5')
        .then(r => r.json())
        .then(d => {
          setUnreadCount(d.unreadCount ?? 0);
          setNotifications(d.data ?? []);
        })
        .catch(() => {});
    }

    fetch('/api/blog?limit=2&public=true')
      .then(r => r.json())
      .then(d => {
        const posts = d.posts ?? [];
        setBlogPosts(posts.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          slug: (p.slug as string) || undefined,
          tag: CATEGORY_LABELS[p.category as string] || (p.category as string) || '博客',
          date: p.published_at
            ? new Date(p.published_at as string).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
            : p.created_at
              ? new Date(p.created_at as string).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
              : '最近',
          title: (p.title_zh || p.title_en || '无标题') as string,
          excerpt: (p.excerpt_zh || p.excerpt_en || '') as string,
          viewCount: (p.view_count as number) || 0,
        })));
      })
      .catch(() => {});
  }, [user]);

  const fallbackPosts: BlogPost[] = [
    { id: '1', tag: '申请技巧', date: '4月28日', title: '如何写出打动教授的申请信', excerpt: '从研究兴趣切入，三步法精准匹配教授方向，提升回复率。' },
    { id: '2', tag: '选校攻略', date: '4月24日', title: '澳洲 PhD 奖学金的隐藏机会', excerpt: '盘点容易被忽视的资助渠道与时间节点，增加中签率。' },
  ];

  const displayPosts = blogPosts.length > 0 ? blogPosts : fallbackPosts;

  return (
    <div style={{ background: '#080c10', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header — mobile only; desktop uses TopNavBar */}
      <header
        className="lg:hidden sticky top-0 z-50 px-4 pt-4 pb-3 flex justify-between items-center"
        style={{ background: 'linear-gradient(135deg, #080c10 0%, #f5edd8 100%)', borderBottom: '1px solid #ebe3d0' }}
      >
        {/* Left: Logo + brand */}
        <Link href="/koala/home" className="flex items-center gap-2.5 no-underline">
          <Image
            src="/koala-logo.svg"
            alt="Koala"
            width={32}
            height={32}
            className="rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
          <span className="hidden size-8 rounded-lg flex items-center justify-center text-base" style={{ background: '#e8e4dc' }}>🐨</span>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight leading-none" style={{ color: '#e8e4dc' }}>
              Koala Study
            </span>
            <span className="text-[10px] leading-tight mt-0.5" style={{ color: '#6a7a7e' }}>
              你的澳洲学术内线
            </span>
          </div>
        </Link>

        {/* Right: Bell + Avatar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative size-9 flex justify-center items-center rounded-full transition-colors"
            style={{ background: showNotif ? 'rgba(201,169,110,0.06)' : 'transparent' }}
          >
            <Bell className="size-[18px]" style={{ color: '#a8b8ac' }} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold" style={{ background: '#b06040', color: '#fff' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="size-9 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
                style={{ background: '#c9a96e', color: '#080c10' }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (user.email || '?')[0].toUpperCase()
                )}
              </button>
              {showUserMenu && (
                <div
                  className="absolute right-0 top-11 w-48 rounded-xl py-2 z-50"
                  style={{ background: '#111c28', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', border: '1px solid rgba(201,169,110,0.15)' }}
                >
                  <p className="px-4 py-1.5 text-[11px] truncate" style={{ color: '#6a7a7e' }}>{user.email}</p>
                  <Link
                    href="/koala/my-profile"
                    className="block px-4 py-2 text-xs no-underline hover:bg-white/5"
                    style={{ color: '#e8e4dc' }}
                    onClick={() => setShowUserMenu(false)}
                  >
                    个人中心
                  </Link>
                  <button
                    onClick={() => { setShowUserMenu(false); signOut(); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-white/5"
                    style={{ color: '#c9a96e' }}
                  >
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => showLogin()}
              className="size-9 rounded-full flex items-center justify-center"
              style={{ background: '#e8e4dc' }}
            >
              <span className="text-xs font-medium text-white">登录</span>
            </button>
          )}
        </div>
      </header>

      {/* Notification dropdown */}
      {showNotif && (
        <div
          className="mx-4 mt-1 mb-2 rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.1)', boxShadow: '0 8px 24px rgba(125,99,64,0.10)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: '#a8b8ac' }}>通知</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={async () => {
                    await fetch('/api/user/notifications', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'markAllRead' }),
                    });
                    setUnreadCount(0);
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                  }}
                  className="text-[10px]"
                  style={{ color: '#c9a96e' }}
                >
                  全部已读
                </button>
              )}
              <button onClick={() => setShowNotif(false)} className="size-6 flex items-center justify-center rounded-full" style={{ background: 'rgba(201,169,110,0.06)' }}>
                <X className="size-3" style={{ color: '#6a7a7e' }} />
              </button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <div className="flex items-center gap-3 py-2">
              <div className="size-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.06)' }}>
                <Bell className="size-4" style={{ color: '#c9a96e' }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#a8b8ac' }}>暂无新消息</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#6a7a7e' }}>有新动态时会通知你</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <div key={n.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg" style={{ background: n.read ? 'transparent' : 'rgba(201,169,110,0.04)' }}>
                  {!n.read && <span className="mt-1.5 size-1.5 rounded-full flex-shrink-0" style={{ background: '#c9a96e' }} />}
                  <div className={n.read ? 'ml-3.5' : ''}>
                    <p className="text-xs font-medium" style={{ color: '#e8e4dc' }}>{n.title}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#6a7a7e' }}>{n.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <main className="px-4 lg:px-0 pt-2 pb-4 flex flex-col gap-6 lg:gap-10">

        {/* ── Banner Carousel ── */}
        <BannerCarousel />

        {/* ── Hero ── */}
        <section>
          <div
            className="rounded-2xl px-6 py-8 lg:p-10 relative overflow-hidden lg:flex lg:items-center lg:gap-12"
            style={{ background: 'linear-gradient(135deg, #1a2a20 0%, #0d1a14 50%, #162028 100%)', border: '1px solid rgba(201,169,110,0.15)' }}
          >
            {/* Decorative glow */}
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 70%)' }} />
            <div className="absolute right-8 bottom-0 w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)' }} />

            <div className="relative z-10 lg:flex-1">
              <div className="text-xs font-medium mb-2" style={{ color: 'rgba(201,169,110,0.5)' }}>
                AI 导师匹配 · 免费使用
              </div>
              <h1 className="text-xl lg:text-3xl font-bold leading-tight mb-1.5" style={{ color: '#e8e4dc' }}>
                {profCount} 位澳洲导师<br />AI 帮你找最匹配的那个
              </h1>
              <p className="text-xs lg:text-sm leading-relaxed mb-4" style={{ color: '#6a7a7e' }}>
                告诉 Koala 你的背景和兴趣，30 秒内获得个性化导师推荐
              </p>
              <Link
                href="/koala/chat"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm no-underline"
                style={{ background: '#c9a96e', color: '#080c10' }}
              >
                开始匹配 <ArrowRight className="size-4" />
              </Link>
              <div className="mt-3 text-[11px]" style={{ color: 'rgba(201,169,110,0.4)' }}>
                {matchCount > 0
                  ? `已帮助 ${displayMatchCount.toLocaleString()} 位同学匹配理想导师`
                  : '已帮助众多同学匹配理想导师'}
              </div>
            </div>
          </div>
        </section>

        {/* ── Three Steps ── */}
        <section>
          <h2 className="font-bold text-base mb-3" style={{ color: '#e8e4dc' }}>三步搞定 PhD 申请</h2>
          <div className="grid grid-cols-3 gap-2 lg:gap-4">
            {[
              { icon: '💬', step: '01', title: '聊背景', desc: '告诉 Koala 你的专业和兴趣' },
              { icon: '🎯', step: '02', title: 'AI 匹配', desc: `从 ${profCount} 位教授中精准推荐` },
              { icon: '✉️', step: '03', title: '写申请信', desc: '针对每位教授定制专业邮件' },
            ].map((s, i) => (
              <button
                key={s.step}
                onClick={() => handleStepClick(STEP_LINKS[i].href)}
                className="rounded-2xl p-3 lg:p-5 flex flex-col gap-1.5 text-left w-full transition-all active:scale-95"
                style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)', cursor: 'pointer' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(125,99,64,0.15)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                <span className="text-xl">{s.icon}</span>
                <div className="text-[10px] font-medium" style={{ color: '#c9a96e' }}>{s.step}</div>
                <div className="text-xs font-bold" style={{ color: '#e8e4dc' }}>{s.title}</div>
                <div className="text-[10px] leading-relaxed" style={{ color: '#6a7a7e' }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Hot Professors ── */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-base" style={{ color: '#e8e4dc' }}>🔥 热门导师推荐</h2>
            <Link href="/koala/professors" className="text-xs font-semibold flex items-center gap-1 no-underline" style={{ color: '#c9a96e' }}>
              查看全部 <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="flex -mx-4 px-4 pb-2 gap-3 overflow-x-auto lg:overflow-visible lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:gap-4" style={{ scrollbarWidth: 'none' }}>
            {(professors.length > 0 ? professors : Array(4).fill(null)).map((p, i) => {
              if (!p) return (
                <div key={i} className="shrink-0 w-44 lg:w-auto h-52 rounded-2xl animate-pulse" style={{ background: 'rgba(201,169,110,0.06)' }} />
              );
              const badge = getUniBadge(p.university);
              const status = p.acceptingStudents === 'yes' ? { label: '招生中', bg: '#d1fae5', color: '#065f46' }
                           : p.acceptingStudents === 'no'  ? { label: '暂不招', bg: '#fee2e2', color: '#991b1b' }
                           : null;
              return (
                <Link
                  key={p.id}
                  href={`/koala/professors/${p.id}`}
                  className="shrink-0 w-44 lg:w-auto rounded-2xl p-3.5 flex flex-col gap-2 no-underline"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.1)', boxShadow: '0 4px 16px rgba(196,160,80,0.10)' }}
                >
                  {/* Uni badge + status */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: badge.bg, color: badge.fg }}
                    >
                      {badge.short}
                    </span>
                    {status && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    )}
                  </div>

                  {/* Name & title */}
                  <div>
                    <div className="text-xs font-bold leading-snug" style={{ color: '#e8e4dc' }}>{p.name}</div>
                    {p.positionTitle && (
                      <div className="text-[10px] mt-0.5" style={{ color: '#6a7a7e' }}>{p.positionTitle}</div>
                    )}
                  </div>

                  {/* Research tag */}
                  {p.researchAreas?.[0] && (
                    <div
                      className="text-[10px] px-2 py-1 rounded-full leading-tight"
                      style={{ background: 'rgba(201,169,110,0.06)', color: '#a8b8ac' }}
                    >
                      {p.researchAreas[0].length > 30 ? p.researchAreas[0].slice(0, 28) + '…' : p.researchAreas[0]}
                    </div>
                  )}

                  {/* Stats */}
                  {(p.hIndex || p.paperCount) && (
                    <div className="flex gap-2 text-[10px]" style={{ color: '#6a7a7e' }}>
                      {p.hIndex && <span>H={p.hIndex}</span>}
                      {p.paperCount && <span>· {fmtNum(p.paperCount)} 篇</span>}
                    </div>
                  )}

                  {/* CTA */}
                  <div
                    className="mt-auto text-[10px] font-medium text-center py-1.5 rounded-full"
                    style={{ background: 'rgba(201,169,110,0.06)', color: '#c9a96e' }}
                  >
                    查看详情 →
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Research Areas ── */}
        <section>
          <h2 className="font-bold text-base mb-3" style={{ color: '#e8e4dc' }}>热门研究方向</h2>
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {RESEARCH_AREAS.map(area => (
              <Link
                key={area.value}
                href={`/koala/professors?category=${area.value}`}
                className="rounded-2xl p-2.5 flex flex-col items-center gap-1 no-underline"
                style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}
              >
                <span className="text-lg">{area.emoji}</span>
                <span className="text-[10px] font-medium text-center leading-tight" style={{ color: '#a8b8ac' }}>
                  {area.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Blog ── */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-base" style={{ color: '#e8e4dc' }}>最新博客</h2>
            <Link href="/koala/blog" className="text-xs font-semibold flex items-center gap-1 no-underline" style={{ color: '#c9a96e' }}>
              更多 <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
            {displayPosts.map(b => (
              <Link
                key={b.id}
                href={`/koala/blog/${b.slug || b.id}`}
                className="rounded-2xl p-4 flex flex-col gap-2 no-underline"
                style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 4px 16px rgba(196,160,80,0.08)', border: '1px solid rgba(201,169,110,0.06)' }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full text-white" style={{ background: '#c9a96e' }}>
                    {b.tag}
                  </span>
                  <span className="text-[10px]" style={{ color: '#b0b0b0' }}>{b.date}{b.viewCount ? ` · 👁 ${b.viewCount}` : ''}</span>
                </div>
                <h3 className="text-sm font-bold leading-snug" style={{ color: '#e8e4dc' }}>{b.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#8a8a8a' }}>{b.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section>
          <div className="rounded-3xl p-5 text-center" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
            <div className="text-2xl mb-2">🐨</div>
            <h3 className="text-sm font-bold mb-1" style={{ color: '#e8e4dc' }}>还在犹豫？先聊聊你的想法</h3>
            <p className="text-xs mb-4" style={{ color: '#6a7a7e' }}>免费匹配导师，不满意随时退出</p>
            <Link
              href="/koala/chat"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm no-underline text-white"
              style={{ background: '#c9a96e' }}
            >
              免费开始对话 <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}
