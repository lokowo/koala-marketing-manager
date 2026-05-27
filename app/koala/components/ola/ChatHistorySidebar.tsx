'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { IconLayoutSidebar, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';

interface SessionInfo {
  sessionId: string;
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
  currentSessionId?: string;
  isOpen: boolean;
  onToggle: () => void;
  onSwitchMode: (mode: string) => void;
  onNewConversation: () => void;
  onLoadSession?: (sessionId: string, mode: string) => void;
  onDeleteSession?: (sessionId: string) => void;
}

type DateGroup = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

const GROUP_LABELS: Record<DateGroup, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'This Week',
  earlier: 'Earlier',
};

function classifyDate(dateStr: string): DateGroup {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - startOfToday.getDay() * 86400000);

  if (d >= startOfToday) return 'today';
  if (d >= startOfYesterday) return 'yesterday';
  if (d >= startOfWeek) return 'thisWeek';
  return 'earlier';
}

function getTitle(session: SessionInfo) {
  if (session.firstUserMessage) {
    const text = session.firstUserMessage.slice(0, 20);
    return text + (session.firstUserMessage.length > 20 ? '…' : '');
  }
  return MODE_LABELS[session.mode]?.label ?? session.mode;
}

function formatSessionTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function ChatHistorySidebar({
  currentSessionId,
  isOpen,
  onToggle,
  onSwitchMode,
  onNewConversation,
  onLoadSession,
  onDeleteSession,
}: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ola/conversations?list=true&limit=50');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
      setTimeout(() => searchRef.current?.focus(), 350);
    }
  }, [isOpen, fetchSessions]);

  const filteredSessions = search.trim()
    ? sessions.filter(s => {
        const q = search.toLowerCase();
        const label = MODE_LABELS[s.mode]?.label ?? s.mode;
        return label.toLowerCase().includes(q) || s.firstUserMessage?.toLowerCase().includes(q);
      })
    : sessions;

  const grouped = filteredSessions.reduce<Record<DateGroup, SessionInfo[]>>((acc, s) => {
    const group = classifyDate(s.lastMessageAt);
    (acc[group] ??= []).push(s);
    return acc;
  }, { today: [], yesterday: [], thisWeek: [], earlier: [] });

  const groupOrder: DateGroup[] = ['today', 'yesterday', 'thisWeek', 'earlier'];

  return (
    <>
      {/* Toggle button — always visible, fixed in top-left */}
      <button
        onClick={onToggle}
        className="fixed left-3 top-3 z-[52] flex items-center justify-center size-9 rounded-lg bg-white dark:bg-[#0d1520] border border-gray-200 dark:border-white/10 shadow-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        title={isOpen ? '收起侧边栏' : '展开侧边栏'}
      >
        <IconLayoutSidebar className="size-[18px] text-gray-600 dark:text-[#D4A843]" />
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[50] md:hidden transition-opacity"
          onClick={onToggle}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`
          fixed md:relative inset-y-0 left-0 z-[51]
          w-[260px] flex-shrink-0 flex flex-col
          bg-white dark:bg-[#0d1520]
          border-r border-gray-200 dark:border-white/10
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:-ml-[260px]'}
        `}
      >
        {/* Header with new conversation button */}
        <div className="flex items-center gap-2 px-3 pt-14 pb-2">
          <button
            onClick={() => { onNewConversation(); if (window.innerWidth < 768) onToggle(); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90"
          >
            <IconPlus className="size-4" />
            新对话
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
            <IconSearch className="size-3.5 text-gray-400 dark:text-[#5a5550]" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索对话..."
              className="flex-1 text-xs bg-transparent outline-none text-gray-700 dark:text-[#e8e4dc] placeholder:text-gray-400 dark:placeholder:text-[#5a5550]"
            />
          </div>
        </div>

        {/* Session list grouped by date */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            <p className="text-xs text-gray-400 dark:text-[#5a5550] text-center py-8">加载中…</p>
          ) : filteredSessions.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-[#5a5550] text-center py-8">
              {search.trim() ? '未找到匹配的对话' : '暂无对话记录'}
            </p>
          ) : (
            groupOrder.map(groupKey => {
              const items = grouped[groupKey];
              if (!items || items.length === 0) return null;
              return (
                <div key={groupKey} className="mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#5a5550] px-2 pt-3 pb-1">
                    {GROUP_LABELS[groupKey]}
                  </p>
                  {items.map(session => {
                    const active = session.sessionId === currentSessionId;
                    const meta = MODE_LABELS[session.mode];
                    const hovered = hoveredId === session.sessionId;
                    const confirming = confirmDeleteId === session.sessionId;
                    return (
                      <div
                        key={session.sessionId}
                        className="relative group"
                        onMouseEnter={() => setHoveredId(session.sessionId)}
                        onMouseLeave={() => { setHoveredId(null); if (!deleting) setConfirmDeleteId(null); }}
                      >
                        {confirming ? (
                          <div className="px-2.5 py-2 rounded-lg bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/30">
                            <p className="text-[12px] text-red-700 dark:text-red-300 mb-1.5">确定删除这条对话吗？</p>
                            <div className="flex gap-2">
                              <button
                                disabled={deleting}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setDeleting(true);
                                  try {
                                    const res = await fetch('/api/ola/conversations', {
                                      method: 'DELETE',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ sessionId: session.sessionId }),
                                    });
                                    if (res.ok) {
                                      setSessions(prev => prev.filter(s => s.sessionId !== session.sessionId));
                                      onDeleteSession?.(session.sessionId);
                                    }
                                  } catch { /* ignore */ }
                                  setDeleting(false);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                {deleting ? '删除中…' : '确认'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-[#e8e4dc] hover:bg-gray-300 dark:hover:bg-white/15 transition-colors"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                if (onLoadSession) {
                                  onLoadSession(session.sessionId, session.mode);
                                } else {
                                  onSwitchMode(session.mode);
                                }
                                if (window.innerWidth < 768) onToggle();
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors ${
                                active
                                  ? 'bg-gray-100 dark:bg-white/[0.08]'
                                  : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs">{meta?.icon ?? '💬'}</span>
                                <span className="text-[13px] font-medium text-gray-800 dark:text-[#e8e4dc] truncate flex-1">
                                  {getTitle(session)}
                                </span>
                              </div>
                              <p className="text-[11px] mt-0.5 text-gray-400 dark:text-[#5a5550] pl-5">
                                {formatSessionTime(session.lastMessageAt)}
                              </p>
                            </button>
                            {hovered && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(session.sessionId); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                                title="删除对话"
                              >
                                <IconTrash className="size-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
