'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ShareLink {
  id: string;
  label?: string;
  sales_code: string;
  qr_image_url?: string;
  scan_count: number;
  response_count: number;
}

interface Survey {
  id: string;
  title: string;
  status: string;
}

export default function SurveySharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/me').then(r => r.json()),
      fetch(`/api/surveys/${id}`).then(r => r.ok ? r.json() : null),
    ]).then(([me, surveyData]) => {
      setUserRole(me.role || '');
      setSurvey(surveyData);
      if (me.role === 'sales' && surveyData) {
        fetchLinks();
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, [id]);

  async function fetchLinks() {
    const res = await fetch(`/api/surveys/${id}/share-link`);
    if (res.ok) {
      const data = await res.json();
      setLinks(data.links || []);
    }
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    const res = await fetch(`/api/surveys/${id}/share-link`, { method: 'POST' });
    if (res.ok) {
      await fetchLinks();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || '生成失败');
    }
    setGenerating(false);
  }

  async function handleCopy(code: string) {
    const url = `${window.location.origin}/s/${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-400 text-sm">加载中...</div>;
  }

  if (!survey) {
    return <div className="text-center py-20 text-slate-500">问卷不存在</div>;
  }

  if (userRole !== 'sales') {
    return (
      <div className="space-y-5">
        <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-600">&larr; 返回</button>
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">此功能仅限销售人员</h2>
          <p className="text-sm text-slate-500">问卷推广码需由销售人员生成，以追踪推广来源和客户归属。</p>
        </div>
      </div>
    );
  }

  if (survey.status !== 'active') {
    return (
      <div className="space-y-5">
        <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-600">&larr; 返回</button>
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">问卷尚未发布</h2>
          <p className="text-sm text-slate-500">只有已发布的问卷才能生成推广码。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/koala/surveys')} className="text-sm text-slate-400 hover:text-slate-600">&larr; 返回</button>
          <h1 className="text-lg font-bold text-slate-800">问卷推广</h1>
          <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-600">进行中</span>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-medium text-slate-700">{survey.title}</h3>
      </div>

      {links.length > 0 ? (
        <div className="space-y-4">
          {links.map(link => {
            const qrUrl = `${window.location.origin}/s/${link.sales_code}`;
            const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`;
            return (
              <div key={link.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-5">
                  <img
                    src={link.qr_image_url || fallbackQr}
                    alt="QR Code"
                    width={200}
                    height={200}
                    className="rounded-lg border border-slate-200 bg-white flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">{link.label || '我的推广码'}</p>
                      <p className="text-xs text-slate-400 font-mono break-all">{qrUrl}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(link.sales_code)}
                      className="px-4 py-1.5 rounded-lg text-sm text-white transition-colors"
                      style={{ backgroundColor: copied === link.sales_code ? '#22c55e' : '#D4A843' }}
                    >
                      {copied === link.sales_code ? '已复制 ✓' : '复制链接'}
                    </button>
                    <div className="flex gap-6 text-sm pt-2">
                      <div>
                        <span className="text-slate-400">扫码</span>
                        <span className="ml-1.5 font-bold text-slate-700">{link.scan_count}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">提交</span>
                        <span className="ml-1.5 font-bold text-slate-700">{link.response_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <div className="text-4xl mb-3">📱</div>
          <p className="text-sm text-slate-500 mb-4">生成专属推广二维码，追踪您的推广效果</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#D4A843' }}
          >
            {generating ? '生成中...' : '生成我的推广二维码'}
          </button>
        </div>
      )}

      <div className="text-xs text-slate-400 bg-slate-50 border border-slate-100 p-3 rounded-lg">
        💡 每个推广码追踪独立数据。扫码后客户将看到问卷页面，完成填写后自动记录到您的推广统计中。
      </div>

      <div className="flex gap-3">
        <Link
          href={`/dashboard/koala/surveys/responses?survey_id=${id}`}
          className="px-4 py-2 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 no-underline"
        >
          查看回复详情
        </Link>
      </div>
    </div>
  );
}
