'use client';

import { use, useEffect, useState } from 'react';
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

export default function ProfessorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, showLogin } = useAuth();
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/professors/${id}`).then(r => r.json()),
      fetch(`/api/professors/${id}/papers`).then(r => r.json()),
    ]).then(([pd, pp]) => {
      setProfessor(pd.data ?? null);
      setPapers(pp.papers ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  // Check if already bookmarked
  useEffect(() => {
    if (!user) return;
    fetch('/api/user/saved-professors')
      .then(r => r.json())
      .then(d => {
        const isSaved = (d.saved ?? []).some((s: { professor_id: string }) => s.professor_id === id);
        setSaved(isSaved);
      }).catch(() => {});
  }, [user, id]);

  async function toggleBookmark() {
    if (!user) {
      showLogin(() => toggleBookmark());
      return;
    }
    setSavingBookmark(true);
    if (saved) {
      await fetch(`/api/user/saved-professors?professor_id=${id}`, { method: 'DELETE' });
      setSaved(false);
    } else {
      await fetch('/api/user/saved-professors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professor_id: id }),
      });
      setSaved(true);
    }
    setSavingBookmark(false);
  }

  if (loading) {
    return (
      <div className="px-4 py-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl animate-pulse" style={{ background: '#f2ead6', height: '80px' }} />
        ))}
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="text-4xl mb-3">🤔</div>
        <p className="text-sm" style={{ color: '#907858' }}>找不到这位教授</p>
        <Link href="/koala/professors" className="text-xs mt-4 inline-block" style={{ color: '#7d6340' }}>
          ← 返回列表
        </Link>
      </div>
    );
  }

  const score = professor.opportunityScore ?? 0;
  const opportunityText = score > 70
    ? OPPORTUNITY_LABELS.high
    : score >= 40
    ? OPPORTUNITY_LABELS.medium
    : OPPORTUNITY_LABELS.low;

  const opportunityColor = score > 70 ? '#5a8060' : score >= 40 ? '#c4a050' : '#907858';

  return (
    <div className="pb-6">
      {/* Back + Bookmark */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-xs flex items-center gap-1"
          style={{ color: '#7d6340' }}
        >
          ← 返回
        </button>
        <button
          onClick={toggleBookmark}
          disabled={savingBookmark}
          className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full"
          style={{
            background: saved ? '#c4a050' : '#f2ead6',
            color: saved ? '#fff' : '#7d6340',
            border: `1px solid ${saved ? '#c4a050' : '#d8c8a8'}`,
          }}
        >
          {saved ? '🔖 已收藏' : '🔖 收藏'}
        </button>
      </div>

      {/* Profile Card */}
      <div
        className="mx-4 mt-3 rounded-3xl p-5"
        style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: '#e8dcc8' }}
          >
            👨‍🔬
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold" style={{ color: '#1a2332' }}>{professor.name}</h1>
            {professor.positionTitle && (
              <div className="text-xs mt-0.5" style={{ color: '#7d6340' }}>{professor.positionTitle}</div>
            )}
            <div className="text-xs mt-1" style={{ color: '#584838' }}>
              {professor.university}
              {professor.faculty && ` · ${professor.faculty}`}
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {professor.grantStatus === 'Active' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#5a806020', color: '#5a8060' }}>
                  ✓ 活跃经费
                </span>
              )}
              {professor.acceptingStudents === 'yes' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#7d63401a', color: '#7d6340' }}>
                  招收学生
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Opportunity Signal */}
      <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color: '#1a2332' }}>Opportunity Signal</span>
          <span className="text-xs font-bold" style={{ color: opportunityColor }}>
            {score > 70 ? '强' : score >= 40 ? '中' : '弱'}
          </span>
        </div>
        <div className="w-full rounded-full h-1.5 mb-2" style={{ background: '#e8dcc8' }}>
          <div
            className="rounded-full h-1.5 transition-all"
            style={{ width: `${score}%`, background: opportunityColor }}
          />
        </div>
        <p className="text-xs leading-relaxed" style={{ color: '#584838' }}>{opportunityText}</p>
      </div>

      {/* Research Areas */}
      {professor.researchAreas.length > 0 && (
        <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
          <h2 className="text-xs font-semibold mb-2" style={{ color: '#1a2332' }}>研究方向</h2>
          <div className="flex flex-wrap gap-1.5">
            {professor.researchAreas.map(area => (
              <span
                key={area}
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: '#e8dcc8', color: '#584838' }}
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suitable Backgrounds */}
      {professor.suitableStudentBackgrounds.length > 0 && (
        <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
          <h2 className="text-xs font-semibold mb-2" style={{ color: '#1a2332' }}>适合的学生背景</h2>
          <div className="space-y-1">
            {professor.suitableStudentBackgrounds.map(bg => (
              <div key={bg} className="flex items-start gap-2">
                <span style={{ color: '#5a8060' }}>✓</span>
                <span className="text-xs" style={{ color: '#584838' }}>{bg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {(professor.hIndex || professor.paperCount || professor.citationCount) && (
        <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
          <h2 className="text-xs font-semibold mb-2" style={{ color: '#1a2332' }}>学术数据</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            {professor.hIndex !== undefined && (
              <div>
                <div className="text-lg font-bold" style={{ color: '#7d6340' }}>{professor.hIndex}</div>
                <div className="text-[10px]" style={{ color: '#907858' }}>H-Index</div>
              </div>
            )}
            {professor.paperCount !== undefined && (
              <div>
                <div className="text-lg font-bold" style={{ color: '#7d6340' }}>{professor.paperCount}</div>
                <div className="text-[10px]" style={{ color: '#907858' }}>论文</div>
              </div>
            )}
            {professor.citationCount !== undefined && (
              <div>
                <div className="text-lg font-bold" style={{ color: '#7d6340' }}>{professor.citationCount}</div>
                <div className="text-[10px]" style={{ color: '#907858' }}>引用</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Links */}
      {(professor.email || professor.profileUrl || professor.googleScholarUrl) && (
        <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
          <h2 className="text-xs font-semibold mb-2" style={{ color: '#1a2332' }}>联系方式</h2>
          <div className="space-y-2">
            {professor.email && (
              <a href={`mailto:${professor.email}`} className="flex items-center gap-2 text-xs" style={{ color: '#7d6340' }}>
                <span>📧</span><span>{professor.email}</span>
              </a>
            )}
            {professor.profileUrl && (
              <a href={professor.profileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs" style={{ color: '#7d6340' }}>
                <span>🔗</span><span>大学主页</span>
              </a>
            )}
            {professor.googleScholarUrl && (
              <a href={professor.googleScholarUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs" style={{ color: '#7d6340' }}>
                <span>📚</span><span>Google Scholar</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Papers */}
      {papers.length > 0 && (
        <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
          <h2 className="text-xs font-semibold mb-3" style={{ color: '#1a2332' }}>
            代表论文 <span className="font-normal" style={{ color: '#907858' }}>via Semantic Scholar</span>
          </h2>
          <div className="space-y-3">
            {papers.map(p => (
              <div key={p.id} className="border-b last:border-0 pb-3 last:pb-0" style={{ borderColor: '#e8dcc8' }}>
                <a
                  href={p.doi_url ?? p.ss_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium leading-snug block mb-1 no-underline"
                  style={{ color: p.doi_url || p.ss_url ? '#7d6340' : '#1a2332' }}
                >
                  {p.title}
                  {(p.doi_url || p.ss_url) && <span className="ml-1" style={{ color: '#c4a050' }}>↗</span>}
                </a>
                <div className="flex gap-2 text-[10px]" style={{ color: '#907858' }}>
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
      <div className="mx-4 mt-4 mb-2 px-3 py-3 rounded-xl text-[11px] leading-relaxed" style={{ background: '#f0e9d6', color: '#907858' }}>
        ⚠️ 数据说明：本页信息来源于大学官网、Google Scholar 及公开数据库，仅供参考。教授的招生状态、经费情况和研究方向可能随时变化，具体信息请以导师本人确认为准。Koala Study Advisors 不对信息的准确性和时效性承担责任。
      </div>

      {/* CTA */}
      <div className="mx-4 mt-4 space-y-2">
        <Link
          href={`/koala/chat?action=research&prof=${id}&name=${encodeURIComponent(professor.name)}`}
          className="block w-full py-3 rounded-full text-center text-sm font-semibold text-white"
          style={{ background: '#7d6340' }}
        >
          🐨 问 Koala 关于这位教授
        </Link>
        {user ? (
          <Link
            href={`/koala/chat?action=outreach&prof=${id}&name=${encodeURIComponent(professor.name)}`}
            className="block w-full py-3 rounded-full text-center text-sm font-semibold border"
            style={{ color: '#7d6340', borderColor: '#7d6340' }}
          >
            ✍️ 生成套磁信 (AUD 1)
          </Link>
        ) : (
          <button
            onClick={() => showLogin()}
            className="block w-full py-3 rounded-full text-center text-sm font-semibold border"
            style={{ color: '#7d6340', borderColor: '#7d6340', width: '100%' }}
          >
            ✍️ 生成套磁信（登录后使用）
          </button>
        )}
      </div>
    </div>
  );
}
