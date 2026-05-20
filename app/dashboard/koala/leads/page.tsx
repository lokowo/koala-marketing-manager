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
        setLeads([]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    converted: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">线索管理</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">查看和管理所有潜在用户线索</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '总线索', value: '0', icon: '👥', color: 'bg-blue-50' },
          { label: '新线索', value: '0', icon: '🆕', color: 'bg-green-50' },
          { label: '已接触', value: '0', icon: '📞', color: 'bg-yellow-50' },
          { label: '已转化', value: '0', icon: '✅', color: 'bg-purple-50' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4 border border-gray-200 dark:border-gray-700`}>
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{stat.value}</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">线索列表</h3>
          <input
            type="text"
            placeholder="搜索线索..."
            className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500"
          />
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">加载中...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无线索数据</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">当用户开始 AI 对话后，线索将自动记录在此</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">来源</th>
                <th className="text-left px-4 py-2.5 font-medium">AI评分</th>
                <th className="text-left px-4 py-2.5 font-medium">状态</th>
                <th className="text-left px-4 py-2.5 font-medium">时间</th>
                <th className="text-left px-4 py-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-800/50">
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{lead.source}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{lead.ai_score}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[lead.status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500">{lead.created_at}</td>
                  <td className="px-4 py-2.5">
                    <button className="text-blue-600 text-[10px] hover:underline">查看对话</button>
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
