'use client';
import { useState, useEffect } from 'react';

interface Lead {
  id: string;
  created_at: string;
  source: string;
  ai_score: number;
  status: string;
  mode: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/dashboard')
      .then(r => r.json())
      .then(() => {
        // leads come from ai_conversations
        setLeads([]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    converted: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">线索管理</h1>
        <p className="text-sm text-gray-500 mt-1">查看和管理所有潜在用户线索</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: '总线索', value: '0', icon: '👥', color: 'bg-blue-50' },
          { label: '新线索', value: '0', icon: '🆕', color: 'bg-green-50' },
          { label: '已接触', value: '0', icon: '📞', color: 'bg-yellow-50' },
          { label: '已转化', value: '0', icon: '✅', color: 'bg-purple-50' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-lg p-4 border border-gray-200`}>
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">线索列表</h2>
          <input
            type="text"
            placeholder="搜索线索..."
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">加载中...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500">暂无线索数据</p>
            <p className="text-sm text-gray-400 mt-1">当用户开始 AI 对话后，线索将自动记录在此</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">来源</th>
                <th className="text-left px-4 py-2">AI评分</th>
                <th className="text-left px-4 py-2">状态</th>
                <th className="text-left px-4 py-2">时间</th>
                <th className="text-left px-4 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{lead.source}</td>
                  <td className="px-4 py-3">{lead.ai_score}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[lead.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{lead.created_at}</td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 text-xs hover:underline">查看对话</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
