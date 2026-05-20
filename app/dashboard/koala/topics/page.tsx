'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Topic } from '../../../lib/types';

const FIELD_COLORS: Record<string, { bg: string; text: string }> = {
  'Computer Science': { bg: '#EFF6FF', text: '#1E40AF' },
  'Engineering': { bg: '#FEF3C7', text: '#92400E' },
  'Medicine': { bg: '#DCFCE7', text: '#166534' },
  'Business': { bg: '#F3E8FF', text: '#6B21A8' },
  'Education': { bg: '#FCE7F3', text: '#9D174D' },
};

function getFieldStyle(field?: string) {
  if (!field) return { bg: '#F1F5F9', text: '#475569' };
  return FIELD_COLORS[field] || { bg: '#F1F5F9', text: '#475569' };
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', researchField: '' });

  const fetchTopics = useCallback(async () => {
    try {
      const res = await fetch('/api/topics');
      if (res.ok) {
        const { data } = await res.json();
        setTopics(data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', description: '', researchField: '' });
    setShowModal(true);
  }

  function openEdit(topic: Topic) {
    setEditing(topic);
    setForm({ name: topic.name, description: topic.description, researchField: topic.researchField || '' });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/topics/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const { data } = await res.json();
          setTopics(prev => prev.map(t => t.id === editing.id ? data : t));
        }
      } else {
        const res = await fetch('/api/topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const { data } = await res.json();
          setTopics(prev => [...prev, data]);
        }
      }
      setShowModal(false);
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除此话题？')) return;
    try {
      const res = await fetch(`/api/topics/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTopics(prev => prev.filter(t => t.id !== id));
      }
    } catch { /* ignore */ }
  }

  const filtered = topics.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.researchField || '').toLowerCase().includes(q);
  });

  const fields = [...new Set(topics.map(t => t.researchField).filter(Boolean))] as string[];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
              <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">话题管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理研究话题与方向，共 {topics.length} 个话题</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-[#1A1A2E] dark:bg-blue-600 text-white text-sm rounded-lg hover:bg-[#2A2A3E] dark:hover:bg-blue-700 transition-colors"
        >
          + 新建话题
        </button>
      </div>

      {/* Search & field filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索话题名称或描述..."
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400"
        />
        {fields.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">领域：</span>
            {fields.map(f => {
              const style = getFieldStyle(f);
              return (
                <button
                  key={f}
                  onClick={() => setSearch(search === f ? '' : f)}
                  className={`text-xs px-2.5 py-1 rounded transition-colors ${
                    search === f ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500 dark:ring-offset-gray-900' : ''
                  }`}
                  style={{ backgroundColor: style.bg, color: style.text }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Topic cards grid */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm py-16 text-center">
          <div className="flex justify-center mb-3">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">{search ? '无匹配结果' : '暂无话题，点击右上角创建'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(topic => {
            const style = getFieldStyle(topic.researchField);
            return (
              <div
                key={topic.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">{topic.name}</h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(topic)}
                      className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(topic.id)}
                      className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-4">{topic.description}</p>
                <div className="flex items-center justify-between">
                  {topic.researchField ? (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {topic.researchField}
                    </span>
                  ) : (
                    <span />
                  )}
                  {topic.createdAt && (
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">
                      {new Date(topic.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editing ? '编辑话题' : '新建话题'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">话题名称 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="如：量子计算在机器学习中的应用"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">描述</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="话题简要描述..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">研究领域</label>
                <input
                  type="text"
                  value={form.researchField}
                  onChange={e => setForm(prev => ({ ...prev, researchField: e.target.value }))}
                  placeholder="如：Computer Science"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 text-sm bg-[#1A1A2E] dark:bg-blue-600 text-white rounded-lg hover:bg-[#2A2A3E] dark:hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
