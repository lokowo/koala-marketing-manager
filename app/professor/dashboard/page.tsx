'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  User,
  Users,
  FileText,
  GraduationCap,
  ThumbsUp,
  X,
  Eye,
  Heart,
  Clock,
  AlertCircle,
  BookOpen,
  Loader2,
  Megaphone,
  Sparkles,
  Plus,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

interface MatchedStudent {
  id: string;
  display_name: string;
  university: string | null;
  major: string | null;
  degree_level: string | null;
  research_interests: string[] | null;
  gpa: number | null;
  has_publications: boolean | null;
  publication_details: string | null;
  target_field: string | null;
  match_score: number;
  match_reason: string;
}

interface JobPosting {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  deadline: string | null;
  status: 'active' | 'closed';
  created_at: string;
}

type TabKey = 'recommendations' | 'profile' | 'postings';

export default function ProfessorDashboardPage() {
  const [professor, setProfessor] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [tab, setTab] = useState<TabKey>('recommendations');

  // Recommendation state
  const [students, setStudents] = useState<MatchedStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState({ viewed: 0, interested: 0 });
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  // Check professor auth
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
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Load recommendations and stats
  const loadData = useCallback(async () => {
    if (!verified) return;
    setStudentsLoading(true);

    const [studentsRes, statsRes] = await Promise.all([
      fetch('/api/professor/recommended-students').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/professor/feedback').then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    if (studentsRes?.students) setStudents(studentsRes.students);
    if (statsRes) setFeedbackStats({ viewed: statsRes.viewed ?? 0, interested: statsRes.interested ?? 0 });
    setStudentsLoading(false);
  }, [verified]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle feedback action
  async function handleFeedback(studentId: string, action: 'interested' | 'not_suitable') {
    setDismissing(prev => new Set(prev).add(studentId));

    try {
      const res = await fetch('/api/professor/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentProfileId: studentId, action }),
      });
      if (res.ok) {
        // Animate out then remove
        setTimeout(() => {
          setStudents(prev => prev.filter(s => s.id !== studentId));
          setDismissing(prev => {
            const next = new Set(prev);
            next.delete(studentId);
            return next;
          });
          setFeedbackStats(prev => ({
            viewed: prev.viewed + 1,
            interested: action === 'interested' ? prev.interested + 1 : prev.interested,
          }));
        }, 300);
      } else {
        setDismissing(prev => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
      }
    } catch {
      setDismissing(prev => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  // Not verified
  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center">
          <div className="size-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
            <GraduationCap className="size-8 text-blue-600" />
          </div>
          <h1 className="text-lg font-light text-gray-900 mb-2">教授身份验证</h1>
          <p className="text-sm text-gray-500 mb-6">
            您尚未完成教授身份验证。请先通过大学邮箱完成验证，即可查看学生推荐。
          </p>
          <Link
            href="/koala/professor-portal"
            className="inline-block px-6 py-2.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors no-underline"
          >
            前往验证
          </Link>
        </div>
      </div>
    );
  }

  const profInitial = (professor?.name || 'P')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-6">
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-medium flex-shrink-0">
              {profInitial}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-light text-gray-900">{professor?.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {professor?.position_title || professor?.title}
                {professor?.university ? ` · ${professor.university}` : ''}
                {professor?.faculty ? ` · ${professor.faculty}` : ''}
              </p>
              {professor?.research_areas && professor.research_areas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {professor.research_areas.slice(0, 5).map((area: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mt-4">
          <button
            onClick={() => setTab('recommendations')}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center',
              tab === 'recommendations'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <Users className="size-4" />
            学生推荐
          </button>
          <button
            onClick={() => setTab('postings')}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center',
              tab === 'postings'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <Megaphone className="size-4" />
            招生帖
          </button>
          <button
            onClick={() => setTab('profile')}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center',
              tab === 'profile'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <User className="size-4" />
            我的档案
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {tab === 'recommendations' && (
            <RecommendationsTab
              students={students}
              loading={studentsLoading}
              stats={feedbackStats}
              dismissing={dismissing}
              onFeedback={handleFeedback}
            />
          )}

          {tab === 'postings' && (
            <PostingsTab professorId={professor?.id} />
          )}

          {tab === 'profile' && (
            <ProfileTab professor={professor} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Recommendations Tab ─── */

function RecommendationsTab({
  students,
  loading,
  stats,
  dismissing,
  onFeedback,
}: {
  students: MatchedStudent[];
  loading: boolean;
  stats: { viewed: number; interested: number };
  dismissing: Set<string>;
  onFeedback: (id: string, action: 'interested' | 'not_suitable') => void;
}) {
  return (
    <>
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
            <Eye className="size-3.5" />
            <span className="text-xs">已查看</span>
          </div>
          <div className="text-2xl font-light text-gray-900">{stats.viewed}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
            <Heart className="size-3.5" />
            <span className="text-xs">感兴趣</span>
          </div>
          <div className="text-2xl font-light text-green-600">{stats.interested}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
            <Clock className="size-3.5" />
            <span className="text-xs">待查看</span>
          </div>
          <div className="text-2xl font-light text-blue-600">{students.length}</div>
        </div>
      </div>

      {/* Student Cards */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <Loader2 className="size-6 animate-spin mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-400">正在匹配学生...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <div className="text-5xl mb-3">🐨</div>
          <p className="text-sm text-gray-500">暂无新的学生推荐</p>
          <p className="text-xs text-gray-400 mt-1">有新的匹配学生时，会在这里显示</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              isDismissing={dismissing.has(student.id)}
              onFeedback={onFeedback}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Student Card ─── */

function StudentCard({
  student,
  isDismissing,
  onFeedback,
}: {
  student: MatchedStudent;
  isDismissing: boolean;
  onFeedback: (id: string, action: 'interested' | 'not_suitable') => void;
}) {
  const badgeConfig = student.match_score > 85
    ? { label: '强烈推荐', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' }
    : student.match_score > 70
    ? { label: '值得关注', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
    : { label: `${student.match_score}%`, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };

  return (
    <div
      className={[
        'bg-white rounded-lg border border-gray-200 shadow-sm p-5 relative transition-all duration-300',
        isDismissing ? 'opacity-0 translate-x-8 scale-95' : 'opacity-100',
      ].join(' ')}
    >
      {/* Match Badge */}
      <div className="absolute top-4 right-4">
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${badgeConfig.bg} ${badgeConfig.text} border ${badgeConfig.border}`}>
          {badgeConfig.label}
        </span>
      </div>

      {/* Student Info */}
      <div className="pr-24">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="size-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">{student.display_name}</span>
        </div>
        <p className="text-xs text-gray-500 ml-6">
          {[student.university, student.major, student.degree_level].filter(Boolean).join(' / ')}
        </p>
      </div>

      {/* Research Interests */}
      {student.research_interests && student.research_interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {student.research_interests.slice(0, 5).map((interest, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded"
            >
              {interest}
            </span>
          ))}
        </div>
      )}

      {/* Target field */}
      {student.target_field && (
        <div className="mt-2 flex items-center gap-1.5">
          <BookOpen className="size-3 text-gray-400" />
          <span className="text-xs text-gray-500">目标方向: {student.target_field}</span>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
        {student.gpa != null && (
          <span>GPA: {student.gpa}</span>
        )}
        {student.has_publications && (
          <span className="flex items-center gap-0.5">
            <FileText className="size-3" />
            有发表论文
          </span>
        )}
      </div>

      {/* Match Reason */}
      <p className="text-xs text-gray-500 mt-3 leading-relaxed border-t border-gray-100 pt-3">
        {student.match_reason}
      </p>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onFeedback(student.id, 'interested')}
          disabled={isDismissing}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          <ThumbsUp className="size-3.5" />
          感兴趣
        </button>
        <button
          onClick={() => onFeedback(student.id, 'not_suitable')}
          disabled={isDismissing}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <X className="size-3.5" />
          不合适
        </button>
      </div>
    </div>
  );
}

/* ─── Postings Tab ─── */

function PostingsTab({ professorId }: { professorId?: string }) {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [deadline, setDeadline] = useState('');

  const loadPostings = useCallback(async () => {
    try {
      const res = await fetch('/api/professor/job-posting');
      if (res.ok) {
        const data = await res.json();
        setPostings(data.postings ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadPostings(); }, [loadPostings]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setRequirements('');
    setDeadline('');
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(posting: JobPosting) {
    setTitle(posting.title);
    setDescription(posting.description);
    setRequirements(posting.requirements ?? '');
    setDeadline(posting.deadline ?? '');
    setEditingId(posting.id);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { title: title.trim(), description: description.trim() };
      if (requirements.trim()) body.requirements = requirements.trim();
      if (deadline) body.deadline = deadline;
      if (editingId) body.id = editingId;

      const res = await fetch('/api/professor/job-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        resetForm();
        await loadPostings();
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function toggleStatus(id: string, newStatus: 'active' | 'closed') {
    try {
      const res = await fetch('/api/professor/job-posting', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) await loadPostings();
    } catch { /* ignore */ }
  }

  async function handlePolish() {
    if (!description.trim()) return;
    setPolishing(true);
    try {
      const res = await fetch('/api/professor/ai-polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description, targetLang: 'both' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.polished_en) {
          setDescription(data.polished_en);
        }
      }
    } catch { /* ignore */ }
    setPolishing(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
        <Loader2 className="size-6 animate-spin mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-400">加载招生帖...</p>
      </div>
    );
  }

  return (
    <>
      {/* New Posting Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          <Plus className="size-4" />
          发布新招生帖
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            {editingId ? '编辑招生帖' : '发布新招生帖'}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">标题 *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="如：招收 2026 年 PhD 学生 — 机器学习方向"
                maxLength={200}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block text-right">{title.length}/200</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-500">描述 *</label>
                <button
                  onClick={handlePolish}
                  disabled={polishing || !description.trim()}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="size-3" />
                  {polishing ? 'AI 润色中...' : 'AI 润色'}
                </button>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="描述研究方向、项目内容、奖学金信息等"
                rows={4}
                maxLength={2000}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block text-right">{description.length}/2000</span>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">要求（选填）</label>
              <textarea
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder="如：GPA 3.5+, 有机器学习相关研究经验"
                rows={2}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">截止日期（选填）</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSubmit}
              disabled={saving || !title.trim() || !description.trim()}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
              {editingId ? '保存修改' : '发布'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Postings List */}
      {postings.length === 0 && !showForm ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <Megaphone className="size-8 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">还没有发布招生帖</p>
          <p className="text-xs text-gray-400 mt-1">发布招生帖后，感兴趣的学生可以看到您的招生信息</p>
        </div>
      ) : (
        <div className="space-y-3">
          {postings.map(posting => (
            <div key={posting.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{posting.title}</h4>
                    <span className={`shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      posting.status === 'active'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-50 text-gray-500 border border-gray-200'
                    }`}>
                      {posting.status === 'active' ? '活跃' : '已关闭'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-line">{posting.description}</p>
                  {posting.requirements && (
                    <p className="text-xs text-gray-400 mt-1.5">要求: {posting.requirements}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                    {posting.deadline && (
                      <span className="flex items-center gap-0.5">
                        <Calendar className="size-3" />
                        截止 {posting.deadline}
                      </span>
                    )}
                    <span>
                      发布于 {new Date(posting.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => startEdit(posting)}
                  className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => toggleStatus(posting.id, posting.status === 'active' ? 'closed' : 'active')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors ${
                    posting.status === 'active'
                      ? 'text-red-600 bg-red-50 hover:bg-red-100'
                      : 'text-green-600 bg-green-50 hover:bg-green-100'
                  }`}
                >
                  {posting.status === 'active' ? (
                    <><XCircle className="size-3" /> 关闭</>
                  ) : (
                    <><CheckCircle className="size-3" /> 重新开放</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Profile Tab ─── */

function ProfileTab({ professor }: { professor: AnyObj | null }) {
  if (!professor) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-light text-gray-900">我的档案</h2>
        <Link
          href="/koala/professor-portal"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors no-underline"
        >
          查看/编辑档案
        </Link>
      </div>

      <div className="space-y-3">
        <ProfileRow label="姓名" value={professor.name} />
        <ProfileRow label="职位" value={professor.position_title || professor.title} />
        <ProfileRow label="大学" value={professor.university} />
        {professor.faculty && <ProfileRow label="学院" value={professor.faculty} />}
        {professor.email && <ProfileRow label="邮箱" value={professor.email} />}
        {professor.h_index != null && <ProfileRow label="H-index" value={String(professor.h_index)} />}
        {professor.research_areas && professor.research_areas.length > 0 && (
          <div className="flex items-start gap-3 py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500 w-20 flex-shrink-0">研究方向</span>
            <div className="flex flex-wrap gap-1.5">
              {professor.research_areas.map((area: string, i: number) => (
                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded">
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="size-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-800 font-medium">档案信息来源</p>
            <p className="text-xs text-blue-600 mt-0.5">
              您的档案信息来自公开学术数据源（ARC Portal、Semantic Scholar、大学官网）。如有不准确之处，请在教授门户中提交修改申请。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50">
      <span className="text-sm text-gray-500 w-20 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}
