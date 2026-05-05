'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Users, Mail, FileText, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const TABS = [
  { key: 'students', label: '感兴趣的学生', icon: Users },
  { key: 'letters', label: '收到的申请信', icon: Mail },
  { key: 'publications', label: '论文 & 经费', icon: BookOpen },
  { key: 'articles', label: '推荐文章', icon: FileText },
] as const;
type TabKey = typeof TABS[number]['key'];

export default function ProfessorPortalPage() {
  const router = useRouter();
  const [professor, setProfessor] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [tab, setTab] = useState<TabKey>('students');

  const [students, setStudents] = useState<AnyObj[]>([]);
  const [letters, setLetters] = useState<AnyObj[]>([]);
  const [papers, setPapers] = useState<AnyObj[]>([]);
  const [grants, setGrants] = useState<AnyObj[]>([]);
  const [articles, setArticles] = useState<AnyObj[]>([]);

  const [recruiting, setRecruiting] = useState(false);
  const [recruitForm, setRecruitForm] = useState({ research_topic: '', required_background: '', scholarship_info: '', deadline: '' });

  useEffect(() => {
    fetch('/api/professor-portal/me')
      .then(r => {
        if (!r.ok) { setLoading(false); return null; }
        return r.json();
      })
      .then(d => {
        if (d?.professor) {
          setProfessor(d.professor);
          setVerified(true);
          setStudents(d.students || []);
          setLetters(d.letters || []);
          setPapers(d.papers || []);
          setGrants(d.grants || []);
          setArticles(d.articles || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <p className="text-sm text-slate-400">加载中...</p>
      </div>
    );
  }

  if (!verified) {
    return <VerifyPage onVerified={() => router.refresh()} />;
  }

  const stats = [
    { label: '关注我的学生', value: students.length },
    { label: '收到申请信', value: letters.length },
    { label: '资料被浏览', value: professor?.profile_views ?? 0 },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: '#f8fafc' }}>
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mt-6">
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {(professor?.name || 'P')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-slate-900">{professor?.name}</h1>
              <p className="text-sm text-slate-500">
                {professor?.position_title || professor?.title} · {professor?.university}
                {professor?.faculty ? ` · ${professor.faculty}` : ''}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {professor?.h_index && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">H-index: {professor.h_index}</span>}
                {professor?.citation_count && <span className="text-xs text-slate-400">{professor.citation_count.toLocaleString()} 引用</span>}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            <a href="#" className="text-blue-500 no-underline">信息有误？申请修改</a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mt-4 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
                style={active
                  ? { background: '#fff', color: '#0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                  : { color: '#64748b' }}
              >
                <Icon className="size-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {tab === 'students' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {students.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-300">暂无感兴趣的学生</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {students.map((s, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <span className="text-sm text-slate-700">{s.research_interests || '未知研究方向'}</span>
                        {s.gpa && <span className="text-xs text-slate-400 ml-2">GPA: {s.gpa}</span>}
                        {s.match_score && <span className="text-xs text-emerald-600 ml-2">{s.match_score}% 匹配</span>}
                      </div>
                      <button className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                        发送橄榄枝
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'letters' && (
            <div className="space-y-2">
              {letters.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-300">暂无申请信</div>
              ) : (
                letters.map((l, i) => <LetterCard key={i} letter={l} />)
              )}
            </div>
          )}

          {tab === 'publications' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">论文 ({papers.length})</div>
                {papers.length === 0 ? (
                  <p className="p-4 text-sm text-slate-300">暂无论文记录</p>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {papers.map((p, i) => (
                      <div key={i} className="px-4 py-3">
                        <p className="text-sm text-slate-800">{p.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{p.journal}{p.year ? ` · ${p.year}` : ''} · {p.citation_count ?? 0} 引用</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">经费 ({grants.length})</div>
                {grants.length === 0 ? (
                  <p className="p-4 text-sm text-slate-300">暂无经费记录</p>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {grants.map((g, i) => (
                      <div key={i} className="px-4 py-3">
                        <p className="text-sm text-slate-800">{g.title || g.grant_title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{g.funding_body} · {g.amount ? `$${Number(g.amount).toLocaleString()}` : ''}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'articles' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {articles.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-300">暂无推荐文章</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {articles.map((a, i) => (
                    <Link key={i} href={`/koala/blog/${a.id}`} className="block px-4 py-3 hover:bg-slate-50 no-underline">
                      <p className="text-sm text-slate-800">{a.title_zh || a.title_en}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{a.category} · {new Date(a.published_at || a.created_at).toLocaleDateString('zh-CN')}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recruit CTA */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">发布招生信息</h3>
            <button
              onClick={() => setRecruiting(v => !v)}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              {recruiting ? '收起' : '发布新招生'}
            </button>
          </div>
          {recruiting && (
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <input type="text" placeholder="研究方向" value={recruitForm.research_topic}
                onChange={e => setRecruitForm(p => ({ ...p, research_topic: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input type="text" placeholder="要求的背景" value={recruitForm.required_background}
                onChange={e => setRecruitForm(p => ({ ...p, required_background: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input type="text" placeholder="奖学金情况" value={recruitForm.scholarship_info}
                onChange={e => setRecruitForm(p => ({ ...p, scholarship_info: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input type="date" placeholder="截止日期" value={recruitForm.deadline}
                onChange={e => setRecruitForm(p => ({ ...p, deadline: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <button
                onClick={async () => {
                  await fetch('/api/professor-portal/recruit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...recruitForm, professor_id: professor?.id }),
                  });
                  setRecruiting(false);
                  alert('招生信息已发布');
                }}
                className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                发布
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VerifyPage({ onVerified }: { onVerified: () => void }) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/professor-portal/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_code', email }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || '发送失败'); return; }
      setStep('code');
    } catch { setError('网络错误'); }
    setLoading(false);
  }

  async function verifyCode() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/professor-portal/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, code }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || '验证失败'); return; }
      onVerified();
    } catch { setError('网络错误'); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🎓</div>
          <h1 className="text-lg font-bold text-slate-900">教授端验证</h1>
          <p className="text-sm text-slate-500 mt-1">请使用您的大学邮箱验证身份</p>
        </div>

        {step === 'email' ? (
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your.name@university.edu.au"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
            />
            <button
              onClick={sendCode}
              disabled={loading || !email}
              className="w-full py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '发送中...' : '发送验证码'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 text-center">验证码已发送至 {email}</p>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="6位验证码"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-center tracking-widest"
              maxLength={6}
            />
            <button
              onClick={verifyCode}
              disabled={loading || code.length < 6}
              className="w-full py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '验证中...' : '验证'}
            </button>
            <button onClick={() => setStep('email')} className="w-full text-xs text-slate-400">
              返回
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-500">
            <AlertCircle className="size-3.5" /> {error}
          </div>
        )}
      </div>
    </div>
  );
}

function LetterCard({ letter }: { letter: AnyObj }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800">{letter.subject_line || '申请信'}</p>
          <p className="text-xs text-slate-400 mt-0.5">{letter.created_at ? new Date(letter.created_at).toLocaleDateString('zh-CN') : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {letter.status && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{letter.status}</span>}
          {open ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{letter.email_body || '无内容'}</pre>
          <div className="flex gap-2 mt-3">
            <button className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700">✅ 感兴趣</button>
            <button className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600">❌ 不合适</button>
            <button className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500">稍后再看</button>
          </div>
        </div>
      )}
    </div>
  );
}
