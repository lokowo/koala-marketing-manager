'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

type MainTab = 'system' | 'tickets';

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

// ── Constants ───────────────────────────────────────────────────────────────

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
  role_application: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  role_approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  role_rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  role_revoked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  weekly_report: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  weekly_report_summary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  admin_message: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  broadcast: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  info: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const ALL_TYPES = Object.keys(TYPE_LABELS);

// ── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
        type === 'success'
          ? 'bg-green-50 dark:bg-green-900/80 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
          : 'bg-red-50 dark:bg-red-900/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
      }`}>
        <span>{type === 'success' ? '✓' : '✗'}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [mainTab, setMainTab] = useState<MainTab>('system');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  return (
    <div className="space-y-5 pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">站内信</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理系统通知和用户工单</p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-0 -mb-px">
          {([['system', '系统通知'], ['tickets', '工单管理']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMainTab(key)}
              className={`px-4 py-2.5 text-sm transition-all duration-150 border-b-2 ${
                mainTab === key
                  ? 'font-medium text-gray-900 dark:text-gray-100 border-gray-900 dark:border-gray-100'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mainTab === 'system' ? (
        <SystemNotifications showToast={showToast} />
      ) : (
        <TicketManager showToast={showToast} />
      )}

      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.25s ease-out; }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 1: System Notifications (calls /api/admin/notifications)
// ═══════════════════════════════════════════════════════════════════════════

function SystemNotifications({ showToast }: { showToast: (m: string, t: 'success' | 'error') => void }) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showSendModal, setShowSendModal] = useState<'send' | 'broadcast' | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const limit = 30;

  useEffect(() => { loadNotifs(); }, [page, typeFilter]);

  function doSearch(val: string) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); loadNotifsWithSearch(val); }, 400);
  }

  function loadNotifs() { loadNotifsWithSearch(search); }

  async function loadNotifsWithSearch(q: string) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (typeFilter) params.set('type', typeFilter);
    if (q) params.set('search', q);
    try {
      const res = await fetch(`/api/admin/notifications?${params}`);
      const d = await res.json();
      setNotifs(d.data ?? []);
      setTotal(d.total ?? 0);
    } catch {
      showToast('加载通知失败', 'error');
    }
    setLoading(false);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input
          placeholder="搜索标题或内容..."
          value={search}
          onChange={e => doSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500"
        />
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="">全部类型</option>
          {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <button
          onClick={() => setShowSendModal('send')}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          发送通知
        </button>
        <button
          onClick={() => setShowSendModal('broadcast')}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-800 dark:bg-gray-600 text-white hover:bg-gray-700 dark:hover:bg-gray-500 transition"
        >
          全员广播
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-400 dark:text-gray-500">
        <span>共 {total} 条通知</span>
        {typeFilter && <span>· 筛选: {TYPE_LABELS[typeFilter]}</span>}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="h-3 w-48 bg-gray-100 dark:bg-gray-700/60 rounded" />
            </div>
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-12 text-center">暂无通知</p>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div
              key={n.id}
              className={`bg-white dark:bg-gray-800 rounded-lg p-4 border transition ${
                n.is_read
                  ? 'border-gray-100 dark:border-gray-700'
                  : 'border-blue-200 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[n.type] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                      {TYPE_LABELS[n.type] || n.type}
                    </span>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{n.title}</p>
                  {n.content && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{n.content}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 dark:text-gray-500 flex-wrap">
                    <span>{new Date(n.created_at).toLocaleString('zh-CN')}</span>
                    {n.user_profiles?.display_name && (
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                        {n.user_profiles.display_name}
                      </span>
                    )}
                    {n.user_profiles?.email && <span>{n.user_profiles.email}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            上一页
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            下一页
          </button>
        </div>
      )}

      {/* Send / Broadcast Modal */}
      {showSendModal && (
        <SendNotificationModal
          mode={showSendModal}
          onClose={() => setShowSendModal(null)}
          onSuccess={() => { setShowSendModal(null); loadNotifs(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ── Send Notification Modal ─────────────────────────────────────────────────

function SendNotificationModal({
  mode,
  onClose,
  onSuccess,
  showToast,
}: {
  mode: 'send' | 'broadcast';
  onClose: () => void;
  onSuccess: () => void;
  showToast: (m: string, t: 'success' | 'error') => void;
}) {
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!title.trim() || !content.trim()) return;
    if (mode === 'send' && !userId.trim()) return;

    setSending(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode === 'send' ? 'send' : 'broadcast',
          userId: mode === 'send' ? userId : undefined,
          title,
          content,
        }),
      });
      const d = await res.json();
      if (res.ok && (d.success || d.sent !== undefined)) {
        showToast(mode === 'broadcast' ? `已发送给 ${d.sent} 位用户` : '通知已发送', 'success');
        onSuccess();
      } else {
        showToast(d.error || '发送失败', 'error');
      }
    } catch {
      showToast('发送失败', 'error');
    }
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
          {mode === 'broadcast' ? '全员广播' : '发送通知'}
        </h3>

        {mode === 'send' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">用户 ID</label>
            <input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="输入目标用户的 UUID"
              className="w-full rounded-lg px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">标题</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="通知标题"
            className="w-full rounded-lg px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">内容</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="通知内容..."
            rows={4}
            className="w-full rounded-lg px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            取消
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !content.trim() || (mode === 'send' && !userId.trim())}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {sending ? '发送中...' : mode === 'broadcast' ? '广播' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 2: Ticket Manager (calls /api/admin/messages)
// ═══════════════════════════════════════════════════════════════════════════

function TicketManager({ showToast }: { showToast: (m: string, t: 'success' | 'error') => void }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
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
    try {
      const res = await fetch(`/api/admin/messages?status=${statusFilter}`);
      const d = await res.json();
      setThreads(d.data ?? []);
    } catch {
      showToast('加载工单失败', 'error');
    }
    setLoading(false);
  }

  async function loadMessages(threadId: string) {
    try {
      const res = await fetch(`/api/admin/messages?threadId=${threadId}`);
      const d = await res.json();
      setMessages(d.messages ?? []);
      if (d.thread) setSelectedThread(d.thread);
    } catch {
      showToast('加载消息失败', 'error');
    }
  }

  async function sendReply() {
    if (!reply.trim() || !selectedThread) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', threadId: selectedThread.id, content: reply }),
      });
      if (res.ok) {
        setReply('');
        loadMessages(selectedThread.id);
        loadThreads();
      } else {
        showToast('回复失败', 'error');
      }
    } catch {
      showToast('回复失败', 'error');
    }
    setSending(false);
  }

  async function closeTicket() {
    if (!selectedThread) return;
    setClosing(true);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', threadId: selectedThread.id }),
      });
      if (res.ok) {
        showToast('工单已关闭', 'success');
        setSelectedThread(prev => prev ? { ...prev, status: 'closed' } : null);
        loadThreads();
      } else {
        showToast('关闭失败', 'error');
      }
    } catch {
      showToast('关闭失败', 'error');
    }
    setClosing(false);
  }

  // ── Thread Detail View ──
  if (selectedThread) {
    const userName = selectedThread.user_profiles?.display_name || '未知用户';
    const userEmail = selectedThread.user_profiles?.email || '';

    return (
      <div className="flex flex-col h-[calc(100vh-220px)]">
        {/* Detail Header */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { setSelectedThread(null); setMessages([]); }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex-shrink-0"
            >
              ← 返回
            </button>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{selectedThread.subject}</p>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                <span className="font-medium text-gray-600 dark:text-gray-300">{userName}</span>
                {userEmail && <span>{userEmail}</span>}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                  selectedThread.status === 'open'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {selectedThread.status === 'open' ? '进行中' : '已关闭'}
                </span>
              </div>
            </div>
          </div>
          {selectedThread.status === 'open' && (
            <button
              onClick={closeTicket}
              disabled={closing}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
            >
              {closing ? '关闭中...' : '关闭工单'}
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-3">
          {messages.map(m => {
            const isStaff = ['super_admin', 'admin', 'sales'].includes(m.sender_role);
            const isSystem = m.sender_role === 'system';
            const senderName = isSystem
              ? '系统'
              : isStaff
                ? `管理员${m.user_profiles?.display_name ? ' · ' + m.user_profiles.display_name : ''}`
                : userName;

            return (
              <div key={m.id} className={`flex ${isStaff || isSystem ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                  isSystem
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300'
                    : isStaff
                      ? 'bg-gray-800 dark:bg-gray-600 text-white'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] ${isStaff ? 'text-gray-300' : isSystem ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      {senderName}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${isStaff ? 'text-gray-400' : isSystem ? 'text-blue-400 dark:text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
                    {new Date(m.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply bar */}
        {selectedThread.status === 'open' && (
          <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
              placeholder="以管理员身份回复..."
              className="flex-1 rounded-lg px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500"
            />
            <button
              disabled={sending || !reply.trim()}
              onClick={sendReply}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {sending ? '...' : '发送'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Thread List View ──
  return (
    <div>
      {/* Status filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(['open', 'closed', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-gray-800 dark:bg-gray-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {{ open: '进行中', closed: '已关闭', all: '全部' }[s]}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">{threads.length} 条工单</span>
      </div>

      {/* Thread list */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 animate-pulse">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700/60 rounded" />
                </div>
                <div className="h-5 w-14 bg-gray-100 dark:bg-gray-700/60 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {statusFilter === 'open' ? '没有进行中的工单' : statusFilter === 'closed' ? '没有已关闭的工单' : '暂无工单'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map(t => {
            const userName = t.user_profiles?.display_name || '未知用户';
            const userEmail = t.user_profiles?.email || '';
            return (
              <button
                key={t.id}
                onClick={() => setSelectedThread(t)}
                className="w-full text-left bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{t.subject}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                      <span className="font-medium text-gray-600 dark:text-gray-300">{userName}</span>
                      {userEmail && <span className="truncate">{userEmail}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      t.status === 'open'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {t.status === 'open' ? '进行中' : '已关闭'}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  最后消息: {new Date(t.last_message_at).toLocaleString('zh-CN')}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
