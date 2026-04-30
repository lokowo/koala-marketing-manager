'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, Plus, Send, Sparkles, PawPrint } from 'lucide-react';
import Link from 'next/link';
import type { AIMode } from '../../lib/constants';
import type { ProfessorMatch, ScoreCard } from '../../lib/types';
import { ExtendedReadingPanel } from '../components/ai/ExtendedReadingPanel';
import type { PaperData } from '../components/ai/PaperCitationCard';
import { EmailPackage } from '../components/outreach/EmailPackage';
import { AchievementBadge } from '../components/ai/AchievementBadge';
import { MiniStats } from '../components/ai/MiniStats';
import { ConfidenceBadge, type ConfidenceLevel } from '../components/ai/ConfidenceBadge';
import { DontKnowResponse } from '../components/ai/DontKnowResponse';
import { KoalaAvatar, UserAvatar } from '../components/KoalaAvatar';

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackRating = 'helpful' | 'partial' | 'unhelpful' | 'correction';
type TonePref = 'casual' | 'professional' | 'direct';
type LangPref = 'zh' | 'en' | 'mixed';

interface EmailPackageData {
  subjectLine: string;
  emailBody: string;
  followupBody?: string;
  riskNote?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  quickReplies?: string[];
  citations?: PaperData[];
  academicSearch?: { sources: string[]; totalFound: number; queries: string[] };
  matchedProfessors?: ProfessorMatch[];
  scoreCard?: ScoreCard;
  confidence?: ConfidenceLevel;
  feedback?: FeedbackRating;
  emailPackage?: EmailPackageData;
  suggestConsultation?: boolean;
  noResults?: boolean;
  timestamp: Date;
}

// ─── Mode config ──────────────────────────────────────────────────────────────

const MODES: {
  key: AIMode;
  label: string;
  icon: React.ReactNode;
  desc: string;
  placeholder: string;
  welcome: string;
  initialReplies?: string[];
}[] = [
  {
    key: 'path',
    label: '🧭 申请规划',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round"/></svg>,
    desc: '评估竞争力 · 规划申请时间线',
    placeholder: '告诉我你的专业背景和目标……',
    welcome: '我来帮你评估澳洲 PhD 申请的可行性。\n\n告诉我你的专业背景和目标，我帮你：\n• 评估申请竞争力\n• 规划申请时间线\n• 推荐最适合的学校和导师',
    initialReplies: ['本科985/211', '双非背景', '已有硕士', '转专业'],
  },
  {
    key: 'research',
    label: '🔬 科研助手',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2h-3" strokeLinecap="round"/><path d="M9 3a3 3 0 006 0M9 3h6" strokeLinecap="round"/><circle cx="12" cy="14" r="3"/><path d="M12 17v2" strokeLinecap="round"/></svg>,
    desc: '搜文献 · 解读论文 · 梳理方向',
    placeholder: '把你的问题或论文链接发给我……',
    welcome: '我可以帮你搜索文献、解读论文、梳理研究方向 🔬\n\n把你的问题或论文链接发给我，我来帮你分析。',
    initialReplies: ['帮我搜文献', '解读一篇论文', '梳理研究方向', '写文献综述'],
  },
  {
    key: 'chat',
    label: '💬 自由聊天',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    desc: '有问必答 · 不焦虑',
    placeholder: '有任何关于澳洲读博的问题都可以问……',
    welcome: '有任何关于澳洲读博的问题都可以问我！💬',
    initialReplies: ['奖学金问题', '签证问题', '生活费预算', '读博时间线'],
  },
  {
    key: 'write',
    label: '✉️ 写套磁信',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9" strokeLinecap="round"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    desc: '定制套磁信 · SOP · 研究计划',
    placeholder: '给我一位教授的名字，我帮你写套磁信……',
    welcome: '给我一位教授的名字或链接，我帮你写一封专业的套磁信 ✉️',
    initialReplies: ['我有目标教授', '帮我先找教授再写信', '修改我的草稿'],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBadgeInline({ level, count }: { level: ConfidenceLevel; count?: number }) {
  const map: Record<ConfidenceLevel, { icon: string; label: string; color: string }> = {
    high:    { icon: '🟢', label: count ? `高置信 · ${count} 篇论文` : '高置信', color: '#5a8060' },
    medium:  { icon: '🟡', label: count ? `中置信 · ${count} 篇论文` : '中置信', color: '#8a6c30' },
    low:     { icon: '🔴', label: '低置信', color: '#b06040' },
    warning: { icon: '⚠️', label: '待验证', color: '#8a6c30' },
    unknown: { icon: '⚪', label: '未知来源', color: '#907858' },
  };
  const cfg = map[level];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ml-1" style={{ background: '#f2ead6', color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ProfessorMatchCard({ match }: { match: ProfessorMatch }) {
  const score = match.matchScore;
  const color = score >= 75 ? '#5a8060' : score >= 50 ? '#c4a050' : '#b06040';
  return (
    <Link href={`/koala/professors/${match.professorId}`} style={{ textDecoration: 'none' }}>
      <div className="rounded-xl p-3 mt-2" style={{ background: '#fff', border: '1px solid #e8dcc8' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold" style={{ color: '#1a2332' }}>🎓 {match.name}</div>
            <div className="text-[11px] mt-0.5" style={{ color: '#907858' }}>{match.institution}</div>
            {match.positionTitle && <div className="text-[10px]" style={{ color: '#b09878' }}>{match.positionTitle}</div>}
            {match.researchTags && match.researchTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {match.researchTags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#f2ead6', color: '#7d6340' }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="text-lg font-bold" style={{ color }}>{score}</div>
            <div className="text-[10px]" style={{ color: '#b09878' }}>匹配度</div>
          </div>
        </div>
        {match.reason && (
          <div className="text-[11px] mt-2 pt-2 leading-relaxed" style={{ color: '#584838', borderTop: '1px solid #f0e8d4' }}>{match.reason}</div>
        )}
        {match.opportunityLabel && (
          <div className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-1" style={{ background: '#f0f8f2', color: '#5a8060' }}>{match.opportunityLabel}</div>
        )}
      </div>
    </Link>
  );
}

function ScoreCardBlock({ card }: { card: ScoreCard }) {
  return (
    <div className="rounded-xl p-3 mt-2" style={{ background: '#fff', border: '1px solid #e8dcc8' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: '#1a2332' }}>📊 申请潜力初评</span>
        <span className="text-lg font-bold" style={{ color: '#c4a050' }}>{card.totalScore}<span className="text-xs font-normal text-stone-400">/100</span></span>
      </div>
      <div className="space-y-1.5">
        {card.dimensions.map(dim => (
          <div key={dim.name}>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span style={{ color: '#584838' }}>{dim.name}</span>
              <span style={{ color: '#7d6340' }}>{dim.score}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f0e8d4' }}>
              <div className="h-full rounded-full" style={{ width: `${dim.score}%`, background: '#c4a050' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedbackBar({ onFeedback, current }: { onFeedback: (r: FeedbackRating) => void; current?: FeedbackRating }) {
  const options: { key: FeedbackRating; emoji: string; label: string }[] = [
    { key: 'helpful', emoji: '👍', label: '有帮助' },
    { key: 'partial', emoji: '🤔', label: '一般' },
    { key: 'unhelpful', emoji: '👎', label: '没帮助' },
    { key: 'correction', emoji: '📝', label: '纠错' },
  ];
  return (
    <div className="flex items-center gap-2 mt-1.5 ml-9">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onFeedback(opt.key)}
          className="text-[13px] transition-transform active:scale-95"
          style={{ opacity: current && current !== opt.key ? 0.35 : 1 }}
          title={opt.label}
        >
          {opt.emoji}
        </button>
      ))}
    </div>
  );
}

function FileUploadSheet({ onClose, onFile }: { onClose: () => void; onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6" style={{ background: '#faf6ec', maxWidth: 480, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
        <div className="text-sm font-semibold mb-4" style={{ color: '#1a2332' }}>上传文件</div>
        <div className="space-y-2">
          {[{ icon: '📄', label: '上传简历 (PDF)' }, { icon: '📊', label: '上传成绩单 (PDF/图片)' }].map(item => (
            <button key={item.label} onClick={() => inputRef.current?.click()} className="w-full flex items-center gap-3 rounded-2xl p-4 text-left" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm" style={{ color: '#1a2332' }}>{item.label}</span>
            </button>
          ))}
        </div>
        <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { onFile(f); onClose(); } }} />
        <button className="w-full mt-4 py-3 rounded-2xl text-sm font-medium" style={{ background: '#f2ead6', color: '#907858' }} onClick={onClose}>取消</button>
      </div>
    </div>
  );
}

function CreditConfirmDialog({ remaining, onConfirm, onCancel }: { remaining: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onCancel}>
      <div className="w-full rounded-t-3xl p-6" style={{ background: '#faf6ec', maxWidth: 480, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="size-4" style={{ color: '#c4a050' }} />
          <span className="text-sm font-bold" style={{ color: '#1a2332' }}>生成套磁信</span>
        </div>
        <p className="text-xs leading-relaxed mb-1" style={{ color: '#584838' }}>本次生成将消耗 <strong>1 积分</strong>，剩余 {remaining} 积分。</p>
        <p className="text-[11px]" style={{ color: '#907858' }}>月度额度优先扣除；单独购买的积分永久有效。</p>
        {remaining <= 0 && (
          <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: '#fff5e8', border: '1px solid #f0d0a0', color: '#8a5020' }}>
            积分不足！可前往「工具 → 定价」购买积分包，或升级订阅。
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <button className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: '#f2ead6', color: '#7d6340', border: '1px solid #d8c8a8' }} onClick={onCancel}>取消</button>
          {remaining > 0 ? (
            <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#c4a050' }} onClick={onConfirm}>确认生成（−1 积分）</button>
          ) : (
            <Link href="/koala/tools" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white text-center no-underline" style={{ background: '#c4a050' }}>去购买积分</Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ConsultationBanner() {
  return (
    <div className="rounded-xl p-3 mt-2" style={{ background: '#f5e8c4', border: '1px solid #e8d098' }}>
      <div className="text-xs font-semibold mb-1" style={{ color: '#8a6c30' }}>💡 需要更深入的分析？</div>
      <p className="text-[11px] leading-relaxed" style={{ color: '#7d6340' }}>AI 评估有局限，真人顾问能帮你做更精准的项目匹配。</p>
      <div className="flex gap-2 mt-2">
        <a href="mailto:info@koalastudyadvisors.net" className="flex-1 py-1.5 rounded-lg text-[11px] font-medium text-center no-underline" style={{ background: '#c4a050', color: '#fff' }}>📧 联系顾问</a>
        <a href="weixin://dl/chat?username=KoalaStudyAdvisor" className="flex-1 py-1.5 rounded-lg text-[11px] font-medium text-center no-underline" style={{ background: '#f2ead6', color: '#7d6340', border: '1px solid #d8c8a8' }}>💬 微信咨询</a>
      </div>
    </div>
  );
}

function SettingsPanel({
  tone, lang,
  onTone, onLang,
  onClear, onClose,
}: {
  tone: TonePref; lang: LangPref;
  onTone: (t: TonePref) => void; onLang: (l: LangPref) => void;
  onClear: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6 space-y-5" style={{ background: '#faf6ec', maxWidth: 480, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: '#1a2332' }}>设置</span>
          <button onClick={onClose} className="text-xs" style={{ color: '#907858' }}>关闭</button>
        </div>

        {/* Tone */}
        <div>
          <div className="text-xs font-semibold mb-2" style={{ color: '#584838' }}>AI 语气偏好</div>
          <div className="grid grid-cols-3 gap-2">
            {([['casual', '轻松'], ['professional', '专业'], ['direct', '直接']] as [TonePref, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => onTone(val)}
                className="py-2 rounded-xl text-xs font-medium"
                style={{
                  background: tone === val ? '#f5e8c4' : '#f2ead6',
                  border: `1.5px solid ${tone === val ? '#c4a050' : '#e8dcc8'}`,
                  color: tone === val ? '#8a6c30' : '#a08058',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <div className="text-xs font-semibold mb-2" style={{ color: '#584838' }}>语言偏好</div>
          <div className="grid grid-cols-3 gap-2">
            {([['zh', '中文'], ['en', 'English'], ['mixed', '中英混合']] as [LangPref, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => onLang(val)}
                className="py-2 rounded-xl text-xs font-medium"
                style={{
                  background: lang === val ? '#f5e8c4' : '#f2ead6',
                  border: `1.5px solid ${lang === val ? '#c4a050' : '#e8dcc8'}`,
                  color: lang === val ? '#8a6c30' : '#a08058',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => { onClear(); onClose(); }}
            className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ background: '#f2ead6', color: '#b06040', border: '1px solid #e8d8c8' }}
          >
            🗑️ 清除对话记录
          </button>
          <Link
            href="/login"
            onClick={onClose}
            className="block w-full py-2.5 rounded-xl text-sm font-medium text-center no-underline"
            style={{ background: '#f2ead6', color: '#907858', border: '1px solid #e8dcc8' }}
          >
            退出登录
          </Link>
        </div>
      </div>
    </div>
  );
}

function msgId() { return Math.random().toString(36).slice(2); }

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [mode, setMode] = useState<AIMode>('path');
  const [messages, setMessages] = useState<Message[]>([
    { id: msgId(), role: 'assistant', content: MODES[0].welcome, timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [credits, setCredits] = useState<number>(10);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [pendingEmailText, setPendingEmailText] = useState<string | null>(null);
  const [toastAchievement, setToastAchievement] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tonePref, setTonePref] = useState<TonePref>('casual');
  const [langPref, setLangPref] = useState<LangPref>('zh');
  const [parsedFile, setParsedFile] = useState<string | null>(null); // last parsed filename
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentMode = MODES.find(m => m.key === mode)!;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function switchMode(newMode: AIMode) {
    const cfg = MODES.find(m => m.key === newMode)!;
    setMode(newMode);
    setMessages([{ id: msgId(), role: 'assistant', content: cfg.welcome, timestamp: new Date() }]);
    setInput('');
  }

  const sendMessage = useCallback(async (text?: string) => {
    const txt = (text ?? input).trim();
    if (!txt || loading) return;

    const isEmailRequest = mode === 'write' && /套磁信|email|生成|帮我写/i.test(txt) && messages.length > 1;
    if (isEmailRequest) {
      setPendingEmailText(txt);
      setShowCreditConfirm(true);
      return;
    }

    setInput('');
    const userMsg: Message = { id: msgId(), role: 'user', content: txt, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const allMsgs = [...messages, userMsg];
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          messages: allMsgs.map(m => ({ role: m.role, content: m.content })),
          userStyleProfile: {
            formality: tonePref === 'professional' ? 'formal' : tonePref === 'direct' ? 'mixed' : 'casual',
            expertise: 'intermediate',
            emotionalState: 'neutral',
          },
        }),
      });
      const data = await res.json();

      let confidence: ConfidenceLevel | undefined;
      if (mode === 'research') {
        const count = data.citations?.length ?? 0;
        confidence = count >= 3 ? 'high' : count >= 1 ? 'medium' : 'low';
      }

      const assistantMsg: Message = {
        id: msgId(),
        role: 'assistant',
        content: data.reply ?? '抱歉，我没能生成回复，请再试一次。',
        citations: data.citations,
        academicSearch: data.academicSearch,
        matchedProfessors: data.matchedProfessors,
        scoreCard: data.scoreCard,
        confidence,
        quickReplies: data.quickReplies,
        emailPackage: data.emailPackage,
        suggestConsultation: data.suggestConsultation,
        noResults: mode === 'research' && (!data.citations || data.citations.length === 0),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (data.achievement) setToastAchievement(data.achievement);
    } catch {
      setMessages(prev => [...prev, {
        id: msgId(), role: 'assistant',
        content: '抱歉，网络出了点问题。请稍后再试。',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, mode, tonePref]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function setFeedback(id: string, rating: FeedbackRating) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, feedback: rating } : m));
  }

  async function handleFile(file: File) {
    setMessages(prev => [...prev, {
      id: msgId(), role: 'user',
      content: `📎 已上传：${file.name}，正在解析…`,
      timestamp: new Date(),
    }]);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/user/profile/parse', { method: 'POST', body: fd });
      const data = await res.json();

      if (res.ok && data.profile) {
        const p = data.profile;
        const summary = [
          p.major ? `专业：${p.major}` : '',
          p.university ? `学校：${p.university}` : '',
          p.gpa ? `GPA：${p.gpa}${p.gpaScale ? `/${p.gpaScale}` : ''}` : '',
          p.researchInterests?.length ? `研究兴趣：${p.researchInterests.slice(0, 3).join('、')}` : '',
        ].filter(Boolean).join('\n');

        setParsedFile(file.name);
        setMessages(prev => [...prev, {
          id: msgId(), role: 'assistant',
          content: `✅ 简历解析完成！\n\n${summary}\n\n数据已保存到「个人数据中心」。需要根据你的背景匹配教授吗？`,
          quickReplies: ['是的，帮我匹配教授', '先看路径评估'],
          timestamp: new Date(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: msgId(), role: 'assistant',
          content: `已收到文件「${file.name}」。请告诉我你想用它做什么？`,
          timestamp: new Date(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: msgId(), role: 'assistant',
        content: `已收到文件「${file.name}」。请告诉我你想用它做什么？`,
        timestamp: new Date(),
      }]);
    }
  }

  function clearConversation() {
    setMessages([{ id: msgId(), role: 'assistant', content: currentMode.welcome, timestamp: new Date() }]);
  }

  function confirmEmailGeneration() {
    setShowCreditConfirm(false);
    if (!pendingEmailText) return;
    const txt = pendingEmailText;
    setPendingEmailText(null);
    setCredits(prev => Math.max(0, prev - 1));

    const doSend = async () => {
      setInput('');
      const userMsg: Message = { id: msgId(), role: 'user', content: txt, timestamp: new Date() };
      setMessages(prev => [...prev, userMsg]);
      setLoading(true);
      try {
        const allMsgs = [...messages, userMsg];
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, messages: allMsgs.map(m => ({ role: m.role, content: m.content })) }),
        });
        const data = await res.json();
        setMessages(prev => [...prev, {
          id: msgId(), role: 'assistant',
          content: data.reply ?? '抱歉，生成失败，请重试。',
          emailPackage: data.emailPackage,
          timestamp: new Date(),
        }]);
      } catch {
        setMessages(prev => [...prev, {
          id: msgId(), role: 'assistant',
          content: '网络出错，积分已退回。', timestamp: new Date(),
        }]);
        setCredits(prev => prev + 1);
      } finally {
        setLoading(false);
      }
    };
    doSend();
  }

  const formatTime = (d: Date) => d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: '#faf6ec', paddingBottom: 60 }}>

      {/* Achievement toast */}
      {toastAchievement && (
        <AchievementBadge
          achievementKey={toastAchievement}
          mode="toast"
          onDismiss={() => setToastAchievement(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: '#1a2332' }}>
        <div className="flex items-center gap-2">
          <div
            className="size-9 rounded-full flex justify-center items-center flex-shrink-0"
            style={{ background: '#c4a050' }}
          >
            <PawPrint className="size-5" style={{ color: '#1a2332' }} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base leading-6 tracking-wide" style={{ color: '#c4a050' }}>
              Koala Study Advisors
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(196,160,80,0.8)' }}>
              考拉学长 · 在线
            </span>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)}>
          <Settings className="size-5" style={{ color: '#c4a050' }} />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex px-2 items-stretch flex-shrink-0" style={{ background: '#f0e9d6' }}>
        {MODES.map(m => {
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => switchMode(m.key)}
              className="flex pt-3 pb-2 flex-col items-center flex-1 gap-2"
            >
              <span
                className="text-sm leading-5"
                style={{
                  color: active ? '#1a2332' : '#9a9285',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {m.label}
              </span>
              <div
                className="rounded-full w-8 h-0.5"
                style={{ background: active ? '#c4a050' : 'transparent' }}
              />
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5">
        <div className="flex items-center gap-2 py-2 mb-1">
          <div className="flex-1 h-px" style={{ background: '#e8dcc8' }} />
          <span className="text-[11px] flex-shrink-0" style={{ color: '#b09878' }}>今天 {formatTime(messages[0]?.timestamp ?? new Date())}</span>
          <div className="flex-1 h-px" style={{ background: '#e8dcc8' }} />
        </div>

        {messages.map((msg, idx) => (
          <div key={msg.id}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-0.5`}>
              {msg.role === 'assistant' && (
                <div className="mt-1 mr-2 flex-shrink-0">
                  <KoalaAvatar size={28} />
                </div>
              )}
              <div className="flex flex-col max-w-[80%]">
                <div
                  className="px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={msg.role === 'user'
                    ? { background: '#c4a050', color: '#fff', borderRadius: '1rem 0.25rem 1rem 1rem', boxShadow: '0 2px 8px rgba(196,160,80,0.20)' }
                    : { background: '#fff', color: '#28201a', borderRadius: '0.25rem 1rem 1rem 1rem', boxShadow: '0 2px 8px rgba(196,160,80,0.12)' }
                  }
                >
                  {msg.content}
                  {msg.role === 'assistant' && msg.confidence && (
                    <ConfidenceBadgeInline level={msg.confidence} count={msg.citations?.length} />
                  )}
                </div>

                {msg.role === 'assistant' && msg.scoreCard && <ScoreCardBlock card={msg.scoreCard} />}
                {msg.role === 'assistant' && msg.matchedProfessors?.map((p, i) => (
                  <ProfessorMatchCard key={i} match={p} />
                ))}
                {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                  <ExtendedReadingPanel
                    papers={msg.citations}
                    searchQueries={msg.academicSearch?.queries}
                    sources={msg.academicSearch ? [msg.academicSearch.sources.join(' + ')] : undefined}
                    totalFound={msg.academicSearch?.totalFound}
                    defaultExpanded={msg.citations.length <= 3}
                  />
                )}
                {msg.role === 'assistant' && msg.noResults && (
                  <DontKnowResponse onSuggestedQuestion={q => sendMessage(q)} />
                )}
                {msg.role === 'assistant' && msg.emailPackage && (
                  <div className="mt-2">
                    <EmailPackage
                      professorName="目标教授"
                      subjectLine={msg.emailPackage.subjectLine}
                      emailBody={msg.emailPackage.emailBody}
                      followupBody={msg.emailPackage.followupBody}
                      riskNote={msg.emailPackage.riskNote}
                    />
                  </div>
                )}
                {msg.role === 'assistant' && msg.suggestConsultation && <ConsultationBanner />}
                {msg.role === 'assistant' && msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.quickReplies.map(qr => (
                      <button key={qr} onClick={() => sendMessage(qr)} disabled={loading}
                        className="text-xs px-3 py-1.5 rounded-full border"
                        style={{ background: '#faf6ec', borderColor: '#d8c8a8', color: '#584838' }}
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="mt-1 ml-2 flex-shrink-0">
                  <UserAvatar size={28} />
                </div>
              )}
            </div>

            {msg.role === 'assistant' && !(loading && idx === messages.length - 1) && (
              <FeedbackBar onFeedback={r => setFeedback(msg.id, r)} current={msg.feedback} />
            )}
          </div>
        ))}

        {/* Initial quick replies */}
        {!loading && messages.length === 1 && messages[0].role === 'assistant' && currentMode.initialReplies && (
          <div className="flex flex-wrap gap-1.5 mt-1 ml-9">
            {currentMode.initialReplies.map(qr => (
              <button key={qr} onClick={() => sendMessage(qr)}
                className="text-xs px-3 py-1.5 rounded-full border"
                style={{ background: '#faf6ec', borderColor: '#d8c8a8', color: '#584838' }}
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-start mb-1">
            <div className="mt-1 mr-2 flex-shrink-0">
              <KoalaAvatar size={28} />
            </div>
            <div className="px-3.5 py-2.5 text-sm" style={{ background: '#fff', borderRadius: '0.25rem 1rem 1rem 1rem', boxShadow: '0 2px 8px rgba(196,160,80,0.12)', color: '#907858' }}>
              {mode === 'research' ? (
                <span className="animate-pulse">🔬 正在检索论文…</span>
              ) : (
                <span className="animate-pulse">正在思考中…</span>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="flex-shrink-0 border-t"
        style={{ background: '#fff', borderColor: '#e8dfc8' }}
      >
        <div className="flex p-4 items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="size-9 shrink-0 rounded-full flex justify-center items-center"
            style={{ background: '#f0e9d6' }}
          >
            <Plus className="size-5" style={{ color: '#1a2332' }} />
          </button>
          <div
            className="rounded-full px-4 py-2.5 flex-1"
            style={{ background: '#f7f1e0' }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder={currentMode.placeholder}
              className="w-full resize-none text-sm outline-none bg-transparent leading-relaxed"
              style={{ color: '#1a2332', maxHeight: 120 }}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="size-9 shrink-0 rounded-full flex justify-center items-center"
            style={{ background: input.trim() && !loading ? '#c4a050' : '#e0d8c4' }}
          >
            <Send className="size-4 fill-white text-white" />
          </button>
        </div>
        <p className="text-center text-[10px] pb-2" style={{ color: '#c0a878' }}>
          Koala 可能出错，重要决策请咨询人工顾问
        </p>
      </div>

      {showUpload && <FileUploadSheet onClose={() => setShowUpload(false)} onFile={handleFile} />}
      {showCreditConfirm && (
        <CreditConfirmDialog
          remaining={credits}
          onConfirm={confirmEmailGeneration}
          onCancel={() => { setShowCreditConfirm(false); setPendingEmailText(null); }}
        />
      )}
      {showSettings && (
        <SettingsPanel
          tone={tonePref} lang={langPref}
          onTone={setTonePref} onLang={setLangPref}
          onClear={clearConversation}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
