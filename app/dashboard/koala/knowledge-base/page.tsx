'use client';
import { useState, useEffect, useCallback } from 'react';

interface KnowledgeChunk {
  id: string;
  source_type: string;
  source_title: string;
  content: string;
  created_at?: string;
}

interface SearchResult {
  id: string;
  source_type: string;
  source_title: string;
  content: string;
  similarity: number;
}

const SOURCE_TYPES = [
  'professor_paper', 'arc_grant', 'blog_post', 'faq',
  'user_feedback', 'guide', 'professor_profile', 'manual',
];

export default function KnowledgeBasePage() {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [searchKw, setSearchKw] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingChunk, setEditingChunk] = useState<KnowledgeChunk | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState('manual');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<KnowledgeChunk | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showBatch, setShowBatch] = useState(false);
  const [batchJson, setBatchJson] = useState('');
  const [batchResult, setBatchResult] = useState('');
  const [importing, setImporting] = useState(false);

  const [semQuery, setSemQuery] = useState('');
  const [semThreshold, setSemThreshold] = useState(0.45);
  const [semLimit, setSemLimit] = useState(10);
  const [semResults, setSemResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState('');

  const LIMIT = 20;

  const fetchChunks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (filterType) params.set('source_type', filterType);
      if (searchKw.trim()) params.set('search', searchKw.trim());

      const resp = await fetch(`/api/admin/knowledge?${params}`);
      const data = await resp.json();
      setChunks(data.chunks ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setChunks([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, searchKw]);

  useEffect(() => { fetchChunks(); }, [fetchChunks]);

  function openCreate() {
    setEditingChunk(null);
    setFormTitle('');
    setFormContent('');
    setFormType('manual');
    setShowModal(true);
  }

  function openEdit(chunk: KnowledgeChunk) {
    setEditingChunk(chunk);
    setFormTitle(chunk.source_title);
    setFormContent(chunk.content);
    setFormType(chunk.source_type);
    setShowModal(true);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formContent.trim()) return;
    setSaving(true);
    try {
      if (editingChunk) {
        const resp = await fetch(`/api/admin/knowledge/${editingChunk.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_title: formTitle, content: formContent, source_type: formType }),
        });
        if (resp.ok) {
          const updated = await resp.json();
          setChunks(prev => prev.map(c => c.id === updated.id ? updated : c));
        }
      } else {
        const resp = await fetch('/api/admin/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_title: formTitle, content: formContent, source_type: formType }),
        });
        if (resp.ok) {
          fetchChunks();
        }
      }
      setShowModal(false);
    } catch { /* handled by UI state */ } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const resp = await fetch(`/api/admin/knowledge/${deleteTarget.id}`, { method: 'DELETE' });
      if (resp.ok) {
        setChunks(prev => prev.filter(c => c.id !== deleteTarget.id));
        setTotal(prev => prev - 1);
      }
      setDeleteTarget(null);
    } catch { /* handled by UI state */ } finally {
      setDeleting(false);
    }
  }

  async function handleBatchImport() {
    setImporting(true);
    setBatchResult('');
    try {
      const items = JSON.parse(batchJson);
      const resp = await fetch('/api/admin/knowledge/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: Array.isArray(items) ? items : [items] }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setBatchResult(`导入成功: ${data.imported} 条${data.errors ? `\n验证错误: ${data.errors.join(', ')}` : ''}`);
        fetchChunks();
      } else {
        setBatchResult(`错误: ${data.error}${data.details ? `\n${data.details.join('\n')}` : ''}`);
      }
    } catch {
      setBatchResult('JSON 格式错误，请检查输入');
    } finally {
      setImporting(false);
    }
  }

  async function handleSearch() {
    if (!semQuery.trim()) return;
    setSearching(true);
    setSemResults([]);
    setSearchError('');
    try {
      const resp = await fetch('/api/admin/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: semQuery, threshold: semThreshold, limit: semLimit }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setSearchError(data.error ?? `请求失败 (${resp.status})`);
        return;
      }
      setSemResults(data.results ?? []);
      if ((data.results ?? []).length === 0) {
        setSearchError('无匹配结果，试试降低阈值或换个查询词');
      }
    } catch {
      setSearchError('网络错误，无法连接搜索服务');
    } finally {
      setSearching(false);
    }
  }

  async function handleBackfill() {
    setBackfilling(true);
    setBackfillResult('');
    try {
      const resp = await fetch('/api/admin/knowledge/backfill', { method: 'POST' });
      const data = await resp.json();
      if (resp.ok) {
        setBackfillResult(data.message + (data.processed > 0 ? ` — 处理 ${data.processed} 条，失败 ${data.failed} 条` : ''));
      } else {
        setBackfillResult(`错误: ${data.error}`);
      }
    } catch {
      setBackfillResult('网络错误');
    } finally {
      setBackfilling(false);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">知识库管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理 AI 的知识库内容和向量索引 · 共 {total} 条</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleBackfill} disabled={backfilling} className="px-3 py-2 border border-orange-300 text-orange-700 text-sm rounded-lg hover:bg-orange-50 transition disabled:opacity-50">
            {backfilling ? '重建中...' : '重建索引'}
          </button>
          <button onClick={() => setShowBatch(true)} className="px-3 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition">
            批量导入
          </button>
          <button onClick={openCreate} className="px-3 py-2 bg-[#1A1A2E] text-white text-sm rounded-lg hover:bg-[#2A2A3E] transition">
            添加知识
          </button>
        </div>
      </div>

      {backfillResult && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">{backfillResult}</div>
      )}

      {/* Semantic Search Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">语义搜索测试</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={semQuery}
            onChange={e => setSemQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="输入查询文本..."
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 bg-[#D4A843] text-white text-sm rounded-lg hover:bg-[#C09A3A] transition disabled:opacity-50"
          >
            {searching ? '搜索中...' : '测试'}
          </button>
        </div>
        <div className="flex gap-4 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            阈值:
            <input
              type="number"
              min={0} max={1} step={0.05}
              value={semThreshold}
              onChange={e => setSemThreshold(parseFloat(e.target.value))}
              className="w-20 border border-slate-300 rounded px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-2">
            数量:
            <input
              type="number"
              min={1} max={50}
              value={semLimit}
              onChange={e => setSemLimit(parseInt(e.target.value))}
              className="w-20 border border-slate-300 rounded px-2 py-1 text-sm"
            />
          </label>
        </div>
        {searchError && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{searchError}</div>
        )}
        {semResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {semResults.map(r => (
              <div key={r.id} className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-mono">
                    {(r.similarity * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{r.source_type}</span>
                  <span className="text-sm font-medium text-slate-700">{r.source_title}</span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chunk List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700 shrink-0">知识库内容</h2>
          <div className="flex gap-2 flex-1 justify-end">
            <input
              type="text"
              value={searchKw}
              onChange={e => { setSearchKw(e.target.value); setPage(1); }}
              placeholder="搜索标题/内容..."
              className="max-w-[200px] text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setPage(1); }}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="">所有来源</option>
              {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">加载中...</div>
        ) : chunks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-500">暂无知识条目</p>
            <p className="text-sm text-slate-400 mt-1">点击「添加知识」或「批量导入」开始</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {chunks.map(chunk => (
              <div key={chunk.id} className="p-4 hover:bg-slate-50 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{chunk.source_type}</span>
                      <span className="text-sm font-medium text-slate-700 truncate">{chunk.source_title}</span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{chunk.content}</p>
                    {chunk.created_at && (
                      <p className="text-xs text-slate-400 mt-1">{new Date(chunk.created_at).toLocaleDateString('zh-CN')}</p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button onClick={() => openEdit(chunk)} className="text-xs px-2 py-1 text-slate-600 hover:bg-slate-200 rounded">编辑</button>
                    <button onClick={() => setDeleteTarget(chunk)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">删除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm">
            <span className="text-slate-500">第 {page}/{totalPages} 页</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-30">上一页</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-30">下一页</button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{editingChunk ? '编辑知识' : '添加知识'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">标题</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="知识条目标题"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">来源类型</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">内容</label>
                <textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  rows={8}
                  placeholder="知识内容..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
              <button
                onClick={handleSave}
                disabled={saving || !formTitle.trim() || !formContent.trim()}
                className="px-4 py-2 text-sm bg-[#1A1A2E] text-white rounded-lg hover:bg-[#2A2A3E] disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-2">确认删除</h3>
            <p className="text-sm text-slate-600 mb-4">
              确定要删除「{deleteTarget.source_title}」吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {showBatch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">批量导入</h3>
              <button onClick={() => { setShowBatch(false); setBatchResult(''); }} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-slate-600">输入 JSON 数组，每项包含 source_title、content、source_type（最多 20 条）</p>
              <textarea
                value={batchJson}
                onChange={e => setBatchJson(e.target.value)}
                rows={10}
                placeholder={`[\n  {\n    "source_title": "标题",\n    "content": "内容...",\n    "source_type": "manual"\n  }\n]`}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
              />
              {batchResult && (
                <pre className="bg-slate-50 p-3 rounded text-xs whitespace-pre-wrap">{batchResult}</pre>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => { setShowBatch(false); setBatchResult(''); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">关闭</button>
              <button
                onClick={handleBatchImport}
                disabled={importing || !batchJson.trim()}
                className="px-4 py-2 text-sm bg-[#1A1A2E] text-white rounded-lg hover:bg-[#2A2A3E] disabled:opacity-50"
              >
                {importing ? '导入中...' : '导入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
