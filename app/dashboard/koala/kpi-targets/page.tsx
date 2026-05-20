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

const KPI_FIELDS = [
  { key: 'target_visits' as const, label: '访问量', color: '#3B82F6' },
  { key: 'target_registrations' as const, label: '注册量', color: '#F59E0B' },
  { key: 'target_conversions' as const, label: '转化数', color: '#10B981' },
  { key: 'target_revenue' as const, label: '佣金 (AUD)', color: '#D4A843' },
];

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

  if (loading) return <p className="text-sm text-[#6B7280] py-8 text-center">加载中...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#111827]">分销 KPI 目标</h1>
        <button
          onClick={() => setShowBatch(!showBatch)}
          className="text-xs px-4 py-2 rounded-lg bg-[#111827] text-white font-medium hover:opacity-90 transition"
        >
          批量设置
        </button>
      </div>

      {/* Month selector */}
      <div className="border-b border-[#E5E7EB]">
        <div className="flex gap-0 -mb-px">
          {months.map(m => (
            <button
              key={m.label}
              onClick={() => setSelectedMonth(m.label)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition ${
                selectedMonth === m.label
                  ? 'border-[#F59E0B] text-[#111827]'
                  : 'border-transparent text-[#6B7280] hover:text-[#374151]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batch form */}
      {showBatch && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h2 className="text-sm font-semibold text-[#374151] mb-4">
            为所有活跃销售设置 {currentMonth.label} 目标
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {KPI_FIELDS.map(item => (
              <div key={item.key}>
                <label className="text-[10px] font-medium mb-1 block" style={{ color: item.color }}>
                  {item.label}
                </label>
                <input
                  type="number"
                  value={batchForm[item.key]}
                  onChange={e => setBatchForm(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowBatch(false)} className="text-xs px-3 py-1.5 rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]">
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
            <div key={agent.id} className="rounded-xl p-4 bg-white border border-[#E5E7EB] hover:shadow-sm transition">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="size-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#6B7280]">
                  {(profile?.display_name || profile?.email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#111827] truncate">{profile?.display_name || '未知'}</div>
                  <div className="text-[10px] text-[#9CA3AF] font-mono">{agent.referral_code}</div>
                </div>
                {target ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] ml-auto">已设置</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#9CA3AF] ml-auto">未设置</span>
                )}
              </div>
              {target ? (
                <div className="grid grid-cols-2 gap-2">
                  {KPI_FIELDS.map(field => (
                    <div key={field.key} className="rounded-lg p-2 bg-[#F9FAFB]">
                      <div className="text-[10px] text-[#9CA3AF]">{field.label}</div>
                      <div className="text-sm font-bold" style={{ color: field.color }}>
                        {field.key === 'target_revenue' ? `$${target[field.key]}` : target[field.key]}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#9CA3AF] text-center py-3">
                  使用批量设置为该销售设置目标
                </div>
              )}
            </div>
          );
        })}
      </div>

      {agents.length === 0 && (
        <p className="text-xs text-[#6B7280] py-6 text-center">暂无活跃销售人员</p>
      )}
    </div>
  );
}
