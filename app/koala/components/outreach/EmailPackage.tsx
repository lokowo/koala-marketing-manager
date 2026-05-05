'use client';
import { useState, useCallback } from 'react';
import { SendTutorial } from './SendTutorial';

interface EmailPackageProps {
  emailId?: string;
  professorName: string;
  professorInstitution?: string;
  professorEmail?: string;
  professorGoogleScholar?: string;
  professorProfileUrl?: string;
  professorUniversity?: string;
  emailSource?: string;
  matchScore?: number;
  subjectLine: string;
  emailBody: string;
  followupBody?: string;
  riskNote?: string;
  onStatusChange?: (status: 'sent' | 'later' | 'abandoned') => void;
  onRegenerate?: () => void;
}

type CopyState = 'idle' | 'copied' | 'error';
type SendStatus = 'pending' | 'sent' | 'later' | 'abandoned';
type Section = 'followup' | 'tutorial';

function useClipboard() {
  const [state, setState] = useState<CopyState>('idle');
  const [manualText, setManualText] = useState<string | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
        document.body.appendChild(el);
        el.focus();
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        if (!ok) throw new Error('execCommand failed');
      }
      setState('copied');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setManualText(text);
      setState('error');
    }
  }, []);

  return { state, copy, manualText, clearManual: () => setManualText(null) };
}

export function EmailPackage({
  emailId,
  professorName,
  professorInstitution,
  professorEmail,
  professorGoogleScholar,
  professorProfileUrl,
  professorUniversity,
  emailSource,
  matchScore,
  subjectLine,
  emailBody: initialBody,
  followupBody,
  riskNote,
  onStatusChange,
  onRegenerate,
}: EmailPackageProps) {
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<SendStatus>('pending');
  const [openSection, setOpenSection] = useState<Section | null>(null);
  const clipboard = useClipboard();

  const hasEmail = !!professorEmail;
  const institution = professorInstitution || professorUniversity || '';

  function toggleSection(s: Section) {
    setOpenSection(prev => prev === s ? null : s);
  }

  function handleCopyAll() {
    const full = `Subject: ${subjectLine}\n\n${body}`;
    clipboard.copy(full);
  }

  function handleMailtoOpen() {
    if (!professorEmail) return;
    const mailtoUrl = `mailto:${professorEmail}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
    if (mailtoUrl.length > 2000) {
      handleCopyAll();
      return;
    }
    clipboard.copy(`Subject: ${subjectLine}\n\n${body}`);
    window.location.href = mailtoUrl;
  }

  function updateStatus(s: 'sent' | 'later' | 'abandoned') {
    setStatus(s);
    onStatusChange?.(s);
    if (emailId) {
      fetch('/api/outreach/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, status: s }),
      }).catch(() => {});
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #e8dcc8' }}>
      {/* Header */}
      <div className="p-3" style={{ background: '#1a2332' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">✉️ 申请信 · {professorName}</div>
            {institution && <div className="text-[11px] text-white/60 mt-0.5">{institution}</div>}
          </div>
          {matchScore !== undefined && (
            <div className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: matchScore >= 75 ? '#5a8060' : '#c4a050', color: '#fff' }}>
              匹配 {matchScore}%
            </div>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Generated success message */}
        <div className="rounded-xl px-3 py-2.5" style={{ background: '#f0f8f2', border: '1px solid #c0e0c8' }}>
          <div className="text-xs font-semibold" style={{ color: '#2d6a3e' }}>
            {hasEmail ? '✅ 申请信已生成！' : '📋 邮件已生成！教授邮箱需要你手动查找'}
          </div>
        </div>

        {/* Subject */}
        <div>
          <div className="text-[10px] font-semibold mb-1" style={{ color: '#907858' }}>📝 主题行</div>
          <div className="flex items-start gap-2 rounded-xl px-3 py-2"
            style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
            <span className="flex-1 text-xs leading-relaxed" style={{ color: '#1a2332' }}>{subjectLine}</span>
            <button onClick={() => clipboard.copy(subjectLine)} className="text-[11px] flex-shrink-0 mt-0.5" style={{ color: '#c4a050' }}>📋</button>
          </div>
        </div>

        {/* Body */}
        <div>
          <div className="text-[10px] font-semibold mb-1" style={{ color: '#907858' }}>📄 邮件正文（可修改）</div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={8}
            className="w-full rounded-xl px-3 py-2 text-xs leading-relaxed outline-none resize-none"
            style={{ background: '#f2ead6', border: '1px solid #e8dcc8', color: '#1a2332', fontFamily: 'inherit' }}
          />
        </div>

        {/* Copy feedback */}
        {clipboard.state === 'copied' && (
          <div className="text-xs text-center py-1.5 rounded-xl" style={{ background: '#f0f8f2', color: '#5a8060' }}>
            ✅ 已复制到剪贴板！
          </div>
        )}

        {/* Manual copy fallback */}
        {clipboard.manualText && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: '#fff5e8', border: '1px solid #f0d0a0' }}>
            <div className="text-[11px] font-semibold" style={{ color: '#8a5020' }}>自动复制失败，请手动全选复制：</div>
            <textarea
              readOnly
              value={clipboard.manualText}
              rows={5}
              className="w-full rounded-lg px-2 py-1.5 text-[10px] outline-none cursor-pointer"
              style={{ background: '#fff', border: '1px solid #f0d0a0', color: '#584838', fontFamily: 'monospace' }}
              onClick={e => (e.target as HTMLTextAreaElement).select()}
            />
            <button onClick={clipboard.clearManual} className="text-[11px]" style={{ color: '#907858' }}>关闭</button>
          </div>
        )}

        {/* ── Action buttons: different UX based on email availability ── */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background: '#e8dcc8' }} />
          <span className="text-[10px] flex-shrink-0" style={{ color: '#b09878' }}>发送方式</span>
          <div className="flex-1 h-px" style={{ background: '#e8dcc8' }} />
        </div>

        {hasEmail ? (
          /* ── Has email: show mailto + copy options ── */
          <div className="space-y-2">
            <button
              onClick={handleMailtoOpen}
              disabled={status !== 'pending'}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: '#c4a050', color: '#fff', opacity: status !== 'pending' ? 0.5 : 1 }}
            >
              📤 复制并打开邮箱
            </button>
            <button
              onClick={handleCopyAll}
              className="w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ background: '#f2ead6', color: '#7d6340', border: '1px solid #d8c8a8' }}
            >
              📋 仅复制内容
            </button>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
              <span className="text-[10px]" style={{ color: '#907858' }}>收件人：</span>
              <span className="flex-1 text-xs font-mono" style={{ color: '#1a2332' }}>{professorEmail}</span>
              <button onClick={() => clipboard.copy(professorEmail!)} className="text-[11px]" style={{ color: '#c4a050' }}>📋</button>
            </div>
            {emailSource && (
              <div className="text-[10px]" style={{ color: '#b09878' }}>
                邮箱来源：{emailSource}
                {emailSource === 'inferred' && ' ⚠ 系统推测，建议官网确认'}
              </div>
            )}
          </div>
        ) : (
          /* ── No email: mailto without to + guide to find email ── */
          <div className="space-y-2">
            <button
              onClick={() => {
                const mailtoUrl = `mailto:?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
                if (mailtoUrl.length > 2000) {
                  handleCopyAll();
                  return;
                }
                clipboard.copy(`Subject: ${subjectLine}\n\n${body}`);
                window.location.href = mailtoUrl;
              }}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: '#c4a050', color: '#fff' }}
            >
              📤 复制并打开邮箱（需手动填收件人）
            </button>
            <button
              onClick={handleCopyAll}
              className="w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ background: '#f2ead6', color: '#7d6340', border: '1px solid #d8c8a8' }}
            >
              📋 仅复制内容
            </button>

            {(professorGoogleScholar || professorProfileUrl) && (
              <a
                href={professorGoogleScholar || professorProfileUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 no-underline"
                style={{ background: '#f2ead6', color: '#1a2332', border: '1px solid #d8c8a8' }}
              >
                🔍 查找教授邮箱
                <span className="text-[10px]" style={{ color: '#907858' }}>
                  ({professorGoogleScholar ? 'Google Scholar' : '大学主页'})
                </span>
              </a>
            )}

            {!professorGoogleScholar && !professorProfileUrl && (
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(`${professorName} ${institution} email`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 no-underline"
                style={{ background: '#f2ead6', color: '#1a2332', border: '1px solid #d8c8a8' }}
              >
                🔍 查找教授邮箱
                <span className="text-[10px]" style={{ color: '#907858' }}>(Google搜索)</span>
              </a>
            )}
          </div>
        )}

        {/* Email tip */}
        <div className="rounded-xl px-3 py-2.5 text-[11px] leading-relaxed" style={{ background: '#f8f5ef', border: '1px solid #e8dcc8', color: '#907858' }}>
          💡 澳洲教授邮箱常见格式：首字母.姓氏@university.edu.au（如 j.smith@unsw.edu.au）。你也可以在教授的大学官网主页找到联系方式。
        </div>

        {/* Follow-up panel */}
        {followupBody && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e8dcc8' }}>
            <button
              className="w-full flex items-center justify-between px-3 py-2.5"
              style={{ background: '#f2ead6' }}
              onClick={() => toggleSection('followup')}
            >
              <span className="text-[11px] font-medium" style={{ color: '#7d6340' }}>▶ 查看 14天后的跟进邮件</span>
              <span className="text-[10px]" style={{ color: '#b09878' }}>{openSection === 'followup' ? '收起' : '展开'}</span>
            </button>
            {openSection === 'followup' && (
              <div className="px-3 pb-3">
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap mt-2" style={{ color: '#584838', fontFamily: 'inherit' }}>
                  {followupBody}
                </pre>
                <button
                  onClick={() => clipboard.copy(followupBody)}
                  className="mt-2 text-[11px]"
                  style={{ color: '#c4a050' }}
                >
                  📋 复制 Follow-up
                </button>
              </div>
            )}
          </div>
        )}

        {/* Risk note */}
        {riskNote && (
          <div className="rounded-xl px-3 py-2.5" style={{ background: '#fff8f0', border: '1px solid #f0dcc0' }}>
            <div className="text-[10px] font-semibold mb-1" style={{ color: '#8a5020' }}>💡 内部提醒</div>
            <div className="text-[11px] leading-relaxed" style={{ color: '#7d4820' }}>{riskNote}</div>
          </div>
        )}

        {/* Regenerate */}
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="w-full py-2 rounded-xl text-xs font-medium"
            style={{ background: '#f2ead6', color: '#7d6340', border: '1px solid #d8c8a8' }}
          >
            🔄 重新生成
          </button>
        )}

        {/* Status */}
        {status === 'pending' ? (
          <div>
            <div className="text-[11px] font-semibold mb-2" style={{ color: '#7d6340' }}>发出去了吗？</div>
            <div className="flex gap-2">
              <button
                onClick={() => updateStatus('sent')}
                className="flex-1 py-2 rounded-xl text-xs font-medium"
                style={{ background: '#5a8060', color: '#fff' }}
              >
                ✅ 已发送
              </button>
              <button
                onClick={() => updateStatus('later')}
                className="flex-1 py-2 rounded-xl text-xs font-medium"
                style={{ background: '#f2ead6', color: '#7d6340', border: '1px solid #d8c8a8' }}
              >
                ⏳ 稍后再发
              </button>
              <button
                onClick={() => updateStatus('abandoned')}
                className="flex-1 py-2 rounded-xl text-xs font-medium"
                style={{ background: '#f2ead6', color: '#b06040', border: '1px solid #d8c8a8' }}
              >
                ❌ 放弃
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2 rounded-xl text-xs font-medium"
            style={{
              background: status === 'sent' ? '#f0f8f2' : status === 'later' ? '#f5e8c4' : '#fff0f0',
              color: status === 'sent' ? '#5a8060' : status === 'later' ? '#8a6c30' : '#b06040',
              border: `1px solid ${status === 'sent' ? '#c0e0c8' : status === 'later' ? '#e8d098' : '#f0c0c0'}`,
            }}
          >
            {status === 'sent' && '✅ 已标记为已发送，14 天后我会提醒你跟进'}
            {status === 'later' && '⏳ 已保存，可以在"我的申请信"找到这封信'}
            {status === 'abandoned' && '❌ 已放弃'}
          </div>
        )}

        {/* Tutorial */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e8dcc8' }}>
          <button
            className="w-full flex items-center justify-between px-3 py-2.5"
            style={{ background: '#f2ead6' }}
            onClick={() => toggleSection('tutorial')}
          >
            <span className="text-[11px] font-medium" style={{ color: '#7d6340' }}>❓ 不知道怎么发？点这里看教程</span>
            <span className="text-[10px]" style={{ color: '#b09878' }}>{openSection === 'tutorial' ? '收起' : '展开'}</span>
          </button>
          {openSection === 'tutorial' && (
            <div className="px-3 pb-3 pt-2">
              <SendTutorial />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
