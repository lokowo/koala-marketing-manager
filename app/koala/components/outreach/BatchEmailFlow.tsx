'use client';

import { useState, useRef } from 'react';
import { EmailPackage } from './EmailPackage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfessorOption {
  id: string;
  name: string;
  institution?: string;
  matchScore?: number;
  researchAreas?: string[];
}

interface EmailResult {
  professorId: string;
  professorName: string;
  professorInstitution: string;
  subjectLine: string;
  emailBody: string;
  followupBody?: string;
  riskNote?: string;
  emailId?: string;
  error?: string;
}

interface BatchEmailFlowProps {
  professors: ProfessorOption[];
  studentProfile?: {
    major?: string;
    degreeLevel?: string;
    gpa?: string;
    researchInterests?: string[];
    university?: string;
  };
  userId?: string;
  onClose?: () => void;
}

type Step = 'confirm' | 'generating' | 'results';

// ─── BatchEmailFlow ───────────────────────────────────────────────────────────

export function BatchEmailFlow({ professors, studentProfile, userId, onClose }: BatchEmailFlowProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(professors.map(p => p.id)));
  const [step, setStep] = useState<Step>('confirm');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [results, setResults] = useState<EmailResult[]>([]);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const selectedProfs = professors.filter(p => selected.has(p.id));
  const count = selectedProfs.length;

  function toggleProf(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function startGeneration() {
    if (!count) return;
    setStep('generating');
    setProgress(0);
    setResults([]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/outreach/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          professorIds: selectedProfs.map(p => p.id),
          studentProfile,
          tone: 'professional',
          purpose: 'PhD',
          userId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setProgressMsg(err.message ?? '生成失败，请重试');
        setStep('confirm');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n\n');
        buf = lines.pop() ?? '';

        for (const chunk of lines) {
          const dataLine = chunk.replace(/^data: /, '').trim();
          if (!dataLine) continue;
          try {
            const evt = JSON.parse(dataLine);
            if (evt.type === 'progress') {
              setProgress(evt.current / evt.total);
              const prof = professors.find(p => p.id === evt.professorId);
              setProgressMsg(`正在生成第 ${evt.current}/${evt.total} 封：${prof?.name ?? ''}`);
            } else if (evt.type === 'email_done') {
              setResults(prev => [...prev, evt.result]);
            } else if (evt.type === 'email_error') {
              const prof = professors.find(p => p.id === evt.professorId);
              setResults(prev => [...prev, {
                professorId: evt.professorId,
                professorName: prof?.name ?? '未知',
                professorInstitution: prof?.institution ?? '',
                subjectLine: '',
                emailBody: '',
                followupBody: '',
                riskNote: '',
                error: evt.error,
              }]);
            } else if (evt.type === 'done') {
              setProgress(1);
              setProgressMsg(`生成完成！共 ${evt.totalGenerated} 封`);
              setStep('results');
            }
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setProgressMsg('网络错误，请重试');
        setStep('confirm');
      }
    }
  }

  function stopGeneration() {
    abortRef.current?.abort();
    setStep('confirm');
  }

  async function exportDocx() {
    setExporting(true);
    try {
      const exportable = results.filter(r => !r.error);
      const res = await fetch('/api/ai/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exportType: 'batch-emails',
          emails: exportable,
          title: `申请信打包 · ${new Date().toLocaleDateString('zh-CN')}`,
        }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `koala-emails-${Date.now()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  }

  // ── Step: Confirm ──
  if (step === 'confirm') {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #e8dcc8' }}>
        <div className="p-4" style={{ background: '#1a2332' }}>
          <div className="text-sm font-bold text-white">📨 批量生成申请信</div>
          <div className="text-[11px] text-white/60 mt-0.5">每封消耗 1 积分，生成后可单独修改和下载</div>
        </div>

        <div className="p-3 space-y-2">
          <div className="text-[11px] font-semibold mb-1" style={{ color: '#584838' }}>
            选择要发送的教授（{count}/{professors.length}）
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {professors.map(p => (
              <button
                key={p.id}
                onClick={() => toggleProf(p.id)}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                style={{
                  background: selected.has(p.id) ? '#f5e8c4' : '#f7f2e8',
                  border: `1.5px solid ${selected.has(p.id) ? '#c4a050' : '#e8dcc8'}`,
                }}
              >
                <div
                  className="size-4 rounded flex-shrink-0 flex items-center justify-center"
                  style={{ background: selected.has(p.id) ? '#c4a050' : '#e8dcc8' }}
                >
                  {selected.has(p.id) && <span className="text-white text-[10px]">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: '#1a2332' }}>{p.name}</div>
                  {p.institution && <div className="text-[10px] truncate" style={{ color: '#907858' }}>{p.institution}</div>}
                </div>
                {p.matchScore !== undefined && (
                  <div className="text-[10px] font-bold flex-shrink-0" style={{ color: '#c4a050' }}>{p.matchScore}%</div>
                )}
              </button>
            ))}
          </div>

          {progressMsg && (
            <div className="rounded-xl px-3 py-2 text-[11px]" style={{ background: '#fff5e8', color: '#8a5020', border: '1px solid #f0d0a0' }}>
              {progressMsg}
            </div>
          )}

          <div className="rounded-xl px-3 py-2.5 text-[11px]" style={{ background: '#f5e8c4', border: '1px solid #e8d098', color: '#7d6340' }}>
            共选 {count} 位教授，将消耗 <strong>{count} 积分</strong>
          </div>

          <div className="flex gap-2 pt-1">
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#f2ead6', color: '#907858', border: '1px solid #d8c8a8' }}
              >
                取消
              </button>
            )}
            <button
              onClick={startGeneration}
              disabled={!count}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
              style={{ background: count ? '#c4a050' : '#d8c8a8', opacity: count ? 1 : 0.6 }}
            >
              开始生成 {count} 封申请信
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Generating ──
  if (step === 'generating') {
    const pct = Math.round(progress * 100);
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #e8dcc8' }}>
        <div className="p-4" style={{ background: '#1a2332' }}>
          <div className="text-sm font-bold text-white">🔄 正在生成申请信…</div>
          <div className="text-[11px] text-white/60 mt-0.5">{progressMsg}</div>
        </div>
        <div className="p-4 space-y-3">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f0e8d4' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: '#c4a050' }}
            />
          </div>
          <div className="text-center text-sm font-semibold" style={{ color: '#c4a050' }}>{pct}%</div>

          {results.length > 0 && (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {results.map(r => (
                <div key={r.professorId} className="flex items-center gap-2 text-[11px]" style={{ color: r.error ? '#b06040' : '#5a8060' }}>
                  <span>{r.error ? '❌' : '✅'}</span>
                  <span>{r.professorName}</span>
                  {r.error && <span style={{ color: '#b09878' }}>({r.error})</span>}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={stopGeneration}
            className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ background: '#f2ead6', color: '#b06040', border: '1px solid #e8d8c8' }}
          >
            停止生成
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Results ──
  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="rounded-2xl p-3" style={{ background: '#1a2332' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-white">✅ 生成完成</div>
            <div className="text-[11px] text-white/60 mt-0.5">
              成功 {successful.length} 封{failed.length > 0 ? ` · 失败 ${failed.length} 封` : ''}
            </div>
          </div>
          <button
            onClick={exportDocx}
            disabled={!successful.length || exporting}
            className="shrink-0 text-[11px] font-semibold px-3 py-2 rounded-xl text-white transition-opacity"
            style={{ background: '#c4a050', opacity: exporting ? 0.6 : 1 }}
          >
            {exporting ? '导出中…' : '📥 下载申请信合集'}
          </button>
        </div>
        <div className="mt-2 rounded-lg px-2.5 py-2 text-[11px]" style={{ background: 'rgba(255,255,255,0.08)', color: '#e8dcc8' }}>
          📋 申请信已生成！请下载后自行逐封发送。建议每封间隔1-2天。
        </div>
      </div>

      {/* Failed entries */}
      {failed.length > 0 && (
        <div className="rounded-xl p-3 space-y-1" style={{ background: '#fff5e8', border: '1px solid #f0d0a0' }}>
          <div className="text-[11px] font-semibold" style={{ color: '#8a5020' }}>以下教授生成失败：</div>
          {failed.map(r => (
            <div key={r.professorId} className="text-[11px]" style={{ color: '#b06040' }}>
              ❌ {r.professorName}：{r.error}
            </div>
          ))}
        </div>
      )}

      {/* Email cards */}
      {successful.map(r => (
        <EmailPackage
          key={r.professorId}
          emailId={r.emailId}
          professorName={r.professorName}
          professorInstitution={r.professorInstitution}
          subjectLine={r.subjectLine}
          emailBody={r.emailBody}
          followupBody={r.followupBody}
          riskNote={r.riskNote}
        />
      ))}

      {/* Re-export button at bottom */}
      {successful.length > 1 && (
        <button
          onClick={exportDocx}
          disabled={exporting}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white"
          style={{ background: '#1a2332', opacity: exporting ? 0.6 : 1 }}
        >
          {exporting ? '正在导出…' : `📥 下载申请信合集（${successful.length} 封）`}
        </button>
      )}
    </div>
  );
}
