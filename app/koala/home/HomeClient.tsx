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
  { href: '/koala/chat?mode=path', label: '聊背景' },
  { href: '/koala/discover',       label: 'AI匹配' },
  { href: '/koala/chat?mode=write', label: '写申请信' },
];

interface HomeClientProps {
  initialProfessors: Professor[];
  initialProfCount: number;
  initialMatchCount: number;
  initialBlogPosts: BlogPost[];
}

export default function HomeClient({ initialProfessors, initialProfCount, initialMatchCount, initialBlogPosts }: HomeClientProps) {
  const router = useRouter();
  const { user, profile, showLogin, signOut } = useAuth();
  const [professors] = useState<Professor[]>(initialProfessors);
  const profCount = initialProfCount > 0 ? initialProfCount.toLocaleString() : '4,200+';
  const [matchCount] = useState(initialMatchCount);
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
    if (user) {
      fetch('/api/user/notifications?limit=5')
        .then(r => r.json())
        .then(d => {
          setUnreadCount(d.unreadCount ?? 0);
          setNotifications(d.data ?? []);
        })
        .catch(() => {});
    }
  }, [user]);

  const blogPosts = initialBlogPosts;

  const fallbackPosts: BlogPost[] = [
    { id: '1', tag: '申请技巧', date: '4月28日', title: '如何写出打动教授的申请信', excerpt: '从研究兴趣切入，三步法精准匹配教授方向，提升回复率。' },
    { id: '2', tag: '选校攻略', date: '4月24日', title: '澳洲 PhD 奖学金的隐藏机会', excerpt: '盘点容易被忽视的资助渠道与时间节点，增加中签率。' },
  ];

  const displayPosts = blogPosts.length > 0 ? blogPosts : fallbackPosts;

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#080c10] min-h-screen pb-[100px]">
      {/* Header — mobile only; desktop uses TopNavBar */}
      <header
        className="lg:hidden sticky top-0 z-50 px-4 pt-4 pb-3 flex justify-between items-center bg-white dark:bg-[#080c10] border-b border-gray-200 dark:border-[#ebe3d0]/20 shadow-sm dark:shadow-none"
      >
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
          <span className="hidden size-8 rounded-lg flex items-center justify-center text-base bg-[#e8e4dc]">🐨</span>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight leading-none text-gray-900 dark:text-[#e8e4dc]">
              Koala Study
            </span>
            <span className="text-[10px] leading-tight mt-0.5 text-gray-500 dark:text-[#6a7a7e]">
              你的澳洲学术内线
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className={`relative size-9 flex justify-center items-center rounded-full transition-colors ${showNotif ? 'bg-amber-50 dark:bg-[#D4A843]/10' : ''}`}
          >
            <Bell className="size-[18px] text-gray-400 dark:text-[#a8b8ac]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold bg-[#b06040] text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="size-9 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (user.email || '?')[0].toUpperCase()
                )}
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-11 w-48 rounded-xl py-2 z-50 bg-white dark:bg-[#0F1419] shadow-lg dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] border border-gray-200 dark:border-[#c9a96e]/15">
                  <p className="px-4 py-1.5 text-[11px] truncate text-gray-500 dark:text-[#6a7a7e]">{user.email}</p>
                  <Link
                    href="/koala/my-profile"
                    className="block px-4 py-2 text-xs no-underline hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-[#e8e4dc]"
                    onClick={() => setShowUserMenu(false)}
                  >
                    个人中心
                  </Link>
                  <button
                    onClick={() => { setShowUserMenu(false); signOut(); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 dark:hover:bg-white/5 text-red-500 dark:text-[#D4A843]"
                  >
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => showLogin()}
              className="size-9 rounded-full flex items-center justify-center bg-[#e8e4dc] dark:bg-[#e8e4dc]"
            >
              <span className="text-xs font-medium text-white">登录</span>
            </button>
          )}
        </div>
      </header>

      {/* Notification dropdown */}
      {showNotif && (
        <div className="mx-4 mt-1 mb-2 rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-[#c9a96e]/10 shadow-sm dark:shadow-[0_8px_24px_rgba(125,99,64,0.10)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-[#a8b8ac]">通知</span>
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
                  className="text-[10px] text-amber-700 dark:text-[#D4A843]"
                >
                  全部已读
                </button>
              )}
              <button onClick={() => setShowNotif(false)} className="size-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#c9a96e]/[0.06]">
                <X className="size-3 text-gray-400 dark:text-[#6a7a7e]" />
              </button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <div className="flex items-center gap-3 py-2">
              <div className="size-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-[#c9a96e]/[0.06]">
                <Bell className="size-4 text-amber-600 dark:text-[#D4A843]" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-[#a8b8ac]">暂无新消息</p>
                <p className="text-[10px] mt-0.5 text-gray-400 dark:text-[#6a7a7e]">有新动态时会通知你</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <div key={n.id} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg ${n.read ? '' : 'bg-amber-50/50 dark:bg-[#D4A843]/10'}`}>
                  {!n.read && <span className="mt-1.5 size-1.5 rounded-full flex-shrink-0 bg-amber-500 dark:bg-[#D4A843]" />}
                  <div className={n.read ? 'ml-3.5' : ''}>
                    <p className="text-xs font-medium text-gray-900 dark:text-[#e8e4dc]">{n.title}</p>
                    <p className="text-[10px] mt-0.5 text-gray-400 dark:text-[#6a7a7e]">{n.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <main className="px-4 lg:px-0 pt-2 pb-4 flex flex-col gap-6 lg:gap-10">

        {/* ── Hero + Banner ── */}
        <section>
          <div
            className="rounded-2xl relative overflow-hidden border border-amber-200/30 dark:border-[#c9a96e]/15 bg-gradient-to-br from-[#F8F6F1] to-[#EDE8DC] dark:from-[#1a2a20] dark:via-[#0d1a14] dark:to-[#162028]"
          >
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)' }} />
            <div className="absolute right-8 bottom-0 w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.04) 0%, transparent 70%)' }} />

            <div className="lg:flex lg:items-center">
              <div className="px-6 py-8 lg:p-10 relative z-10 lg:w-1/2">
                <div className="inline-flex items-center text-xs font-medium mb-2 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-transparent text-amber-700 dark:text-[#D4A843]/50 border border-amber-200 dark:border-transparent">
                  AI 导师匹配 · 免费使用
                </div>
                <h1 className="text-xl lg:text-3xl font-bold leading-tight mb-1.5 text-[#1A1A2E] dark:text-[#e8e4dc]">
                  {profCount} 位澳洲导师<br />AI 帮你找最匹配的那个
                </h1>
                <p className="text-xs lg:text-sm leading-relaxed mb-4 text-gray-500 dark:text-[#6a7a7e]">
                  告诉 Koala 你的背景和兴趣，30 秒内获得个性化导师推荐
                </p>
                <Link
                  href="/koala/chat"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
                >
                  开始匹配 <ArrowRight className="size-4" />
                </Link>
                <div className="mt-3 text-[11px] text-amber-700 dark:text-[#D4A843]/40">
                  {matchCount > 0
                    ? `已帮助 ${displayMatchCount.toLocaleString()} 位同学匹配理想导师`
                    : '已帮助众多同学匹配理想导师'}
                </div>
              </div>

              <div className="hidden lg:block lg:w-1/2 p-4 pl-0">
                <BannerCarousel heroMode />
              </div>
            </div>
          </div>
        </section>

        {/* ── Three Steps ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843] border border-amber-200 dark:border-[#D4A843]/20">How it works</span>
            <h2 className="font-bold text-base text-gray-900 dark:text-[#e8e4dc]">三步搞定 PhD 申请</h2>
          </div>
          <div className="flex flex-col lg:flex-row items-stretch gap-4 lg:gap-0">
            {([
              {
                icon: '💬', step: '01', title: '聊背景',
                desc: '告诉 Koala 你的专业方向、学术经历和兴趣，AI 帮你评估申请竞争力',
                features: ['覆盖 8 所 Go8 大学', '中英文双语支持'],
                extra: '⏱ 约 2 分钟',
                primary: true,
                iconBg: 'bg-[#D4A843]/20',
                gradientBar: 'bg-gradient-to-r from-[#D4A843] to-[#c9a96e]',
                featureIcon: 'text-[#D4A843]',
              },
              {
                icon: '🎯', step: '02', title: 'AI 匹配',
                desc: `从 ${profCount} 位导师中，根据你的背景和研究兴趣精准推荐最佳导师`,
                features: [`${profCount} 导师库`, '实时招生状态'],
                extra: '⚡ 30 秒出结果',
                primary: false,
                iconBg: 'bg-[#4ECDC4]/15 dark:bg-[#4ECDC4]/20',
                gradientBar: 'bg-gradient-to-r from-[#4ECDC4] to-[#38b2ac]',
                featureIcon: 'text-[#4ECDC4]',
              },
              {
                icon: '✉️', step: '03', title: '写申请信',
                desc: '针对每位教授的研究方向和最新论文，AI 定制高回复率的专业邮件',
                features: ['个性化定制内容', '支持批量生成'],
                extra: '📧 A$1/封起',
                primary: false,
                iconBg: 'bg-amber-100 dark:bg-amber-900/20',
                gradientBar: 'bg-gradient-to-r from-[#F59E0B] to-[#D4A843]',
                featureIcon: 'text-amber-500',
              },
            ] as const).map((s, i) => (
              <div key={s.step} className="flex items-center lg:flex-1">
                <button
                  onClick={() => handleStepClick(STEP_LINKS[i].href)}
                  className={`rounded-2xl p-5 lg:p-6 flex flex-col text-left w-full h-full transition-all duration-300 active:scale-[0.98] cursor-pointer relative overflow-hidden group ${
                    s.primary
                      ? 'bg-gradient-to-br from-[#1A1A2E] to-[#2D2D4A] text-white shadow-lg hover:shadow-2xl hover:-translate-y-1.5 border border-transparent dark:border-[#D4A843]/30'
                      : 'bg-white dark:bg-[#0F1419] border border-gray-100 dark:border-white/10 shadow-sm hover:-translate-y-1.5 hover:shadow-xl'
                  }`}
                >
                  {s.primary && (
                    <>
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#D4A843]/10 rounded-full" />
                      <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[#4ECDC4]/10 rounded-full" />
                      <div className="absolute right-4 bottom-4 text-[64px] leading-none opacity-[0.06] select-none">🐨</div>
                    </>
                  )}
                  <div className={`absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity ${s.gradientBar}`} />

                  <div className="flex items-center gap-3 relative mb-3">
                    <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${s.iconBg}`}>{s.icon}</span>
                    <span className={`text-[10px] font-bold tracking-widest ${s.primary ? 'text-white/50' : 'text-gray-400 dark:text-[#D4A843]/60'}`}>STEP {s.step}</span>
                  </div>
                  <div className={`text-lg font-bold relative mb-1.5 ${s.primary ? 'text-white' : 'text-gray-900 dark:text-[#e8e4dc]'}`}>{s.title}</div>
                  <div className={`text-xs leading-relaxed relative mb-3 ${s.primary ? 'text-white/60' : 'text-gray-500 dark:text-[#6a7a7e]'}`}>{s.desc}</div>

                  <div className="flex flex-col gap-2 relative mb-4">
                    {s.features.map(f => (
                      <div key={f} className="flex items-center gap-2">
                        <svg className={`size-3.5 shrink-0 ${s.primary ? 'text-[#D4A843]' : s.featureIcon}`} viewBox="0 0 16 16" fill="none"><path d="M13.3 4.3a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L6.6 9.6l5.3-5.3a1 1 0 0 1 1.4 0Z" fill="currentColor"/></svg>
                        <span className={`text-[11px] ${s.primary ? 'text-white/60' : 'text-gray-600 dark:text-[#a8b8ac]'}`}>{f}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto relative">
                    <div className={`h-px mb-3 ${s.primary ? 'bg-white/10' : 'bg-gray-100 dark:bg-white/5'}`} />
                    <div className={`text-[11px] font-medium ${s.primary ? 'text-white/40' : 'text-gray-400 dark:text-[#6a7a7e]'}`}>{s.extra}</div>
                  </div>
                </button>
                {i < 2 && (
                  <div className="hidden lg:flex items-center justify-center w-12 shrink-0">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-px h-5 border-l border-dashed border-gray-300 dark:border-[#D4A843]/30" />
                      <ArrowRight className="size-6 text-gray-400 dark:text-[#D4A843]/50" />
                      <div className="w-px h-5 border-l border-dashed border-gray-300 dark:border-[#D4A843]/30" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Hot Professors ── */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-base text-gray-900 dark:text-[#e8e4dc]">🔥 热门导师推荐</h2>
            <Link href="/koala/professors" className="text-xs font-semibold flex items-center gap-1 no-underline text-[#1A1A2E] dark:text-[#D4A843]">
              查看全部 <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="flex -mx-4 px-4 pb-2 gap-3 overflow-x-auto lg:overflow-visible lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:gap-4" style={{ scrollbarWidth: 'none' }}>
            {(professors.length > 0 ? professors : Array(4).fill(null)).map((p, i) => {
              if (!p) return (
                <div key={i} className="shrink-0 w-44 lg:w-auto h-52 rounded-2xl animate-pulse bg-gray-100 dark:bg-[#c9a96e]/[0.06]" />
              );
              const badge = getUniBadge(p.university);
              const status = p.acceptingStudents === 'yes' ? { label: '招生中', bg: '#d1fae5', color: '#065f46' }
                           : p.acceptingStudents === 'no'  ? { label: '暂不招', bg: '#fee2e2', color: '#991b1b' }
                           : null;
              return (
                <Link
                  key={p.id}
                  href={`/koala/professors/${p.id}`}
                  className="shrink-0 w-44 lg:w-auto rounded-2xl p-3.5 flex flex-col gap-2 no-underline bg-white dark:bg-white/5 border border-gray-200 dark:border-[#c9a96e]/10 shadow-sm dark:shadow-[0_4px_16px_rgba(196,160,80,0.10)]"
                >
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

                  <div>
                    <div className="text-xs font-bold leading-snug text-gray-900 dark:text-[#e8e4dc]">{p.name}</div>
                    {p.positionTitle && (
                      <div className="text-[10px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">{p.positionTitle}</div>
                    )}
                  </div>

                  {p.researchAreas?.[0] && (
                    <div className="text-[10px] px-2 py-1 rounded-full leading-tight bg-gray-100 dark:bg-[#c9a96e]/[0.06] text-gray-500 dark:text-[#a8b8ac]">
                      {p.researchAreas[0].length > 30 ? p.researchAreas[0].slice(0, 28) + '…' : p.researchAreas[0]}
                    </div>
                  )}

                  {(p.hIndex || p.paperCount) && (
                    <div className="flex gap-2 text-[10px] text-gray-500 dark:text-[#6a7a7e]">
                      {p.hIndex && <span>H={p.hIndex}</span>}
                      {p.paperCount && <span>· {fmtNum(p.paperCount)} 篇</span>}
                    </div>
                  )}

                  <div className="mt-auto text-[10px] font-medium text-center py-1.5 rounded-full bg-gray-100 dark:bg-[#c9a96e]/[0.06] text-[#1A1A2E] dark:text-[#D4A843]">
                    查看详情 →
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Research Areas ── */}
        <section>
          <h2 className="font-bold text-base mb-3 text-gray-900 dark:text-[#e8e4dc]">热门研究方向</h2>
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {RESEARCH_AREAS.map(area => (
              <Link
                key={area.value}
                href={`/koala/professors?category=${area.value}`}
                className="rounded-2xl p-2.5 flex flex-col items-center gap-1 no-underline bg-gray-50 dark:bg-[#c9a96e]/[0.06] border border-gray-200 dark:border-[#c9a96e]/10"
              >
                <span className="text-lg">{area.emoji}</span>
                <span className="text-[10px] font-medium text-center leading-tight text-gray-500 dark:text-[#a8b8ac]">
                  {area.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Blog ── */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-base text-gray-900 dark:text-[#e8e4dc]">最新博客</h2>
            <Link href="/koala/blog" className="text-xs font-semibold flex items-center gap-1 no-underline text-[#1A1A2E] dark:text-[#D4A843]">
              更多 <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
            {displayPosts.map(b => (
              <Link
                key={b.id}
                href={`/koala/blog/${b.slug || b.id}`}
                className="rounded-2xl p-4 flex flex-col gap-2 no-underline bg-white dark:bg-white/5 border border-gray-200 dark:border-[#c9a96e]/[0.06] shadow-sm dark:shadow-[0_4px_16px_rgba(196,160,80,0.08)]"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 dark:bg-[#D4A843] text-amber-700 dark:text-white border border-amber-200 dark:border-transparent">
                    {b.tag}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-[#b0b0b0]">{b.date}{b.viewCount ? ` · 👁 ${b.viewCount}` : ''}</span>
                </div>
                <h3 className="text-sm font-bold leading-snug text-gray-900 dark:text-[#e8e4dc]">{b.title}</h3>
                <p className="text-xs leading-relaxed text-gray-500 dark:text-[#8a8a8a]">{b.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section>
          <div className="rounded-3xl p-5 text-center bg-gray-50 dark:bg-[#c9a96e]/[0.06] border border-gray-200 dark:border-[#c9a96e]/10">
            <div className="text-2xl mb-2">🐨</div>
            <h3 className="text-sm font-bold mb-1 text-gray-900 dark:text-[#e8e4dc]">还在犹豫？先聊聊你的想法</h3>
            <p className="text-xs mb-4 text-gray-500 dark:text-[#6a7a7e]">免费匹配导师，不满意随时退出</p>
            <Link
              href="/koala/chat"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
            >
              免费开始对话 <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}
