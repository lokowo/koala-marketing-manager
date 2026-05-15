'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Professor } from '../../../lib/types';
import { OPPORTUNITY_LABELS, parseUniversity } from '../../../lib/constants';
import { useAuth } from '../../components/AuthContext';

interface Paper {
  id: string;
  title: string;
  year: number | null;
  citation_count: number;
  journal: string | null;
  doi: string | null;
  doi_url: string | null;
  ss_url: string | null;
}

interface RelatedBlog {
  id: string;
  slug: string;
  title: string;
  category: string;
  cover_image: string | null;
}

interface SimilarProfessor {
  id: string;
  name: string;
  university: string;
  research_areas: string[];
  opportunity_score: number | null;
  position_title: string | null;
}

function getApplicationTips(professor: Professor): string[] {
  const tips: string[] = [];
  if (professor.grantStatus === 'Active') {
    tips.push('该教授目前有活跃科研经费支持，意味着可能有充足的资源支持新的 PhD 学生。');
  }
  if (professor.acceptingStudents === 'yes') {
    tips.push('该教授明确表示正在招收学生，建议尽早联系并展示你的研究兴趣。');
  } else if (professor.acceptingStudents === 'likely') {
    tips.push('该教授可能正在招收学生，建议主动联系确认招生意向。');
  }
  if (professor.hIndex && professor.hIndex >= 40) {
    tips.push('学术影响力较高（H-Index ' + professor.hIndex + '），在领域内有较强的学术声誉，跟随这样的导师有助于你的学术发展。');
  } else if (professor.hIndex && professor.hIndex >= 20) {
    tips.push('具有稳定的学术产出，适合希望在专注领域深入研究的学生。');
  }
  if (tips.length === 0) {
    tips.push('建议通过邮件或大学官网了解该教授的最新招生情况，在联系前准备好你的研究兴趣和学术背景概述。');
  }
  return tips;
}

export default function ProfessorDetailClient({ professor, papers, relatedBlogs: initialRelatedBlogs, similarProfessors }: { professor: Professor; papers: Paper[]; relatedBlogs: RelatedBlog[]; similarProfessors: SimilarProfessor[] }) {
  const router = useRouter();
  const { user, showLogin } = useAuth();
  const [saved, setSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(professor.aiSummary ?? null);
  const [summaryLoading, setSummaryLoading] = useState(!professor.aiSummary);
  const [relatedBlogs, setRelatedBlogs] = useState(initialRelatedBlogs);
  const [blogGenerating, setBlogGenerating] = useState(false);
  const [blogError, setBlogError] = useState<string | null>(null);
  const [creditShortfall, setCreditShortfall] = useState<{ needed: number; balance: number } | null>(null);

  useEffect(() => {
    fetch(`/api/professors/${professor.id}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'viewed', userId: user?.id }),
    }).catch(() => {});
  }, [professor.id, user?.id]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/user/saved-professors')
      .then(r => r.json())
      .then(d => {
        const isSaved = (d.saved ?? []).some((s: { professor_id: string }) => s.professor_id === professor.id);
        setSaved(isSaved);
      }).catch(() => {});
  }, [user, professor.id]);

  useEffect(() => {
    if (professor.aiSummary) { setSummaryLoading(false); return; }
    fetch(`/api/professors/${professor.id}/ai-summary`)
      .then(r => r.json())
      .then(d => { if (d.summary) setAiSummary(d.summary); })
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, [professor.id, professor.aiSummary]);

  async function toggleBookmark() {
    if (!user) {
      showLogin(() => toggleBookmark());
      return;
    }
    setSavingBookmark(true);
    if (saved) {
      await fetch(`/api/user/saved-professors?professor_id=${professor.id}`, { method: 'DELETE' });
      setSaved(false);
    } else {
      await fetch('/api/user/saved-professors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professor_id: professor.id }),
      });
      setSaved(true);
    }
    setSavingBookmark(false);
  }

  async function handleGenerateBlog() {
    if (!user) {
      showLogin(() => handleGenerateBlog());
      return;
    }
    setBlogGenerating(true);
    setBlogError(null);
    setCreditShortfall(null);
    try {
      const res = await fetch(`/api/professors/${professor.id}/generate-blog`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.status === 402) {
        setCreditShortfall({ needed: data.needed, balance: data.balance });
        return;
      }
      if (!res.ok) {
        setBlogError(data.error || '生成失败');
        return;
      }
      if (data.exists || data.success) {
        const blog = data.blog;
        setRelatedBlogs(prev => [...prev, { id: blog.id, slug: blog.slug, title: blog.title, category: 'professor_spotlight', cover_image: null }]);
      }
    } catch {
      setBlogError('网络错误，请稍后再试');
    } finally {
      setBlogGenerating(false);
    }
  }

  const score = professor.opportunityScore ?? 0;
  const opportunityText = score > 70
    ? OPPORTUNITY_LABELS.high
    : score >= 40
    ? OPPORTUNITY_LABELS.medium
    : OPPORTUNITY_LABELS.low;

  const opportunityColor = score > 70 ? '#5a8060' : score >= 40 ? '#D4A843' : '#6a7a7e';

  return (
    <div className="pb-6 lg:pb-12 bg-white dark:bg-[#080c10] min-h-screen">
      {/* Back + Bookmark */}
      <div className="px-4 lg:px-0 pt-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-xs flex items-center gap-1 text-[#1A1A2E] dark:text-[#D4A843]"
        >
          ← 返回
        </button>
        <button
          onClick={toggleBookmark}
          disabled={savingBookmark}
          className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-full ${saved ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] border border-[#1A1A2E] dark:border-[#D4A843]' : 'bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843] border border-amber-300 dark:border-[rgba(212,168,67,0.25)]'}`}
        >
          {saved ? '🔖 已收藏' : '🔖 收藏'}
        </button>
      </div>

      {/* Desktop two-col layout */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
      <div>{/* left col */}

      {/* Profile Card */}
      <div className="mx-4 lg:mx-0 mt-3 rounded-3xl p-5 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0 bg-amber-50 dark:bg-[rgba(212,168,67,0.1)]">
            👨‍🔬
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-[#e8e4dc]">{professor.name}</h1>
            {professor.positionTitle && (
              <div className="text-xs mt-0.5 text-amber-700 dark:text-[#D4A843]">{professor.positionTitle}</div>
            )}
            <div className="text-xs mt-1 text-gray-500 dark:text-[#a8b8ac]">
              {parseUniversity(professor.university).full}
              {professor.faculty && ` · ${professor.faculty}`}
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {professor.grantStatus === 'Active' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(90,128,96,0.15)', color: '#5a8060' }}>
                  ✓ 活跃经费
                </span>
              )}
              {professor.acceptingStudents === 'yes' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full text-amber-700 dark:text-[#D4A843] bg-amber-50 dark:bg-[#D4A843]/10">
                  招收学生
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="mx-4 lg:mx-0 mt-3 rounded-2xl p-4 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">教授简介</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full text-amber-600 dark:text-[#D4A843]/70 bg-amber-50 dark:bg-[#D4A843]/5">AI 生成</span>
        </div>
        {summaryLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 rounded bg-gray-100 dark:bg-white/5 w-full" />
            <div className="h-3 rounded bg-gray-100 dark:bg-white/5 w-4/5" />
            <div className="h-3 rounded bg-gray-100 dark:bg-white/5 w-3/5" />
          </div>
        ) : aiSummary ? (
          <p className="text-xs leading-relaxed text-gray-600 dark:text-[#a8b8ac]">{aiSummary}</p>
        ) : (
          <p className="text-xs text-gray-400 dark:text-[#6a7a7e]">暂无简介</p>
        )}
      </div>

      {/* Opportunity Signal */}
      <div className="mx-4 lg:mx-0 mt-3 rounded-2xl p-4 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">Opportunity Signal</span>
          <span className="text-xs font-bold" style={{ color: opportunityColor }}>
            {score > 70 ? '强' : score >= 40 ? '中' : '弱'}
          </span>
        </div>
        <div className="w-full rounded-full h-1.5 mb-2 bg-amber-50 dark:bg-[rgba(212,168,67,0.1)]">
          <div
            className="rounded-full h-1.5 transition-all"
            style={{ width: `${score}%`, background: opportunityColor }}
          />
        </div>
        <p className="text-xs leading-relaxed text-gray-500 dark:text-[#a8b8ac]">{opportunityText}</p>
      </div>

      {/* Application Tips */}
      <div className="mx-4 lg:mx-0 mt-3 rounded-2xl p-4 bg-amber-50/50 dark:bg-[#D4A843]/5 border border-amber-200/50 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
        <h2 className="text-xs font-semibold mb-2 text-gray-900 dark:text-[#e8e4dc]">💡 申请建议</h2>
        <div className="space-y-1.5">
          {getApplicationTips(professor).map((tip, i) => (
            <p key={i} className="text-xs leading-relaxed text-gray-600 dark:text-[#a8b8ac]">{tip}</p>
          ))}
        </div>
      </div>

      {/* Research Areas */}
      {professor.researchAreas.length > 0 && (
        <div className="mx-4 lg:mx-0 mt-3 rounded-2xl p-4 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
          <h2 className="text-xs font-semibold mb-2 text-gray-900 dark:text-[#e8e4dc]">研究方向</h2>
          <div className="flex flex-wrap gap-1.5">
            {professor.researchAreas.map(area => (
              <span
                key={area}
                className="text-xs px-2.5 py-1 rounded-full text-amber-700 dark:text-[#D4A843] bg-amber-50 dark:bg-[#D4A843]/10 border border-amber-300 dark:border-[rgba(212,168,67,0.2)]"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suitable Backgrounds */}
      {professor.suitableStudentBackgrounds.length > 0 && (
        <div className="mx-4 lg:mx-0 mt-3 rounded-2xl p-4 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
          <h2 className="text-xs font-semibold mb-2 text-gray-900 dark:text-[#e8e4dc]">适合的学生背景</h2>
          <div className="space-y-1">
            {professor.suitableStudentBackgrounds.map(bg => (
              <div key={bg} className="flex items-start gap-2">
                <span style={{ color: '#5a8060' }}>✓</span>
                <span className="text-xs text-gray-500 dark:text-[#a8b8ac]">{bg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {(professor.hIndex || professor.paperCount || professor.citationCount) && (
        <div className="mx-4 lg:mx-0 mt-3 rounded-2xl p-4 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
          <h2 className="text-xs font-semibold mb-2 text-gray-900 dark:text-[#e8e4dc]">学术数据</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            {professor.hIndex !== undefined && (
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-[#D4A843]">{professor.hIndex}</div>
                <div className="text-[10px] text-gray-500 dark:text-[#6a7a7e]">H-Index</div>
              </div>
            )}
            {professor.paperCount !== undefined && (
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-[#D4A843]">{professor.paperCount}</div>
                <div className="text-[10px] text-gray-500 dark:text-[#6a7a7e]">论文</div>
              </div>
            )}
            {professor.citationCount !== undefined && (
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-[#D4A843]">{professor.citationCount}</div>
                <div className="text-[10px] text-gray-500 dark:text-[#6a7a7e]">引用</div>
              </div>
            )}
          </div>
        </div>
      )}

      </div>{/* end left col */}
      <div>{/* right col */}

      {/* Links */}
      {(professor.email || professor.profileUrl || professor.googleScholarUrl) && (
        <div className="mx-4 lg:mx-0 mt-3 rounded-2xl p-4 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
          <h2 className="text-xs font-semibold mb-2 text-gray-900 dark:text-[#e8e4dc]">联系方式</h2>
          <div className="space-y-2">
            {professor.email && (
              <a href={`mailto:${professor.email}`} className="flex items-center gap-2 text-xs text-[#1A1A2E] dark:text-[#D4A843]">
                <span>📧</span><span>{professor.email}</span>
              </a>
            )}
            {professor.profileUrl && (
              <a href={professor.profileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#1A1A2E] dark:text-[#D4A843]">
                <span>🔗</span><span>大学主页</span>
              </a>
            )}
            {professor.googleScholarUrl && (
              <a href={professor.googleScholarUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#1A1A2E] dark:text-[#D4A843]">
                <span>📚</span><span>Google Scholar</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Papers */}
      {papers.length > 0 && (
        <div className="mx-4 lg:mx-0 mt-3 rounded-2xl p-4 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
          <h2 className="text-xs font-semibold mb-3 text-gray-900 dark:text-[#e8e4dc]">
            代表论文 <span className="font-normal text-gray-500 dark:text-[#6a7a7e]">via Semantic Scholar</span>
          </h2>
          <div className="space-y-3">
            {papers.map(p => (
              <div key={p.id} className="border-b border-gray-100 dark:border-[rgba(212,168,67,0.1)] last:border-0 pb-3 last:pb-0">
                <a
                  href={p.doi_url ?? p.ss_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs font-medium leading-snug block mb-1 no-underline ${p.doi_url || p.ss_url ? 'text-[#1A1A2E] dark:text-[#D4A843]' : 'text-gray-700 dark:text-[#e8e4dc]'}`}
                >
                  {p.title}
                  {(p.doi_url || p.ss_url) && <span className="ml-1 text-[#1A1A2E] dark:text-[#D4A843]">↗</span>}
                </a>
                <div className="flex gap-2 text-[10px] text-gray-500 dark:text-[#6a7a7e]">
                  {p.year && <span>{p.year}</span>}
                  {p.journal && <span>· {p.journal}</span>}
                  {p.citation_count > 0 && <span>· 引用 {p.citation_count}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Blogs */}
      {relatedBlogs.length > 0 ? (
        <div className="mx-4 lg:mx-0 mt-3 rounded-2xl p-4 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
          <h2 className="text-xs font-semibold mb-3 text-gray-900 dark:text-[#e8e4dc]">📝 相关文章</h2>
          <div className="space-y-2.5">
            {relatedBlogs.map(blog => (
              <Link key={blog.id} href={`/koala/blog/${blog.slug}`} className="flex items-start gap-3 group">
                {blog.cover_image && (
                  <img src={blog.cover_image} alt="" className="w-14 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 dark:text-[#e8e4dc] group-hover:text-[#D4A843] dark:group-hover:text-[#D4A843] leading-snug line-clamp-2">{blog.title}</div>
                  <span className="text-[10px] text-gray-400 dark:text-[#6a7a7e] mt-0.5 inline-block">{blog.category}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-4 lg:mx-0 mt-3 rounded-2xl p-4 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
          <h2 className="text-xs font-semibold mb-2 text-gray-900 dark:text-[#e8e4dc]">📝 教授介绍文章</h2>
          <p className="text-xs mb-3 text-gray-500 dark:text-[#a8b8ac]">
            还没有关于这位教授的介绍文章，点击下方按钮由 AI 生成一篇详细的教授介绍。
          </p>
          {creditShortfall && (
            <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
              <p className="text-xs text-red-700 dark:text-red-400">
                积分不足：需要 {creditShortfall.needed} 积分，当前余额 {creditShortfall.balance}
              </p>
              <div className="flex gap-2 mt-2">
                <Link href="/koala/pricing#credit-packs" className="text-[10px] px-2.5 py-1 rounded-full bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] font-semibold">
                  充值积分
                </Link>
                <Link href="/koala/pricing#subscriptions" className="text-[10px] px-2.5 py-1 rounded-full bg-amber-50 dark:bg-[#D4A843]/6 text-amber-700 dark:text-[#D4A843] border border-amber-300 dark:border-[#D4A843]/20 font-semibold">
                  查看订阅
                </Link>
                <span className="text-[10px] py-1 text-gray-400 dark:text-[#6a7a7e]">每日签到可获 2 积分</span>
              </div>
            </div>
          )}
          {blogError && (
            <p className="text-xs mb-2 text-red-500">{blogError}</p>
          )}
          <button
            onClick={handleGenerateBlog}
            disabled={blogGenerating}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843] border border-amber-300 dark:border-[rgba(212,168,67,0.25)] disabled:opacity-50"
          >
            {blogGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                AI 正在生成文章（约 30 秒）...
              </span>
            ) : (
              '生成教授介绍文章（首次免费 / 10 积分）'
            )}
          </button>
        </div>
      )}

      {/* Data disclaimer */}
      <div className="mx-4 lg:mx-0 mt-4 mb-2 px-3 py-3 rounded-xl text-[11px] leading-relaxed bg-gray-50 dark:bg-[#0F1419] text-gray-500 dark:text-[#6a7a7e] border border-gray-200 dark:border-[rgba(212,168,67,0.12)]">
        ⚠️ 数据说明：本页信息来源于大学官网、Google Scholar 及公开数据库，仅供参考。教授的招生状态、经费情况和研究方向可能随时变化，具体信息请以导师本人确认为准。Koala PhD 不对信息的准确性和时效性承担责任。
      </div>

      {/* CTA */}
      <div className="mx-4 lg:mx-0 mt-4 space-y-2">
        <Link
          href={`/koala/chat?action=research&prof=${professor.id}&name=${encodeURIComponent(professor.name)}`}
          className="block w-full py-3 rounded-full text-center text-sm font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
        >
          🐨 问 Koala 关于这位教授
        </Link>
        {user ? (
          <Link
            href={`/koala/chat?action=outreach&prof=${professor.id}&name=${encodeURIComponent(professor.name)}`}
            className="block w-full py-3 rounded-full text-center text-sm font-semibold border text-[#1A1A2E] dark:text-[#D4A843] border-gray-300 dark:border-[rgba(212,168,67,0.3)]"
          >
            ✍️ 生成申请信 (1 积分)
          </Link>
        ) : (
          <button
            onClick={() => showLogin()}
            className="block w-full py-3 rounded-full text-center text-sm font-semibold border text-[#1A1A2E] dark:text-[#D4A843] border-gray-300 dark:border-[rgba(212,168,67,0.3)]"
            style={{ width: '100%' }}
          >
            ✍️ 生成申请信（登录后使用）
          </button>
        )}
      </div>
      {/* Similar Professors */}
      {similarProfessors.length > 0 && (
        <div className="mx-4 lg:mx-0 mt-4 rounded-2xl p-4 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
          <h2 className="text-xs font-semibold mb-3 text-gray-900 dark:text-[#e8e4dc]">该方向其他教授</h2>
          <div className="space-y-2.5">
            {similarProfessors.map(sp => {
              const matchingAreas = sp.research_areas.filter(a => professor.researchAreas.includes(a));
              return (
                <Link key={sp.id} href={`/koala/professors/${sp.id}`} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 bg-amber-50 dark:bg-[rgba(212,168,67,0.1)]">
                    👨‍🔬
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 dark:text-[#e8e4dc] group-hover:text-[#D4A843] dark:group-hover:text-[#D4A843]">{sp.name}</div>
                    <div className="text-[10px] text-gray-400 dark:text-[#6a7a7e]">
                      {parseUniversity(sp.university).full}{sp.position_title ? ` · ${sp.position_title}` : ''}
                    </div>
                    {matchingAreas.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {matchingAreas.slice(0, 2).map(a => (
                          <span key={a} className="text-[9px] px-1.5 py-0.5 rounded-full text-amber-600 dark:text-[#D4A843] bg-amber-50 dark:bg-[#D4A843]/10">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      </div>{/* end right col */}
      </div>{/* end two-col grid */}
    </div>
  );
}
