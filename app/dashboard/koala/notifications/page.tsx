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
    const params = new URLSearchParams({ page: String(page), limit: '30' });
    if (typeFilter) params.set('type', typeFilter);
    if (q) params.set('search', q);
    const res = await fetch(`/api/admin/notifications?${params}`);
    const d = await res.json();
    setNotifs(d.data ?? []);
    setTotal(d.total ?? 0);
    setLoading(false);
  }

  const allTypes = ['role_application', 'role_approved', 'role_rejected', 'role_revoked', 'weekly_report', 'weekly_report_summary', 'admin_message', 'broadcast', 'info'];

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
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
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">加载中…</p>
      ) : notifs.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">暂无通知</p>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div key={n.id} className={`bg-white rounded-xl p-4 border ${n.is_read ? 'border-slate-100' : 'border-blue-200 bg-blue-50/30'}`}>
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

function MessagesPanel() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed' | 'all'>('open');
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
    const res = await fetch(`/api/admin/messages?status=${statusFilter}`);
    const d = await res.json();
    setThreads(d.data ?? []);
    setLoading(false);
  }

  async function loadMessages(threadId: string) {
    const res = await fetch(`/api/admin/messages?threadId=${threadId}`);
    const d = await res.json();
    setMessages(d.messages ?? []);
    if (d.thread) setSelectedThread(d.thread);
  }

  async function sendReply() {
    if (!reply.trim() || !selectedThread) return;
    setSending(true);
    await fetch('/api/admin/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reply', threadId: selectedThread.id, content: reply }),
    });
    setReply('');
    setSending(false);
    loadMessages(selectedThread.id);
  }

  async function closeThread(threadId: string) {
    await fetch('/api/admin/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close', threadId }),
    });
    setSelectedThread(null);
    loadThreads();
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
                {selectedThread.user_profiles?.display_name || selectedThread.user_profiles?.email || selectedThread.user_id.slice(0, 8)}
                {selectedThread.status === 'closed' && ' · 已关闭'}
              </p>
            </div>
          </div>
          {selectedThread.status === 'open' && (
            <button onClick={() => closeThread(selectedThread.id)} className="px-3 py-1.5 rounded-lg text-xs bg-white text-slate-600 border border-slate-200 hover:bg-slate-50">关闭对话</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pb-3">
          {messages.map(m => (
            <div key={m.id} className={`flex ${['super_admin', 'admin', 'sales'].includes(m.sender_role) ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${['super_admin', 'admin', 'sales'].includes(m.sender_role) ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] opacity-70">
                    {m.user_profiles?.display_name || m.sender_role}
                    {m.sender_role !== 'user' && ` (${m.sender_role})`}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                <p className={`text-[10px] mt-1 ${['super_admin', 'admin', 'sales'].includes(m.sender_role) ? 'opacity-50' : 'text-slate-400'}`}>
                  {new Date(m.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
          ))}
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
      <div className="flex gap-2 mb-4">
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

      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">加载中…</p>
      ) : threads.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">暂无对话</p>
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
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.user_profiles?.display_name || t.user_profiles?.email || t.user_id.slice(0, 8)}
                  </p>
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
