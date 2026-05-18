'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Search, MessageSquare } from 'lucide-react';

interface SessionInfo {
  mode: string;
  messageCount: number;
  lastMessageAt: string;
  firstUserMessage: string | null;
}

const MODE_LABELS: Record<string, { label: string; icon: string }> = {
  path: { label: '申请规划', icon: '🧭' },
  research: { label: '科研助手', icon: '🔬' },
  chat: { label: '自由聊天', icon: '💬' },
  write: { label: '写申请信', icon: '✉️' },
  rp: { label: 'RP 助手', icon: '📝' },
  interview: { label: '模拟面试', icon: '🎤' },
};

interface ChatHistorySidebarProps {
  currentMode: string;
  isOpen: boolean;
  onClose: () => void;
  onSwitchMode: (mode: string) => void;
  onNewConversation: () => void;
}

export function ChatHistorySidebar({
  currentMode,
  isOpen,
  onClose,
  onSwitchMode,
  onNewConversation,
}: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ola/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) fetchSessions();
  }, [isOpen, fetchSessions]);

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }

  function getTitle(session: SessionInfo) {
    if (session.firstUserMessage) {
      return session.firstUserMessage.slice(0, 24) + (session.firstUserMessage.length > 24 ? '…' : '');
    }
    return MODE_LABELS[session.mode]?.label ?? session.mode;
  }

  const filteredSessions = search.trim()
    ? sessions.filter(s => {
        const q = search.toLowerCase();
        const label = MODE_LABELS[s.mode]?.label ?? s.mode;
        return label.toLowerCase().includes(q) || (s.firstUserMessage?.toLowerCase().includes(q));
      })
    : sessions;

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-white dark:bg-[#0d1520] border-r border-gray-200 dark:border-white/10 shadow-xl lg:relative lg:shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-gray-500 dark:text-[#D4A843]" />
            <span className="text-sm font-semibold text-gray-900 dark:text-[#e8e4dc]">对话历史</span>
          </div>
          <button onClick={onClose} className="lg:hidden">
            <X className="size-5 text-gray-400" />
          </button>
        </div>

        {/* New conversation */}
        <div className="px-3 py-2">
          <button
            onClick={() => { onNewConversation(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-[#e8e4dc] hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10"
          >
            <Plus className="size-3.5" />
            新对话
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
            <Search className="size-3.5 text-gray-400 dark:text-[#5a5550]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索对话..."
              className="flex-1 text-xs bg-transparent outline-none text-gray-700 dark:text-[#e8e4dc] placeholder:text-gray-400 dark:placeholder:text-[#5a5550]"
            />
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {loading ? (
            <p className="text-xs text-gray-400 dark:text-[#5a5550] text-center py-4">加载中…</p>
          ) : filteredSessions.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-[#5a5550] text-center py-4">
              {search.trim() ? '未找到匹配的对话' : '暂无对话记录'}
            </p>
          ) : (
            filteredSessions.map(session => {
              const active = session.mode === currentMode;
              const meta = MODE_LABELS[session.mode];
              return (
                <button
                  key={session.mode}
                  onClick={() => { onSwitchMode(session.mode); onClose(); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    active
                      ? 'bg-[#D4A843]/10 border border-[#D4A843]/20'
                      : 'hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-900 dark:text-[#e8e4dc]">
                      {meta?.icon} {meta?.label ?? session.mode}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-[#5a5550]">
                      {formatTime(session.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5 truncate text-gray-500 dark:text-[#8a8078]">
                    {getTitle(session)}
                  </p>
                  <span className="text-[10px] text-gray-400 dark:text-[#5a5550]">
                    {session.messageCount} 条消息
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
