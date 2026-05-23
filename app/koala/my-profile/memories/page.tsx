'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../components/AuthContext';

interface MemoryItem {
  id: string;
  memory_text: string;
  category: string;
  confidence: number;
  created_at: string;
  updated_at: string | null;
}

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  education:   { emoji: '📚', label: '教育' },
  academic:    { emoji: '📚', label: '学术' },
  research:    { emoji: '🔬', label: '研究' },
  publication: { emoji: '📝', label: '论文' },
  preference:  { emoji: '🎯', label: '偏好' },
  experience:  { emoji: '💼', label: '经历' },
  skill:       { emoji: '🛠', label: '技能' },
  language:    { emoji: '🌐', label: '语言' },
  personal:    { emoji: '👤', label: '个人' },
};

function confidenceLabel(c: number): { text: string; cls: string } {
  if (c >= 0.9) return { text: '高', cls: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' };
  if (c >= 0.7) return { text: '中', cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' };
  return { text: '低', cls: 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400' };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

const CARD_CLS = 'bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[#D4A843]/[0.08]';
const DIVIDER_CLS = 'border-gray-100 dark:border-[#D4A843]/[0.06]';

export default function MemoriesPage() {
  const { user, showLogin } = useAuth();
  const [grouped, setGrouped] = useState<Record<string, MemoryItem[]>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/user/memories');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setGrouped(data.memories ?? {});
      setTotal(data.total ?? 0);
    } catch {
      console.error('[memories] fetch failed');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const handleEdit = (mem: MemoryItem) => {
    setEditingId(mem.id);
    setEditText(mem.memory_text);
  };

  const handleSave = async (id: string) => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/user/memories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory_text: editText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setGrouped(prev => {
          const next = { ...prev };
          for (const cat of Object.keys(next)) {
            next[cat] = next[cat].map(m => m.id === id ? { ...m, ...data.memory } : m);
          }
          return next;
        });
      }
    } catch {
      console.error('[memories] save failed');
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/user/memories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setGrouped(prev => {
          const next: Record<string, MemoryItem[]> = {};
          for (const [cat, mems] of Object.entries(prev)) {
            const filtered = mems.filter(m => m.id !== id);
            if (filtered.length > 0) next[cat] = filtered;
          }
          return next;
        });
        setTotal(t => Math.max(0, t - 1));
        setDeletingId(null);
      }
    } catch {
      console.error('[memories] delete failed');
    }
  };

  const latestUpdate = Object.values(grouped)
    .flat()
    .reduce((latest, m) => {
      const d = m.updated_at || m.created_at;
      return d > latest ? d : latest;
    }, '');

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 text-center">
        <p className="text-sm text-gray-500 dark:text-[#6a7a7e]">请先登录查看 Ola 的记忆</p>
        <button onClick={() => showLogin()} className="mt-3 px-6 py-2 rounded-lg text-sm font-medium bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">
          登录
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-24 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/koala/my-profile" className="text-gray-400 dark:text-[#6a7a7e] no-underline text-lg">←</Link>
        <div>
          <h1 className="text-base font-bold text-gray-900 dark:text-[#e8e4dc]">Ola 对你的了解</h1>
          <p className="text-[11px] text-gray-500 dark:text-[#6a7a7e]">Ola 在对话中记住的关于你的信息</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-gray-500 dark:text-[#6a7a7e]">加载中…</div>
      ) : total === 0 ? (
        <div className={`rounded-xl p-8 text-center ${CARD_CLS}`}>
          <div className="text-4xl mb-3">🐨</div>
          <p className="text-sm text-gray-900 dark:text-[#e8e4dc] font-medium">还没有记忆</p>
          <p className="text-xs text-gray-500 dark:text-[#6a7a7e] mt-1">和 Ola 多聊聊，她会慢慢了解你的</p>
          <Link href="/koala/chat" className="inline-block mt-4 px-6 py-2 rounded-lg text-xs font-medium no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">
            开始对话
          </Link>
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([category, memories]) => {
            const meta = CATEGORY_META[category] ?? { emoji: '📌', label: category };
            return (
              <div key={category} className={`rounded-xl overflow-hidden mb-3 ${CARD_CLS}`}>
                <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${DIVIDER_CLS}`}>
                  <span className="text-sm">{meta.emoji}</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">{meta.label}</span>
                  <span className="text-[10px] text-gray-400 dark:text-[#6a7a7e]">({memories.length})</span>
                </div>
                <div className={`divide-y ${DIVIDER_CLS}`}>
                  {memories.map(mem => {
                    const conf = confidenceLabel(mem.confidence);
                    const isEditing = editingId === mem.id;
                    const isDeleting = deletingId === mem.id;

                    return (
                      <div key={mem.id} className="px-4 py-2.5">
                        {isDeleting ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-500 dark:text-[#6a7a7e]">确认删除这条记忆？</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDelete(mem.id)}
                                className="text-[10px] px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400"
                              >
                                删除
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="text-[10px] px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#6a7a7e]"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : isEditing ? (
                          <div>
                            <input
                              autoFocus
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSave(mem.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              disabled={saving}
                              className="w-full px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-[#D4A843]/20 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-[#e8e4dc] outline-none focus:border-blue-400 dark:focus:border-[#D4A843]/50"
                            />
                            <div className="flex justify-end gap-2 mt-1.5">
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-[10px] px-2 py-0.5 text-gray-400 dark:text-[#6a7a7e]"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => handleSave(mem.id)}
                                disabled={saving || !editText.trim()}
                                className="text-[10px] px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 disabled:opacity-50"
                              >
                                {saving ? '保存中…' : '保存'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-900 dark:text-[#e8e4dc] leading-relaxed">{mem.memory_text}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${conf.cls}`}>
                                  {conf.text}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-[#6a7a7e]">
                                  {timeAgo(mem.updated_at || mem.created_at)}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0 pt-0.5">
                              <button
                                onClick={() => handleEdit(mem)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 dark:text-[#6a7a7e]"
                                title="编辑"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  <path d="m15 5 4 4" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeletingId(mem.id)}
                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-400 dark:text-[#6a7a7e] hover:text-red-500 dark:hover:text-red-400"
                                title="删除"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Footer stats */}
          <div className="text-center text-[11px] text-gray-400 dark:text-[#6a7a7e] mt-4 mb-2">
            共 {total} 条记忆{latestUpdate ? ` · 上次更新 ${timeAgo(latestUpdate)}` : ''}
          </div>
        </>
      )}
    </div>
  );
}
