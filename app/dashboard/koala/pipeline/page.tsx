'use client';
import { useState } from 'react';

export default function PipelinePage() {
  const [triggering, setTriggering] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  async function triggerSync() {
    setTriggering(true);
    setLog(prev => [...prev, `[${new Date().toISOString()}] 开始采集...`]);
    try {
      const resp = await fetch('/api/admin/trigger-sync', {
        method: 'POST',
      });
      const data = await resp.json() as { synced?: number; message?: string };
      setLog(prev => [...prev, `[${new Date().toISOString()}] 完成: ${data.message ?? JSON.stringify(data)}`]);
    } catch (e) {
      setLog(prev => [...prev, `[${new Date().toISOString()}] 错误: ${(e as Error).message}`]);
    }
    setTriggering(false);
  }

  const apiStatus = [
    { name: 'Semantic Scholar', status: 'online', latency: '~200ms' },
    { name: 'ARC Portal', status: 'online', latency: '~800ms' },
    { name: 'OpenAlex', status: 'online', latency: '~300ms' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">采集管线监控</h1>
        <p className="text-sm text-slate-500 mt-1">监控教授数据自动采集状态</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: '上次采集', value: '暂无记录', icon: '🕐' },
          { label: '新增教授', value: '0', icon: '👨‍🔬' },
          { label: '待审核', value: '0', icon: '⏳' },
          { label: '总教授数', value: '0', icon: '📊' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-5 border border-slate-200">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">API 状态</h2>
        <div className="space-y-2">
          {apiStatus.map(api => (
            <div key={api.name} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm font-medium text-slate-700">{api.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{api.latency}</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  ● {api.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">手动触发采集</h2>
          <button
            onClick={triggerSync}
            disabled={triggering}
            className="px-4 py-2 bg-[#D4A843] text-white text-sm rounded-lg disabled:opacity-50 hover:bg-[#C09A3A] transition"
          >
            {triggering ? '采集中...' : '一键触发'}
          </button>
        </div>
        {log.length > 0 && (
          <div className="bg-slate-50 rounded p-3 font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
        <p className="text-xs text-slate-500 mt-2">手动补充教授：直接在 <a href="/dashboard/koala/professors" className="text-blue-600">教授管理</a> 页面添加</p>
      </div>
    </div>
  );
}
