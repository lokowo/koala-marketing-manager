'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Settings, Plus, Send, Sparkles, PawPrint, Mic, MicOff } from 'lucide-react';
import VoiceInputButton from '../../components/VoiceInputButton';
import Link from 'next/link';
import { useAuth } from '../components/AuthContext';
import { BRAND } from '../../lib/constants';
import type { AIMode } from '../../lib/constants';
import type { ProfessorMatch, ScoreCard } from '../../lib/types';
import { ExtendedReadingPanel } from '../components/ai/ExtendedReadingPanel';
import type { PaperData } from '../components/ai/PaperCitationCard';
import { EmailPackage } from '../components/outreach/EmailPackage';
import { BatchEmailFlow } from '../components/outreach/BatchEmailFlow';
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
  professorEmail?: string | null;
  professorGoogleScholar?: string | null;
  professorProfileUrl?: string | null;
  professorUniversity?: string | null;
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

function ProfessorMatchCard({ match }: { match: ProfessorMatch }) {
  const score = match.matchScore;
  const color = score >= 75 ? '#5a8060' : score >= 50 ? '#D4A843' : '#b06040';
  const hasStats = match.hIndex != null || match.paperCount != null || match.citationCount != null;
  return (
    <div className="rounded-xl p-3 mt-2 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
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
        {match.reason && (
          <div className="text-[11px] mt-2 pt-2 leading-relaxed text-gray-500 dark:text-[#a09888] border-t border-gray-200 dark:border-white/[0.08]">{match.reason}</div>
        )}
        {match.opportunityLabel && (
          <div className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-1" style={{ background: 'rgba(90,128,96,0.15)', color: '#5a8060' }}>{match.opportunityLabel}</div>
        )}
      </Link>
      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-white/[0.08]">
        <Link
          href={`/koala/professors/${match.professorId}`}
          className="flex-1 text-center text-[11px] font-medium py-1.5 rounded-lg no-underline bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-[#e8e4dc]"
        >
          查看详情
        </Link>
        <Link
          href={`/koala/chat?action=outreach&prof=${match.professorId}&name=${encodeURIComponent(match.name)}`}
          className="flex-1 text-center text-[11px] font-medium py-1.5 rounded-lg no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
        >
          ✉️ 写申请信
        </Link>
      </div>
    </div>
  );
}

function ScoreCardBlock({ card }: { card: ScoreCard }) {
  return (
    <div className="rounded-xl p-3 mt-2 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
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
            <button key={opt.type} onClick={() => handleSelect(opt.type)} className="w-full flex items-center gap-3 rounded-2xl p-4 text-left bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10">
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
          <div className="mt-3 rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(176,96,64,0.15)', color: '#e08060', border: '1px solid rgba(176,96,64,0.3)' }}>
            {error}
          </div>
        )}
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className="hidden" onChange={handleFileChange} />
        <button className="w-full mt-4 py-3 rounded-2xl text-sm font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-[#8a8078]" onClick={onClose}>取消</button>
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
          <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: 'rgba(176,96,64,0.15)', border: '1px solid rgba(176,96,64,0.3)', color: '#e08060' }}>
            积分不足！可前往「工具 → 定价」购买积分包，或升级订阅。
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <button className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-[#8a8078] border border-gray-200 dark:border-white/10" onClick={onCancel}>取消</button>
          {remaining > 0 ? (
            <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]" onClick={onConfirm}>确认生成（−1 积分）</button>
          ) : (
            <Link href="/koala/tools" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">去购买积分</Link>
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
        <a href={`weixin://dl/chat?username=${BRAND.wechat}`} className="flex-1 py-1.5 rounded-lg text-[11px] font-medium text-center no-underline bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 text-amber-700 dark:text-[#D4A843]">💬 微信咨询</a>
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
            className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(176,96,64,0.1)', color: '#e08060', border: '1px solid rgba(176,96,64,0.3)' }}
          >
            🗑️ 清除对话记录
          </button>
          <Link
            href="/login"
            onClick={onClose}
            className="block w-full py-2.5 rounded-xl text-sm font-medium text-center no-underline bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-[#8a8078] border border-gray-200 dark:border-white/10"
          >
            退出登录
          </Link>
        </div>
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

async function loadRemoteHistory(userId: string, mode: string): Promise<Message[]> {
  try {
    const res = await fetch(`/api/chat-history?userId=${userId}&mode=${mode}&limit=60`);
    if (!res.ok) return [];
    const { messages } = await res.json();
    if (!messages?.length) return [];
    return messages.map((m: { id: string; role: 'user' | 'assistant'; content: string; metadata?: Record<string, unknown>; created_at: string }) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      matchedProfessors: m.metadata?.matchedProfessors,
      scoreCard: m.metadata?.scoreCard,
      emailPackage: m.metadata?.emailPackage,
      citations: m.metadata?.citations,
      timestamp: new Date(m.created_at),
    })) as Message[];
  } catch { return []; }
}

async function saveRemoteMessages(userId: string, mode: string, msgs: Message[]) {
  try {
    await fetch('/api/chat-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId, mode,
        messages: msgs.map(m => ({
          role: m.role,
          content: m.content,
          metadata: m.matchedProfessors || m.scoreCard || m.emailPackage || m.citations ? {
            matchedProfessors: m.matchedProfessors,
            scoreCard: m.scoreCard,
            emailPackage: m.emailPackage,
            citations: m.citations,
          } : null,
        })),
      }),
    });
  } catch {}
}

async function clearRemoteHistory(userId: string, mode: string) {
  try {
    await fetch('/api/chat-history', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, mode }),
    });
  } catch {}
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
  const { user, profile, showLogin } = useAuth();
  const [mode, setMode] = useState<AIMode>(() => {
    const action = searchParams.get('action');
    if (action === 'outreach') return 'write';
    if (action === 'research') return 'research';
    return 'path';
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    const action = searchParams.get('action');
    const modeKey = action === 'outreach' ? 'write' : action === 'research' ? 'research' : 'path';
    const cfg = MODES.find(m => m.key === modeKey)!;
    // Try loading from localStorage immediately (server-rendered safe)
    const cached = getLocalHistory(modeKey);
    if (cached.length > 0) return cached;
    return [{ id: msgId(), role: 'assistant', content: cfg.welcome, timestamp: new Date() }];
  });
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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
  const [batchProfessors, setBatchProfessors] = useState<{ id: string; name: string; institution?: string; matchScore?: number }[] | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSentRef = useRef(false);

  const currentMode = MODES.find(m => m.key === mode)!;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load history from remote DB when user is logged in
  useEffect(() => {
    if (historyLoaded) return;
    if (!user?.id) { setHistoryLoaded(true); return; }
    loadRemoteHistory(user.id, mode).then(loaded => {
      if (loaded.length > 0) {
        setMessages(loaded);
        setLocalHistory(mode, loaded);
      }
      setHistoryLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mode]);

  // Auto-send outreach message from professor card/detail URL params
  const [pendingAutoSend, setPendingAutoSend] = useState<{ msg: string; profId?: string } | null>(() => {
    const action = searchParams.get('action');
    const profName = searchParams.get('name');
    const profId = searchParams.get('prof');
    if (action === 'outreach' && profName) {
      const decodedName = decodeURIComponent(profName);
      return { msg: `请帮我给 ${decodedName} 教授写一封申请信`, profId: profId ?? undefined };
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
    // Load cached history for this mode
    const cached = getLocalHistory(newMode);
    if (cached.length > 0) {
      setMessages(cached);
    } else {
      setMessages([{ id: msgId(), role: 'assistant', content: cfg.welcome, timestamp: new Date() }]);
    }
    // Also try loading from remote in background
    if (user?.id) {
      loadRemoteHistory(user.id, newMode).then(loaded => {
        if (loaded.length > 0) {
          setMessages(loaded);
          setLocalHistory(newMode, loaded);
        }
      });
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
    setLoading(true);

    try {
      const allMsgs = [...currentMessages, userMsg];
      const body: Record<string, unknown> = {
        mode,
        messages: allMsgs.map(m => ({ role: m.role, content: m.content })),
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

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      setMessages(prev => {
        const updated = [...prev, assistantMsg];
        setLocalHistory(mode, updated);
        if (user?.id) saveRemoteMessages(user.id, mode, [userMsg, assistantMsg]);
        return updated;
      });
      if (data.achievement) setToastAchievement(data.achievement);
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
    }
  }, [mode, tonePref, user]);

  // Auto-send from URL params (professor outreach)
  const sendMessageWithProfessor = useCallback(async (txt: string, professorId?: string) => {
    setInput('');
    await callApi(txt, messages, professorId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callApi]);

  const sendMessage = useCallback(async (text?: string) => {
    const txt = (text ?? input).trim();
    if (!txt || loading) return;
    if (!user) {
      showLogin();
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
        setBatchProfessors(profs);
        return;
      }
      // No prior professors in conversation — ask AI to search first (no credit consumed for search)
      setInput('');
      callApi(txt, messages);
      return;
    }

    const isEmailRequest = mode === 'write' && /申请信|email|生成|帮我写/i.test(txt) && messages.length > 1;
    if (isEmailRequest) {
      setPendingEmailText(txt);
      setShowCreditConfirm(true);
      return;
    }

    setInput('');
    await callApi(txt, messages, pendingProfessorId ?? undefined);
  }, [input, loading, messages, mode, callApi, pendingProfessorId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function setFeedback(id: string, rating: FeedbackRating) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, feedback: rating } : m));
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
    if (user?.id) clearRemoteHistory(user.id, mode);
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

  const formatTime = (d: Date) => d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col bg-white dark:bg-[#080c10]" style={{ height: '100dvh', paddingBottom: 60 }}>

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
          <div className="size-9 rounded-full flex justify-center items-center flex-shrink-0 bg-[#1A1A2E] dark:bg-[#D4A843]">
            <PawPrint className="size-5 text-white dark:text-[#080c10]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base leading-6 tracking-wide text-[#1A1A2E] dark:text-[#D4A843]">
              Koala PhD
            </span>
            <span className="text-[10px] text-amber-600 dark:text-[#D4A843]/70">
              考拉学长 · 在线
            </span>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)}>
          <Settings className="size-5 text-gray-500 dark:text-[#D4A843]" />
        </button>
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
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5">
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
                  <KoalaAvatar size={28} />
                </div>
              )}
              <div className="flex flex-col max-w-[80%]">
                <div
                  className={`px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]' : 'bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-[#e8e4dc]'}`}
                  style={msg.role === 'user'
                    ? { borderRadius: '1rem 0.25rem 1rem 1rem', boxShadow: '0 2px 8px rgba(212,168,67,0.20)' }
                    : { borderRadius: '0.25rem 1rem 1rem 1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
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
                {msg.role === 'assistant' && msg.matchedProfessors && msg.matchedProfessors.length > 0 && (
                  <p className="text-[11px] mt-1.5 ml-1 text-gray-400 dark:text-[#8a8078]">
                    不是你要找的教授？告诉我正确的教授名字和大学
                  </p>
                )}
                {msg.role === 'assistant' && msg.matchedProfessors && msg.matchedProfessors.length > 1 && (
                  <button
                    onClick={() => setBatchProfessors(msg.matchedProfessors!.map(p => ({ id: p.professorId, name: p.name, institution: p.institution, matchScore: p.matchScore })))}
                    className="mt-2 w-full py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-[#0d1520] text-[#1A1A2E] dark:text-[#D4A843] border border-gray-300 dark:border-[#D4A843]/30"
                  >
                    📨 批量生成申请信（{msg.matchedProfessors.length} 封）
                  </button>
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
                {msg.role === 'assistant' && msg.suggestConsultation && <ConsultationBanner />}
                {msg.role === 'assistant' && msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.quickReplies.map(qr => (
                      <button key={qr} onClick={() => sendMessage(qr)} disabled={loading}
                        className="text-xs px-3 py-1.5 rounded-full border bg-gray-100 dark:bg-white/[0.06] border-gray-200 dark:border-white/[0.12] text-gray-500 dark:text-[#a09888]"
                      >
                        {qr}
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

        {/* Initial quick replies */}
        {!loading && messages.length === 1 && messages[0].role === 'assistant' && currentMode.initialReplies && (
          <div className="flex flex-wrap gap-1.5 mt-1 ml-9">
            {currentMode.initialReplies.map(qr => (
              <button key={qr} onClick={() => sendMessage(qr)}
                className="text-xs px-3 py-1.5 rounded-full border bg-gray-100 dark:bg-white/[0.06] border-gray-200 dark:border-white/[0.12] text-gray-500 dark:text-[#a09888]"
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        {/* Batch email flow */}
        {batchProfessors && (
          <div className="mt-2">
            <BatchEmailFlow
              professors={batchProfessors}
              studentProfile={profile ? {
                major: profile.major ?? undefined,
                degreeLevel: profile.degree_level ?? undefined,
                gpa: profile.gpa != null ? String(profile.gpa) : undefined,
                researchInterests: profile.research_description ? [profile.research_description] : undefined,
                university: profile.university ?? undefined,
              } : undefined}
              userId={user?.id}
              onClose={() => setBatchProfessors(null)}
            />
          </div>
        )}

        {loading && (
          <div className="flex justify-start mb-1">
            <div className="mt-1 mr-2 flex-shrink-0">
              <KoalaAvatar size={28} />
            </div>
            <div className="px-3.5 py-2.5 text-sm bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-[#8a8078]" style={{ borderRadius: '0.25rem 1rem 1rem 1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
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

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-[#0d1520]">
        <div className="flex p-4 items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="size-9 shrink-0 rounded-full flex justify-center items-center bg-gray-100 dark:bg-white/[0.06]"
          >
            <Plus className="size-5 text-gray-700 dark:text-[#e8e4dc]" />
          </button>
          <div className="rounded-full px-4 py-2.5 flex-1 bg-gray-100 dark:bg-white/[0.06]">
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
              className="w-full resize-none text-sm outline-none bg-transparent leading-relaxed placeholder:text-gray-400 dark:placeholder:text-[#5a5550] text-gray-900 dark:text-[#e8e4dc]"
              style={{ maxHeight: 120 }}
            />
          </div>
          <VoiceInputButton
            onTranscript={(text) => setInput(prev => prev + text)}
            size="md"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className={`size-9 shrink-0 rounded-full flex justify-center items-center ${input.trim() && !loading ? 'bg-[#1A1A2E] dark:bg-[#D4A843]' : 'bg-gray-200 dark:bg-white/[0.08]'}`}
          >
            <Send className="size-4 fill-white text-white" />
          </button>
        </div>
        <p className="text-center text-[10px] pb-2 text-gray-400 dark:text-[#5a5550]">
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
