'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, MessageSquare, Plus, ArrowLeft, Send, CheckCheck, Clock, XCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../components/AuthContext';

type Tab = 'notifications' | 'tickets';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface Thread {
  id: string;
  subject: string;
  status: 'open' | 'closed';
  last_message_at: string;
  created_at: string;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  created_at: string;
  isMe: boolean;
  isStaff: boolean;
}

const CATEGORIES = [
  { value: 'account', label: '账户问题', icon: '👤' },
  { value: 'payment', label: '付款/积分', icon: '💳' },
  { value: 'bug', label: 'Bug 反馈', icon: '🐛' },
  { value: 'professor', label: '教授信息', icon: '🎓' },
  { value: 'outreach', label: '套磁信', icon: '✉️' },
  { value: 'suggestion', label: '功能建议', icon: '💡' },
  { value: 'general', label: '其他', icon: '📋' },
] as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default function MessagesPage() {
  const { user, showLogin } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('notifications');

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(true);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newCategory, setNewCategory] = useState('general');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setNotifLoading(true);
    try {
      const res = await fetch('/api/user/notifications?limit=50');
      const d = await res.json();
      setNotifications(d.data ?? []);
      setUnreadCount(d.unreadCount ?? 0);
    } catch { /* ignore */ }
    setNotifLoading(false);
  }, [user]);

  const fetchThreads = useCallback(async () => {
    if (!user) return;
    setTicketsLoading(true);
    try {
      const res = await fetch('/api/user/messages');
      const d = await res.json();
      setThreads(d.data ?? []);
    } catch { /* ignore */ }
    setTicketsLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchThreads();
    }
  }, [user, fetchNotifications, fetchThreads]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <Bell className="size-12 mb-4 text-gray-300 dark:text-[#6a7a7e]" />
        <p className="text-sm text-gray-500 dark:text-[#6a7a7e] mb-4">登录后查看消息</p>
        <button
          onClick={() => showLogin(() => {})}
          className="px-6 py-2.5 rounded-full text-sm font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
        >
          登录
        </button>
      </div>
    );
  }

  async function markRead(id: string) {
    await fetch('/api/user/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markRead', notificationId: id }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    await fetch('/api/user/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markAllRead' }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function openThread(thread: Thread) {
    setActiveThread(thread);
    setThreadLoading(true);
    setReplyContent('');
    try {
      const res = await fetch(`/api/user/messages?threadId=${thread.id}`);
      const d = await res.json();
      setMessages(d.messages ?? []);
    } catch { /* ignore */ }
    setThreadLoading(false);
  }

  async function submitNewTicket() {
    if (!newContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/user/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', category: newCategory, content: newContent.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        setShowNewTicket(false);
        setNewContent('');
        setNewCategory('general');
        fetchThreads();
        setTab('tickets');
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  }

  async function sendReply() {
    if (!replyContent.trim() || !activeThread) return;
    setReplying(true);
    try {
      const res = await fetch('/api/user/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', threadId: activeThread.id, content: replyContent.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        setReplyContent('');
        const refresh = await fetch(`/api/user/messages?threadId=${activeThread.id}`);
        const rd = await refresh.json();
        setMessages(rd.messages ?? []);
      }
    } catch { /* ignore */ }
    setReplying(false);
  }

  // ── Thread detail view ──
  if (activeThread) {
    return (
      <div className="flex flex-col h-[calc(100svh-120px)] lg:h-[calc(100svh-80px)]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-[rgba(201,169,110,0.12)]">
          <button onClick={() => { setActiveThread(null); setMessages([]); }} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5">
            <ArrowLeft className="size-4 text-gray-600 dark:text-[#a8b8ac]" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-gray-900 dark:text-[#e8e4dc]">{activeThread.subject}</p>
            <p className="text-[10px] text-gray-400 dark:text-[#6a7a7e]">
              {activeThread.status === 'open' ? '进行中' : '已关闭'} · {timeAgo(activeThread.created_at)}
            </p>
          </div>
          {activeThread.status === 'open' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">进行中</span>
          )}
          {activeThread.status === 'closed' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#6a7a7e]">已关闭</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {threadLoading ? (
            <div className="flex justify-center py-10">
              <div className="size-6 border-2 border-gray-300 dark:border-[#D4A843]/30 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex ${m.isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  m.isMe
                    ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] rounded-br-md'
                    : m.sender_role === 'system'
                      ? 'bg-amber-50 dark:bg-[#D4A843]/10 text-gray-600 dark:text-[#a8b8ac] rounded-bl-md'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-[#e8e4dc] rounded-bl-md'
                }`}>
                  {m.isStaff && !m.isMe && m.sender_role !== 'system' && (
                    <p className="text-[10px] font-semibold mb-1 text-[#D4A843]">Koala 客服</p>
                  )}
                  {m.sender_role === 'system' && (
                    <p className="text-[10px] font-semibold mb-1 text-amber-600 dark:text-[#D4A843]">自动回复</p>
                  )}
                  {m.content}
                  <p className={`text-[9px] mt-1 ${m.isMe ? 'text-white/50 dark:text-[#080c10]/50' : 'text-gray-400 dark:text-[#6a7a7e]'}`}>
                    {timeAgo(m.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {activeThread.status === 'open' ? (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-[rgba(201,169,110,0.12)]">
            <div className="flex items-end gap-2">
              <textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="输入回复..."
                rows={1}
                className="flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm outline-none bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-[#e8e4dc] border border-gray-200 dark:border-[rgba(201,169,110,0.12)] focus:border-[#1A1A2E] dark:focus:border-[#D4A843]"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
                }}
              />
              <button
                onClick={sendReply}
                disabled={replying || !replyContent.trim()}
                className="size-10 flex-shrink-0 flex items-center justify-center rounded-full bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-[rgba(201,169,110,0.12)] text-center">
            <p className="text-xs text-gray-400 dark:text-[#6a7a7e]">该工单已关闭</p>
          </div>
        )}
      </div>
    );
  }

  // ── New ticket form ──
  if (showNewTicket) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setShowNewTicket(false)} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5">
            <ArrowLeft className="size-4 text-gray-600 dark:text-[#a8b8ac]" />
          </button>
          <h2 className="text-base font-bold text-gray-900 dark:text-[#e8e4dc]">提交工单</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-[#a8b8ac]">选择分类</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setNewCategory(cat.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                    newCategory === cat.value
                      ? 'border-[#1A1A2E] dark:border-[#D4A843] bg-[#1A1A2E]/5 dark:bg-[#D4A843]/10 text-[#1A1A2E] dark:text-[#D4A843]'
                      : 'border-gray-200 dark:border-[rgba(201,169,110,0.12)] text-gray-600 dark:text-[#a8b8ac] hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-[#a8b8ac]">问题描述</label>
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="请详细描述你遇到的问题..."
              rows={5}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-[#e8e4dc] border border-gray-200 dark:border-[rgba(201,169,110,0.12)] focus:border-[#1A1A2E] dark:focus:border-[#D4A843]"
            />
          </div>

          <button
            onClick={submitNewTicket}
            disabled={submitting || !newContent.trim()}
            className="w-full py-3 rounded-full text-sm font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] disabled:opacity-40"
          >
            {submitting ? '提交中...' : '提交工单'}
          </button>
        </div>
      </div>
    );
  }

  // ── Main list view ──
  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900 dark:text-[#e8e4dc]">消息中心</h1>
        <button
          onClick={() => setShowNewTicket(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
        >
          <Plus className="size-3.5" />
          提交工单
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-4 bg-gray-100 dark:bg-white/5">
        <button
          onClick={() => setTab('notifications')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            tab === 'notifications'
              ? 'bg-white dark:bg-[#1A1A2E] text-gray-900 dark:text-[#e8e4dc] shadow-sm'
              : 'text-gray-500 dark:text-[#6a7a7e]'
          }`}
        >
          <Bell className="size-3.5" />
          通知
          {unreadCount > 0 && (
            <span className="min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold bg-[#b06040] text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('tickets')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            tab === 'tickets'
              ? 'bg-white dark:bg-[#1A1A2E] text-gray-900 dark:text-[#e8e4dc] shadow-sm'
              : 'text-gray-500 dark:text-[#6a7a7e]'
          }`}
        >
          <MessageSquare className="size-3.5" />
          工单
          {threads.filter(t => t.status === 'open').length > 0 && (
            <span className="min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">
              {threads.filter(t => t.status === 'open').length}
            </span>
          )}
        </button>
      </div>

      {/* Notifications tab */}
      {tab === 'notifications' && (
        <div>
          {unreadCount > 0 && (
            <div className="flex justify-end mb-2">
              <button onClick={markAllRead} className="text-[11px] font-medium text-[#1A1A2E] dark:text-[#D4A843]">
                <CheckCheck className="size-3 inline mr-1" />
                全部已读
              </button>
            </div>
          )}
          {notifLoading ? (
            <div className="flex justify-center py-10">
              <div className="size-6 border-2 border-gray-300 dark:border-[#D4A843]/30 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <Bell className="size-10 mb-3 text-gray-200 dark:text-[#6a7a7e]/50" />
              <p className="text-sm text-gray-400 dark:text-[#6a7a7e]">暂无通知</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markRead(n.id);
                    if (n.link) router.push(n.link);
                  }}
                  className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-colors ${
                    n.is_read
                      ? 'bg-white dark:bg-white/[0.02]'
                      : 'bg-amber-50/60 dark:bg-[#D4A843]/5'
                  } hover:bg-gray-50 dark:hover:bg-white/5`}
                >
                  {!n.is_read && (
                    <span className="mt-1.5 size-2 rounded-full flex-shrink-0 bg-[#b06040] dark:bg-[#D4A843]" />
                  )}
                  <div className={n.is_read ? 'ml-5' : ''}>
                    <p className="text-sm font-medium text-gray-900 dark:text-[#e8e4dc]">{n.title}</p>
                    <p className="text-xs mt-0.5 line-clamp-2 text-gray-500 dark:text-[#a8b8ac]">{n.content}</p>
                    <p className="text-[10px] mt-1 text-gray-400 dark:text-[#6a7a7e]">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tickets tab */}
      {tab === 'tickets' && (
        <div>
          {ticketsLoading ? (
            <div className="flex justify-center py-10">
              <div className="size-6 border-2 border-gray-300 dark:border-[#D4A843]/30 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <MessageSquare className="size-10 mb-3 text-gray-200 dark:text-[#6a7a7e]/50" />
              <p className="text-sm text-gray-400 dark:text-[#6a7a7e] mb-3">暂无工单</p>
              <button
                onClick={() => setShowNewTicket(true)}
                className="text-xs font-semibold text-[#1A1A2E] dark:text-[#D4A843]"
              >
                提交第一个工单
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map(t => (
                <button
                  key={t.id}
                  onClick={() => openThread(t)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className={`size-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    t.status === 'open'
                      ? 'bg-green-100 dark:bg-green-900/20'
                      : 'bg-gray-100 dark:bg-white/5'
                  }`}>
                    {t.status === 'open'
                      ? <Clock className="size-4 text-green-600 dark:text-green-400" />
                      : <XCircle className="size-4 text-gray-400 dark:text-[#6a7a7e]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate text-gray-900 dark:text-[#e8e4dc]">{t.subject}</p>
                    <p className="text-[10px] mt-0.5 text-gray-400 dark:text-[#6a7a7e]">
                      {t.status === 'open' ? '进行中' : '已关闭'} · {timeAgo(t.last_message_at || t.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="size-4 flex-shrink-0 text-gray-300 dark:text-[#6a7a7e]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
