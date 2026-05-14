'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Professor } from '../../../lib/types';
import { OPPORTUNITY_LABELS } from '../../../lib/constants';
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

export default function ProfessorDetailClient({ professor, papers }: { professor: Professor; papers: Paper[] }) {
  const router = useRouter();
  const { user, showLogin } = useAuth();
  const [saved, setSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);

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
              {professor.university}
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
            ✍️ 生成申请信 (AUD 1)
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
      </div>{/* end right col */}
      </div>{/* end two-col grid */}
    </div>
  );
}
