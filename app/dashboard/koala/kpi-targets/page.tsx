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
  effective_from: string;
  effective_until: string;
  period_type: string;
  kpi_1_visits: number;
  kpi_2_registrations: number;
  kpi_3_payments: number;
  kpi_3_revenue: number;
  kpi_4_offline: number;
  sales_agents?: { user_id: string; referral_code: string; user_profiles: { display_name: string; email: string } | null };
}

function getMonthRange(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end, label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
}

const KPI_FIELDS = [
  { key: 'kpi_1_visits' as const, label: 'KPI1 访问', color: '#3B82F6' },
  { key: 'kpi_2_registrations' as const, label: 'KPI2 注册', color: '#22C55E' },
  { key: 'kpi_3_payments' as const, label: 'KPI3 付费', color: '#F59E0B' },
  { key: 'kpi_3_revenue' as const, label: '佣金 (AUD)', color: '#D4A843' },
  { key: 'kpi_4_offline' as const, label: 'KPI4 线下', color: '#8B5CF6' },
];

export default function KpiTargetsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getMonthRange().label);
  const [showBatch, setShowBatch] = useState(false);
  const [batchForm, setBatchForm] = useState({ kpi_1_visits: 50, kpi_2_registrations: 20, kpi_3_payments: 10, kpi_3_revenue: 500, kpi_4_offline: 5 });
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
  const monthTargets = targets.filter(t => t.effective_from === currentMonth.start);

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
        effective_from: currentMonth.start,
        effective_until: currentMonth.end,
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

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">加载中...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">分销 KPI 目标</h1>
        <button
          onClick={() => setShowBatch(!showBatch)}
          className="text-xs px-4 py-2 rounded-lg bg-[#111827] text-white font-medium hover:opacity-90 transition"
        >
          批量设置
        </button>
      </div>

      {/* Month selector */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-0 -mb-px">
          {months.map(m => (
            <button
              key={m.label}
              onClick={() => setSelectedMonth(m.label)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition ${
                selectedMonth === m.label
                  ? 'border-[#F59E0B] text-gray-900 dark:text-gray-100'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batch form */}
      {showBatch && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            为所有活跃销售设置 {currentMonth.label} 目标
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
            {KPI_FIELDS.map(item => (
              <div key={item.key}>
                <label className="text-[10px] font-medium mb-1 block" style={{ color: item.color }}>
                  {item.label}
                </label>
                <input
                  type="number"
                  value={batchForm[item.key]}
                  onChange={e => setBatchForm(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowBatch(false)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-[#E5E7EB]">
              取消
            </button>
            <button
              onClick={saveBatchTargets}
              disabled={saving}
              className="text-xs px-4 py-1.5 rounded-lg bg-[#111827] text-white font-medium disabled:opacity-50 hover:opacity-90 transition"
            >
              {saving ? '保存中...' : `应用给 ${agents.length} 人`}
            </button>
          </div>
        </div>
      )}

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => {
          const profile = agent.user_profiles;
          const target = getTargetForAgent(agent.id);
          return (
            <div key={agent.id} className="rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-sm transition">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="size-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">
                  {(profile?.display_name || profile?.email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{profile?.display_name || '未知'}</div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{agent.referral_code}</div>
                </div>
                {target ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] ml-auto">已设置</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 ml-auto">未设置</span>
                )}
              </div>
              {target ? (
                <div className="grid grid-cols-2 gap-2">
                  {KPI_FIELDS.map(field => (
                    <div key={field.key} className="rounded-lg p-2 bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-[10px] text-gray-400 dark:text-gray-500">{field.label}</div>
                      <div className="text-sm font-bold" style={{ color: field.color }}>
                        {field.key === 'kpi_3_revenue' ? `$${target[field.key]}` : target[field.key]}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
                  使用批量设置为该销售设置目标
                </div>
              )}
            </div>
          );
        })}
      </div>

      {agents.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 py-6 text-center">暂无活跃销售人员</p>
      )}
    </div>
  );
}
