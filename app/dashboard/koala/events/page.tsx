'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Trash2, Save, Image as ImageIcon, Link as LinkIcon, FileText, X, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const EVENT_CATEGORIES = ['cafe', 'cultural', 'nightclub', 'outdoor', 'restaurant', 'music', 'festival', 'other'] as const;
type Category = typeof EVENT_CATEGORIES[number];

const CATEGORY_LABELS: Record<Category, string> = {
  cafe: '咖啡',
  cultural: '文化',
  nightclub: '夜店',
  outdoor: '户外',
  restaurant: '餐厅',
  music: '音乐',
  festival: '节庆',
  other: '其他',
};

interface ParsedEvent {
  event_name: string;
  event_name_cn: string;
  venue: string | null;
  event_date: string | null;
  event_time: string | null;
  category: string;
  description: string | null;
  ola_comment: string | null;
  source_url: string | null;
}

interface StoredEvent {
  id: string;
  city: string;
  event_name: string;
  event_name_cn: string;
  venue: string | null;
  event_date: string | null;
  event_time: string | null;
  category: string;
  description: string | null;
  ola_comment: string | null;
  source: string | null;
  source_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export default function EventsPage() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [image, setImage] = useState<{ base64: string; mediaType: string; name: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [drafts, setDrafts] = useState<ParsedEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [stored, setStored] = useState<StoredEvent[]>([]);
  const [storedTotal, setStoredTotal] = useState(0);
  const [storedPage, setStoredPage] = useState(1);
  const [storedLoading, setStoredLoading] = useState(false);
  const storedPageSize = 50;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const fetchStored = useCallback(async (page = 1) => {
    setStoredLoading(true);
    try {
      const res = await fetch(`/api/admin/events?page=${page}`);
      if (res.ok) {
        const d = await res.json();
        setStored(d.events || []);
        setStoredTotal(d.total || 0);
      }
    } catch { /* ignore */ }
    setStoredLoading(false);
  }, []);

  useEffect(() => { fetchStored(storedPage); }, [fetchStored, storedPage]);

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('只支持图片格式', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('图片大于 5MB，请压缩后再传', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.replace(/^data:[^;]+;base64,/, '');
      setImage({ base64, mediaType: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleParse = async () => {
    if (!text.trim() && !url.trim() && !image) {
      showToast('请粘贴文字 / 链接 / 图片中的至少一种', 'error');
      return;
    }
    setParsing(true);
    setDrafts([]);
    try {
      const res = await fetch('/api/admin/events/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim() || undefined,
          url: url.trim() || undefined,
          imageBase64: image?.base64,
          imageMediaType: image?.mediaType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'AI 整理失败', 'error');
      } else if (Array.isArray(data.events) && data.events.length > 0) {
        setDrafts(data.events);
        showToast(`Ola 整理出 ${data.events.length} 个活动，请确认`, 'success');
      } else {
        showToast('AI 没识别出活动', 'error');
      }
    } catch {
      showToast('网络错误', 'error');
    }
    setParsing(false);
  };

  const updateDraft = (idx: number, patch: Partial<ParsedEvent>) => {
    setDrafts(prev => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const removeDraft = (idx: number) => {
    setDrafts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (drafts.length === 0) return;
    const invalid = drafts.find(d => !d.event_name.trim() || !d.event_name_cn.trim());
    if (invalid) {
      showToast('每个活动的英文名 / 中文名都不能为空', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: drafts }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '入库失败', 'error');
      } else {
        showToast(`已入库 ${data.inserted} 个活动`, 'success');
        setDrafts([]);
        setText('');
        setUrl('');
        setImage(null);
        setStoredPage(1);
        fetchStored(1);
      }
    } catch {
      showToast('网络错误', 'error');
    }
    setSaving(false);
  };

  const storedTotalPages = Math.max(1, Math.ceil(storedTotal / storedPageSize));

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">悉尼活动</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">粘贴素材 → Ola 整理 → 入库 → 学生端 Ola 对话推荐</p>
      </div>

      {/* 输入区 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
            <FileText className="size-3.5" /> 粘贴活动文字（主力 · 最可靠）
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="把活动海报文字 / 公众号文章 / 朋友推荐复制进来…&#10;&#10;示例：&#10;Vivid Sydney 2026 灯光节&#10;5月23日 – 6月14日，每晚 18:00 – 23:00&#10;Circular Quay & Royal Botanic Garden&#10;免费参观，建议工作日晚上去人少"
            rows={6}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              <LinkIcon className="size-3.5" /> 活动链接（可能反爬，失败请改用文字）
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://whatson.cityofsydney.nsw.gov.au/events/…"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              <ImageIcon className="size-3.5" /> 活动图片 / 截图（AI 视觉读图）
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900/40 cursor-pointer hover:border-blue-400 transition-colors"
            >
              {image ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-700 dark:text-gray-200 truncate">📎 {image.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setImage(null); }}
                    className="text-xs text-red-500 hover:text-red-600 flex-shrink-0"
                  >
                    清除
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">点击选择或拖入图片（≤5MB · jpeg/png/gif/webp）</span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageFile(f);
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleParse}
            disabled={parsing || (!text.trim() && !url.trim() && !image)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-pink-500 hover:bg-pink-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Sparkles className="size-4" />
            {parsing ? 'Ola 正在整理…' : '✨ 让 Ola 整理'}
          </button>
        </div>
      </div>

      {/* 待确认卡片 */}
      {drafts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Ola 整理出 {drafts.length} 个活动 — 确认无误后入库
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">所有字段都可改，Ola 点评可手动调整</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="size-4" />
              {saving ? '入库中…' : `确认入库 (${drafts.length})`}
            </button>
          </div>

          <div className="space-y-3">
            {drafts.map((d, i) => (
              <DraftCard
                key={i}
                event={d}
                onChange={(patch) => updateDraft(i, patch)}
                onRemove={() => removeDraft(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 已入库列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CalendarDays className="size-4" /> 已入库活动
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">共 {storedTotal} 条</span>
        </div>

        {storedLoading && stored.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">加载中…</div>
        ) : stored.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">还没有活动 — 试着粘贴一段素材让 Ola 整理</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {stored.map((e) => <StoredRow key={e.id} event={e} />)}
          </div>
        )}

        {storedTotalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">第 {storedPage} / {storedTotalPages} 页</div>
            <div className="flex gap-1">
              <button
                onClick={() => setStoredPage(p => Math.max(1, p - 1))}
                disabled={storedPage <= 1 || storedLoading}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setStoredPage(p => Math.min(storedTotalPages, p + 1))}
                disabled={storedPage >= storedTotalPages || storedLoading}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DraftCard({
  event,
  onChange,
  onRemove,
}: {
  event: ParsedEvent;
  onChange: (patch: Partial<ParsedEvent>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
          <Field label="英文名 *">
            <input
              value={event.event_name}
              onChange={(e) => onChange({ event_name: e.target.value })}
              className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
          <Field label="中文名 *">
            <input
              value={event.event_name_cn}
              onChange={(e) => onChange({ event_name_cn: e.target.value })}
              className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/30 flex-shrink-0"
          title="删除此活动"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Field label="日期 (YYYY-MM-DD)">
          <input
            type="date"
            value={event.event_date || ''}
            onChange={(e) => onChange({ event_date: e.target.value || null })}
            className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </Field>
        <Field label="时间">
          <input
            value={event.event_time || ''}
            placeholder="18:00-23:00"
            onChange={(e) => onChange({ event_time: e.target.value || null })}
            className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </Field>
        <Field label="分类">
          <select
            value={EVENT_CATEGORIES.includes(event.category as Category) ? event.category : 'other'}
            onChange={(e) => onChange({ category: e.target.value })}
            className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {EVENT_CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]} ({c})</option>
            ))}
          </select>
        </Field>
        <Field label="场地">
          <input
            value={event.venue || ''}
            onChange={(e) => onChange({ venue: e.target.value || null })}
            placeholder="Circular Quay"
            className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </Field>
      </div>

      <Field label="描述">
        <textarea
          value={event.description || ''}
          onChange={(e) => onChange({ description: e.target.value || null })}
          rows={2}
          className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
        />
      </Field>

      <Field label="🦘 Ola 学姐点评（一句话，活泼亲切）">
        <textarea
          value={event.ola_comment || ''}
          onChange={(e) => onChange({ ola_comment: e.target.value || null })}
          rows={2}
          className="w-full px-2 py-1.5 text-sm rounded border border-pink-200 dark:border-pink-900/50 bg-pink-50/50 dark:bg-pink-900/10 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-pink-400 resize-y"
        />
      </Field>

      <Field label="来源链接">
        <input
          value={event.source_url || ''}
          onChange={(e) => onChange({ source_url: e.target.value || null })}
          placeholder="https://…"
          className="w-full px-2 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
      {children}
    </div>
  );
}

function StoredRow({ event }: { event: StoredEvent }) {
  const cat = (EVENT_CATEGORIES as readonly string[]).includes(event.category)
    ? CATEGORY_LABELS[event.category as Category]
    : event.category;

  return (
    <div className="px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{event.event_name_cn}</span>
            <span className="text-xs text-gray-400">({event.event_name})</span>
            {!event.is_active && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">已下线</span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{cat}</span>
            {event.source === 'admin_manual' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">手动</span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {event.event_date || '日期未定'}
            {event.event_time && ` · ${event.event_time}`}
            {event.venue && ` @ ${event.venue}`}
          </div>
          {event.ola_comment && (
            <div className="text-xs text-pink-700 dark:text-pink-300 mt-1.5 bg-pink-50/60 dark:bg-pink-900/20 rounded px-2 py-1 inline-block">
              🦘 {event.ola_comment}
            </div>
          )}
        </div>
        {event.source_url && (
          <a
            href={event.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
          >
            来源 ↗
          </a>
        )}
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-[60]">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
          type === 'success'
            ? 'bg-green-50 dark:bg-green-900/80 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
            : 'bg-red-50 dark:bg-red-900/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
        }`}
      >
        <span>{type === 'success' ? '✓' : '✗'}</span>
        <span>{message}</span>
        <button onClick={onClose} className="ml-1 opacity-60 hover:opacity-100">
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
