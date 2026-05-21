'use client';
import { useState, useEffect, useCallback } from 'react';
import { NumberInput } from '../../../../components/ui/number-input';
import { MetricLabel } from '../../../../components/ui/metric-label';
import { METRICS } from '../../../../lib/metrics-glossary';

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
  priority: number;
  enabled: boolean;
  created_at: string;
}

export default function OlaTriggersPage() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Trigger | null>(null);
  const [form, setForm] = useState({ trigger_key: '', page: '', message_zh: '', message_en: '', ola_state: 'suggest', action_type: '', priority: 0 });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Trigger | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTriggers = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/ola-triggers');
      const data = await resp.json();
      setTriggers(data.triggers ?? []);
    } catch {
      setTriggers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTriggers(); }, [fetchTriggers]);

  function openCreate() {
    setEditing(null);
    setForm({ trigger_key: '', page: '', message_zh: '', message_en: '', ola_state: 'suggest', action_type: '', priority: 0 });
    setShowModal(true);
  }

  function openEdit(t: Trigger) {
    setEditing(t);
    setForm({ trigger_key: t.trigger_key, page: t.page, message_zh: t.message_zh, message_en: t.message_en, ola_state: t.ola_state, action_type: t.action_type ?? '', priority: t.priority });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.trigger_key || !form.page || !form.message_zh || !form.message_en) return;
    setSaving(true);
    try {
      const body = { ...form, action_type: form.action_type || null };
      if (editing) {
        await fetch(`/api/admin/ola-triggers/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        await fetch('/api/admin/ola-triggers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      setShowModal(false);
      fetchTriggers();
    } finally { setSaving(false); }
  }

  async function handleToggle(t: Trigger) {
    await fetch(`/api/admin/ola-triggers/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !t.enabled }) });
    fetchTriggers();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/ola-triggers/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      fetchTriggers();
    } finally { setDeleting(false); }
  }

  async function handleSeed() {
    setSeeding(true);
    setSeedResult('');
    try {
      const resp = await fetch('/api/admin/ola-triggers/seed', { method: 'POST' });
      const data = await resp.json();
      setSeedResult(data.message || `已插入 ${data.inserted ?? 0} 条`);
      fetchTriggers();
    } catch { setSeedResult('初始化失败'); }
    finally { setSeeding(false); }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">Ola 触发规则</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理 Ola AI 主动触发气泡规则</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSeed} disabled={seeding} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 disabled:opacity-50">
            {seeding ? '初始化中...' : '🌱 初始化种子'}
          </button>
          <button onClick={openCreate} className="px-4 py-2 text-sm bg-[#1A1A2E] text-white rounded-lg hover:bg-[#2A2A3E]">+ 新增规则</button>
        </div>
      </div>

      {seedResult && <div className="mb-4 p-3 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">{seedResult}</div>}

      {/* Summary Stats */}
      {!loading && triggers.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-[13px] text-gray-500 dark:text-gray-400"><MetricLabel label={METRICS.olaTriggerTotal.label} tooltip={METRICS.olaTriggerTotal.tooltip} /></div>
            <div className="text-2xl font-medium text-gray-900 dark:text-gray-100 mt-1">{triggers.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-[13px] text-gray-500 dark:text-gray-400"><MetricLabel label={METRICS.olaTriggerEnabled.label} tooltip={METRICS.olaTriggerEnabled.tooltip} /></div>
            <div className="text-2xl font-medium text-gray-900 dark:text-gray-100 mt-1">{triggers.filter(t => t.enabled).length}</div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">加载中...</div>
        ) : triggers.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">暂无触发规则</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Key</th>
                <th className="px-4 py-3 text-left">页面</th>
                <th className="px-4 py-3 text-left">消息</th>
                <th className="px-4 py-3 text-center">优先级</th>
                <th className="px-4 py-3 text-center">状态</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {triggers.map(t => (
                <tr key={t.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!t.enabled ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{t.trigger_key}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">{t.page}</span></td>
                  <td className="px-4 py-3 max-w-[250px] truncate text-gray-700 dark:text-gray-300">{t.message_zh}</td>
                  <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{t.priority}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggle(t)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${t.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${t.enabled ? 'translate-x-[18px]' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(t)} className="text-blue-600 hover:text-blue-800 text-xs mr-3">编辑</button>
                    <button onClick={() => setDeleteTarget(t)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{editing ? '编辑触发规则' : '新增触发规则'}</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Trigger Key *</label>
                <input value={form.trigger_key} onChange={e => setForm(f => ({ ...f, trigger_key: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700" placeholder="new_user_welcome" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">页面 *</label>
                  <input value={form.page} onChange={e => setForm(f => ({ ...f, page: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700" placeholder="home / * / professors/[id]" />
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">优先级</label>
                  <NumberInput value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">中文消息 *</label>
                <textarea value={form.message_zh} onChange={e => setForm(f => ({ ...f, message_zh: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 resize-vertical" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">英文消息 *</label>
                <textarea value={form.message_en} onChange={e => setForm(f => ({ ...f, message_en: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 resize-vertical" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Ola 状态</label>
                  <select value={form.ola_state} onChange={e => setForm(f => ({ ...f, ola_state: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {['welcome', 'suggest', 'sleepy', 'cheer', 'celebrate', 'surprise', 'focus'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">动作类型</label>
                  <select value={form.action_type} onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">无</option>
                    <option value="open_chat">打开对话</option>
                    <option value="navigate">跳转页面</option>
                    <option value="show_pricing">显示定价</option>
                    <option value="show_url_input">URL 输入</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-[#1A1A2E] text-white rounded-lg hover:bg-[#2A2A3E] disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">确定删除触发规则「{deleteTarget.trigger_key}」？</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">取消</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
