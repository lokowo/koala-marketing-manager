'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconBellRinging, IconPlus, IconRefresh, IconEdit, IconX } from '@tabler/icons-react';

interface TriggerStats {
  shown: number;
  clicked: number;
  dismissed: number;
  click_pct: number | null;
  dismiss_pct: number | null;
  last_shown_at: string | null;
}

interface Trigger {
  id: string;
  trigger_key: string;
  page: string;
  condition: Record<string, unknown>;
  ola_state: string;
  message_zh: string;
  message_en: string;
  action_type: string | null;
  action_payload: Record<string, unknown> | null;
  frequency_limit: string | null;
  priority: number;
  enabled: boolean;
  created_at: string;
  stats: TriggerStats;
}

interface Overview {
  total_shown: number;
  total_clicked: number;
  total_dismissed: number;
  overall_click_pct: number | null;
  recent7d_count: number;
  total_rules: number;
  enabled_rules: number;
}

const OLA_STATES = ['suggest', 'cheer', 'idle', 'urgent', 'celebrate'];

function clickPctColor(pct: number | null, shown: number) {
  if (shown === 0 || pct === null) {
    return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700';
  }
  if (pct > 10) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900';
  }
  if (pct >= 3) {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900';
  }
  return 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900';
}

export default function TriggersAdminPage() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled' | 'low_ctr'>('all');
  const [editing, setEditing] = useState<Trigger | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/triggers');
      const json = await r.json();
      if (r.ok) {
        setTriggers(json.triggers ?? []);
        setOverview(json.overview ?? null);
      } else {
        setToast(json.error || '加载失败');
      }
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return triggers.filter((t) => {
      if (filter === 'enabled' && !t.enabled) return false;
      if (filter === 'disabled' && t.enabled) return false;
      if (filter === 'low_ctr' && (t.stats.shown < 20 || (t.stats.click_pct ?? 100) >= 3)) return false;
      if (!s) return true;
      return (
        t.trigger_key.toLowerCase().includes(s) ||
        t.page.toLowerCase().includes(s) ||
        t.message_zh.toLowerCase().includes(s) ||
        t.message_en.toLowerCase().includes(s)
      );
    });
  }, [triggers, search, filter]);

  async function toggleEnabled(t: Trigger) {
    const next = !t.enabled;
    setTriggers((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled: next } : x)));
    try {
      const r = await fetch('/api/admin/triggers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, enabled: next }),
      });
      if (!r.ok) {
        setTriggers((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled: !next } : x)));
        const json = await r.json().catch(() => ({}));
        setToast(json.error || '切换失败');
      } else {
        setToast(next ? `${t.trigger_key} 已启用` : `${t.trigger_key} 已停用`);
      }
    } catch (e) {
      setTriggers((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled: !next } : x)));
      setToast((e as Error).message);
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <IconBellRinging size={22} className="text-blue-600 dark:text-blue-400" />
            Ola 主动触达管理中心
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            前端引擎已在运行。这里可看每条规则的真实点击率、调文案/频率、上线新规则。
            <span className="text-gray-700 dark:text-gray-300">点击率 &lt;3% 的规则建议改文案或停用。</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <IconRefresh size={14} /> 刷新
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            <IconPlus size={14} /> 新建规则
          </button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <OverviewCard title="总展示次数" value={overview?.total_shown ?? '—'} sub={`${overview?.total_rules ?? 0} 条规则`} />
        <OverviewCard
          title="总点击率"
          value={overview?.overall_click_pct !== null && overview?.overall_click_pct !== undefined ? `${overview.overall_click_pct}%` : '—'}
          sub={`${overview?.total_clicked ?? 0} 次点击`}
          accent={
            overview?.overall_click_pct !== null && overview?.overall_click_pct !== undefined
              ? overview.overall_click_pct > 10
                ? 'green'
                : overview.overall_click_pct >= 3
                ? 'amber'
                : 'red'
              : null
          }
        />
        <OverviewCard title="最近 7 天触发" value={overview?.recent7d_count ?? '—'} sub="次主动消息" />
        <OverviewCard title="生效规则" value={`${overview?.enabled_rules ?? 0} / ${overview?.total_rules ?? 0}`} sub="启用 / 总数" />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {([
            ['all', '全部'],
            ['enabled', '启用'],
            ['disabled', '停用'],
            ['low_ctr', '低点击率 (<3%, ≥20次展示)'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                filter === k
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100 font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索 key / page / 文案"
          className="text-sm px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F172A] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
        />
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {loading && <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">加载中…</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            没有匹配的规则
          </div>
        )}
        {filtered.map((t) => {
          const pct = t.stats.click_pct;
          return (
            <div
              key={t.id}
              className={`bg-white dark:bg-gray-800 border rounded-xl shadow-sm p-4 ${
                t.enabled ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <code className="px-2 py-0.5 text-[12px] rounded bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                      {t.trigger_key}
                    </code>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      page: <code className="text-[11px]">{t.page}</code>
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                      {t.ola_state}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      优先级 {t.priority} · 频率 {t.frequency_limit ?? '—'}
                    </span>
                  </div>
                  <div className="space-y-1 mb-2">
                    <div className="text-sm text-gray-800 dark:text-gray-200">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-1">中</span>
                      {t.message_zh}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-1">英</span>
                      {t.message_en}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="text-gray-500 dark:text-gray-400">
                      展示 <span className="text-gray-900 dark:text-gray-100 font-medium">{t.stats.shown}</span> 次
                    </span>
                    <span className={`px-2 py-0.5 rounded ${clickPctColor(pct, t.stats.shown)}`}>
                      点击率 {pct === null ? '—' : `${pct}%`} ({t.stats.clicked})
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      忽略 {t.stats.dismissed} 次
                    </span>
                    {t.stats.last_shown_at && (
                      <span className="text-gray-400 dark:text-gray-500">
                        · 最近 {new Date(t.stats.last_shown_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.enabled}
                      onChange={() => toggleEnabled(t)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-500 transition-colors relative">
                      <span
                        className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${
                          t.enabled ? 'translate-x-4' : ''
                        }`}
                      />
                    </div>
                  </label>
                  <button
                    onClick={() => setEditing(t)}
                    className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    <IconEdit size={12} /> 编辑
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(editing || creating) && (
        <EditModal
          trigger={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={(msg) => {
            setToast(msg);
            setEditing(null);
            setCreating(false);
            load();
            setTimeout(() => setToast(null), 3500);
          }}
          onError={(msg) => {
            setToast(msg);
            setTimeout(() => setToast(null), 5000);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm shadow-lg max-w-md text-center">
          {toast}
        </div>
      )}
    </div>
  );
}

function OverviewCard({
  title,
  value,
  sub,
  accent,
}: {
  title: string;
  value: string | number;
  sub: string;
  accent?: 'green' | 'amber' | 'red' | null;
}) {
  const accentCls =
    accent === 'green'
      ? 'text-emerald-600 dark:text-emerald-400'
      : accent === 'amber'
      ? 'text-amber-600 dark:text-amber-400'
      : accent === 'red'
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-900 dark:text-gray-100';
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 shadow-sm">
      <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</div>
      <div className={`text-2xl font-light mt-1 ${accentCls}`}>{value}</div>
      <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}

function EditModal({
  trigger,
  onClose,
  onSaved,
  onError,
}: {
  trigger: Trigger | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const isNew = trigger === null;
  const [form, setForm] = useState({
    trigger_key: trigger?.trigger_key ?? '',
    page: trigger?.page ?? '',
    ola_state: trigger?.ola_state ?? 'suggest',
    message_zh: trigger?.message_zh ?? '',
    message_en: trigger?.message_en ?? '',
    action_type: trigger?.action_type ?? '',
    frequency_limit: trigger?.frequency_limit ?? '24:00:00',
    priority: trigger?.priority ?? 0,
    enabled: trigger?.enabled ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.message_zh || !form.message_en) {
      onError('中英文文案都必填');
      return;
    }
    if (isNew && (!form.trigger_key || !form.page)) {
      onError('trigger_key 和 page 必填');
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        action_type: form.action_type || null,
        frequency_limit: form.frequency_limit || null,
      };
      const method = isNew ? 'POST' : 'PATCH';
      const payload = isNew ? body : { id: trigger!.id, ...body };
      const r = await fetch('/api/admin/triggers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        onError(json.error || '保存失败');
      } else {
        onSaved(isNew ? '新规则已创建' : '已保存');
      }
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
            {isNew ? '新建触达规则' : `编辑 · ${trigger!.trigger_key}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {isNew && (
            <>
              <Field label="trigger_key（唯一标识）" required>
                <input
                  value={form.trigger_key}
                  onChange={(e) => setForm((f) => ({ ...f, trigger_key: e.target.value }))}
                  placeholder="例：deadline_3d_warning"
                  className={inputCls}
                />
              </Field>
              <Field label="page（生效页面，* 表示所有）" required>
                <input
                  value={form.page}
                  onChange={(e) => setForm((f) => ({ ...f, page: e.target.value }))}
                  placeholder="例：chat / professors / *"
                  className={inputCls}
                />
              </Field>
            </>
          )}

          <Field label="中文文案" required>
            <textarea
              value={form.message_zh}
              onChange={(e) => setForm((f) => ({ ...f, message_zh: e.target.value }))}
              rows={2}
              className={inputCls}
            />
          </Field>

          <Field label="英文文案" required>
            <textarea
              value={form.message_en}
              onChange={(e) => setForm((f) => ({ ...f, message_en: e.target.value }))}
              rows={2}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="ola_state">
              <select
                value={form.ola_state}
                onChange={(e) => setForm((f) => ({ ...f, ola_state: e.target.value }))}
                className={inputCls}
              >
                {OLA_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="action_type（可选）">
              <input
                value={form.action_type}
                onChange={(e) => setForm((f) => ({ ...f, action_type: e.target.value }))}
                placeholder="navigate / open_modal …"
                className={inputCls}
              />
            </Field>

            <Field label="frequency_limit（如 24:00:00）">
              <input
                value={form.frequency_limit}
                onChange={(e) => setForm((f) => ({ ...f, frequency_limit: e.target.value }))}
                placeholder="HH:MM:SS"
                className={inputCls}
              />
            </Field>

            <Field label="priority">
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                className={inputCls}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
            启用
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? '保存中…' : isNew ? '创建' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </div>
      {children}
    </div>
  );
}
