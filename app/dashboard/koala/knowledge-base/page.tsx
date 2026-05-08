'use client';
import { useState, useEffect } from 'react';

interface KnowledgeChunk {
  id: string;
  source_type: string;
  source_title: string;
  content: string;
  created_at?: string;
}

export default function KnowledgeBasePage() {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string>('');

  useEffect(() => {
    // Would fetch from supabase knowledge_chunks table
    setChunks([]);
    setLoading(false);
  }, []);

  async function testSearch() {
    if (!searchQuery.trim()) return;
    setSearchResults('搜索中...');
    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'research',
          messages: [{ role: 'user', content: searchQuery }],
        }),
      });
      const data = await resp.json() as { citations?: unknown[]; reply?: string };
      setSearchResults(`返回 ${(data.citations ?? []).length} 个引用\n\n${(data.reply ?? '').slice(0, 300)}...`);
    } catch {
      setSearchResults('搜索失败');
    }
  }

  const SOURCE_TYPES = ['arc_grant', 'paper', 'university_website', 'policy_doc', 'manual'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">知识库管理</h1>
        <p className="text-sm text-slate-500 mt-1">管理 AI 的知识库内容和向量索引</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'knowledge_chunks', value: chunks.length.toString(), icon: '📚' },
          { label: '来源类型', value: SOURCE_TYPES.length.toString(), icon: '🏷️' },
          { label: '向量维度', value: '1536', icon: '🔢' },
          { label: '相似度阈值', value: '0.7', icon: '⚡' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-5 border border-slate-200">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">测试搜索</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && testSearch()}
            placeholder="输入搜索词..."
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <button
            onClick={testSearch}
            className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition"
          >
            测试
          </button>
        </div>
        {searchResults && (
          <pre className="mt-3 bg-slate-50 p-3 rounded text-xs whitespace-pre-wrap">{searchResults}</pre>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">知识库内容</h2>
          <div className="flex gap-2">
            <select className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none">
              <option value="">所有来源</option>
              {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
              上传文档
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">加载中...</div>
        ) : chunks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-500">知识库暂无内容</p>
            <p className="text-sm text-slate-400 mt-1">运行 <code className="bg-slate-100 px-1 rounded">knowledge_builder.js</code> 构建知识库</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {chunks.slice(0, 20).map(chunk => (
              <div key={chunk.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{chunk.source_type}</span>
                  <span className="text-sm font-medium text-slate-700">{chunk.source_title}</span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2">{chunk.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
