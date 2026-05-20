'use client';

import { useEffect, useState } from 'react';

interface Agent {
  id: string;
  user_id: string;
  referral_code: string;
  status: string;
  user_profiles: { display_name: string; email: string } | null;
}

interface KpiTarget {
  id: string;
  agent_id: string;
  period_start: string;
  period_end: string;
  target_visits: number;
  target_registrations: number;
  target_conversions: number;
  target_revenue: number;
  sales_agents?: { user_id: string; referral_code: string; user_profiles: { display_name: string; email: string } | null };
}

function getMonthRange(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end, label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
}

export default function KpiTargetsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getMonthRange().label);
  const [showBatch, setShowBatch] = useState(false);
  const [batchForm, setBatchForm] = useState({ target_visits: 100, target_registrations: 10, target_conversions: 3, target_revenue: 500 });
  const [saving, setSaving] = useState(false);

  const months = [-2, -1, 0, 1].map(o => getMonthRange(o));

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/sales-agents').then(r => r.json()),
      fetch('/api/admin/kpi-targets').then(r => r.json()),
    ]).then(([agentsRes, targetsRes]) => {
      setAgents((agentsRes.data || []).filter((a: Agent) => a.status === 'active'));
      setTargets(targetsRes.data || []);
      setLoading(false);
    });
  }, []);

  const currentMonth = months.find(m => m.label === selectedMonth) || months[2];
  const monthTargets = targets.filter(t => t.period_start === currentMonth.start);

  function getTargetForAgent(agentId: string) {
    return monthTargets.find(t => t.agent_id === agentId);
  }

  async function saveBatchTargets() {
    setSaving(true);
    const activeAgentIds = agents.map(a => a.id);
    const res = await fetch('/api/admin/kpi-targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_ids: activeAgentIds,
        period_start: currentMonth.start,
        period_end: currentMonth.end,
        ...batchForm,
      }),
    });
    if (res.ok) {
      const refreshed = await fetch('/api/admin/kpi-targets').then(r => r.json());
      setTargets(refreshed.data || []);
      setShowBatch(false);
    } else {
      alert('保存失败');
    }
    setSaving(false);
  }

  if (loading) return <p className="text-sm text-slate-400 py-8 text-center">加载中...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">分销 KPI 目标</h1>
        <button
          onClick={() => setShowBatch(!showBatch)}
          className="text-xs px-4 py-2 rounded-lg bg-[#1A1A2E] text-white font-medium hover:opacity-90 transition"
        >
          批量设置
        </button>
      </div>

      {/* Month selector */}
      <div className="flex gap-2">
        {months.map(m => (
          <button
            key={m.label}
            onClick={() => setSelectedMonth(m.label)}
            className={`text-xs px-3 py-1.5 rounded-lg transition ${
              selectedMonth === m.label ? 'bg-amber-100 text-amber-700 font-medium' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Batch form */}
      {showBatch && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">为所有活跃销售设置 {currentMonth.label} 目标</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { key: 'target_visits' as const, label: '访问量目标', icon: '👁' },
              { key: 'target_registrations' as const, label: '注册量目标', icon: '📥' },
              { key: 'target_conversions' as const, label: '付费转化目标', icon: '🎯' },
              { key: 'target_revenue' as const, label: '佣金目标 (AUD)', icon: '💰' },
            ].map(item => (
              <div key={item.key}>
                <label className="text-[10px] text-slate-500 mb-1 block">{item.icon} {item.label}</label>
                <input
                  type="number"
                  value={batchForm[item.key]}
                  onChange={e => setBatchForm(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowBatch(false)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600">取消</button>
            <button
              onClick={saveBatchTargets}
              disabled={saving}
              className="text-xs px-4 py-1.5 rounded-lg bg-amber-500 text-white font-medium disabled:opacity-50"
            >
              {saving ? '保存中...' : `应用给 ${agents.length} 人`}
            </button>
          </div>
        </div>
      )}

      {/* Targets table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="text-left px-4 py-2.5 font-medium">销售人员</th>
              <th className="text-center px-4 py-2.5 font-medium">👁 访问量</th>
              <th className="text-center px-4 py-2.5 font-medium">📥 注册量</th>
              <th className="text-center px-4 py-2.5 font-medium">🎯 转化</th>
              <th className="text-center px-4 py-2.5 font-medium">💰 佣金</th>
              <th className="text-center px-4 py-2.5 font-medium">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agents.map(agent => {
              const profile = agent.user_profiles;
              const target = getTargetForAgent(agent.id);
              return (
                <tr key={agent.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{profile?.display_name || profile?.email || '未知'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{agent.referral_code}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700 font-medium">{target?.target_visits ?? '-'}</td>
                  <td className="px-4 py-3 text-center text-slate-700 font-medium">{target?.target_registrations ?? '-'}</td>
                  <td className="px-4 py-3 text-center text-slate-700 font-medium">{target?.target_conversions ?? '-'}</td>
                  <td className="px-4 py-3 text-center text-slate-700 font-medium">
                    {target?.target_revenue != null ? `$${target.target_revenue}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {target ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">已设置</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">未设置</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {agents.length === 0 && (
          <p className="text-xs text-slate-400 py-6 text-center">暂无活跃销售人员</p>
        )}
      </div>
    </div>
  );
}
