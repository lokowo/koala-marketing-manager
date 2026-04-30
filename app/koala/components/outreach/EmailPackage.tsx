'use client';
import { useState, useCallback } from 'react';
import { SendTutorial } from './SendTutorial';

interface EmailPackageProps {
  emailId?: string;
  professorName: string;
  professorInstitution?: string;
  professorEmail?: string; // may be null if not collected
  emailSource?: string;
  matchScore?: number;
  subjectLine: string;
  emailBody: string;
  followupBody?: string;
  riskNote?: string;
  onStatusChange?: (status: 'sent' | 'later' | 'abandoned') => void;
}

type CopyState = 'idle' | 'copied' | 'error';
type SendStatus = 'pending' | 'sent' | 'later' | 'abandoned';
type Section = 'followup' | 'tutorial';

function useClipboard() {
  const [state, setState] = useState<CopyState>('idle');
  const [manualText, setManualText] = useState<string | null>(null);

  const copy = useCallback(async (text: string, _label: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback: execCommand
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
      setTimeout(() => setState('idle'), 2000);
    } catch {
      // Ultimate fallback: show manual copy dialog
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
  emailSource,
  matchScore,
  subjectLine,
  emailBody: initialBody,
  followupBody,
  riskNote,
  onStatusChange,
}: EmailPackageProps) {
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<SendStatus>('pending');
  const [openSection, setOpenSection] = useState<Section | null>(null);
  const [mailtoFeedback, setMailtoFeedback] = useState<'none' | 'asking'>('none');
  const clipboard = useClipboard();

  const emailDisplay = professorEmail ?? '邮箱未收录';
  const emailVerified = !!professorEmail;

  function toggleSection(s: Section) {
    setOpenSection(prev => prev === s ? null : s);
  }

  function handleMailto() {
    if (!professorEmail) {
      clipboard.copy(
        `收件人：（请自行查找教授邮箱）\n\n主题：${subjectLine}\n\n正文：\n${body}`,
        '邮件内容'
      );
      return;
    }

    const mailtoUrl = `mailto:${professorEmail}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;

    if (mailtoUrl.length > 2000) {
      // Auto-degrade: too long for mailto
      handleCopyAll();
      return;
    }

    try {
      window.location.href = mailtoUrl;
      // After 3s ask if it worked
      setTimeout(() => setMailtoFeedback('asking'), 3000);
    } catch {
      handleCopyAll();
    }
  }

  async function handleCopyAll() {
    const full = `收件人：${emailDisplay}\n\n主题：${subjectLine}\n\n正文：\n${body}`;
    await clipboard.copy(full, '全部内容');
  }

  function updateStatus(s: 'sent' | 'later' | 'abandoned') {
    setStatus(s);
    onStatusChange?.(s);
    // Fire-and-forget API call
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
            <div className="text-sm font-bold text-white">✉️ 套磁信 · {professorName}</div>
            {professorInstitution && <div className="text-[11px] text-white/60 mt-0.5">{professorInstitution}</div>}
          </div>
          {matchScore !== undefined && (
            <div
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: matchScore >= 75 ? '#5a8060' : '#c4a050', color: '#fff' }}
            >
              匹配 {matchScore}%
            </div>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Recipient */}
        <div>
          <div className="text-[10px] font-semibold mb-1" style={{ color: '#907858' }}>📧 收件人</div>
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}
          >
            <span className="flex-1 text-xs font-mono" style={{ color: emailVerified ? '#1a2332' : '#b09878' }}>
              {emailDisplay}
            </span>
            {emailVerified ? (
              <button onClick={() => clipboard.copy(professorEmail!, '邮箱')} className="text-[11px]" style={{ color: '#c4a050' }}>📋</button>
            ) : (
              <a
                href={`https://${professorInstitution?.toLowerCase().includes('unsw') ? 'unsw' : 'google'}.edu.au`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] no-underline"
                style={{ color: '#5a8060' }}
              >
                查找邮箱 →
              </a>
            )}
          </div>
          {emailSource && (
            <div className="text-[10px] mt-0.5" style={{ color: '#b09878' }}>
              via {emailSource}
              {emailSource === 'inferred' && ' ⚠ 系统推测，建议官网确认'}
            </div>
          )}
          {!emailVerified && (
            <div className="mt-1 rounded-xl px-2.5 py-1.5 text-[11px]" style={{ background: '#fff5e8', border: '1px solid #f0d0a0', color: '#8a5020' }}>
              邮箱未收录。请在教授所在大学 Staff Directory 查找后手动填入。
            </div>
          )}
        </div>

        {/* Subject */}
        <div>
          <div className="text-[10px] font-semibold mb-1" style={{ color: '#907858' }}>📝 主题行</div>
          <div
            className="flex items-start gap-2 rounded-xl px-3 py-2"
            style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}
          >
            <span className="flex-1 text-xs leading-relaxed" style={{ color: '#1a2332' }}>{subjectLine}</span>
            <button onClick={() => clipboard.copy(subjectLine, '主题')} className="text-[11px] flex-shrink-0 mt-0.5" style={{ color: '#c4a050' }}>📋</button>
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
          <button
            onClick={() => clipboard.copy(body, '正文')}
            className="mt-1 text-[11px]"
            style={{ color: '#c4a050' }}
          >
            📋 单独复制正文
          </button>
        </div>

        {/* Copy feedback */}
        {clipboard.state === 'copied' && (
          <div className="text-xs text-center py-1 rounded-xl" style={{ background: '#f0f8f2', color: '#5a8060' }}>
            ✅ 已复制到剪贴板！打开邮箱粘贴即可。
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
            <div className="text-[10px]" style={{ color: '#8a5020' }}>点击文本框 → 全选(Ctrl+A) → 复制(Ctrl+C)</div>
            <button onClick={clipboard.clearManual} className="text-[11px]" style={{ color: '#907858' }}>关闭</button>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background: '#e8dcc8' }} />
          <span className="text-[10px] flex-shrink-0" style={{ color: '#b09878' }}>发送方式（选一种）</span>
          <div className="flex-1 h-px" style={{ background: '#e8dcc8' }} />
        </div>

        {/* Method 1: mailto */}
        <div className="rounded-xl p-3 space-y-2" style={{ background: '#f5e8c4', border: '1px solid #e8d098' }}>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">✨</span>
            <span className="text-xs font-semibold" style={{ color: '#8a6c30' }}>方式一：一键打开邮箱（推荐）</span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: '#7d6340' }}>
            点击按钮自动打开你的邮箱 APP，收件人、主题、正文全部预填好，你只需要检查一下然后点发送。
          </p>
          <button
            onClick={handleMailto}
            disabled={status !== 'pending'}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: '#c4a050', color: '#fff', opacity: status !== 'pending' ? 0.5 : 1 }}
          >
            📧 打开邮箱发送
          </button>
          <p className="text-[10px]" style={{ color: '#b09878' }}>支持 Gmail / Outlook / QQ邮箱 / 163邮箱 / Apple Mail</p>

          {mailtoFeedback === 'asking' && (
            <div className="rounded-xl p-2.5" style={{ background: '#fff', border: '1px solid #e8d098' }}>
              <div className="text-[11px] font-semibold mb-2" style={{ color: '#8a6c30' }}>邮箱打开了吗？</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMailtoFeedback('none')}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-medium"
                  style={{ background: '#5a8060', color: '#fff' }}
                >
                  打开了 ✓
                </button>
                <button
                  onClick={() => { setMailtoFeedback('none'); handleCopyAll(); }}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-medium"
                  style={{ background: '#f2ead6', color: '#7d6340', border: '1px solid #d8c8a8' }}
                >
                  没打开，帮我复制
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Method 2: copy all */}
        <div className="rounded-xl p-3 space-y-2" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
          <div className="text-xs font-semibold" style={{ color: '#7d6340' }}>方式二：复制全部，手动粘贴</div>
          <p className="text-[11px]" style={{ color: '#907858' }}>如果方式一打不开，用这个：</p>
          <button
            onClick={handleCopyAll}
            className="w-full py-2 rounded-xl text-sm font-medium"
            style={{ background: '#fff', color: '#7d6340', border: '1px solid #d8c8a8' }}
          >
            📋 复制邮箱+主题+正文
          </button>
          <p className="text-[10px]" style={{ color: '#b09878' }}>复制后打开你的邮箱，新建邮件 → 粘贴即可。</p>
        </div>

        {/* Method 3: step by step */}
        <div className="rounded-xl p-3 space-y-2" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
          <div className="text-xs font-semibold" style={{ color: '#7d6340' }}>方式三：分步复制</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => professorEmail && clipboard.copy(professorEmail, '邮箱')}
              disabled={!professorEmail}
              className="text-[11px] px-3 py-1.5 rounded-lg"
              style={{ background: '#fff', color: '#7d6340', border: '1px solid #d8c8a8', opacity: professorEmail ? 1 : 0.4 }}
            >
              📋 复制邮箱
            </button>
            <button
              onClick={() => clipboard.copy(subjectLine, '主题')}
              className="text-[11px] px-3 py-1.5 rounded-lg"
              style={{ background: '#fff', color: '#7d6340', border: '1px solid #d8c8a8' }}
            >
              📋 复制主题
            </button>
            <button
              onClick={() => clipboard.copy(body, '正文')}
              className="text-[11px] px-3 py-1.5 rounded-lg"
              style={{ background: '#fff', color: '#7d6340', border: '1px solid #d8c8a8' }}
            >
              📋 复制正文
            </button>
          </div>
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
                  onClick={() => clipboard.copy(followupBody, 'Follow-up 邮件')}
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
            {status === 'later' && '⏳ 已保存，可以在"我的套磁信"找到这封信'}
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
