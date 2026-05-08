'use client';

import { useEffect, useState, useRef } from 'react';

type MainTab = 'system' | 'messages';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  user_profiles?: { display_name: string | null; email: string | null } | null;
}

interface Thread {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  assigned_to: string | null;
  last_message_at: string;
  created_at: string;
  user_profiles?: { display_name: string | null; email: string | null } | null;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  created_at: string;
  user_profiles?: { display_name: string | null; email: string | null } | null;
}

const TYPE_LABELS: Record<string, string> = {
  role_application: '角色申请',
  role_approved: '角色通过',
  role_rejected: '角色拒绝',
  role_revoked: '角色撤销',
  weekly_report: '周报',
  weekly_report_summary: '周报汇总',
  admin_message: '管理员消息',
  broadcast: '系统广播',
  info: '系统通知',
};

const TYPE_COLORS: Record<string, string> = {
  role_application: 'bg-purple-100 text-purple-700',
  role_approved: 'bg-green-100 text-green-700',
  role_rejected: 'bg-red-100 text-red-700',
  role_revoked: 'bg-red-100 text-red-700',
  weekly_report: 'bg-blue-100 text-blue-700',
  weekly_report_summary: 'bg-blue-100 text-blue-700',
  admin_message: 'bg-amber-100 text-amber-700',
  broadcast: 'bg-indigo-100 text-indigo-700',
  info: 'bg-slate-100 text-slate-700',
};

export default function NotificationsPage() {
  const [mainTab, setMainTab] = useState<MainTab>('system');

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">站内信</h1>

      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-3">
        <button
          onClick={() => setMainTab('system')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mainTab === 'system' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          📋 系统通知
        </button>
        <button
          onClick={() => setMainTab('messages')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mainTab === 'messages' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          💬 对话消息
        </button>
      </div>

      {mainTab === 'system' ? <SystemNotifications /> : <MessagesPanel />}
    </div>
  );
}

function SystemNotifications() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { loadNotifs(); }, [page, typeFilter]);

  function doSearch(val: string) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); loadNotifsWithSearch(val); }, 400);
  }

  async function loadNotifs() { loadNotifsWithSearch(search); }

  async function loadNotifsWithSearch(q: string) {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    const res = await fetch(`/api/user/notifications?${params}`);
    const d = await res.json();
    let items: Notification[] = d.data ?? [];
    if (typeFilter) items = items.filter(n => n.type === typeFilter);
    if (q) {
      const lower = q.toLowerCase();
      items = items.filter(n => n.title.toLowerCase().includes(lower) || (n.content ?? '').toLowerCase().includes(lower));
    }
    setTotal(items.length);
    const start = (page - 1) * 30;
    setNotifs(items.slice(start, start + 30));
    setLoading(false);
  }

  async function markAllRead() {
    await fetch('/api/user/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markAllRead' }),
    });
    loadNotifs();
  }

  async function markRead(id: string) {
    await fetch('/api/user/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markRead', notificationId: id }),
    });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  const allTypes = ['role_application', 'role_approved', 'role_rejected', 'role_revoked', 'weekly_report', 'weekly_report_summary', 'admin_message', 'broadcast', 'info'];

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input
          placeholder="搜索标题或内容…"
          value={search}
          onChange={e => doSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg px-3 py-2 text-sm border border-slate-200 bg-white"
        >
          <option value="">全部类型</option>
          {allTypes.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
        </select>
        <button
          onClick={markAllRead}
          className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
        >
          全部已读
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">加载中…</p>
      ) : notifs.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">暂无通知</p>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`bg-white rounded-xl p-4 border cursor-pointer transition ${n.is_read ? 'border-slate-100' : 'border-blue-200 bg-blue-50/30 hover:bg-blue-50/50'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[n.type] || 'bg-slate-100 text-slate-600'}`}>
                      {TYPE_LABELS[n.type] || n.type}
                    </span>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                  {n.content && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.content}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                    <span>{new Date(n.created_at).toLocaleString('zh-CN')}</span>
                    {n.user_profiles?.display_name && <span>用户: {n.user_profiles.display_name}</span>}
                    {n.user_profiles?.email && <span>{n.user_profiles.email}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 30 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200 disabled:opacity-40">上一页</button>
          <span className="text-xs text-slate-500">{page} / {Math.ceil(total / 30)}</span>
          <button disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200 disabled:opacity-40">下一页</button>
        </div>
      )}
    </div>
  );
}

const TICKET_CATEGORIES = [
  { key: 'general', label: '一般咨询', emoji: '💬' },
  { key: 'account', label: '账户问题', emoji: '👤' },
  { key: 'professor', label: '教授信息反馈', emoji: '🎓' },
  { key: 'outreach', label: '套磁信问题', emoji: '✉️' },
  { key: 'payment', label: '付款/积分', emoji: '💰' },
  { key: 'bug', label: 'Bug 反馈', emoji: '🐛' },
  { key: 'suggestion', label: '功能建议', emoji: '💡' },
];

function MessagesPanel() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newCategory, setNewCategory] = useState('general');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadThreads(); }, [statusFilter]);

  useEffect(() => {
    if (selectedThread) loadMessages(selectedThread.id);
  }, [selectedThread?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadThreads() {
    setLoading(true);
    const res = await fetch('/api/user/messages');
    const d = await res.json();
    setThreads(d.data ?? []);
    setLoading(false);
  }

  async function loadMessages(threadId: string) {
    const res = await fetch(`/api/user/messages?threadId=${threadId}`);
    const d = await res.json();
    setMessages(d.messages ?? []);
    if (d.thread) setSelectedThread(d.thread);
  }

  async function sendReply() {
    if (!reply.trim() || !selectedThread) return;
    setSending(true);
    await fetch('/api/user/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reply', threadId: selectedThread.id, content: reply }),
    });
    setReply('');
    setSending(false);
    loadMessages(selectedThread.id);
  }

  async function createTicket() {
    if (!newContent.trim()) return;
    setCreating(true);
    const res = await fetch('/api/user/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', category: newCategory, content: newContent }),
    });
    const d = await res.json();
    setCreating(false);
    if (d.success) {
      setShowNewTicket(false);
      setNewContent('');
      setNewCategory('general');
      loadThreads();
    }
  }

  if (showNewTicket) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setShowNewTicket(false)} className="text-sm text-slate-500 hover:text-slate-800">← 返回</button>
          <h3 className="text-sm font-semibold text-slate-800">新建工单</h3>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">问题类型</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TICKET_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setNewCategory(cat.key)}
                className={`p-2.5 rounded-xl text-xs text-center border transition ${newCategory === cat.key ? 'border-slate-800 bg-slate-50 font-medium text-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="text-lg block mb-0.5">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">详细描述</label>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="请描述您的问题或建议…"
            rows={5}
            className="w-full rounded-xl px-4 py-3 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
          />
        </div>

        <button
          onClick={createTicket}
          disabled={creating || !newContent.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {creating ? '提交中…' : '提交工单'}
        </button>
      </div>
    );
  }

  if (selectedThread) {
    return (
      <div className="flex flex-col h-[calc(100vh-220px)]">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedThread(null)} className="text-sm text-slate-500 hover:text-slate-800">← 返回</button>
            <div>
              <p className="text-sm font-semibold text-slate-800">{selectedThread.subject}</p>
              <p className="text-[10px] text-slate-400">
                {selectedThread.status === 'closed' ? '已关闭' : '进行中'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pb-3">
          {messages.map(m => {
            const isStaff = ['super_admin', 'admin', 'sales'].includes(m.sender_role);
            const isSystem = m.sender_role === 'system';
            return (
              <div key={m.id} className={`flex ${isStaff || isSystem ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                  isSystem ? 'bg-blue-50 border border-blue-200 text-blue-800' :
                  isStaff ? 'bg-white border border-slate-200 text-slate-800' :
                  'bg-slate-800 text-white'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] opacity-70">
                      {isSystem ? '系统' : isStaff ? '客服' : '我'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${isStaff || isSystem ? 'text-slate-400' : 'opacity-50'}`}>
                    {new Date(m.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {selectedThread.status === 'open' && (
          <div className="flex gap-2 pt-3 border-t border-slate-200">
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
              placeholder="输入回复…"
              className="flex-1 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button
              disabled={sending || !reply.trim()}
              onClick={sendReply}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
            >
              发送
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(['open', 'closed', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === s ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
              {{ open: '进行中', closed: '已关闭', all: '全部' }[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNewTicket(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          + 新建工单
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">加载中…</p>
      ) : threads.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 text-3xl mb-2">💬</p>
          <p className="text-sm text-slate-400 mb-4">暂无对话</p>
          <button
            onClick={() => setShowNewTicket(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700"
          >
            联系客服
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedThread(t)}
              className="w-full text-left bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {t.status === 'open' ? '进行中' : '已关闭'}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                最后消息: {new Date(t.last_message_at).toLocaleString('zh-CN')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
