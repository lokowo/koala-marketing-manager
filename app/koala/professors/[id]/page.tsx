'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Professor } from '../../../lib/types';
import { OPPORTUNITY_LABELS } from '../../../lib/constants';

export default function ProfessorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/professors/${id}`)
      .then(r => r.json())
      .then(d => setProfessor(d.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
      {/* Back */}
      <div className="px-4 pt-4">
        <button
          onClick={() => router.back()}
          className="text-xs flex items-center gap-1"
          style={{ color: '#7d6340' }}
        >
          ← 返回
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

      {/* CTA */}
      <div className="mx-4 mt-4 space-y-2">
        <Link
          href={`/koala/chat?mode=research&professor=${id}`}
          className="block w-full py-3 rounded-full text-center text-sm font-semibold text-white"
          style={{ background: '#7d6340' }}
        >
          🐨 问 Koala 关于这位教授
        </Link>
        <Link
          href={`/koala/chat?mode=write&professor=${id}`}
          className="block w-full py-3 rounded-full text-center text-sm font-semibold border"
          style={{ color: '#7d6340', borderColor: '#7d6340' }}
        >
          ✍️ 生成套磁信 (AUD 1)
        </Link>
      </div>
    </div>
  );
}
