'use client';
import { useState, useEffect, useCallback } from 'react';

interface HandoffRequest {
  id: string;
  user_id: string | null;
  reason: string | null;
  collected_data: Record<string, unknown> | null;
  conversation_summary: string | null;
  status: string;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
}

export default function HandoffQueuePage() {
  const [requests, setRequests] = useState<HandoffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'handled' | 'all'>('pending');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/ola-handoff?status=${filter}`);
      if (resp.ok) {
        const data = await resp.json();
        setRequests(data.requests ?? []);
      }
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  async function markHandled(id: string) {
    await fetch(`/api/admin/ola-handoff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'handled' }),
    });
    fetchRequests();
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">Handoff 队列</h1>
          <p className="text-sm text-gray-500 mt-1">Ola AI 转人工请求</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['pending', 'handled', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${filter === f ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              {f === 'pending' ? '待处理' : f === 'handled' ? '已处理' : '全部'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">加载中...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200 dark:border-gray-700">
            {filter === 'pending' ? '暂无待处理的请求' : '暂无记录'}
          </div>
        ) : (
          requests.map(r => (
            <div key={r.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {r.status === 'pending' ? '待处理' : '已处理'}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(r.created_at)}</span>
                    {r.user_id && <span className="text-xs text-gray-400 dark:text-gray-500">User: {r.user_id.slice(0, 8)}...</span>}
                  </div>
                  {r.reason && <p className="text-sm font-medium text-gray-800 mb-1">原因：{r.reason}</p>}
                  {r.conversation_summary && (
                    <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">{r.conversation_summary}</p>
                  )}
                </div>
                {r.status === 'pending' && (
                  <button onClick={() => markHandled(r.id)} className="ml-4 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 flex-shrink-0">
                    标记已处理
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
