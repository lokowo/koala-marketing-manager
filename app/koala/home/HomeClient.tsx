'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bell, ChevronLeft, ChevronRight, X } from 'lucide-react';
import BannerCarousel from '../../components/BannerCarousel';
import type { Professor } from '../../lib/types';
import { useAuth } from '../components/AuthContext';
import { BRAND, getUniBadge, parseUniversity } from '../../lib/constants';


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

const AI_TOOLS = [
  { emoji: '🎯', title: 'AI 选校', desc: '智能匹配最适合你的学校和项目', href: '/koala/chat?mode=path' },
  { emoji: '🔬', title: '科研助手', desc: '文献检索、课题分析、方法论指导', href: '/koala/chat?mode=research' },
  { emoji: '💬', title: 'AI 聊天', desc: '自由提问，PhD 申请百科全书', href: '/koala/chat' },
  { emoji: '✉️', title: '套磁信生成', desc: '针对教授方向定制高回复率邮件', href: '/koala/chat?mode=write' },
  { emoji: '📝', title: 'RP 助手', desc: '研究计划撰写与优化建议', href: '/koala/chat?mode=research' },
  { emoji: '🎤', title: '模拟面试', desc: '模拟 PhD 面试场景和常见问题', href: '/koala/chat?mode=chat' },
];

const PRICING_PREVIEW = [
  { name: '入门包', credits: 50, price: 'AUD 4.99' },
  { name: '标准包', credits: 120, price: 'AUD 9.99' },
  { name: '专业包', credits: 280, price: 'AUD 19.99' },
];

interface HomeClientProps {
  initialProfessors: Professor[];
  initialProfCount: number;
  initialUserCount: number;
  initialBlogPosts: BlogPost[];
  professorLabels?: Record<string, string>;
  postingProfIds?: string[];
}

export default function HomeClient({ initialProfessors, initialUserCount, initialBlogPosts, professorLabels = {}, postingProfIds = [] }: HomeClientProps) {
  const router = useRouter();
  const { user, profile, showLogin, signOut } = useAuth();
  const [professors] = useState<Professor[]>(initialProfessors);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; read: boolean; created_at: string }[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const blogScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  function updateBlogScrollState() {
    const el = blogScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  useEffect(() => {
    const el = blogScrollRef.current;
    if (!el) return;
    updateBlogScrollState();
    el.addEventListener('scroll', updateBlogScrollState, { passive: true });
    const ro = new ResizeObserver(updateBlogScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateBlogScrollState);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scrollBlog(direction: 'left' | 'right') {
    const el = blogScrollRef.current;
    if (!el) return;
    const distance = direction === 'right' ? 336 : -336;
    el.scrollBy({ left: distance, behavior: 'smooth' });
  }

  const blogPosts = initialBlogPosts;

  const fallbackPosts: BlogPost[] = [
    { id: '1', tag: '申请技巧', date: '4月28日', title: '如何写出打动教授的申请信', excerpt: '从研究兴趣切入，三步法精准匹配教授方向，提升回复率。' },
    { id: '2', tag: '选校攻略', date: '4月24日', title: '澳洲 PhD 奖学金的隐藏机会', excerpt: '盘点容易被忽视的资助渠道与时间节点，增加中签率。' },
    { id: '3', tag: '科研方法', date: '4月20日', title: '文献综述的高效方法论', excerpt: '如何快速找到关键文献，构建你的研究框架。' },
    { id: '4', tag: '导师关系', date: '4月16日', title: '第一次和导师开会该聊什么', excerpt: '准备清单与沟通技巧，让导师对你刮目相看。' },
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
              Koala PhD
            </span>
            <span className="text-[10px] leading-tight mt-0.5 text-gray-500 dark:text-[#6a7a7e]">
              你的澳洲学术内线
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className={`relative size-11 flex justify-center items-center rounded-full transition-colors ${showNotif ? 'bg-amber-50 dark:bg-[#D4A843]/10' : ''}`}
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
                  <Image src={profile.avatar_url} alt="用户头像" fill className="object-cover" sizes="36px" />
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
              className="size-10 rounded-full flex items-center justify-center bg-[#1A1A2E] dark:bg-[#D4A843]"
            >
              <span className="text-xs font-medium text-white dark:text-[#080c10]">登录</span>
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
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full dark:opacity-0" style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)' }} />
            <div className="absolute right-8 bottom-0 w-40 h-40 rounded-full dark:opacity-0" style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.04) 0%, transparent 70%)' }} />

            <div className="flex flex-col md:flex-row md:items-center">
              <div className="order-2 md:order-1 px-6 py-6 md:py-8 lg:py-12 lg:px-10 relative z-10 md:w-[45%]">
                <div className="inline-flex items-center text-xs font-medium mb-4 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-transparent text-amber-700 dark:text-[#D4A843]/50 border border-amber-200 dark:border-transparent">
                  AI 导师匹配 · 免费使用
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-3xl font-bold leading-snug mb-3 text-[#1A1A2E] dark:text-[#e8e4dc]">
                  覆盖全澳 38 所大学<br />AI 帮你找最匹配的导师
                </h1>
                <p className="text-xs lg:text-sm leading-relaxed mb-6 text-gray-500 dark:text-[#6a7a7e]">
                  告诉 Koala 你的背景和兴趣，30 秒内获得个性化导师推荐
                </p>
                <Link
                  href="/koala/chat"
                  className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 rounded-full font-semibold text-base no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
                >
                  开始匹配 <ArrowRight className="size-4" />
                </Link>
                <div className="mt-4 text-[11px] text-center md:text-left text-amber-700 dark:text-[#D4A843]/40">
                  {initialUserCount >= 10
                    ? `已帮助 ${initialUserCount.toLocaleString()} 位同学匹配理想导师`
                    : '覆盖全澳 38 所大学'}
                </div>
              </div>

              <div className="order-1 md:order-2 md:w-[55%] p-3 md:p-4 md:pl-0">
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
                features: ['覆盖全澳 38 所大学', '中英文双语支持'],
                extra: '⏱ 约 2 分钟',
                primary: true,
                iconBg: 'bg-[#D4A843]/20',
                gradientBar: 'bg-gradient-to-r from-[#D4A843] to-[#c9a96e]',
                featureIcon: 'text-[#D4A843]',
              },
              {
                icon: '🎯', step: '02', title: 'AI 匹配',
                desc: '从全澳 38 所大学的导师与学者中，根据你的背景和研究兴趣精准推荐最佳导师',
                features: ['覆盖全澳 38 所大学', '实时招生状态'],
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
                extra: '📧 积分制 · 低至 AUD 0.06/积分',
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

        {/* ── AI Tools Grid ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30">AI Tools</span>
            <h2 className="font-bold text-base text-gray-900 dark:text-[#e8e4dc]">AI 工具箱</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {AI_TOOLS.map(tool => (
              <Link
                key={tool.title}
                href={tool.href}
                className="rounded-2xl p-4 flex flex-col gap-2 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10"
              >
                <span className="text-2xl">{tool.emoji}</span>
                <div className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">{tool.title}</div>
                <div className="text-[11px] leading-snug text-gray-500 dark:text-[#6a7a7e]">{tool.desc}</div>
              </Link>
            ))}
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

        {/* ── Hot Professors ── */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="font-bold text-base text-gray-900 dark:text-[#e8e4dc]">🔥 热门导师推荐</h2>
              <p className="text-xs mt-0.5 text-gray-500 dark:text-[#6a7a7e]">基于匹配度和学术影响力排序</p>
            </div>
            <Link href="/koala/professors" className="text-xs font-semibold flex items-center gap-1 no-underline text-[#1A1A2E] dark:text-[#D4A843]">
              查看全部 <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="flex -mx-4 px-4 pb-2 gap-3 overflow-x-auto lg:overflow-visible lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:gap-4" style={{ scrollbarWidth: 'none' }}>
            {(professors.length > 0 ? professors : Array(4).fill(null)).map((p, i) => {
              if (!p) return (
                <div key={i} className="shrink-0 w-56 lg:w-auto h-60 rounded-2xl animate-pulse bg-gray-100 dark:bg-[#c9a96e]/[0.06]" />
              );
              const badge = getUniBadge(p.university);
              const status = p.acceptingStudents === 'yes' ? { label: '招生中', dotCls: 'bg-emerald-500' }
                           : p.acceptingStudents === 'no'  ? { label: '暂不招', dotCls: 'bg-red-400' }
                           : null;
              const tags = (p.researchAreas || []).slice(0, 2);
              return (
                <Link
                  key={p.id}
                  href={`/koala/professors/${p.id}`}
                  className="shrink-0 w-56 lg:w-auto bg-gradient-to-br from-white to-gray-50 dark:from-[#0F1419] dark:to-[#151B23] rounded-2xl p-5 border border-gray-100 dark:border-white/10 hover:shadow-xl hover:shadow-[#D4A843]/5 hover:-translate-y-1 transition-all duration-300 group cursor-pointer no-underline flex flex-col gap-2.5 relative overflow-hidden border-l-4"
                  style={{ borderLeftColor: badge.bg }}
                >
                  {/* Recommend label */}
                  {professorLabels[p.id] && (
                    <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      professorLabels[p.id].includes('学术') ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                      professorLabels[p.id].includes('招生') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                      'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>
                      {professorLabels[p.id]}
                    </span>
                  )}
                  {/* Posting badge */}
                  {postingProfIds.includes(p.id) && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold w-fit">
                      <span>🔥</span> 正在招生
                    </div>
                  )}

                  {/* University badge + status */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1"
                      style={{ background: badge.bg, color: badge.fg }}
                    >
                      {badge.short}
                      <span className="font-medium opacity-80">·</span>
                      <span className="font-medium text-[9px] opacity-90">
                        {(() => { const full = parseUniversity(p.university).full; return full.length > 20 ? full.slice(0, 18) + '…' : full; })()}
                      </span>
                    </span>
                    {status && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400">
                        <span className={`size-1.5 rounded-full ${status.dotCls}`} />
                        {status.label}
                      </span>
                    )}
                  </div>

                  {/* Name + position */}
                  <div>
                    <div className="text-sm font-bold leading-snug text-gray-900 dark:text-[#e8e4dc]">{p.name}</div>
                    {p.positionTitle && (
                      <div className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">{p.positionTitle}</div>
                    )}
                  </div>

                  {/* Research tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags[0] && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                          {tags[0].length > 20 ? tags[0].slice(0, 18) + '…' : tags[0]}
                        </span>
                      )}
                      {tags[1] && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400">
                          {tags[1].length > 20 ? tags[1].slice(0, 18) + '…' : tags[1]}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats row */}
                  {(p.hIndex || p.paperCount || p.citationCount) && (
                    <>
                      <div className="border-t border-gray-100 dark:border-white/5 mt-auto" />
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-[#6a7a7e]">
                        {p.hIndex != null && (
                          <span className="flex items-center gap-0.5">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">H-index</span>
                            <span>{p.hIndex}</span>
                          </span>
                        )}
                        {p.hIndex != null && p.paperCount != null && (
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                        )}
                        {p.paperCount != null && (
                          <span className="flex items-center gap-0.5">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">论文</span>
                            <span>{fmtNum(p.paperCount)}</span>
                          </span>
                        )}
                        {(p.hIndex != null || p.paperCount != null) && p.citationCount != null && (
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                        )}
                        {p.citationCount != null && (
                          <span className="flex items-center gap-0.5">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">引用</span>
                            <span>{fmtNum(p.citationCount)}</span>
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {/* Hover button */}
                  <div className="absolute bottom-3 left-5 right-5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <div className="text-[11px] font-semibold text-center py-2 rounded-xl bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">
                      查看详情 →
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Blog Carousel ── */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-base text-gray-900 dark:text-[#e8e4dc]">最新博客</h2>
          </div>
          <div className="relative group">
            {canScrollLeft && (
              <button
                onClick={() => scrollBlog('left')}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-9 h-9 items-center justify-center rounded-full bg-white/90 dark:bg-[#1a1a2e]/90 shadow-lg border border-gray-200 dark:border-[#c9a96e]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white dark:hover:bg-[#1a1a2e] cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-[#e8e4dc]" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scrollBlog('right')}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-9 h-9 items-center justify-center rounded-full bg-white/90 dark:bg-[#1a1a2e]/90 shadow-lg border border-gray-200 dark:border-[#c9a96e]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white dark:hover:bg-[#1a1a2e] cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-[#e8e4dc]" />
              </button>
            )}
            <div
              ref={blogScrollRef}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide"
            >
              {displayPosts.map(b => (
                <Link
                  key={b.id}
                  href={`/koala/blog/${b.slug || b.id}`}
                  className="w-[280px] md:w-[320px] flex-shrink-0 snap-start rounded-2xl p-4 flex flex-col gap-2 no-underline bg-white dark:bg-white/5 border border-gray-200 dark:border-[#c9a96e]/[0.06] shadow-sm dark:shadow-[0_4px_16px_rgba(196,160,80,0.08)]"
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
          </div>
          <div className="text-center mt-6">
            <Link
              href="/koala/blog"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-50 dark:bg-white/5 text-[#1A1A2E] dark:text-[#D4A843] font-medium rounded-xl hover:bg-[#1A1A2E] hover:text-white dark:hover:bg-[#D4A843] dark:hover:text-[#080C10] transition-all duration-200 no-underline"
            >
              查看更多文章 →
            </Link>
          </div>
        </section>

        {/* ── Pricing Preview ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843] border border-amber-200 dark:border-[#D4A843]/20">Credits</span>
            <h2 className="font-bold text-base text-gray-900 dark:text-[#e8e4dc]">注册即送积分，免费体验</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {PRICING_PREVIEW.map(pack => (
              <div
                key={pack.name}
                className="rounded-2xl p-4 text-center bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10"
              >
                <div className="text-lg font-bold text-[#1A1A2E] dark:text-[#D4A843]">{pack.credits}</div>
                <div className="text-[10px] text-gray-500 dark:text-[#6a7a7e] mt-0.5">积分</div>
                <div className="text-xs font-bold mt-2 text-gray-900 dark:text-[#e8e4dc]">{pack.name}</div>
                <div className="text-[11px] mt-1 text-gray-500 dark:text-[#6a7a7e]">{pack.price}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <Link
              href="/koala/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-50 dark:bg-white/5 text-[#1A1A2E] dark:text-[#D4A843] font-medium rounded-xl hover:bg-[#1A1A2E] hover:text-white dark:hover:bg-[#D4A843] dark:hover:text-[#080C10] transition-all duration-200 no-underline"
            >
              查看完整定价 →
            </Link>
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="bg-gradient-to-br from-[#1A1A2E] to-[#2D2D4A] dark:from-[#0F1419] dark:to-[#1A1A2E] rounded-2xl p-8 md:p-12 text-white relative overflow-hidden dark:border dark:border-[#D4A843]/20">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#D4A843]/5 rounded-full" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-[#4ECDC4]/5 rounded-full" />

          <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-12 relative z-10">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                还在犹豫？先聊聊你的想法
              </h2>
              <p className="text-gray-300 mb-6 text-base md:text-lg">
                免费匹配导师，不满意随时退出。覆盖全澳 38 所大学导师与学者。
              </p>
              <div className="flex flex-wrap gap-3 md:gap-4">
                <Link
                  href="/koala/chat?mode=path"
                  className="inline-flex items-center gap-2 px-7 py-3 md:px-8 md:py-3.5 bg-[#D4A843] text-[#1A1A2E] font-bold rounded-xl hover:bg-[#B8922F] transition no-underline"
                >
                  免费开始对话 <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/koala/professors"
                  className="inline-flex items-center gap-2 px-5 py-3 md:px-6 md:py-3.5 border border-white/20 text-white rounded-xl hover:bg-white/10 transition no-underline"
                >
                  浏览导师库
                </Link>
              </div>
            </div>

            <div className="hidden md:flex gap-5">
              <div className="text-center px-5 py-4 bg-white/5 rounded-xl min-w-[100px]">
                <div className="text-2xl lg:text-3xl font-bold text-[#D4A843]">38</div>
                <div className="text-xs text-gray-400 mt-1">澳洲大学</div>
              </div>
              <div className="text-center px-5 py-4 bg-white/5 rounded-xl min-w-[100px]">
                <div className="text-2xl lg:text-3xl font-bold text-[#4ECDC4]">30s</div>
                <div className="text-xs text-gray-400 mt-1">智能匹配</div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="px-4 lg:px-0 py-8 border-t border-gray-200 dark:border-[#c9a96e]/10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-center md:text-left">
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">Koala PhD 考拉博士</div>
            <div className="text-[11px] mt-1 text-gray-500 dark:text-[#6a7a7e]">{BRAND.positioning}</div>
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-x-4 gap-y-1 text-[11px] text-gray-400 dark:text-[#6a7a7e]">
            <span>{BRAND.email}</span>
            <span>WeChat: {BRAND.wechat}</span>
            <span>小红书: {BRAND.xiaohongshu}</span>
            <Link href="/koala/insights" className="no-underline hover:underline text-gray-400 dark:text-[#6a7a7e]">研究洞察</Link>
            <Link href="/terms" className="no-underline hover:underline text-gray-400 dark:text-[#6a7a7e]">使用条款</Link>
            <Link href="/privacy" className="no-underline hover:underline text-gray-400 dark:text-[#6a7a7e]">隐私政策</Link>
          </div>
        </div>
        <div className="text-center text-[10px] mt-4 text-gray-300 dark:text-[#6a7a7e]/60">
          &copy; 2026 Koala PhD 考拉博士 &middot; {BRAND.address}
        </div>
      </footer>

    </div>
  );
}
