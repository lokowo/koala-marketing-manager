'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/AuthContext';
import ResearchProposalCard from '../components/ResearchProposalCard';
import RecommendationLetterCard from '../components/RecommendationLetterCard';
import AcademicCVCard from '../components/AcademicCVCard';
import { Plus, Loader2, FileText, MessageSquare, ChevronDown, X, Mail, GraduationCap, AlertCircle } from 'lucide-react';
import { MobilePageHeader } from '../components/MobilePageHeader';

interface SavedProfessor {
  professor_id: string;
  professors: {
    id: string;
    name: string;
    university: string;
  };
}

interface ProposalContent {
  title: string;
  background: string;
  research_questions: string;
  methodology: string;
  significance: string;
  timeline: string;
}

interface LetterContent {
  letter: string;
  cover_note: string;
  recommender?: {
    name: string;
    title?: string;
  };
}

interface CVContent {
  personal: { name?: string; email?: string; phone?: string; linkedin?: string };
  education?: Array<{ degree: string; university: string; gpa?: string; dates?: string; thesis?: string }>;
  research?: Array<{ title: string; lab?: string; supervisor?: string; period?: string; description?: string }>;
  publications?: Array<{ title: string; journal?: string; year?: number; authors?: string; doi?: string }>;
  skills?: { technical?: string[]; languages?: string[]; tools?: string[] };
  awards?: Array<{ title: string; organization?: string; year?: number }>;
  references?: Array<{ name: string; title?: string; university?: string; email?: string; relationship?: string }>;
}

interface GeneratedDocument {
  id: string;
  type: string;
  title: string;
  content: ProposalContent | LetterContent;
  status: 'draft' | 'final';
  professor_id: string | null;
  professor_name?: string;
  professor_university?: string;
  recommender_name?: string;
  recommender_title?: string;
  created_at: string;
  updated_at: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function MyDocumentsPage() {
  const { user, authLoading, showLogin } = useAuth();
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New document flow
  const [showNewDocFlow, setShowNewDocFlow] = useState(false);
  const [newDocType, setNewDocType] = useState<'research_proposal' | 'recommendation_letter' | 'cv' | null>(null);
  const [savedProfessors, setSavedProfessors] = useState<SavedProfessor[]>([]);
  const [loadingProfessors, setLoadingProfessors] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // CV completeness
  const [cvCompleteness, setCvCompleteness] = useState<{
    ready: boolean;
    completion_percentage: number;
    missing_required: string[];
    missing_recommended: string[];
    sections: Record<string, { status: string; data_count: number }>;
  } | null>(null);
  const [loadingCompleteness, setLoadingCompleteness] = useState(false);

  // Recommendation letter form
  const [recName, setRecName] = useState('');
  const [recTitle, setRecTitle] = useState('');
  const [recRelationship, setRecRelationship] = useState('');
  const [recProfessorId, setRecProfessorId] = useState('');

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/user/research-proposal/list');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocuments((data.documents ?? []).map((d: GeneratedDocument) => {
        if (d.type === 'recommendation_letter' && d.content) {
          const lc = d.content as LetterContent;
          return {
            ...d,
            recommender_name: d.recommender_name || lc.recommender?.name,
            recommender_title: d.recommender_title || lc.recommender?.title,
          };
        }
        return d;
      }));
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchDocuments();
    else setLoading(false);
  }, [user, fetchDocuments]);

  const fetchSavedProfessors = async () => {
    setLoadingProfessors(true);
    try {
      const res = await fetch('/api/user/saved-professors');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSavedProfessors(data.saved ?? []);
    } catch {
      setSavedProfessors([]);
    } finally {
      setLoadingProfessors(false);
    }
  };

  const handleNewDoc = () => {
    setShowNewDocFlow(true);
    setNewDocType(null);
    setGenerateError(null);
    setCvCompleteness(null);
    setRecName('');
    setRecTitle('');
    setRecRelationship('');
    setRecProfessorId('');
  };

  const handlePickType = async (type: 'research_proposal' | 'recommendation_letter' | 'cv') => {
    setNewDocType(type);
    setGenerateError(null);
    setCvCompleteness(null);
    if (type === 'research_proposal' || type === 'recommendation_letter') {
      fetchSavedProfessors();
    }
    if (type === 'cv') {
      setLoadingCompleteness(true);
      try {
        const res = await fetch('/api/user/cv/completeness');
        if (res.ok) {
          const data = await res.json();
          setCvCompleteness(data);
        }
      } catch { /* silent */ } finally {
        setLoadingCompleteness(false);
      }
    }
  };

  const [cvGenerating, setCvGenerating] = useState(false);

  const handleGenerateCV = async () => {
    setCvGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/user/cv/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error ?? '生成失败');
        return;
      }
      setShowNewDocFlow(false);
      setNewDocType(null);
      await fetchDocuments();
      setExpandedId(data.id);
    } catch {
      setGenerateError('网络错误，请重试');
    } finally {
      setCvGenerating(false);
    }
  };

  const handleGenerate = async (professorId: string) => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/user/research-proposal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professor_id: professorId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error ?? '生成失败');
        return;
      }
      setShowNewDocFlow(false);
      setNewDocType(null);
      await fetchDocuments();
      setExpandedId(data.id);
    } catch {
      setGenerateError('网络错误，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateLetter = async () => {
    if (!recName.trim()) { setGenerateError('请填写推荐人姓名'); return; }
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/user/recommendation-letter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommender_name: recName.trim(),
          recommender_title: recTitle.trim() || undefined,
          relationship: recRelationship.trim() || undefined,
          professor_id: recProfessorId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error ?? '生成失败');
        return;
      }
      setShowNewDocFlow(false);
      setNewDocType(null);
      await fetchDocuments();
      setExpandedId(data.id);
    } catch {
      setGenerateError('网络错误，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'draft' | 'final') => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    try {
      const res = await fetch(`/api/user/research-proposal/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      fetchDocuments();
    }
  };

  // Stats
  const total = documents.length;
  const drafts = documents.filter(d => d.status === 'draft').length;
  const finals = documents.filter(d => d.status === 'final').length;

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="text-5xl mb-4">📄</div>
        <h1 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">登录后查看文档</h1>
        <p className="text-sm mb-6 text-gray-500 dark:text-gray-400">
          登录后可以管理你的研究计划和申请文书
        </p>
        <button
          onClick={() => showLogin()}
          className="w-full max-w-xs py-3 rounded-full text-sm font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
        >
          登录 / 注册
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] pb-24">
      <MobilePageHeader title="我的文档" />
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-light text-gray-900 dark:text-gray-100 tracking-tight hidden lg:block">我的文档</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理你的研究计划、申请文书和学术 CV</p>
        </div>
        <button
          onClick={handleNewDoc}
          disabled={generating}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Plus size={14} /> 新建
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-4">
        {[
          { label: '总文档', value: total },
          { label: '草稿', value: drafts },
          { label: '定稿', value: finals },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-3 text-center">
            <p className="text-lg font-medium tabular-nums text-gray-900 dark:text-gray-100">{stat.value}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* New document flow */}
      {showNewDocFlow && (
        <div className="mx-4 mb-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/5">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {!newDocType ? '选择文档类型' : newDocType === 'research_proposal' ? '选择目标导师' : newDocType === 'cv' ? '生成学术 CV' : '推荐信信息'}
            </h3>
            <button onClick={() => { setShowNewDocFlow(false); setNewDocType(null); }} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={16} />
            </button>
          </div>

          {generateError && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
              {generateError}
            </div>
          )}

          {/* Type picker */}
          {!newDocType && (
            <div className="p-4 space-y-2">
              <button
                onClick={() => handlePickType('research_proposal')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors border border-gray-100 dark:border-white/5"
              >
                <FileText size={20} className="text-blue-500 dark:text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">研究计划</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">根据目标导师的研究方向生成研究计划</p>
                </div>
                <ChevronDown size={16} className="text-gray-400 dark:text-gray-500 shrink-0 -rotate-90" />
              </button>
              <button
                onClick={() => handlePickType('recommendation_letter')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors border border-gray-100 dark:border-white/5"
              >
                <Mail size={20} className="text-amber-500 dark:text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">推荐信指导</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">生成推荐信草稿与给推荐人的说明</p>
                </div>
                <ChevronDown size={16} className="text-gray-400 dark:text-gray-500 shrink-0 -rotate-90" />
              </button>
              <button
                onClick={() => handlePickType('cv')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors border border-gray-100 dark:border-white/5"
              >
                <GraduationCap size={20} className="text-green-500 dark:text-green-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">学术 CV</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">AI 润色生成专业学术简历</p>
                </div>
                <ChevronDown size={16} className="text-gray-400 dark:text-gray-500 shrink-0 -rotate-90" />
              </button>
            </div>
          )}

          {/* Research proposal: professor picker */}
          {newDocType === 'research_proposal' && (
            <div className="p-4">
              {loadingProfessors ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-gray-400 dark:text-gray-500" />
                </div>
              ) : savedProfessors.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">还没有收藏教授</p>
                  <Link
                    href="/koala/professors"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
                  >
                    去教授库收藏
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                    从你的收藏中选择一位教授，AI 将根据其研究方向生成研究计划
                  </p>
                  {savedProfessors.map(sp => (
                    <button
                      key={sp.professor_id}
                      onClick={() => handleGenerate(sp.professor_id)}
                      disabled={generating}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50 border border-gray-100 dark:border-white/5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {sp.professors.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {sp.professors.university}
                        </p>
                      </div>
                      {generating ? (
                        <Loader2 size={16} className="animate-spin text-gray-400 shrink-0" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400 dark:text-gray-500 shrink-0 -rotate-90" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recommendation letter: form */}
          {newDocType === 'recommendation_letter' && (
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">推荐人姓名 *</label>
                <input
                  value={recName}
                  onChange={e => setRecName(e.target.value)}
                  placeholder="e.g. Prof. John Smith"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">推荐人职称</label>
                <input
                  value={recTitle}
                  onChange={e => setRecTitle(e.target.value)}
                  placeholder="e.g. Associate Professor, School of Computing"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">与你的关系</label>
                <input
                  value={recRelationship}
                  onChange={e => setRecRelationship(e.target.value)}
                  placeholder="e.g. 本科毕业论文导师 / 实习主管"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>
              {!loadingProfessors && savedProfessors.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">目标教授（可选）</label>
                  <select
                    value={recProfessorId}
                    onChange={e => setRecProfessorId(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 dark:focus:border-blue-400"
                  >
                    <option value="">不指定</option>
                    {savedProfessors.map(sp => (
                      <option key={sp.professor_id} value={sp.professor_id}>
                        {sp.professors.name} — {sp.professors.university}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={handleGenerateLetter}
                disabled={generating || !recName.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
              >
                {generating ? (
                  <><Loader2 size={14} className="animate-spin" /> 生成中...</>
                ) : (
                  '生成推荐信指导'
                )}
              </button>
            </div>
          )}

          {/* CV generation */}
          {newDocType === 'cv' && (
            <div className="p-4 space-y-3">
              {loadingCompleteness ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-gray-400 dark:text-gray-500" />
                </div>
              ) : cvCompleteness && cvCompleteness.completion_percentage < 60 ? (
                /* Low completeness — guide user to Ola */
                <div className="space-y-3">
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10">
                    <AlertCircle size={16} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">学术资料还不够完整</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        当前完整度 {cvCompleteness.completion_percentage}%，建议先补全以下信息，生成的 CV 质量更高
                      </p>
                    </div>
                  </div>
                  {/* Missing sections */}
                  <div className="space-y-1.5">
                    {[...cvCompleteness.missing_required, ...cvCompleteness.missing_recommended].map(key => {
                      const labels: Record<string, string> = {
                        personal: '个人信息',
                        education: '教育背景',
                        research: '研究经历',
                        work: '工作/实习经历',
                        publications: '论文发表',
                        skills: '技能特长',
                      };
                      const prompts: Record<string, string> = {
                        personal: '我想补全CV中的个人信息部分，请帮我整理',
                        education: '我想补全CV中的教育背景部分，请帮我整理',
                        research: '我想补全CV中的研究经历部分，请帮我整理',
                        work: '我想补全CV中的工作经历部分，请帮我整理',
                        publications: '我想补全CV中的论文发表部分，请帮我整理',
                        skills: '我想补全CV中的技能特长部分，请帮我整理',
                      };
                      const isRequired = cvCompleteness.missing_required.includes(key);
                      return (
                        <Link
                          key={key}
                          href={`/koala/chat?mode=rp&msg=${encodeURIComponent(prompts[key] ?? '')}`}
                          className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors no-underline"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {labels[key] ?? key}
                            {isRequired && <span className="ml-1.5 text-[10px] text-red-500 dark:text-red-400 font-medium">必填</span>}
                          </span>
                          <span className="text-xs text-blue-500 dark:text-blue-400 font-medium shrink-0">去补全 →</span>
                        </Link>
                      );
                    })}
                  </div>
                  {/* Still allow generating with low completeness */}
                  <button
                    onClick={handleGenerateCV}
                    disabled={cvGenerating}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50 min-h-[40px]"
                  >
                    {cvGenerating ? (
                      <><Loader2 size={13} className="animate-spin" /> 生成中...</>
                    ) : (
                      '仍然生成（内容可能不完整）'
                    )}
                  </button>
                </div>
              ) : (
                /* Sufficient completeness — normal generate flow */
                <div className="space-y-3">
                  {cvCompleteness && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">资料完整度</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{cvCompleteness.completion_percentage}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500 dark:bg-green-400 transition-all"
                          style={{ width: `${cvCompleteness.completion_percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    AI 将根据你的个人资料和教育/工作经历自动生成专业学术 CV。生成后可编辑各分段内容。
                  </p>
                  <button
                    onClick={handleGenerateCV}
                    disabled={cvGenerating}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
                  >
                    {cvGenerating ? (
                      <><Loader2 size={14} className="animate-spin" /> 生成中...</>
                    ) : (
                      '生成学术 CV'
                    )}
                  </button>
                  {/* Show missing recommended sections as suggestions */}
                  {cvCompleteness && cvCompleteness.missing_recommended.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5">想让 CV 更完整？补全以下板块：</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cvCompleteness.missing_recommended.map(key => {
                          const labels: Record<string, string> = {
                            research: '研究经历',
                            work: '工作经历',
                            publications: '论文',
                            skills: '技能',
                          };
                          return (
                            <Link
                              key={key}
                              href={`/koala/chat?mode=rp&msg=${encodeURIComponent(`我想补全CV中的${labels[key] ?? key}部分，请帮我整理`)}`}
                              className="inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-full border border-gray-200 dark:border-white/10 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors no-underline"
                            >
                              + {labels[key] ?? key}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(generating || cvGenerating) && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs">
                <Loader2 size={14} className="animate-spin" />
                {newDocType === 'cv' ? '正在生成学术 CV，约需 20-30 秒...' : newDocType === 'recommendation_letter' ? '正在生成推荐信指导，约需 20-30 秒...' : '正在生成研究计划，约需 30-60 秒...'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document list */}
      <div className="mx-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 && !showNewDocFlow ? (
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">还没有文档</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                收藏一位教授后，就可以生成针对性的研究计划
              </p>
              <Link
                href="/koala/chat"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-full no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] min-h-[44px]"
              >
                <MessageSquare size={16} />
                和 Ola 聊天
              </Link>
            </div>
          </div>
        ) : (
          documents.map(doc => (
            <div key={doc.id}>
              {/* Collapsed row */}
              {expandedId !== doc.id && (
                <button
                  onClick={() => setExpandedId(doc.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-left hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                >
                  {doc.type === 'recommendation_letter'
                    ? <Mail size={18} className="text-amber-500 dark:text-amber-400 shrink-0" />
                    : doc.type === 'cv'
                    ? <GraduationCap size={18} className="text-green-500 dark:text-green-400 shrink-0" />
                    : <FileText size={18} className="text-gray-400 dark:text-gray-500 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {doc.type === 'recommendation_letter'
                        ? `推荐信 — ${doc.recommender_name || (doc.title?.replace('推荐信 — ', '') || '未命名')}`
                        : doc.type === 'cv'
                        ? doc.title || '学术 CV'
                        : doc.title || ('title' in (doc.content ?? {}) ? (doc.content as ProposalContent).title : null) || '未命名文档'
                      }
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {doc.type === 'recommendation_letter'
                        ? `${doc.recommender_title ? doc.recommender_title + ' · ' : ''}${formatDate(doc.created_at)}`
                        : doc.type === 'cv'
                        ? formatDate(doc.created_at)
                        : `${doc.professor_name ? doc.professor_name + ' · ' : ''}${formatDate(doc.created_at)}`
                      }
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                    doc.status === 'final'
                      ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400'
                  }`}>
                    {doc.status === 'final' ? '定稿' : '草稿'}
                  </span>
                </button>
              )}

              {/* Expanded card */}
              {expandedId === doc.id && (
                <div>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mb-2 flex items-center gap-1"
                  >
                    收起
                  </button>
                  {doc.type === 'recommendation_letter' ? (
                    <RecommendationLetterCard
                      id={doc.id}
                      content={doc.content as LetterContent}
                      recommenderName={doc.recommender_name || doc.title?.replace('推荐信 — ', '') || '推荐人'}
                      recommenderTitle={doc.recommender_title}
                      status={doc.status}
                      onStatusChange={handleStatusChange}
                    />
                  ) : doc.type === 'cv' ? (
                    <AcademicCVCard
                      id={doc.id}
                      content={doc.content as unknown as CVContent}
                      status={doc.status}
                      onStatusChange={handleStatusChange}
                    />
                  ) : (
                    <ResearchProposalCard
                      id={doc.id}
                      proposal={doc.content as ProposalContent}
                      professorId={doc.professor_id ?? undefined}
                      professorName={doc.professor_name}
                      professorUniversity={doc.professor_university}
                      status={doc.status}
                      createdAt={doc.created_at}
                      onStatusChange={handleStatusChange}
                      onRegenerate={profId => handleGenerate(profId)}
                    />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
