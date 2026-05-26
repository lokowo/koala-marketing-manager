'use client';

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, Settings, Plus, Send, Sparkles, Mic, MicOff } from 'lucide-react';
import VoiceInputButton from '../../components/VoiceInputButton';
import Link from 'next/link';
import { useAuth } from '../components/AuthContext';
import { BRAND } from '../../lib/constants';
import type { AIMode } from '../../lib/constants';
import type { ProfessorMatch, ScoreCard } from '../../lib/types';
import { ExtendedReadingPanel } from '../components/ai/ExtendedReadingPanel';
import type { PaperData } from '../components/ai/PaperCitationCard';
import { EmailPackage } from '../components/outreach/EmailPackage';
import { AchievementBadge } from '../components/ai/AchievementBadge';
import { MiniStats } from '../components/ai/MiniStats';
import { ConfidenceBadge, type ConfidenceLevel } from '../components/ai/ConfidenceBadge';
import { DontKnowResponse } from '../components/ai/DontKnowResponse';
import { UserAvatar } from '../components/KoalaAvatar';
import { OlaAvatar } from '../components/ola/OlaAvatar';
import { OlaWelcome } from '../components/ola/OlaWelcome';
import { OlaChatMascot } from '../components/ola/OlaChatMascot';
import { OlaRatingPrompt } from '../components/ola/OlaRatingPrompt';
import { ChatHistorySidebar } from '../components/ola/ChatHistorySidebar';
import { OlaHandoffCard } from '../components/ola/OlaHandoffCard';
import { ProfileCard } from '../components/chat/ProfileCard';
import { ColdEmailCard } from '../components/chat/ColdEmailCard';
import { UpgradePrompt } from '../components/chat/UpgradePrompt';
import { FeedbackCard } from '../components/chat/FeedbackCard';
import { MatchProfileCard } from '../components/chat/MatchProfileCard';
import { checkUsage, incrementUsage } from '../../lib/services/usageTracker';
import { supabase } from '../../lib/supabase/client';
import type { ExtractedProfile } from '../../lib/chat/extract-profile';
import { Download, History } from 'lucide-react';
import { SharePosterTrigger } from '../components/SharePoster';

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackRating = 'helpful' | 'partial' | 'unhelpful' | 'correction';
type TonePref = 'casual' | 'professional' | 'direct';
type LangPref = 'zh' | 'en' | 'mixed';

interface EmailPackageData {
  subjectLine: string;
  emailBody: string;
  followupBody?: string;
  riskNote?: string;
  professorEmail?: string | null;
  professorGoogleScholar?: string | null;
  professorProfileUrl?: string | null;
  professorUniversity?: string | null;
}

interface ColdEmailData {
  id?: string;
  subject: string;
  body: string;
  highlights: { text: string; type: 'student' | 'professor' }[];
  matchScores: { researchAlignment: number; backgroundFit: number; researchReadiness: number; opportunity: number; overall: number };
  creditsUsed: number;
  creditsRemaining: number;
  professorId: string;
  professorName?: string;
  professorEmail?: string;
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
  coldEmailData?: ColdEmailData;
  upgradePrompt?: { feature: string; remaining: number; message?: string; actions?: { label: string; href: string }[] };
  suggestions?: string[];
  suggestConsultation?: boolean;
  profileData?: ExtractedProfile;
  handoffCard?: boolean;
  noResults?: boolean;
  olaAssetId?: string;
  olaEmotionTag?: string;
  olaAction?: { type: string; userId?: string };
  timestamp: Date;
}

// ─── Ola state tag parser ─────────────────────────────────────────────────────

const OLA_STATE_RE = /<!--\s*ola_state\s*:\s*(\{[^}]*\})\s*-->/;

function parseOlaState(text: string): { clean: string; assetId?: string; emotionTag?: string } {
  const match = text.match(OLA_STATE_RE);
  if (!match) return { clean: text };
  const clean = text.replace(OLA_STATE_RE, '').trim();
  try {
    const parsed = JSON.parse(match[1]) as { emotion?: string; image?: string };
    return { clean, assetId: parsed.image, emotionTag: parsed.emotion };
  } catch {
    return { clean };
  }
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
    label: '✉️ 写申请信',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9" strokeLinecap="round"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    desc: '定制申请信 · SOP · 研究计划',
    placeholder: '给我一位教授的名字，我帮你写申请信……',
    welcome: '给我一位教授的名字或链接，我帮你写一封专业的申请信 ✉️',
    initialReplies: ['我有目标教授', '帮我先找教授再写信', '修改我的草稿'],
  },
  {
    key: 'rp',
    label: '📝 RP 助手',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    desc: '帮你写 Research Proposal',
    placeholder: '描述你的研究兴趣，或粘贴你的 RP 草稿……',
    welcome: '我是你的 Research Proposal 写作顾问 📝\n\n我可以帮你：\n• 确定研究选题和研究问题\n• 指导 RP 结构和写作\n• 审阅和修改你的 RP 草稿\n\n先告诉我你的研究兴趣和目标教授吧！',
    initialReplies: ['帮我确定研究选题', '审阅我的 RP 草稿', '怎么写文献综述', '方法论怎么选'],
  },
  {
    key: 'interview',
    label: '🎤 模拟面试',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round"/><path d="M12 19v4M8 23h8" strokeLinecap="round"/></svg>,
    desc: '模拟导师面试练习',
    placeholder: '告诉我你要面试哪位教授……',
    welcome: '欢迎来到模拟面试练习！🎤\n\n我会扮演澳洲大学的 PhD 导师，模拟真实面试场景。\n\n告诉我你要面试哪位教授，我会根据他/她的研究方向设计面试问题。每个问题回答后我都会给出反馈和改进建议。',
    initialReplies: ['我有目标教授', '通用面试练习', '面试常见问题有哪些'],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBadgeInline({ level, count }: { level: ConfidenceLevel; count?: number }) {
  const map: Record<ConfidenceLevel, { icon: string; label: string; color: string }> = {
    high:    { icon: '🟢', label: count ? `高置信 · ${count} 篇论文` : '高置信', color: '#5a8060' },
    medium:  { icon: '🟡', label: count ? `中置信 · ${count} 篇论文` : '中置信', color: '#D4A843' },
    low:     { icon: '🔴', label: '低置信', color: '#b06040' },
    warning: { icon: '⚠️', label: '待验证', color: '#D4A843' },
    unknown: { icon: '⚪', label: '未知来源', color: '#6a7a7e' },
  };
  const cfg = map[level];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ml-1 bg-black/10 dark:bg-white/10" style={{ color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function AcceptingBadge({ status }: { status?: string }) {
  if (!status || status === 'unknown') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-[#6a6058]">🟡 招生未知</span>;
  if (status === 'yes' || status === 'likely') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400">🟢 招生中</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">🔴 暂不招生</span>;
}

function ProfessorMatchCard({ match, onGenerateEmail, selectable, selected, onToggleSelect }: { match: ProfessorMatch; onGenerateEmail?: (professorId: string, professorName: string) => void; selectable?: boolean; selected?: boolean; onToggleSelect?: (professorId: string) => void }) {
  const score = match.matchScore;
  const color = score >= 75 ? '#5a8060' : score >= 50 ? '#D4A843' : '#b06040';
  const hasStats = match.hIndex != null || match.paperCount != null || match.citationCount != null;
  return (
    <div className="rounded-xl p-3 mt-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      {selectable && (
        <label className="flex items-center gap-2 mb-2 cursor-pointer" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(match.professorId)}
            className="size-4 rounded border-gray-300 dark:border-white/20 text-[#D4A843] accent-[#D4A843]"
          />
          <span className="text-[11px] text-gray-500 dark:text-[#a09888]">选中批量生成</span>
        </label>
      )}
      <Link href={`/koala/professors/${match.professorId}`} style={{ textDecoration: 'none' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">🎓 {match.name}</div>
            <div className="text-[11px] mt-0.5 text-gray-500 dark:text-[#8a8078]">{match.institution}</div>
            {match.positionTitle && <div className="text-[10px] text-gray-400 dark:text-[#6a6058]">{match.positionTitle}</div>}
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="text-lg font-bold" style={{ color }}>{score}</div>
            <div className="text-[10px] text-gray-400 dark:text-[#6a6058]">匹配度</div>
          </div>
        </div>
        {/* Stats row + accepting badge */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <AcceptingBadge status={match.acceptingStudents} />
          {match.opportunityScore != null && match.opportunityScore > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              机会分 {match.opportunityScore}
            </span>
          )}
          {match.opportunityLabel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(90,128,96,0.15)', color: '#5a8060' }}>{match.opportunityLabel}</span>
          )}
        </div>
        {hasStats && (
          <div className="flex gap-3 mt-1.5 text-[10px] text-gray-500 dark:text-[#8a8078]">
            {match.hIndex != null && <span>H:{match.hIndex}</span>}
            {match.paperCount != null && <span>{match.paperCount}篇论文</span>}
            {match.citationCount != null && <span>{match.citationCount >= 1000 ? `${(match.citationCount / 1000).toFixed(1)}k` : match.citationCount}引用</span>}
          </div>
        )}
        {match.researchTags && match.researchTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {match.researchTags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-white/[0.08] text-amber-700 dark:text-[#D4A843]">{tag}</span>
            ))}
          </div>
        )}
        {match.latestPapers && match.latestPapers.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-white/[0.08]">
            <div className="text-[10px] font-medium text-gray-400 dark:text-[#6a6058] mb-1">最新论文</div>
            {match.latestPapers.slice(0, 2).map((paper, i) => (
              <div key={i} className="mb-1 last:mb-0">
                {paper.doi_url ? (
                  <a href={paper.doi_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[11px] leading-snug text-blue-600 dark:text-blue-400 hover:underline no-underline">
                    {paper.title}
                    {paper.journal && <span className="text-gray-400 dark:text-[#6a6058]">, {paper.journal}</span>}
                    {paper.year && <span className="text-gray-400 dark:text-[#6a6058]">, {paper.year}</span>}
                    <span className="ml-0.5">↗</span>
                  </a>
                ) : (
                  <span className="text-[11px] leading-snug text-gray-500 dark:text-[#8a8078]">
                    {paper.title}
                    {paper.journal && <span className="text-gray-400 dark:text-[#6a6058]">, {paper.journal}</span>}
                    {paper.year && <span className="text-gray-400 dark:text-[#6a6058]">, {paper.year}</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {match.reason && (
          <div className="text-[11px] mt-2 pt-2 leading-relaxed text-gray-500 dark:text-[#a09888] border-t border-gray-200 dark:border-white/[0.08]">{match.reason}</div>
        )}
      </Link>
      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-white/[0.08]">
        <Link
          href={`/koala/professors/${match.professorId}`}
          className="flex-1 text-center text-[11px] font-medium py-1.5 rounded-lg no-underline bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-[#e8e4dc]"
        >
          查看详情
        </Link>
        <button
          onClick={() => onGenerateEmail?.(match.professorId, match.name)}
          className="flex-1 text-center text-[11px] font-medium py-1.5 rounded-lg bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
        >
          ✉️ 生成套磁信
        </button>
      </div>
    </div>
  );
}

function ScoreCardBlock({ card }: { card: ScoreCard }) {
  return (
    <div className="rounded-xl p-3 mt-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">📊 申请潜力初评</span>
        <span className="text-lg font-bold text-amber-600 dark:text-[#D4A843]">{card.totalScore}<span className="text-xs font-normal text-gray-400 dark:text-[#6a6058]">/100</span></span>
      </div>
      <div className="space-y-1.5">
        {card.dimensions.map(dim => (
          <div key={dim.name}>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-gray-500 dark:text-[#a09888]">{dim.name}</span>
              <span className="text-amber-600 dark:text-[#D4A843]">{dim.score}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-white/[0.08]">
              <div className="h-full rounded-full" style={{ width: `${dim.score}%`, background: '#D4A843' }} />
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

function FileUploadSheet({ onClose, onFile }: { onClose: () => void; onFile: (f: File, type: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<string>('resume');
  const [error, setError] = useState<string | null>(null);

  const options = [
    { type: 'resume', icon: '📄', label: '上传简历', accept: '.pdf', desc: 'PDF, 最大5MB' },
    { type: 'transcript', icon: '📊', label: '上传成绩单', accept: '.pdf,.png,.jpg,.jpeg', desc: 'PDF/图片, 最大5MB' },
    { type: 'other', icon: '📑', label: '上传其他文件', accept: '.pdf,.png,.jpg,.jpeg,.doc,.docx', desc: 'PDF/图片/Word, 最大5MB' },
  ];

  function handleSelect(type: string) {
    setSelectedType(type);
    setError(null);
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'];
    if (!allowed.includes(ext)) {
      setError('不支持的文件格式。允许：PDF, PNG, JPG, DOC, DOCX');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('文件大小不能超过 5MB');
      return;
    }
    onFile(f, selectedType);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6 bg-white dark:bg-[#0d1520]" style={{ maxWidth: 480, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
        <div className="text-sm font-semibold mb-4 text-gray-900 dark:text-[#e8e4dc]">上传文件</div>
        <div className="space-y-2">
          {options.map(opt => (
            <button key={opt.type} onClick={() => handleSelect(opt.type)} className="w-full flex items-center gap-3 rounded-2xl p-4 text-left bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <span className="text-xl">{opt.icon}</span>
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-[#e8e4dc]">{opt.label}</span>
                <span className="text-[11px] ml-2 text-gray-500 dark:text-[#8a8078]">({opt.desc})</span>
              </div>
            </button>
          ))}
        </div>
        {selectedType === 'other' && (
          <p className="text-[11px] mt-2 px-1 text-gray-500 dark:text-[#8a8078]">
            例如：证书、论文草稿、研究计划、推荐信等
          </p>
        )}
        {error && (
          <div className="mt-3 rounded-xl px-3 py-2 text-xs bg-red-50 dark:bg-red-900/15 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30">
            {error}
          </div>
        )}
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className="hidden" onChange={handleFileChange} />
        <button className="w-full mt-4 py-3 rounded-2xl text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#8a8078]" onClick={onClose}>取消</button>
      </div>
    </div>
  );
}

function CreditConfirmDialog({ remaining, onConfirm, onCancel }: { remaining: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onCancel}>
      <div className="w-full rounded-t-3xl p-6 bg-white dark:bg-[#0d1520]" style={{ maxWidth: 480, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="size-4 text-amber-600 dark:text-[#D4A843]" />
          <span className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">生成申请信</span>
        </div>
        <p className="text-xs leading-relaxed mb-1 text-gray-500 dark:text-[#a09888]">本次生成将消耗 <strong>1 积分</strong>，剩余 {remaining} 积分。</p>
        <p className="text-[11px] text-gray-400 dark:text-[#8a8078]">月度额度优先扣除；单独购买的积分永久有效。</p>
        {remaining <= 0 && (
          <div className="mt-3 rounded-xl p-3 text-xs bg-red-50 dark:bg-red-900/15 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30">
            积分不足！前往<Link href="/koala/pricing#credit-packs" className="underline font-medium text-red-600 dark:text-red-400">积分充值</Link>购买积分包，或升级订阅。
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <button className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#8a8078] border border-gray-200 dark:border-white/10" onClick={onCancel}>取消</button>
          {remaining > 0 ? (
            <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]" onClick={onConfirm}>确认生成（−1 积分）</button>
          ) : (
            <Link href="/koala/pricing#credit-packs" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">去购买积分</Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ConsultationBanner() {
  return (
    <div className="rounded-xl p-3 mt-2 bg-amber-50 dark:bg-[#D4A843]/10 border border-amber-200 dark:border-[#D4A843]/20">
      <div className="text-xs font-semibold mb-1 text-amber-700 dark:text-[#D4A843]">💡 需要更深入的分析？</div>
      <p className="text-[11px] leading-relaxed text-gray-500 dark:text-[#a09888]">AI 评估有局限，真人顾问能帮你做更精准的项目匹配。</p>
      <div className="flex gap-2 mt-2">
        <a href="mailto:info@koalaphd.com" className="flex-1 py-1.5 rounded-lg text-[11px] font-medium text-center no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">📧 联系顾问</a>
        <a href={`weixin://dl/chat?username=${BRAND.wechat}`} className="flex-1 py-1.5 rounded-lg text-[11px] font-medium text-center no-underline bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-amber-700 dark:text-[#D4A843]">💬 微信咨询</a>
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
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6 space-y-5 bg-white dark:bg-[#080c10]" style={{ maxWidth: 480, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">设置</span>
          <button onClick={onClose} className="text-xs text-gray-500 dark:text-[#8a8078]">关闭</button>
        </div>

        {/* Tone */}
        <div>
          <div className="text-xs font-semibold mb-2 text-gray-500 dark:text-[#a09888]">AI 语气偏好</div>
          <div className="grid grid-cols-3 gap-2">
            {([['casual', '轻松'], ['professional', '专业'], ['direct', '直接']] as [TonePref, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => onTone(val)}
                className={`py-2 rounded-xl text-xs font-medium border-[1.5px] ${tone === val ? 'bg-amber-50 dark:bg-[#D4A843]/15 border-amber-500 dark:border-[#D4A843] text-amber-700 dark:text-[#D4A843]' : 'border-gray-200 dark:border-gray-500/20 text-gray-500 dark:text-gray-400'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <div className="text-xs font-semibold mb-2 text-gray-500 dark:text-[#a09888]">语言偏好</div>
          <div className="grid grid-cols-3 gap-2">
            {([['zh', '中文'], ['en', 'English'], ['mixed', '中英混合']] as [LangPref, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => onLang(val)}
                className={`py-2 rounded-xl text-xs font-medium border-[1.5px] ${lang === val ? 'bg-amber-50 dark:bg-[#D4A843]/15 border-amber-500 dark:border-[#D4A843] text-amber-700 dark:text-[#D4A843]' : 'border-gray-200 dark:border-gray-500/20 text-gray-500 dark:text-gray-400'}`}
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
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-red-50 dark:bg-red-900/15 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30"
          >
            🗑️ 清除对话记录
          </button>
          <Link
            href="/login"
            onClick={onClose}
            className="block w-full py-2.5 rounded-xl text-sm font-medium text-center no-underline bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#8a8078] border border-gray-200 dark:border-white/10"
          >
            退出登录
          </Link>
        </div>
      </div>
    </div>
  );
}

const THINKING_MESSAGES = [
  '小欧正在思考…',
  '让我想想…',
  '正在查询学者数据库…',
  '小欧正在翻阅资料…',
  '认真分析中…',
  '小欧打了个哈欠，但还在认真工作…',
];

function ThinkingBubble({ mode }: { mode: string }) {
  const [msgIndex, setMsgIndex] = useState(0);
  useEffect(() => {
    if (mode === 'research') return;
    const timer = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % THINKING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [mode]);

  return (
    <div className="flex justify-start mb-1">
      <div className="mt-1 mr-2 flex-shrink-0">
        <OlaAvatar assetId="h-09-bubbly-boba-nobg" size="sm" />
      </div>
      <div className="px-3.5 py-2.5 text-sm bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-[#8a8078]" style={{ borderRadius: '0.25rem 1rem 1rem 1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <span className="animate-pulse">
          {mode === 'research' ? '🔬 正在检索论文…' : THINKING_MESSAGES[msgIndex]}
        </span>
      </div>
    </div>
  );
}

function msgId() { return Math.random().toString(36).slice(2); }

// ─── Persistence helpers ─────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = 'koala_chat_history';

function getLocalHistory(mode: string): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${mode}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{ id: string; role: 'user' | 'assistant'; content: string; metadata?: Record<string, unknown>; timestamp: string }>;
    return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) })) as Message[];
  } catch { return []; }
}

function setLocalHistory(mode: string, messages: Message[]) {
  if (typeof window === 'undefined') return;
  try {
    const slim = messages.map(m => ({
      id: m.id, role: m.role, content: m.content,
      metadata: m.matchedProfessors || m.scoreCard || m.emailPackage ? {
        matchedProfessors: m.matchedProfessors,
        scoreCard: m.scoreCard,
        emailPackage: m.emailPackage,
        citations: m.citations,
      } : undefined,
      timestamp: m.timestamp.toISOString(),
    }));
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${mode}`, JSON.stringify(slim.slice(-60)));
  } catch {}
}

function clearLocalHistory(mode: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${LOCAL_STORAGE_KEY}_${mode}`);
}

interface ConversationData {
  sessionId: string;
  mode: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

async function loadRemoteConversation(mode: string): Promise<ConversationData | null> {
  try {
    // Try chat_messages table first (new normalized storage)
    const res = await fetch(`/api/chat-history?mode=${encodeURIComponent(mode)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.conversation && data.messages?.length > 0) {
        return {
          sessionId: data.conversation.sessionId,
          mode: data.conversation.mode ?? mode,
          messages: data.messages.map((m: { role: 'user' | 'assistant'; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        };
      }
    }
    // Fallback to ai_conversations JSONB (for older sessions not yet in chat_messages)
    const fallbackRes = await fetch(`/api/ola/conversations?mode=${encodeURIComponent(mode)}`);
    if (!fallbackRes.ok) return null;
    const { conversation } = await fallbackRes.json();
    if (!conversation?.messages?.length) return null;
    return conversation as ConversationData;
  } catch { return null; }
}

async function loadRemoteSession(sessionId: string): Promise<ConversationData | null> {
  try {
    const res = await fetch(`/api/ola/conversations?sessionId=${encodeURIComponent(sessionId)}`);
    if (!res.ok) return null;
    const { conversation } = await res.json();
    if (!conversation?.messages?.length) return null;
    return conversation as ConversationData;
  } catch { return null; }
}

async function clearRemoteConversation(mode: string) {
  try {
    await fetch('/api/ola/conversations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
  } catch {}
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function remoteToMessages(msgs: { role: 'user' | 'assistant'; content: string }[]): Message[] {
  return msgs.map(m => ({ id: msgId(), role: m.role, content: m.content, timestamp: new Date() }));
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center" style={{ height: '100dvh' }}>
        <p className="text-sm text-gray-500 dark:text-[#8a8078]">加载中…</p>
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile, showLogin, refreshProfile } = useAuth();
  const [mode, setMode] = useState<AIMode>(() => {
    const action = searchParams.get('action');
    const modeParam = searchParams.get('mode');
    if (action === 'outreach') return 'write';
    if (action === 'interview') return 'interview';
    if (action === 'research') return 'research';
    if (modeParam && ['path', 'research', 'chat', 'write', 'rp', 'interview'].includes(modeParam)) return modeParam as AIMode;
    return 'path';
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    const action = searchParams.get('action');
    const modeParam = searchParams.get('mode');
    let modeKey: string = action === 'outreach' ? 'write' : action === 'interview' ? 'interview' : action === 'research' ? 'research' : 'path';
    if (modeParam && ['path', 'research', 'chat', 'write', 'rp', 'interview'].includes(modeParam)) modeKey = modeParam;
    const cfg = MODES.find(m => m.key === modeKey)!;
    // Anonymous users: load from localStorage; logged-in users: wait for DB
    if (!user) {
      const cached = getLocalHistory(modeKey);
      if (cached.length > 0) return cached;
    }
    return [{ id: msgId(), role: 'assistant', content: cfg.welcome, timestamp: new Date() }];
  });
  const [historyLoaded, setHistoryLoaded] = useState(!user);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [bgAnim, setBgAnim] = useState<'idle' | 'send' | 'reply'>('idle');
  const bgIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [credits, setCredits] = useState<number>(10);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [pendingEmailText, setPendingEmailText] = useState<string | null>(null);
  const [pendingProfessorId, setPendingProfessorId] = useState<string | null>(null);
  const [pendingProfessorName, setPendingProfessorName] = useState<string | null>(() => {
    const n = searchParams.get('name');
    return n ? decodeURIComponent(n) : null;
  });
  const [toastAchievement, setToastAchievement] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tonePref, setTonePref] = useState<TonePref>('casual');
  const [langPref, setLangPref] = useState<LangPref>('zh');
  const [parsedFile, setParsedFile] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [typewriterMsgId, setTypewriterMsgId] = useState<string | null>(null);
  const [typewriterText, setTypewriterText] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isVoiceTranscribing, setIsVoiceTranscribing] = useState(false);
  const [profileCollectionPending, setProfileCollectionPending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ file: File; type: string } | null>(null);
  const [coldEmailLoading, setColdEmailLoading] = useState(false);
  const [selectedProfessorIds, setSelectedProfessorIds] = useState<Set<string>>(new Set());
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);
  const [freeUsageHint, setFreeUsageHint] = useState<{ chat: { used: number; limit: number }; email: { used: number; limit: number } } | null>(null);
  const [profileCaptureStep, setProfileCaptureStep] = useState<number>(0);
  const [profileCaptureDone, setProfileCaptureDone] = useState(false);
  const [listenPulse, setListenPulse] = useState(0);
  const sessionIdRef = useRef<string>(generateSessionId());
  const consecutiveUnhelpfulRef = useRef<number>(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSentRef = useRef(false);
  const ratingShownRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageTimeRef = useRef<number>(Date.now());

  const currentMode = MODES.find(m => m.key === mode)!;

  useEffect(() => {
    if (!user) return;
    fetch('/api/user/credits').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.balance != null) setCredits(d.balance);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user || !profile) return;
    const tier = profile.plan_type || 'free';
    if (tier !== 'free') { setFreeUsageHint(null); return; }
    Promise.all([
      checkUsage(supabase, user.id, 'chat'),
      checkUsage(supabase, user.id, 'email'),
    ]).then(([chat, email]) => {
      setFreeUsageHint({ chat: { used: chat.used, limit: chat.limit }, email: { used: email.used, limit: email.limit } });
    }).catch(() => {});
  }, [user, profile, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typewriterText]);

  // Session-end beacon: notify backend when user leaves
  useEffect(() => {
    const sid = sessionIdRef.current;
    const sendEnd = () => {
      const payload = JSON.stringify({ sessionId: sid });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/ola/session-end', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/ola/session-end', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
      }
    };
    const onVisChange = () => { if (document.visibilityState === 'hidden') sendEnd(); };
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('beforeunload', sendEnd);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('beforeunload', sendEnd);
    };
  }, []);

  // Rating idle timer: show after 5+ messages and 30s idle
  useEffect(() => {
    if (ratingShownRef.current || loading) return;
    const userMsgCount = messages.filter(m => m.role === 'user').length;
    if (userMsgCount < 5) return;

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!ratingShownRef.current) {
        ratingShownRef.current = true;
        setShowRating(true);
      }
    }, 30000);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [messages, loading]);

  // Feedback idle timer: show after 5 min of inactivity
  useEffect(() => {
    if (feedbackDismissed || loading || messages.length < 4) return;
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    lastMessageTimeRef.current = Date.now();
    feedbackTimerRef.current = setTimeout(() => {
      if (!feedbackDismissed) setShowFeedback(true);
    }, 5 * 60 * 1000);
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [messages, loading, feedbackDismissed]);

  // Profile capture: after 3+ user messages, if key fields are missing, Ola asks
  const PROFILE_QUESTIONS: { field: string; question: string; replies: string[] }[] = [
    { field: 'target_field', question: '对了，你感兴趣的研究方向是什么呀？比如 AI、环境科学、金融这些～', replies: ['AI/机器学习', '商科/金融', '工程/材料', '医学/生物'] },
    { field: 'degree_level', question: '你现在是什么学历呢？本科在读、硕士还是已经毕业了？', replies: ['本科在读', '本科毕业', '硕士在读', '硕士毕业'] },
    { field: 'target_degree', question: '你的目标是读 PhD 还是 MRes 呢？', replies: ['PhD', 'MRes', '还没想好'] },
    { field: 'university', question: '你本科/硕士是在哪所学校读的呀？', replies: ['985/211', '双非', '海外本科'] },
  ];

  useEffect(() => {
    if (profileCaptureDone || !user || !profile || loading) return;
    const userMsgCount = messages.filter(m => m.role === 'user').length;
    if (userMsgCount < 3) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role !== 'assistant') return;
    // Don't interrupt if last message already has cards
    if (lastMsg.matchedProfessors?.length || lastMsg.emailPackage || lastMsg.coldEmailData || lastMsg.handoffCard) return;

    // Find the next missing field
    let nextStep = profileCaptureStep;
    while (nextStep < PROFILE_QUESTIONS.length) {
      const q = PROFILE_QUESTIONS[nextStep];
      const val = profile[q.field as keyof typeof profile];
      if (!val || (Array.isArray(val) && val.length === 0)) break;
      nextStep++;
    }

    if (nextStep >= PROFILE_QUESTIONS.length) {
      setProfileCaptureDone(true);
      return;
    }
    if (nextStep !== profileCaptureStep) setProfileCaptureStep(nextStep);

    // Only inject after the latest assistant message, with a delay
    const timer = setTimeout(() => {
      const q = PROFILE_QUESTIONS[nextStep];
      setMessages(prev => {
        const alreadyAsked = prev.some(m => m.content === q.question);
        if (alreadyAsked) return prev;
        return [...prev, {
          id: msgId(),
          role: 'assistant' as const,
          content: q.question,
          quickReplies: [...q.replies, '跳过'],
          timestamp: new Date(),
        }];
      });
      setProfileCaptureStep(nextStep + 1);
    }, 2000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading, profileCaptureDone, profile, user]);

  // Typewriter effect for the latest assistant message
  useEffect(() => {
    if (!typewriterMsgId) return;
    const msg = messages.find(m => m.id === typewriterMsgId);
    if (!msg) { setTypewriterMsgId(null); return; }

    const fullText = msg.content;
    let charIndex = 0;
    setTypewriterText('');

    function tick() {
      charIndex += 1;
      if (charIndex <= fullText.length) {
        setTypewriterText(fullText.slice(0, charIndex));
        requestAnimationFrame(tick);
      } else {
        setTypewriterMsgId(null);
      }
    }
    requestAnimationFrame(tick);
  }, [typewriterMsgId]);

  // PDF export handler
  async function handleExportPdf() {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const res = await fetch('/api/ola/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error('PDF export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ola-chat-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setExportingPdf(false);
    }
  }

  // Load history from remote DB on mount (logged-in) and when user logs in mid-session
  const dbLoadUserIdRef = useRef<string | null>(null);
  const migrationDoneRef = useRef(false);
  useEffect(() => {
    if (!user?.id) {
      dbLoadUserIdRef.current = null;
      setHistoryLoaded(true);
      return;
    }
    if (dbLoadUserIdRef.current === user.id) return;
    dbLoadUserIdRef.current = user.id;
    setHistoryLoaded(false);

    loadRemoteConversation(mode).then(async (conv) => {
      if (conv && conv.messages.length > 0) {
        const restored = remoteToMessages(conv.messages);
        setMessages(restored);
        setLocalHistory(mode, restored);
        sessionIdRef.current = conv.sessionId;
      } else {
        // No remote history — migrate localStorage if available
        if (!migrationDoneRef.current) {
          migrationDoneRef.current = true;
          const allModes = ['path', 'research', 'chat', 'write', 'rp', 'interview'];
          for (const m of allModes) {
            const local = getLocalHistory(m);
            if (local.length > 1) {
              try {
                await fetch('/api/chat-history', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    mode: m,
                    messages: local.map(msg => ({ role: msg.role, content: msg.content })),
                  }),
                });
                clearLocalHistory(m);
              } catch {}
            }
          }
          // After migration, try loading current mode again
          const migrated = await loadRemoteConversation(mode);
          if (migrated && migrated.messages.length > 0) {
            const restored = remoteToMessages(migrated.messages);
            setMessages(restored);
            sessionIdRef.current = migrated.sessionId;
          } else {
            sessionIdRef.current = generateSessionId();
          }
        } else {
          sessionIdRef.current = generateSessionId();
        }
      }
      setHistoryLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-send outreach message from professor card/detail URL params
  const [pendingAutoSend, setPendingAutoSend] = useState<{ msg: string; profId?: string } | null>(() => {
    const action = searchParams.get('action');
    const profName = searchParams.get('name');
    const profId = searchParams.get('prof');
    const msgParam = searchParams.get('msg');
    if (action === 'outreach' && profName) {
      const decodedName = decodeURIComponent(profName);
      return { msg: `请帮我给 ${decodedName} 教授写一封申请信`, profId: profId ?? undefined };
    }
    if (action === 'interview' && profName) {
      const decodedName = decodeURIComponent(profName);
      return { msg: `请帮我模拟和 ${decodedName} 教授的面试`, profId: profId ?? undefined };
    }
    if (msgParam) {
      return { msg: decodeURIComponent(msgParam) };
    }
    return null;
  });

  useEffect(() => {
    if (!pendingAutoSend || autoSentRef.current) return;
    autoSentRef.current = true;
    const profId = searchParams.get('prof');
    if (profId) setPendingProfessorId(profId);
    const timer = setTimeout(() => {
      callApi(pendingAutoSend.msg, messages, pendingAutoSend.profId);
      setPendingAutoSend(null);
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoSend]);

  function switchMode(newMode: AIMode) {
    const cfg = MODES.find(m => m.key === newMode)!;
    setMode(newMode);
    setInput('');
    if (newMode !== 'write') {
      setPendingProfessorId(null);
      setPendingProfessorName(null);
    }
    if (user?.id) {
      // Logged-in: DB is authoritative — show welcome while loading, gate send
      setMessages([{ id: msgId(), role: 'assistant' as const, content: cfg.welcome, timestamp: new Date() }]);
      setHistoryLoaded(false);
      loadRemoteConversation(newMode).then(conv => {
        if (conv && conv.messages.length > 0) {
          const restored = remoteToMessages(conv.messages);
          setMessages(restored);
          setLocalHistory(newMode, restored);
          sessionIdRef.current = conv.sessionId;
        } else {
          sessionIdRef.current = generateSessionId();
        }
        setHistoryLoaded(true);
      });
    } else {
      // Anonymous: localStorage only
      const cached = getLocalHistory(newMode);
      if (cached.length > 0) {
        setMessages(cached);
      } else {
        setMessages([{ id: msgId(), role: 'assistant' as const, content: cfg.welcome, timestamp: new Date() }]);
      }
      sessionIdRef.current = generateSessionId();
    }
  }

  // Core API call, optionally with a professorId for outreach context
  const callApi = useCallback(async (
    txt: string,
    currentMessages: Message[],
    professorId?: string,
  ) => {
    const userMsg: Message = { id: msgId(), role: 'user', content: txt, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setListenPulse(p => p + 1);
    setLoading(true);
    setBgAnim('send');
    if (bgIdleTimer.current) clearTimeout(bgIdleTimer.current);

    try {
      const allMsgs = [...currentMessages, userMsg];
      const body: Record<string, unknown> = {
        mode,
        sessionId: sessionIdRef.current,
        messages: allMsgs.map(m => ({ role: m.role, content: m.content })),
        userId: user?.id,
        userStyleProfile: {
          formality: tonePref === 'professional' ? 'formal' : tonePref === 'direct' ? 'mixed' : 'casual',
          expertise: 'intermediate',
          emotionalState: 'neutral',
        },
      };
      if (professorId) body.professorId = professorId;
      if (profile) {
        body.studentProfile = {
          languagePreference: profile.language_preference ?? undefined,
          personalityTags: profile.personality_tags ?? undefined,
          careerGoal: profile.career_goal ?? undefined,
          preferredCity: profile.preferred_city ?? undefined,
          budget: profile.budget ?? undefined,
        };
      }

      // If profile collection is pending, extract profile from user text in parallel
      const extractionPromise = profileCollectionPending && txt.length >= 20
        ? fetch('/api/chat/extract-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: txt }),
          }).then(r => r.ok ? r.json() : null).catch(() => null)
        : Promise.resolve(null);

      const [res, extractionResult] = await Promise.all([
        fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
        extractionPromise,
      ]);
      const data = await res.json();

      if (res.status === 403 && data.error === 'daily_limit_reached') {
        const upgradeMsg: Message = {
          id: msgId(), role: 'assistant',
          content: data.reply || `今日免费对话次数已用完（${data.usageInfo?.used ?? '?'}/${data.usageInfo?.limit ?? '?'}）`,
          upgradePrompt: { feature: '对话', remaining: 0, message: data.reply },
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, upgradeMsg]);
        return;
      }

      // If extraction succeeded, clear the pending flag
      const extractedProfile: ExtractedProfile | undefined =
        extractionResult?.profile && Object.keys(extractionResult.profile).length > 0
          ? extractionResult.profile
          : undefined;
      if (extractedProfile) setProfileCollectionPending(false);

      // If the API signals profile collection, set pending for next message
      if (data.profileCollectionSuggested) setProfileCollectionPending(true);

      let confidence: ConfidenceLevel | undefined;
      if (mode === 'research') {
        const count = data.citations?.length ?? 0;
        confidence = count >= 3 ? 'high' : count >= 1 ? 'medium' : 'low';
      }

      const rawReply = data.reply ?? '抱歉，我没能生成回复，请再试一次。';
      const olaState = parseOlaState(rawReply);

      const assistantMsg: Message = {
        id: msgId(),
        role: 'assistant',
        content: olaState.clean,
        citations: data.citations,
        academicSearch: data.academicSearch,
        matchedProfessors: data.matchedProfessors,
        scoreCard: data.scoreCard,
        confidence,
        quickReplies: data.quickReplies,
        suggestions: data.suggestions,
        emailPackage: data.emailPackage,
        suggestConsultation: data.suggestConsultation,
        profileData: extractedProfile,
        noResults: mode === 'research' && (!data.citations || data.citations.length === 0),
        olaAssetId: olaState.assetId,
        olaEmotionTag: olaState.emotionTag,
        olaAction: data.olaAction as { type: string; userId?: string } | undefined,
        timestamp: new Date(),
      };
      setTypewriterMsgId(assistantMsg.id);
      setMessages(prev => {
        const updated = [...prev, assistantMsg];
        setLocalHistory(mode, updated);
        return updated;
      });
      if (data.achievement) setToastAchievement(data.achievement);
      // Increment chat usage
      if (user?.id) incrementUsage(supabase, user.id, 'chat').catch(() => {});

      // Positive-moment match hint for free users
      if (data.matchedProfessors?.length && user?.id && profile && (!profile.plan_type || profile.plan_type === 'free')) {
        checkUsage(supabase, user.id, 'match').then(matchUsage => {
          const remaining = matchUsage.limit - matchUsage.used;
          if (remaining <= 1 && remaining >= 0 && matchUsage.limit > 0) {
            setTimeout(() => {
              setMessages(prev => [...prev, {
                id: msgId(), role: 'assistant',
                content: remaining === 0
                  ? '今天的匹配次数用完啦，明天会刷新。急着找更多导师的话，升级后每天可以匹配 10 次～'
                  : `今天还剩 ${remaining} 次匹配机会，明天刷新。`,
                timestamp: new Date(),
              }]);
            }, 2000);
          }
        }).catch(() => {});
      }

      lastMessageTimeRef.current = Date.now();
    } catch {
      const errMsg: Message = {
        id: msgId(), role: 'assistant',
        content: '抱歉，网络出了点问题。请稍后再试。',
        timestamp: new Date(),
      };
      setMessages(prev => {
        const updated = [...prev, errMsg];
        setLocalHistory(mode, updated);
        return updated;
      });
    } finally {
      setLoading(false);
      setBgAnim('reply');
      bgIdleTimer.current = setTimeout(() => setBgAnim('idle'), 5000);
    }
  }, [mode, tonePref, user, profileCollectionPending, refreshProfile]);

  // Auto-send from URL params (professor outreach)
  const sendMessageWithProfessor = useCallback(async (txt: string, professorId?: string) => {
    setInput('');
    await callApi(txt, messages, professorId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callApi]);

  const sendMessage = useCallback(async (text?: string) => {
    const txt = (text ?? input).trim();
    if (!txt || loading || !historyLoaded) return;

    // Free trial: anonymous users get 3 messages before login required
    if (!user) {
      const FREE_MSG_LIMIT = 3;
      const count = parseInt(localStorage.getItem('ola_free_msgs') || '0', 10);
      if (count >= FREE_MSG_LIMIT) {
        showLogin();
        return;
      }
      localStorage.setItem('ola_free_msgs', String(count + 1));
    }

    // Check chat_turn usage (logged-in users only)
    if (user) {
      const chatUsage = await checkUsage(supabase, user.id, 'chat');
      if (!chatUsage.allowed) {
        const upgradeMsg: Message = {
          id: msgId(), role: 'assistant',
          content: `你今天的对话次数已用完（${chatUsage.used}/${chatUsage.limit}）`,
          upgradePrompt: { feature: '对话', remaining: 0 },
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, upgradeMsg]);
        return;
      }
    }

    // Detect handoff intent
    if (/转人工|真人|人工客服|人工顾问|真人顾问|找顾问|联系顾问|talk to (a )?human|real person/i.test(txt)) {
      const userMsg: Message = { id: msgId(), role: 'user', content: txt, timestamp: new Date() };
      const handoffMsg: Message = {
        id: msgId(), role: 'assistant',
        content: '好的，帮你转接真人顾问～',
        handoffCard: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg, handoffMsg]);
      setInput('');
      return;
    }

    // Handle "跳过" for profile capture questions
    if (txt === '跳过') {
      const userMsg: Message = { id: msgId(), role: 'user', content: txt, timestamp: new Date() };
      const skipMsg: Message = {
        id: msgId(), role: 'assistant',
        content: '没问题，随时可以补充~ 有什么想问的尽管说！',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg, skipMsg]);
      setInput('');
      return;
    }

    // Detect batch intent: "批量" or "多位" or "所有教授" + email keywords
    const isBatchRequest = mode === 'write' && /批量|多位|所有教授|多封|多个教授/i.test(txt);
    if (isBatchRequest) {
      // Extract matched professors from latest AI message if available
      const lastAiMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.matchedProfessors?.length);
      const profs = lastAiMsg?.matchedProfessors?.map(p => ({
        id: p.professorId,
        name: p.name,
        institution: p.institution,
        matchScore: p.matchScore,
      }));
      if (profs?.length) {
        handleBatchColdEmails(profs.map(p => p.id));
        return;
      }
      // No prior professors in conversation — ask AI to search first (no credit consumed for search)
      setInput('');
      callApi(txt, messages);
      return;
    }

    const isEmailRequest = mode === 'write' && /申请信|email|生成|帮我写/i.test(txt) && messages.length > 1;
    if (isEmailRequest) {
      if (!user) { showLogin(); return; }
      setPendingEmailText(txt);
      setShowCreditConfirm(true);
      return;
    }

    setInput('');

    // Handle file attachment — upload + extract text + prepend to message
    if (attachedFile) {
      const file = attachedFile.file;
      const fileType = attachedFile.type;
      setAttachedFile(null);

      // Upload file
      const uploadFd = new FormData();
      uploadFd.append('file', file);
      uploadFd.append('fileType', fileType);
      fetch('/api/user/files', { method: 'POST', body: uploadFd }).catch(() => {});

      // For PDFs/docs, try to extract text via resume parser
      if (file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        try {
          const parseFd = new FormData();
          parseFd.append('file', file);
          const parseRes = await fetch('/api/user/profile/parse', { method: 'POST', body: parseFd });
          if (parseRes.ok) {
            const parseData = await parseRes.json();
            const extractedText = parseData.rawText || JSON.stringify(parseData.profile || {});
            const enrichedMsg = `[用户上传了文件：${file.name}]\n以下是文件内容：\n${extractedText.slice(0, 3000)}\n\n用户的问题：${txt}`;
            await callApi(enrichedMsg, messages, pendingProfessorId ?? undefined);
            return;
          }
        } catch { /* fall through */ }
      }

      // For images or failed extraction, just note the file
      const enrichedMsg = `[用户上传了文件：${file.name}（${fileType}）]\n\n${txt}`;
      await callApi(enrichedMsg, messages, pendingProfessorId ?? undefined);
      return;
    }

    await callApi(txt, messages, pendingProfessorId ?? undefined);
  }, [input, loading, historyLoaded, messages, mode, callApi, pendingProfessorId, attachedFile]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function setFeedback(id: string, rating: FeedbackRating) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, feedback: rating } : m));
    if (rating === 'unhelpful') {
      consecutiveUnhelpfulRef.current++;
      if (consecutiveUnhelpfulRef.current >= 2) {
        consecutiveUnhelpfulRef.current = 0;
        setMessages(prev => [...prev, {
          id: msgId(), role: 'assistant',
          content: '看起来我的回答不太够用… 要不帮你转接真人顾问？顾问老师能给更专业的建议～',
          handoffCard: true,
          timestamp: new Date(),
        }]);
      }
    } else {
      consecutiveUnhelpfulRef.current = 0;
    }
  }

  async function handleFile(file: File, fileType: string = 'resume') {
    setMessages(prev => [...prev, {
      id: msgId(), role: 'user',
      content: `📎 已上传：${file.name}，正在解析…`,
      timestamp: new Date(),
    }]);

    // Upload file to storage
    const uploadFd = new FormData();
    uploadFd.append('file', file);
    uploadFd.append('fileType', fileType);
    fetch('/api/user/files', { method: 'POST', body: uploadFd }).catch(() => {});

    // Parse if it's a resume
    if (fileType === 'resume') {
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
          return;
        }
      } catch {
        // fall through to generic response
      }
    }

    const typeLabels: Record<string, string> = { resume: '简历', transcript: '成绩单', other: '文件' };
    setMessages(prev => [...prev, {
      id: msgId(), role: 'assistant',
      content: `✅ ${typeLabels[fileType] || '文件'}「${file.name}」已保存！你可以在"我的"页面查看已上传的文件。需要我帮你做什么？`,
      timestamp: new Date(),
    }]);
  }

  function clearConversation() {
    const fresh = [{ id: msgId(), role: 'assistant' as const, content: currentMode.welcome, timestamp: new Date() }];
    setMessages(fresh);
    clearLocalHistory(mode);
    sessionIdRef.current = generateSessionId();
    if (user) {
      clearRemoteConversation(mode);
      fetch('/api/chat-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      }).catch(() => {});
    }
  }

  function confirmEmailGeneration() {
    setShowCreditConfirm(false);
    if (!pendingEmailText) return;
    const txt = pendingEmailText;
    setPendingEmailText(null);
    setCredits(prev => Math.max(0, prev - 1));
    callApi(txt, messages, pendingProfessorId ?? undefined).catch(() => {
      setCredits(prev => prev + 1);
    });
  }

  const handleGenerateColdEmail = useCallback(async (professorId: string, professorName: string) => {
    if (!user) { showLogin(); return; }
    if (coldEmailLoading) return;

    // Check email usage
    const usage = await checkUsage(supabase, user.id, 'email');
    if (!usage.allowed) {
      const upgradeMsg: Message = {
        id: msgId(), role: 'assistant',
        content: `本月套磁信额度已用完（${usage.used}/${usage.limit}）`,
        upgradePrompt: {
          feature: '套磁信',
          remaining: 0,
          message: `本月套磁信额度已用完（${usage.used}/${usage.limit}）`,
          actions: [
            { label: '升级订阅', href: '/koala/pricing' },
            { label: '购买积分包', href: '/koala/pricing#credits' },
          ],
        },
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, upgradeMsg]);
      return;
    }

    // Show loading state in message stream
    const loadingMsg: Message = {
      id: msgId(), role: 'assistant',
      content: `正在为你撰写给 ${professorName} 教授的套磁信...`,
      timestamp: new Date(),
    };
    setColdEmailLoading(true);
    setMessages(prev => [...prev, loadingMsg]);

    try {
      const res = await fetch('/api/chat/generate-cold-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professorId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: '生成失败' }));
        if (res.status === 402 || res.status === 403) {
          setMessages(prev => prev.map(m => m.id === loadingMsg.id ? {
            ...m,
            content: errData.error || '套磁信额度已用完',
            upgradePrompt: {
              feature: '套磁信',
              remaining: 0,
              message: errData.error,
              actions: [
                { label: '升级订阅', href: '/koala/pricing' },
                { label: '购买积分包', href: '/koala/pricing#credits' },
              ],
            },
          } : m));
          return;
        }
        throw new Error(errData.error || '生成失败');
      }

      const data = await res.json();

      // Transform matchScores from API array format to ColdEmailCard object format
      const scoreArray: { dimension: string; score: number }[] = data.matchScores ?? [];
      const getScore = (dim: string) => scoreArray.find(s => s.dimension === dim)?.score ?? 50;
      const scores = {
        researchAlignment: getScore('research_alignment'),
        backgroundFit: getScore('background_fit'),
        researchReadiness: getScore('research_readiness'),
        opportunity: getScore('opportunity'),
        overall: 0,
      };
      scores.overall = Math.round(
        (scores.researchAlignment + scores.backgroundFit + scores.researchReadiness + scores.opportunity) / 4
      );

      const coldEmail: ColdEmailData = {
        id: data.id,
        subject: data.subject,
        body: data.body,
        highlights: data.highlights ?? [],
        matchScores: scores,
        creditsUsed: data.creditsUsed ?? 1,
        creditsRemaining: data.creditsRemaining ?? 0,
        professorId,
        professorName: data.professorName ?? professorName,
        professorEmail: data.professorEmail ?? undefined,
      };

      // Replace loading message with result
      const resultMsg: Message = {
        id: loadingMsg.id,
        role: 'assistant',
        content: '以上是根据你的背景和教授的最新研究定制的套磁信。你可以直接编辑内容，满意后复制发送。',
        coldEmailData: coldEmail,
        timestamp: new Date(),
      };
      setMessages(prev => {
        const updated = prev.map(m => m.id === loadingMsg.id ? resultMsg : m);
        setLocalHistory(mode, updated);
        return updated;
      });
      setCredits(data.creditsRemaining ?? 0);

      // Positive-moment upgrade hint for free users
      if (profile && (!profile.plan_type || profile.plan_type === 'free')) {
        const emailUsage = await checkUsage(supabase, user.id, 'email');
        const remaining = emailUsage.limit - emailUsage.used;
        if (remaining <= 2 && remaining >= 0 && emailUsage.limit > 0) {
          const hint = remaining === 0
            ? '🎉 本月免费额度已用完。邀请朋友注册可获得额外额度，或看看升级方案～'
            : `🎉 写得不错！本月还剩 ${remaining} 次免费套磁信额度。`;
          setTimeout(() => {
            setMessages(prev => [...prev, {
              id: msgId(), role: 'assistant',
              content: hint,
              timestamp: new Date(),
            }]);
          }, 1500);
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? {
        ...m,
        content: `套磁信生成失败：${err instanceof Error ? err.message : '请稍后再试'}`,
      } : m));
    } finally {
      setColdEmailLoading(false);
    }
  }, [user, showLogin, coldEmailLoading, mode, profile]);

  const toggleProfessorSelect = useCallback((professorId: string) => {
    setSelectedProfessorIds(prev => {
      const next = new Set(prev);
      if (next.has(professorId)) next.delete(professorId);
      else next.add(professorId);
      return next;
    });
  }, []);

  const handleBatchColdEmails = useCallback(async (professorIds: string[]) => {
    if (!user) { showLogin(); return; }
    if (batchGenerating || professorIds.length === 0) return;

    setBatchGenerating(true);
    const progressMsgId = msgId();
    setMessages(prev => [...prev, {
      id: progressMsgId, role: 'assistant',
      content: `正在批量生成 ${professorIds.length} 封套磁信，请稍候...`,
      timestamp: new Date(),
    }]);

    try {
      const res = await fetch('/api/chat/generate-cold-emails-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professorIds }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: '批量生成失败' }));
        const isQuotaError = res.status === 402 || res.status === 403;
        setMessages(prev => prev.map(m => m.id === progressMsgId ? {
          ...m, content: errData.error || '批量生成失败',
          upgradePrompt: isQuotaError ? {
            feature: '套磁信', remaining: 0,
            message: errData.error,
            actions: [
              { label: '升级订阅', href: '/koala/pricing' },
              { label: '购买积分包', href: '/koala/pricing#credits' },
            ],
          } : undefined,
        } : m));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
            continue;
          }
          if (line.startsWith('data: ')) {
            const eventType = currentEventType;
            currentEventType = '';
            try {
              const data = JSON.parse(line.slice(6));

              if (eventType === 'progress') {
                setMessages(prev => prev.map(m => m.id === progressMsgId ? {
                  ...m, content: `正在生成 ${data.current}/${data.total}...`,
                } : m));
              } else if (eventType === 'email_done') {
                const r = data.result;
                const scoreArray: { dimension: string; score: number }[] = r.matchScores ?? [];
                const getScore = (dim: string) => scoreArray.find((s: { dimension: string; score: number }) => s.dimension === dim)?.score ?? 50;
                const scores = {
                  researchAlignment: getScore('research_alignment'),
                  backgroundFit: getScore('background_fit'),
                  researchReadiness: getScore('research_readiness'),
                  opportunity: getScore('opportunity'),
                  overall: 0,
                };
                scores.overall = Math.round(
                  (scores.researchAlignment + scores.backgroundFit + scores.researchReadiness + scores.opportunity) / 4,
                );

                const emailMsg: Message = {
                  id: msgId(), role: 'assistant',
                  content: `✅ ${r.professorName}（${r.professorUniversity}）`,
                  coldEmailData: {
                    id: r.id,
                    subject: r.subject,
                    body: r.body,
                    highlights: r.highlights ?? [],
                    matchScores: scores,
                    creditsUsed: r.creditsUsed ?? 1,
                    creditsRemaining: r.creditsRemaining ?? 0,
                    professorId: r.professorId,
                    professorName: r.professorName,
                    professorEmail: r.professorEmail ?? undefined,
                  },
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, emailMsg]);
                setCredits(r.creditsRemaining ?? 0);
              } else if (eventType === 'email_error') {
                if (data.billingExhausted) {
                  const errMsg: Message = {
                    id: msgId(), role: 'assistant',
                    content: `❌ ${data.professorName}: ${data.error}`,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, errMsg]);
                } else {
                  const errMsg: Message = {
                    id: msgId(), role: 'assistant',
                    content: `❌ ${data.professorName}: ${data.error}`,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, errMsg]);
                }
              } else if (eventType === 'skipped') {
                const skippedMsg: Message = {
                  id: msgId(), role: 'assistant',
                  content: `剩余 ${data.count} 位教授因本月额度用尽未生成`,
                  upgradePrompt: {
                    feature: '套磁信',
                    remaining: 0,
                    message: `已生成部分套磁信，剩余 ${data.count} 位教授因额度用尽未生成`,
                    actions: [
                      { label: '升级订阅', href: '/koala/pricing' },
                      { label: '购买积分包', href: '/koala/pricing#credits' },
                    ],
                  },
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, skippedMsg]);
              } else if (eventType === 'done') {
                setMessages(prev => prev.map(m => m.id === progressMsgId ? {
                  ...m, content: `批量生成完成！成功 ${data.totalGenerated} 封${data.totalFailed > 0 ? `，失败 ${data.totalFailed} 封` : ''}。`,
                } : m));

                if (data.totalGenerated > 0) {
                  const summaryMsg: Message = {
                    id: msgId(), role: 'assistant',
                    content: `已为你生成 ${data.totalGenerated} 封定制套磁信。每封都根据教授的最新论文和你的背景量身定制。你可以逐封检查和编辑，满意后复制发送。\n\n📬 所有套磁信都已保存到「我的套磁信」页面。`,
                    suggestions: ['查看我的套磁信', '帮我匹配更多教授'],
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, summaryMsg]);
                }
              }
            } catch {
              // skip malformed SSE
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === progressMsgId ? {
        ...m, content: `批量生成失败：${err instanceof Error ? err.message : '请稍后再试'}`,
      } : m));
    } finally {
      setBatchGenerating(false);
      setSelectedProfessorIds(new Set());
    }
  }, [user, showLogin, batchGenerating]);

  const formatTime = (d: Date) => d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const latestEmotion = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].olaEmotionTag) return messages[i].olaEmotionTag;
    }
    return undefined;
  }, [messages]);

  const showChatMascot = !(messages.length === 1 && messages[0].role === 'assistant' && !loading);

  return (
    <div className="flex flex-col bg-white dark:bg-[#080c10]" style={{ height: '100dvh' }}>

      {/* Achievement toast */}
      {toastAchievement && (
        <AchievementBadge
          achievementKey={toastAchievement}
          mode="toast"
          onDismiss={() => setToastAchievement(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 bg-gray-50 dark:bg-[#0d1520] border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/koala/home')}
            className="lg:hidden p-1 -ml-1 text-gray-500 dark:text-[#a8b8ac]"
          >
            <ChevronLeft className="size-5" />
          </button>
          <OlaAvatar assetId="h-09-bubbly-boba-nobg" size="sm" className="flex-shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-base leading-6 tracking-wide text-[#1A1A2E] dark:text-[#D4A843]">
              Ola AI
            </span>
            <span className="text-[10px] text-amber-600 dark:text-[#D4A843]/70">
              学姐小欧 · 在线
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && mode === 'write' && (
            <Link
              href="/koala/pricing#credits"
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border border-amber-200 dark:border-[#c9a96e]/30 text-amber-700 dark:text-[#c9a96e] bg-amber-50 dark:bg-[#c9a96e]/10 hover:bg-amber-100 dark:hover:bg-[#c9a96e]/20 transition-colors"
            >
              <Sparkles size={10} />
              <span>{credits} 积分</span>
            </Link>
          )}
          <button
            onClick={() => {
              setMessages(prev => [...prev, {
                id: msgId(), role: 'assistant',
                content: '帮你转接真人顾问～',
                handoffCard: true,
                timestamp: new Date(),
              }]);
            }}
            title="转人工顾问"
            className="text-[10px] px-2 py-1 rounded-full border border-gray-200 dark:border-white/10 text-gray-500 dark:text-[#8a8078] hover:bg-gray-100 dark:hover:bg-white/5"
          >
            转人工
          </button>
          <button onClick={() => setSidebarOpen(true)} title="对话历史">
            <History className="size-5 text-gray-500 dark:text-[#D4A843]" />
          </button>
          <button onClick={handleExportPdf} disabled={exportingPdf || messages.length <= 1} title="导出对话 PDF">
            <Download className={`size-5 ${exportingPdf ? 'animate-pulse' : ''} ${messages.length <= 1 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-[#D4A843]'}`} />
          </button>
          <button onClick={() => setShowSettings(true)}>
            <Settings className="size-5 text-gray-500 dark:text-[#D4A843]" />
          </button>
        </div>
      </div>

      {/* Mode tabs — horizontally scrollable for 6 modes on mobile */}
      <div className="flex px-2 items-stretch flex-shrink-0 overflow-x-auto scrollbar-hide bg-gray-50 dark:bg-[#0d1520]" style={{ WebkitOverflowScrolling: 'touch' }}>
        {MODES.map(m => {
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => switchMode(m.key)}
              className="flex pt-3 pb-2 flex-col items-center min-w-[80px] flex-shrink-0 flex-1 gap-2"
            >
              <span
                style={{ fontWeight: active ? 700 : 400 }}
                className={`text-xs sm:text-sm leading-5 whitespace-nowrap ${active ? 'text-gray-900 dark:text-[#e8e4dc]' : 'text-gray-400 dark:text-[#5a5550]'}`}
              >
                {m.label}
              </span>
              <div className={`rounded-full w-8 h-0.5 ${active ? 'bg-[#1A1A2E] dark:bg-[#D4A843]' : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5 relative">
        {/* Background mascot layer */}
        <div
          className={`ola-bg-mascot ${(messages.length === 1 && messages[0].role === 'assistant' && !loading) ? 'empty-state' : ''} ${bgAnim === 'send' ? 'ola-bg-send' : bgAnim === 'reply' ? 'ola-bg-reply' : ''}`}
        >
          <OlaAvatar assetId="b-02-confident-pose" size="xl" className="h-full w-auto" />
        </div>

        {/* Welcome screen when no conversation yet */}
        {messages.length === 1 && messages[0].role === 'assistant' && !loading ? (
          <div className="relative z-[1]"><OlaWelcome onSend={(msg) => sendMessage(msg)} /></div>
        ) : (
        <div className="relative z-[1]">
        <div className="flex items-center gap-2 py-2 mb-1">
          <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.08]" />
          <span className="text-[11px] flex-shrink-0 text-gray-400 dark:text-[#5a5550]">今天 {formatTime(messages[0]?.timestamp ?? new Date())}</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.08]" />
        </div>

        {messages.map((msg, idx) => (
          <div key={msg.id}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-0.5`}>
              {msg.role === 'assistant' && (
                <div className="mt-1 mr-2 flex-shrink-0">
                  <OlaAvatar assetId={msg.olaAssetId || 'h-09-bubbly-boba-nobg'} emotionTag={msg.olaEmotionTag} size="sm" />
                </div>
              )}
              <div className="flex flex-col max-w-[80%]">
                <div
                  className={`px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]' : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-[#e8e4dc]'}`}
                  style={msg.role === 'user'
                    ? { borderRadius: '1rem 0.25rem 1rem 1rem', boxShadow: '0 2px 8px rgba(212,168,67,0.20)' }
                    : { borderRadius: '0.25rem 1rem 1rem 1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
                  }
                >
                  {msg.role === 'assistant' && typewriterMsgId === msg.id ? (
                    <>{typewriterText}<span className="animate-pulse">|</span></>
                  ) : (
                    msg.content
                  )}
                  {msg.role === 'assistant' && msg.confidence && typewriterMsgId !== msg.id && (
                    <ConfidenceBadgeInline level={msg.confidence} count={msg.citations?.length} />
                  )}
                </div>

                {msg.role === 'assistant' && msg.scoreCard && <ScoreCardBlock card={msg.scoreCard} />}
                {msg.role === 'assistant' && msg.matchedProfessors && msg.matchedProfessors.length > 0 && (
                  user ? (
                    <>
                      {msg.matchedProfessors.map((p, i) => (
                        <ProfessorMatchCard
                          key={i}
                          match={p}
                          onGenerateEmail={handleGenerateColdEmail}
                          selectable={msg.matchedProfessors!.length > 1}
                          selected={selectedProfessorIds.has(p.professorId)}
                          onToggleSelect={toggleProfessorSelect}
                        />
                      ))}
                      <div className="flex items-center justify-between mt-1.5 ml-1">
                        <p className="text-[11px] text-gray-400 dark:text-[#8a8078]">
                          不是你要找的教授？告诉我正确的教授名字和大学
                        </p>
                        <SharePosterTrigger
                          label="分享"
                          matchCount={msg.matchedProfessors.length}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md text-gray-400 dark:text-[#8a8078] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        />
                      </div>
                      {msg.matchedProfessors.length > 1 && (
                        <button
                          onClick={() => {
                            const ids = selectedProfessorIds.size > 0
                              ? Array.from(selectedProfessorIds)
                              : msg.matchedProfessors!.map(p => p.professorId);
                            handleBatchColdEmails(ids);
                          }}
                          disabled={batchGenerating}
                          className="mt-2 w-full py-2 rounded-xl text-xs font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] disabled:opacity-50"
                        >
                          {batchGenerating ? '⏳ 生成中...' : `📨 批量生成套磁信（${selectedProfessorIds.size > 0 ? selectedProfessorIds.size : msg.matchedProfessors!.length} 封）`}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <ProfessorMatchCard
                        match={msg.matchedProfessors[0]}
                        onGenerateEmail={handleGenerateColdEmail}
                      />
                      {msg.matchedProfessors.length > 1 && (
                        <div className="relative mt-2">
                          <div className="rounded-xl p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 opacity-40 blur-[2px] pointer-events-none">
                            <div className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">🎓 {msg.matchedProfessors[1].name}</div>
                            <div className="text-[11px] mt-0.5 text-gray-500 dark:text-[#8a8078]">{msg.matchedProfessors[1].institution}</div>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => showLogin()}
                        className="mt-2 w-full py-3 rounded-xl text-xs font-semibold bg-[#1A1A2E] dark:bg-[#c9a96e] text-white dark:text-[#080c10] flex items-center justify-center gap-2"
                      >
                        <span>🔒</span>
                        <span>登录查看全部 {msg.matchedProfessors.length} 位匹配教授</span>
                      </button>
                    </>
                  )
                )}
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
                      professorName={pendingProfessorName ?? '目标教授'}
                      professorEmail={msg.emailPackage.professorEmail || undefined}
                      professorGoogleScholar={msg.emailPackage.professorGoogleScholar || undefined}
                      professorProfileUrl={msg.emailPackage.professorProfileUrl || undefined}
                      professorUniversity={msg.emailPackage.professorUniversity || undefined}
                      subjectLine={msg.emailPackage.subjectLine}
                      emailBody={msg.emailPackage.emailBody}
                      followupBody={msg.emailPackage.followupBody}
                      riskNote={msg.emailPackage.riskNote}
                      onRegenerate={() => {
                        setPendingEmailText('请重新生成一封申请信');
                        setShowCreditConfirm(true);
                      }}
                    />
                  </div>
                )}
                {msg.role === 'assistant' && msg.coldEmailData && (
                  <div className="mt-2">
                    <ColdEmailCard
                      subject={msg.coldEmailData.subject}
                      body={msg.coldEmailData.body}
                      highlights={msg.coldEmailData.highlights}
                      matchScores={msg.coldEmailData.matchScores}
                      creditsUsed={msg.coldEmailData.creditsUsed}
                      creditsRemaining={msg.coldEmailData.creditsRemaining}
                      onRegenerate={() => handleGenerateColdEmail(msg.coldEmailData!.professorId, '教授')}
                      coldEmailId={msg.coldEmailData.id}
                      professorId={msg.coldEmailData.professorId}
                      professorName={msg.coldEmailData.professorName}
                      professorEmail={msg.coldEmailData.professorEmail}
                      userPlan={profile?.plan_type}
                    />
                  </div>
                )}
                {msg.role === 'assistant' && msg.upgradePrompt && (
                  <div className="mt-2">
                    <UpgradePrompt
                      feature={msg.upgradePrompt.feature}
                      remaining={msg.upgradePrompt.remaining}
                      message={msg.upgradePrompt.message}
                      actions={msg.upgradePrompt.actions}
                    />
                  </div>
                )}
                {msg.role === 'assistant' && msg.suggestConsultation && <ConsultationBanner />}
                {msg.role === 'assistant' && msg.profileData && (
                  <ProfileCard
                    data={msg.profileData}
                    onConfirm={async (confirmed) => {
                      const res = await fetch('/api/user/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(confirmed),
                      });
                      if (!res.ok) throw new Error('保存失败');
                      refreshProfile();

                      // Auto-send a matching request to Ola using existing tool_use flow
                      const interests = confirmed.research_interests?.join('、') || confirmed.target_field || '';
                      if (!interests) return;
                      const parts: string[] = [`帮我匹配做 ${interests} 方向的导师`];
                      if (confirmed.preferred_universities?.length) {
                        parts.push(`偏好 ${confirmed.preferred_universities.join('、')} 的大学`);
                      }
                      if (confirmed.preferred_city?.length) {
                        parts.push(`希望在 ${confirmed.preferred_city.join('、')}`);
                      }
                      sendMessage(parts.join('，'));
                    }}
                  />
                )}
                {msg.role === 'assistant' && msg.handoffCard && (
                  <OlaHandoffCard
                    userId={user?.id}
                    userEmail={user?.email}
                    messages={messages.map(m => ({ role: m.role, content: m.content }))}
                  />
                )}
                {msg.role === 'assistant' && msg.olaAction?.type === 'show_match' && msg.olaAction.userId && (
                  <MatchProfileCard
                    targetUserId={msg.olaAction.userId}
                    onAction={async (action, targetUserId) => {
                      if (action === 'decline') {
                        sendMessage('不太感兴趣，帮我看看别的同学吧');
                        return;
                      }
                      try {
                        const res = await fetch('/api/ola/matchmaking', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action, targetUserId }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          if (data.error === 'insufficient_credits') {
                            setMessages(prev => [...prev, {
                              id: msgId(), role: 'assistant',
                              content: data.message || '积分不足',
                              upgradePrompt: { feature: '社交牵线', remaining: 0 },
                              timestamp: new Date(),
                            }]);
                          }
                          return;
                        }
                        if (action === 'unlock_profile' && data.profile) {
                          sendMessage(`我解锁了这位同学的资料，学姐帮我看看跟TA聊什么好？`);
                        } else if (action === 'generate_letter' && data.letter) {
                          setMessages(prev => [...prev, {
                            id: msgId(), role: 'assistant',
                            content: `学姐帮你写好啦～\n\n${data.letter}\n\n要发送给TA吗？`,
                            timestamp: new Date(),
                          }]);
                        }
                      } catch {
                        setMessages(prev => [...prev, {
                          id: msgId(), role: 'assistant',
                          content: '哎呀，网络出了点问题，稍后再试试～',
                          timestamp: new Date(),
                        }]);
                      }
                    }}
                  />
                )}
                {msg.role === 'assistant' && msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.quickReplies.map(qr => (
                      <button key={qr} onClick={() => sendMessage(qr)} disabled={loading}
                        className="text-xs px-3 py-1.5 rounded-full border bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/[0.12] text-gray-500 dark:text-[#a09888]"
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
                {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && typewriterMsgId !== msg.id && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.suggestions.map(s => (
                      <button key={s} onClick={() => sendMessage(s)} disabled={loading}
                        className="text-xs px-3 py-1.5 rounded-full border transition-colors bg-white dark:bg-white/[0.08] border-[#D4A843]/30 dark:border-[#D4A843]/20 text-[#8a6c30] dark:text-[#D4A843] hover:bg-[#D4A843]/10"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="mt-1 ml-2 flex-shrink-0">
                  <UserAvatar size={28} name={profile?.display_name} avatarUrl={profile?.avatar_url} />
                </div>
              )}
            </div>

            {msg.role === 'assistant' && !(loading && idx === messages.length - 1) && (
              <FeedbackBar onFeedback={r => setFeedback(msg.id, r)} current={msg.feedback} />
            )}
          </div>
        ))}

        {/* Batch generation progress is handled inline via messages */}

        {loading && <ThinkingBubble mode={mode} />}

        {/* Rating prompt */}
        {showRating && (
          <OlaRatingPrompt
            sessionId={`session_${messages[0]?.timestamp?.getTime() ?? Date.now()}`}
            onClose={() => setShowRating(false)}
          />
        )}

        {/* Feedback card — shown after 5 min idle */}
        {showFeedback && !feedbackDismissed && (
          <div className="flex justify-start mb-0.5">
            <div className="mt-1 mr-2 flex-shrink-0">
              <OlaAvatar assetId="h-09-bubbly-boba-nobg" size="sm" />
            </div>
            <div className="max-w-[80%]">
              <FeedbackCard
                conversationId={`${mode}_${messages[0]?.timestamp?.getTime() ?? Date.now()}`}
                onDismiss={() => { setShowFeedback(false); setFeedbackDismissed(true); }}
              />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
        </div>
        )}
      </div>

      {/* Profile guidance hint */}
      {profile && (profile.profile_completeness ?? 0) < 60 && (
        <div className="flex-shrink-0 px-4 py-2 bg-black/[0.03] dark:bg-white/[0.03]">
          {(profile.profile_completeness ?? 0) < 30 ? (
            <Link href="/koala/my-profile" className="flex items-center justify-center gap-2 no-underline">
              <span className="text-[11px] leading-relaxed text-amber-700 dark:text-[#D4A843]">
                📝 完善个人资料（{profile.profile_completeness ?? 0}%），获得更精准的教授匹配和申请信
              </span>
            </Link>
          ) : (
            <p className="text-[11px] leading-relaxed text-center text-gray-400 dark:text-[#6a6058]">
              💡 多跟我聊聊你的背景和想法，你说得越多，我帮你匹配的导师就越精准哦～
            </p>
          )}
        </div>
      )}

      {/* Free-tier usage indicator */}
      {freeUsageHint && (
        <div className="flex-shrink-0 flex items-center justify-center gap-3 px-4 py-1.5 bg-gray-50/80 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/[0.04]">
          <span className={`text-[10px] ${freeUsageHint.chat.limit - freeUsageHint.chat.used <= 2 ? 'text-amber-500' : 'text-gray-400 dark:text-[#6a6058]'}`}>
            💬 对话 {freeUsageHint.chat.used}/{freeUsageHint.chat.limit}
          </span>
          <span className="text-[10px] text-gray-300 dark:text-[#3a3530]">|</span>
          <span className={`text-[10px] ${freeUsageHint.email.limit - freeUsageHint.email.used <= 0 ? 'text-amber-500' : 'text-gray-400 dark:text-[#6a6058]'}`}>
            ✉️ 套磁信 {freeUsageHint.email.used}/{freeUsageHint.email.limit}
          </span>
        </div>
      )}

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-[#0d1520]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Attached file preview */}
        {attachedFile && (
          <div className="flex items-center gap-2 mx-4 mt-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
            <span className="text-xs">📎</span>
            <span className="text-xs text-gray-700 dark:text-[#e8e4dc] flex-1 truncate">{attachedFile.file.name}</span>
            <span className="text-[10px] text-gray-400">{(attachedFile.file.size / 1024).toFixed(0)}KB</span>
            <button onClick={() => setAttachedFile(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>
        )}
        <div className="flex p-4 items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="size-11 shrink-0 rounded-full flex justify-center items-center bg-gray-100 dark:bg-white/5"
          >
            <Plus className="size-5 text-gray-700 dark:text-[#e8e4dc]" />
          </button>
          <div className="rounded-full px-4 py-2.5 flex-1 bg-gray-100 dark:bg-white/5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onFocus={() => {
                setTimeout(() => textareaRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300);
              }}
              onKeyDown={handleKeyDown}
              placeholder={isVoiceListening ? '正在录音...' : isVoiceTranscribing ? '识别中...' : currentMode.placeholder}
              className="w-full resize-none text-sm outline-none bg-transparent leading-relaxed placeholder:text-gray-400 dark:placeholder:text-[#5a5550] text-gray-900 dark:text-[#e8e4dc]"
              style={{ maxHeight: 120 }}
            />
          </div>
          <VoiceInputButton
            onTranscript={(text) => setInput(prev => prev + text)}
            onListeningChange={setIsVoiceListening}
            onTranscribingChange={setIsVoiceTranscribing}
            size="md"
            maxDuration={30}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || !historyLoaded}
            className={`size-11 shrink-0 rounded-full flex justify-center items-center ${input.trim() && !loading && historyLoaded ? 'bg-[#1A1A2E] dark:bg-[#D4A843]' : 'bg-gray-200 dark:bg-white/[0.08]'}`}
          >
            <Send className="size-4 fill-white text-white" />
          </button>
        </div>
        <p className="text-center text-[10px] pb-2 text-gray-400 dark:text-[#5a5550]">
          Koala 可能出错，重要决策请咨询人工顾问
        </p>
      </div>

      {/* History sidebar */}
      <ChatHistorySidebar
        currentMode={mode}
        currentSessionId={sessionIdRef.current}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSwitchMode={(m) => switchMode(m as typeof mode)}
        onNewConversation={clearConversation}
        onLoadSession={async (sid, m) => {
          const conv = await loadRemoteSession(sid);
          if (conv && conv.messages.length > 0) {
            const restored = remoteToMessages(conv.messages);
            setMessages(restored);
            setLocalHistory(m, restored);
            sessionIdRef.current = conv.sessionId;
            if (m !== mode) setMode(m as AIMode);
          }
        }}
      />

      {showUpload && <FileUploadSheet onClose={() => setShowUpload(false)} onFile={(f, t) => {
        setAttachedFile({ file: f, type: t });
      }} />}
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

      {showChatMascot && (
        <OlaChatMascot
          emotionTag={latestEmotion}
          loading={loading}
          listenPulse={listenPulse}
        />
      )}
    </div>
  );
}
